import { describe, it, expect } from "vitest";
import { isValidProKey } from "../lib/pro-key";

describe("isValidProKey", () => {
  it("accepts well-formed Pro keys", () => {
    expect(isValidProKey("2026-06-13/ETH/pro.html")).toBe(true);
    expect(isValidProKey("2026-06-13/AAPL/pro.pdf")).toBe(true);
    expect(isValidProKey("2026-06-13/SOL_2/pro.pdf")).toBe(true);
  });

  it("rejects path traversal", () => {
    expect(isValidProKey("../secret")).toBe(false);
    expect(isValidProKey("2026-06-13/ETH/../../etc/passwd")).toBe(false);
    expect(isValidProKey("..%2f..%2fetc")).toBe(false);
  });

  it("rejects non-Pro files and wrong shapes", () => {
    expect(isValidProKey("2026-06-13/ETH/free.html")).toBe(false);
    expect(isValidProKey("2026-06-13/ETH/pro.exe")).toBe(false);
    expect(isValidProKey("2026-06-13/ETH/metadata.json")).toBe(false);
    expect(isValidProKey("notadate/ETH/pro.html")).toBe(false);
    expect(isValidProKey("2026-06-13/ETH/pro.html?x=1")).toBe(false);
    expect(isValidProKey("2026-06-13/ET H/pro.pdf")).toBe(false);
    expect(isValidProKey("")).toBe(false);
  });
});
