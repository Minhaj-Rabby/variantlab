import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { isTimeGated } from "../time-gate.js";

const base: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "a",
  variants: [{ id: "a" }, { id: "b" }],
};

const T_2020 = Date.parse("2020-01-01T00:00:00Z");
const T_2023 = Date.parse("2023-01-01T00:00:00Z");
const T_2026 = Date.parse("2026-01-01T00:00:00Z");

describe("isTimeGated", () => {
  it("is false when no dates are set", () => {
    expect(isTimeGated(base, T_2023)).toBe(false);
  });

  it("is true when now is before startDate", () => {
    expect(isTimeGated({ ...base, startDate: "2023-01-01T00:00:00Z" }, T_2020)).toBe(true);
  });

  it("is false when now equals startDate (inclusive start)", () => {
    expect(isTimeGated({ ...base, startDate: "2023-01-01T00:00:00Z" }, T_2023)).toBe(false);
  });

  it("is false when now is after startDate", () => {
    expect(isTimeGated({ ...base, startDate: "2023-01-01T00:00:00Z" }, T_2026)).toBe(false);
  });

  it("is true when now is past endDate (exclusive end)", () => {
    expect(isTimeGated({ ...base, endDate: "2023-01-01T00:00:00Z" }, T_2023)).toBe(true);
  });

  it("is false when now is before endDate", () => {
    expect(isTimeGated({ ...base, endDate: "2023-01-01T00:00:00Z" }, T_2020)).toBe(false);
  });

  it("is false within a start/end window", () => {
    expect(
      isTimeGated(
        { ...base, startDate: "2020-01-01T00:00:00Z", endDate: "2026-01-01T00:00:00Z" },
        T_2023,
      ),
    ).toBe(false);
  });

  it("is true for a malformed startDate (fails closed)", () => {
    expect(isTimeGated({ ...base, startDate: "not-a-date" }, T_2023)).toBe(true);
  });

  it("is true for a malformed endDate (fails closed)", () => {
    expect(isTimeGated({ ...base, endDate: "not-a-date" }, T_2023)).toBe(true);
  });
});
