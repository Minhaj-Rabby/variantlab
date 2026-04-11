import { describe, expect, it } from "vitest";
import { RingBuffer } from "../index.js";

describe("RingBuffer", () => {
  it("stores items up to capacity in order", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
  });

  it("overwrites oldest when capacity is exceeded", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    buf.push(5);
    expect(buf.size).toBe(3);
    expect(buf.toArray()).toEqual([3, 4, 5]);
  });

  it("returns entries in chronological order after wrap-around", () => {
    const buf = new RingBuffer<number>(4);
    for (let i = 1; i <= 10; i++) buf.push(i);
    expect(buf.toArray()).toEqual([7, 8, 9, 10]);
  });

  it("starts empty and stays empty until first push", () => {
    const buf = new RingBuffer<number>(5);
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it("clear() resets size and contents", () => {
    const buf = new RingBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
    buf.push(99);
    expect(buf.toArray()).toEqual([99]);
  });

  it("exposes capacity on the instance", () => {
    expect(new RingBuffer(42).capacity).toBe(42);
  });

  it("throws on non-positive capacity", () => {
    expect(() => new RingBuffer(0)).toThrow();
    expect(() => new RingBuffer(-1)).toThrow();
  });

  it("throws on non-integer capacity", () => {
    expect(() => new RingBuffer(1.5)).toThrow();
  });

  it("has a default capacity of 500", () => {
    const buf = new RingBuffer<number>();
    expect(buf.capacity).toBe(500);
  });

  it("stores objects and returns stable references", () => {
    const buf = new RingBuffer<{ n: number }>(2);
    const a = { n: 1 };
    buf.push(a);
    expect(buf.toArray()[0]).toBe(a);
  });
});
