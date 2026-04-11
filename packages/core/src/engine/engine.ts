/**
 * The `VariantEngine`.
 *
 * Framework-agnostic runtime for `experiments.json`. Mirrors the
 * surface in `API.md` §`VariantEngine` and preserves the
 * non-negotiables from `ARCHITECTURE.md`:
 *
 *   - `getVariant` is synchronous and O(1) after warmup.
 *   - No `Math.random` anywhere in the hot path.
 *   - `Date.now()` called once per resolution at the outer boundary.
 *   - Fail-open by default; fail-closed throws.
 *   - The loaded config is deeply frozen — no runtime mutation.
 *
 * Resolution order for `getVariant(id)`:
 *
 *   1. `dispose`d?              → error path
 *   2. in-memory override?      → return override
 *   3. cache hit?               → return cached
 *   4. experiment exists?       → no → error path
 *   5. rolled back?             → return default
 *   6. kill-switched?           → return default
 *   7. time-gated?              → return default
 *   8. targeting matches?       → no → return default
 *   9. mutex winner?            → no → return default
 *  10. assign                   → cache, emit, return
 */
import type { Experiment, ExperimentsConfig, VariantContext } from "../config/types.js";
import { validateConfig } from "../config/validator.js";
import { assignVariant } from "../assignment/index.js";
import { bucketUserId } from "../assignment/hash.js";
import { resolveMutex } from "../assignment/mutex.js";
import type { EvalContext, EvaluableTargeting } from "../targeting/types.js";
import { evaluate } from "../targeting/evaluator.js";
import { matchRoute } from "../targeting/glob.js";
import type { EngineEvent } from "../history/events.js";
import { RingBuffer } from "../history/ring-buffer.js";
import { CrashCounter } from "./crash-counter.js";
import { isKilled } from "./kill-switch.js";
import { ListenerSet, type Listener } from "./subscribe.js";
import { isTimeGated } from "./time-gate.js";

export type FailMode = "fail-open" | "fail-closed";

export type VariantChangeSource = "user" | "system" | "deeplink" | "qr";

export interface EngineOptions {
  readonly context?: VariantContext;
  readonly failMode?: FailMode;
  readonly historySize?: number;
}

/** Thrown in fail-closed mode when an experiment id isn't in the config. */
export class UnknownExperimentError extends Error {
  readonly experimentId: string;
  constructor(experimentId: string) {
    super(`Unknown experiment: ${experimentId}`);
    this.name = "UnknownExperimentError";
    this.experimentId = experimentId;
  }
}

export class VariantEngine {
  private config: ExperimentsConfig;
  private experimentIndex: Map<string, Experiment>;
  private context: VariantContext;
  private evalContext: EvalContext;
  private readonly failMode: FailMode;
  private readonly history: RingBuffer<EngineEvent>;
  private readonly listeners = new ListenerSet();
  private readonly overrides = new Map<string, string>();
  private readonly cache = new Map<string, string>();
  private readonly rolledBack = new Set<string>();
  private readonly crashCounter = new CrashCounter();
  private disposed = false;

  constructor(config: ExperimentsConfig, options: EngineOptions = {}) {
    this.config = config;
    this.experimentIndex = indexExperiments(config);
    this.context = options.context ?? {};
    this.evalContext = buildEvalContext(this.context);
    this.failMode = options.failMode ?? "fail-open";
    this.history = new RingBuffer<EngineEvent>(options.historySize ?? 500);
    this.emit({ type: "ready", config });
  }

  // ---------- resolution ---------------------------------------------------

  getVariant(experimentId: string): string {
    if (this.disposed) {
      return this.handleError(new Error("VariantEngine is disposed"), experimentId);
    }
    try {
      const override = this.overrides.get(experimentId);
      if (override !== undefined) return override;

      const cached = this.cache.get(experimentId);
      if (cached !== undefined) return cached;

      const experiment = this.experimentIndex.get(experimentId);
      if (experiment === undefined) {
        if (this.failMode === "fail-closed") {
          throw new UnknownExperimentError(experimentId);
        }
        return this.handleError(new UnknownExperimentError(experimentId), experimentId);
      }

      if (this.rolledBack.has(experimentId)) return experiment.default;
      if (isKilled(this.config, experiment)) return experiment.default;
      if (isTimeGated(experiment, Date.now())) return experiment.default;

      if (!this.isTargeted(experiment)) return experiment.default;

      if (experiment.mutex !== undefined) {
        const winner = this.resolveMutexWinner(experiment.mutex);
        if (winner !== experimentId) return experiment.default;
      }

      const variantId = assignVariant(experiment, this.context.userId);
      this.cache.set(experimentId, variantId);
      this.emit({ type: "assignment", experimentId, variantId, context: this.context });
      return variantId;
    } catch (err) {
      if (this.failMode === "fail-closed") throw err;
      return this.handleError(err as Error, experimentId);
    }
  }

  getVariantValue<T = unknown>(experimentId: string): T {
    const variantId = this.getVariant(experimentId);
    const experiment = this.experimentIndex.get(experimentId);
    if (experiment === undefined) return undefined as T;
    const variant = experiment.variants.find((v) => v.id === variantId);
    return (variant?.value as T) ?? (undefined as T);
  }

  // ---------- overrides ---------------------------------------------------

