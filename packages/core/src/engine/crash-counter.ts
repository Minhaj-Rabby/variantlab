/**
 * In-memory crash counter for crash-rollback.
 *
 * For each experiment, we maintain a sliding window of crash
 * timestamps. `record()` appends, `countWithin()` drops expired
 * entries and returns the current count. Persistence across
 * process restarts is phase 4 (`rollback.persistent`) — the phase 1
 * MVP only protects users within a single session.
 */
export class CrashCounter {
  private readonly crashes = new Map<string, number[]>();

  /** Record a crash; returns the new in-window count (post-prune). */
  record(experimentId: string, now: number, window: number): number {
    const list = this.crashes.get(experimentId) ?? [];
    list.push(now);
    this.crashes.set(experimentId, list);
    return this.countWithin(experimentId, now, window);
  }

  countWithin(experimentId: string, now: number, window: number): number {
    const list = this.crashes.get(experimentId);
    if (list === undefined) return 0;
    const cutoff = now - window;
    let i = 0;
    while (i < list.length && (list[i] ?? 0) < cutoff) i++;
    if (i > 0) list.splice(0, i);
    return list.length;
  }

  clear(experimentId?: string): void {
    if (experimentId === undefined) this.crashes.clear();
    else this.crashes.delete(experimentId);
  }
}
