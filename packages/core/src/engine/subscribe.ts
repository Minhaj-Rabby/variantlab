/**
 * Listener set for engine events.
 *
 * Iteration copies the underlying Set so that a listener that
 * unsubscribes itself (or another listener) during emission doesn't
 * skip the next listener. Errors thrown inside a listener are
 * swallowed — one bad subscriber must not break the engine for
 * everyone else.
 */
import type { EngineEvent } from "../history/events.js";

export type Listener = (event: EngineEvent) => void;

export class ListenerSet {
  private readonly listeners = new Set<Listener>();

  add(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: EngineEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch {
        // Intentional: see file header.
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get size(): number {
    return this.listeners.size;
  }
}