  setVariant(
    experimentId: string,
    variantId: string,
    source: VariantChangeSource = "user",
  ): void {
    if (this.disposed) return;
    const experiment = this.experimentIndex.get(experimentId);
    if (experiment === undefined) return;
    if (!experiment.variants.some((v) => v.id === variantId)) return;
    this.overrides.set(experimentId, variantId);
    this.emit({ type: "variantChanged", experimentId, variantId, source });
  }

  clearVariant(experimentId: string): void {
    if (this.disposed) return;
    if (!this.overrides.delete(experimentId)) return;
    const experiment = this.experimentIndex.get(experimentId);
    if (experiment === undefined) return;
    const next = this.getVariant(experimentId);
    this.emit({ type: "variantChanged", experimentId, variantId: next, source: "system" });
  }

  resetAll(): void {
    if (this.disposed) return;
    this.overrides.clear();
    this.cache.clear();
    this.rolledBack.clear();
    for (const experiment of this.config.experiments) {
      this.emit({
        type: "variantChanged",
        experimentId: experiment.id,
        variantId: this.getVariant(experiment.id),
        source: "system",
      });
    }
  }

  // ---------- lookup ------------------------------------------------------

  /**
   * Returns the currently loaded, deeply-frozen {@link ExperimentsConfig}.
   *
   * Exposed read-only so debug surfaces (e.g. `<VariantDebugOverlay />`)
   * can display the raw config without reaching into private fields.
   * Mutating this value has no effect on the engine.
   */
  getConfig(): ExperimentsConfig {
    return this.config;
  }

  /**
   * Returns a shallow copy of the current {@link VariantContext}.
   *
   * A copy is returned rather than the live object so callers can't
   * accidentally mutate engine state. Use {@link updateContext} to
   * change it.
   */
  getContext(): VariantContext {
    return { ...this.context };
  }

  getExperiments(route?: string): readonly Experiment[] {
    if (route === undefined) return this.config.experiments;
    return this.config.experiments.filter((exp) => {
      if (exp.routes === undefined) return true;
      return exp.routes.some((pattern) => matchRoute(pattern, route));
    });
  }

  // ---------- subscriptions ----------------------------------------------

  subscribe(listener: Listener): () => void {
    return this.listeners.add(listener);
  }

  // ---------- mutation ----------------------------------------------------

  updateContext(patch: Partial<VariantContext>): void {
    if (this.disposed) return;
    const merged: VariantContext = { ...this.context, ...patch };
    this.context = merged;
    this.evalContext = buildEvalContext(merged);
    this.cache.clear();
    this.emit({ type: "contextUpdated", context: merged });
  }

  async loadConfig(next: unknown): Promise<void> {
    if (this.disposed) return;
    const validated = validateConfig(next);
    this.config = validated;
    this.experimentIndex = indexExperiments(validated);
    this.cache.clear();
    this.rolledBack.clear();
    this.crashCounter.clear();
    this.emit({ type: "configLoaded", config: validated });
  }

  // ---------- crash rollback ---------------------------------------------

  reportCrash(experimentId: string, _error: Error): void {
    if (this.disposed) return;
    const experiment = this.experimentIndex.get(experimentId);
    if (experiment === undefined) return;
    const rollback = experiment.rollback;
    if (rollback === undefined) return;
    const now = Date.now();
    const count = this.crashCounter.record(experimentId, now, rollback.window);
    if (count >= rollback.threshold) {
      this.rolledBack.add(experimentId);
      this.cache.delete(experimentId);
      this.overrides.delete(experimentId);
      this.emit({
        type: "rollback",
        experimentId,
        variantId: experiment.default,
        reason: `threshold ${rollback.threshold} crashes in ${rollback.window}ms`,
      });
    }
  }

  // ---------- history -----------------------------------------------------

  getHistory(): readonly EngineEvent[] {
    return this.history.toArray();
  }

  // ---------- lifecycle ---------------------------------------------------

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.overrides.clear();
    this.cache.clear();
    this.rolledBack.clear();
    this.crashCounter.clear();
  }

  // ---------- internals ---------------------------------------------------

  private isTargeted(experiment: Experiment): boolean {
    if (experiment.targeting === undefined) return true;
    return evaluate(experiment.targeting as EvaluableTargeting, this.evalContext).matched;
  }

  private resolveMutexWinner(group: string): string | undefined {
    const userId = this.context.userId;
    if (userId === undefined || userId === "") return undefined;
    const candidates: string[] = [];
    const now = Date.now();
    for (const exp of this.config.experiments) {
      if (exp.mutex !== group) continue;
      if (this.rolledBack.has(exp.id)) continue;
      if (isKilled(this.config, exp)) continue;
      if (isTimeGated(exp, now)) continue;
      if (!this.isTargeted(exp)) continue;
      candidates.push(exp.id);
    }
    return resolveMutex(userId, group, candidates);
  }

  private emit(event: EngineEvent): void {
    this.history.push(event);
    this.listeners.emit(event);
  }

  private handleError(error: Error, experimentId: string): string {
    const experiment = this.experimentIndex.get(experimentId);
    this.emit({ type: "error", error });
    return experiment?.default ?? "";
  }
}

function buildEvalContext(ctx: VariantContext): EvalContext {
  if (ctx.userId === undefined) return ctx;
  return { ...ctx, userIdBucket: bucketUserId(ctx.userId) };
}

function indexExperiments(config: ExperimentsConfig): Map<string, Experiment> {
  const map = new Map<string, Experiment>();
  for (const exp of config.experiments) map.set(exp.id, exp);
  return map;
}
