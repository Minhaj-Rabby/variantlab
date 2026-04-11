/**
 * `createEngine` — preferred factory over `new VariantEngine()`.
 *
 * The factory validates + deep-freezes the config before instantiation
 * so that callers don't have to remember the two-step dance. The
 * options bag is passed through untouched.
 */
import { validateConfig } from "../config/validator.js";
import { type EngineOptions, VariantEngine } from "./engine.js";

export function createEngine(config: unknown, options: EngineOptions = {}): VariantEngine {
  return new VariantEngine(validateConfig(config), options);
}
