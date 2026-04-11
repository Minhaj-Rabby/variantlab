import { describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../../history/events.js";
import { ListenerSet } from "../subscribe.js";

const err: EngineEvent = { type: "error", error: new Error("boom") };

describe("ListenerSet", () => {
  it("calls subscribers on emit", () => {
    const set = new ListenerSet();
    const fn = vi.fn();
    set.add(fn);
    set.emit(err);
    expect(fn).toHaveBeenCalledWith(err);
  });

  it("unsubscribes correctly", () => {
    const set = new ListenerSet();
    const fn = vi.fn();
    const unsubscribe = set.add(fn);
    unsubscribe();
    set.emit(err);
    expect(fn).not.toHaveBeenCalled();
  });

  it("allows a listener to unsubscribe itself during emission without skipping siblings", () => {
    const set = new ListenerSet();
    const seen: number[] = [];
    const unsub1 = set.add(() => {
      seen.push(1);
      unsub1();
    });
    set.add(() => {
      seen.push(2);
    });
    set.emit(err);
    expect(seen).toEqual([1, 2]);
  });

  it("swallows listener errors so one bad listener doesn't break others", () => {
    const set = new ListenerSet();
    const good = vi.fn();
    set.add(() => {
      throw new Error("bad listener");
    });
    set.add(good);
    expect(() => set.emit(err)).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it("clear() removes all listeners", () => {
    const set = new ListenerSet();
    const fn = vi.fn();
    set.add(fn);
    set.clear();
    set.emit(err);
    expect(fn).not.toHaveBeenCalled();
    expect(set.size).toBe(0);
  });

  it("exposes size", () => {
    const set = new ListenerSet();
    expect(set.size).toBe(0);
    set.add(() => {});
    expect(set.size).toBe(1);
  });
});
