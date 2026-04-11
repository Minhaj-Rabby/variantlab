import { describe, expect, it } from "vitest";
import { CrashCounter } from "../crash-counter.js";

describe("CrashCounter", () => {
  it("starts at zero for any experiment", () => {
    const c = new CrashCounter();
    expect(c.countWithin("exp", 1000, 60000)).toBe(0);
  });

  it("counts crashes within a window", () => {
    const c = new CrashCounter();
    expect(c.record("exp", 1000, 60000)).toBe(1);
    expect(c.record("exp", 2000, 60000)).toBe(2);
    expect(c.record("exp", 3000, 60000)).toBe(3);
  });

  it("drops expired crashes as time advances", () => {
    const c = new CrashCounter();
    c.record("exp", 1000, 60000);
    c.record("exp", 2000, 60000);
    // Window of 500ms centered at now=3000 drops both.
    expect(c.countWithin("exp", 3000, 500)).toBe(0);
  });

  it("keeps in-window crashes while dropping older ones", () => {
    const c = new CrashCounter();
    c.record("exp", 1000, 60000);
    c.record("exp", 5000, 60000);
    c.record("exp", 10000, 60000);
    // Only the last two are within 6000ms of now=11000.
    expect(c.countWithin("exp", 11000, 6000)).toBe(2);
  });

  it("tracks experiments independently", () => {
    const c = new CrashCounter();
    c.record("a", 1000, 60000);
    c.record("b", 1000, 60000);
    c.record("b", 2000, 60000);
    expect(c.countWithin("a", 2000, 60000)).toBe(1);
    expect(c.countWithin("b", 2000, 60000)).toBe(2);
  });

  it("clear() removes all or one experiment's crashes", () => {
    const c = new CrashCounter();
    c.record("a", 1000, 60000);
    c.record("b", 1000, 60000);
    c.clear("a");
    expect(c.countWithin("a", 2000, 60000)).toBe(0);
    expect(c.countWithin("b", 2000, 60000)).toBe(1);
    c.clear();
    expect(c.countWithin("b", 2000, 60000)).toBe(0);
  });
});
