import { describe, it, expect } from "vitest";
import { computeHash, validateHash } from "../../src/core/HashValidator";

describe("computeHash", () => {
  it("computes hash for simple text", async () => {
    const result = await computeHash("hello");
    expect(result.algorithm).toBe("SHA-256");
    expect(result.textRange).toEqual({ from: 0, length: 5 });
    expect(result.hash).toHaveLength(32);
    expect(result.hash).toMatch(/^[0-9a-f]+$/);
  });

  it("computes hash for empty text", async () => {
    const result = await computeHash("");
    expect(result.textRange).toEqual({ from: 0, length: 0 });
    expect(result.hash).toHaveLength(32);
  });

  it("counts grapheme length for emoji text", async () => {
    const result = await computeHash("a👍b");
    expect(result.textRange).toEqual({ from: 0, length: 3 });
  });

  it("uses custom truncation length", async () => {
    const result = await computeHash("test", 24);
    expect(result.hash).toHaveLength(24);
  });
});

describe("validateHash", () => {
  it("returns true for matching hash", async () => {
    const hash = await computeHash("hello world");
    const valid = await validateHash("hello world", hash);
    expect(valid).toBe(true);
  });

  it("returns false for non-matching hash", async () => {
    const hash = await computeHash("hello world");
    const valid = await validateHash("different text", hash);
    expect(valid).toBe(false);
  });

  it("validates with truncated hash", async () => {
    const hash = await computeHash("test", 20);
    expect(hash.hash).toHaveLength(20);
    const valid = await validateHash("test", hash);
    expect(valid).toBe(true);
  });
});
