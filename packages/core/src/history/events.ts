/**
 * Discriminated union of engine events.
 *
 * Mirrors `API.md` §`EngineEvent`. Stored in the in-memory history
 * ring buffer and emitted to `subscribe()` listeners. Time-travel
 * replay (phase 4) reuses this exact shape.
 */
import type { ExperimentsConfig, VariantContext } from "../config/types.js";

export type EngineEvent =
  | { readonly type: "ready"; readonly config: ExperimentsConfig }
  | {
      readonly type: "assignment";
      readonly experimentId: string;
      readonly variantId: string;
      readonly context: VariantContext;
    }
  | { readonly type: "exposure"; readonly experimentId: string; readonly variantId: string }
  | {
      readonly type: "variantChanged";
      readonly experimentId: string;
      readonly variantId: string;
      readonly source: "user" | "system" | "deeplink" | "qr";
    }
  | {
      readonly type: "rollback";
      readonly experimentId: string;
      readonly variantId: string;
      readonly reason: string;
    }
  | { readonly type: "configLoaded"; readonly config: ExperimentsConfig }
  | { readonly type: "contextUpdated"; readonly context: VariantContext }
  | { readonly type: "error"; readonly error: Error };
