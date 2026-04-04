import { describe, it, expect } from "vitest";
import { computeAuthorStats } from "../../src/editor/AuthorshipDecorator";
import { SourceType } from "../../src/types";
import type { AuthorshipRange } from "../../src/types";

describe("computeAuthorStats", () => {
  it("computes stats for multiple authors", () => {
    const ranges: AuthorshipRange[] = [
      { from: 0, length: 50, sourceType: SourceType.SELF, authorName: "Self" },
      { from: 50, length: 30, sourceType: SourceType.AI, authorName: "AI" },
      { from: 80, length: 20, sourceType: SourceType.SELF, authorName: "Self" },
    ];

    const stats = computeAuthorStats(ranges);
    expect(stats).toHaveLength(2);

    const selfStats = stats.find((s) => s.authorName === "Self");
    expect(selfStats!.charCount).toBe(70);

    const aiStats = stats.find((s) => s.authorName === "AI");
    expect(aiStats!.charCount).toBe(30);
  });

  it("returns empty array for no ranges", () => {
    expect(computeAuthorStats([])).toEqual([]);
  });

  it("sorts by charCount descending", () => {
    const ranges: AuthorshipRange[] = [
      { from: 0, length: 10, sourceType: SourceType.SELF, authorName: "Self" },
      { from: 10, length: 90, sourceType: SourceType.AI, authorName: "AI" },
    ];

    const stats = computeAuthorStats(ranges);
    expect(stats[0].authorName).toBe("AI");
    expect(stats[1].authorName).toBe("Self");
  });

  it("separates same source type with different author names", () => {
    const ranges: AuthorshipRange[] = [
      { from: 0, length: 10, sourceType: SourceType.SELF, authorName: "Alice" },
      { from: 10, length: 20, sourceType: SourceType.SELF, authorName: "Bob" },
    ];

    const stats = computeAuthorStats(ranges);
    expect(stats).toHaveLength(2);
  });
});
