import { describe, expect, it } from "vitest";

import { computeNextDueDate } from "@/lib/compliance";

describe("computeNextDueDate", () => {
  it("adds interval months", () => {
    expect(computeNextDueDate("2026-01-01", 72)).toBe("2032-01-01");
  });
});
