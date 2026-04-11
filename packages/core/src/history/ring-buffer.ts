/**
 * Fixed-size ring buffer for engine event history.
 *
 * Overwrites the oldest entry when full. `toArray()` returns the
 * stored entries in chronological order (oldest → newest) which is
 * the order the debug overlay and time-travel replayer expect.
 *
 * Default capacity is 500 — at ~200 bytes per event this caps
 * in-memory history at ~100 KB per engine, which is negligible
 * compared to any other memory cost the app already pays.
 */
export class RingBuffer<T> {
  readonly capacity: number;
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;

  constructor(capacity = 500) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("RingBuffer capacity must be a positive integer");
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    const out: T[] = [];
    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(start + i) % this.capacity];
      if (item !== undefined) out.push(item);
    }
    return out;
  }

  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }
}
