import { describe, it, expect } from "vitest";
import {
  insertRange,
  mergeAdjacentRanges,
  splitRange,
  shiftRangesAfter,
  adjustRangesForInsert,
  adjustRangesForDelete,
  removeEmptyRanges,
} from "../../src/core/RangeManager";
import { SourceType } from "../../src/types";
import type { AuthorshipRange } from "../../src/types";

function range(
  from: number,
  length: number,
  sourceType: SourceType = SourceType.SELF,
  authorName: string = "Self",
): AuthorshipRange {
  return { from, length, sourceType, authorName };
}

describe("insertRange", () => {
  it("inserts into empty array", () => {
    const result = insertRange([], range(0, 5));
    expect(result).toEqual([range(0, 5)]);
  });

  it("inserts in sorted order by from position", () => {
    const existing = [range(0, 3), range(10, 5)];
    const result = insertRange(existing, range(5, 3));
    expect(result).toEqual([range(0, 3), range(5, 3), range(10, 5)]);
  });

  it("inserts at beginning when from is smallest", () => {
    const existing = [range(5, 3)];
    const result = insertRange(existing, range(0, 3));
    expect(result).toEqual([range(0, 3), range(5, 3)]);
  });

  it("inserts at end when from is largest", () => {
    const existing = [range(0, 3)];
    const result = insertRange(existing, range(10, 5));
    expect(result).toEqual([range(0, 3), range(10, 5)]);
  });

  it("does not mutate the original array", () => {
    const existing = [range(0, 3)];
    const original = [...existing];
    insertRange(existing, range(5, 3));
    expect(existing).toEqual(original);
  });
});

describe("mergeAdjacentRanges", () => {
  it("returns empty array for empty input", () => {
    expect(mergeAdjacentRanges([])).toEqual([]);
  });

  it("returns single range unchanged", () => {
    const input = [range(0, 5)];
    expect(mergeAdjacentRanges(input)).toEqual(input);
  });

  it("merges two adjacent ranges with same source type and author", () => {
    const input = [range(0, 3), range(3, 5)];
    expect(mergeAdjacentRanges(input)).toEqual([range(0, 8)]);
  });

  it("does not merge ranges with different source types", () => {
    const input = [
      range(0, 3, SourceType.SELF),
      range(3, 5, SourceType.AI, "AI"),
    ];
    const result = mergeAdjacentRanges(input);
    expect(result).toHaveLength(2);
  });

  it("does not merge ranges with different author names", () => {
    const input = [
      range(0, 3, SourceType.SELF, "Alice"),
      range(3, 5, SourceType.SELF, "Bob"),
    ];
    const result = mergeAdjacentRanges(input);
    expect(result).toHaveLength(2);
  });

  it("does not merge non-adjacent ranges", () => {
    const input = [range(0, 3), range(5, 3)];
    expect(mergeAdjacentRanges(input)).toEqual(input);
  });

  it("merges multiple consecutive adjacent ranges", () => {
    const input = [range(0, 2), range(2, 3), range(5, 4)];
    expect(mergeAdjacentRanges(input)).toEqual([range(0, 9)]);
  });

  it("does not mutate input", () => {
    const input = [range(0, 3), range(3, 5)];
    const original = input.map((r) => ({ ...r }));
    mergeAdjacentRanges(input);
    expect(input).toEqual(original);
  });
});

describe("splitRange", () => {
  it("splits a range at a given position", () => {
    const r = range(0, 10, SourceType.AI, "AI");
    const [left, right] = splitRange(r, 4);
    expect(left).toEqual({ from: 0, length: 4, sourceType: SourceType.AI, authorName: "AI" });
    expect(right).toEqual({ from: 4, length: 6, sourceType: SourceType.AI, authorName: "AI" });
  });

  it("returns empty left when splitting at start", () => {
    const r = range(5, 10);
    const [left, right] = splitRange(r, 5);
    expect(left.length).toBe(0);
    expect(right).toEqual(range(5, 10));
  });

  it("returns empty right when splitting at end", () => {
    const r = range(5, 10);
    const [left, right] = splitRange(r, 15);
    expect(left).toEqual(range(5, 10));
    expect(right.length).toBe(0);
  });

  it("does not mutate original range", () => {
    const r = range(0, 10);
    const original = { ...r };
    splitRange(r, 5);
    expect(r).toEqual(original);
  });
});

describe("shiftRangesAfter", () => {
  it("shifts ranges after the given position", () => {
    const input = [range(0, 3), range(5, 3), range(10, 5)];
    const result = shiftRangesAfter(input, 4, 2);
    expect(result).toEqual([range(0, 3), range(7, 3), range(12, 5)]);
  });

  it("does not shift ranges before the position", () => {
    const input = [range(0, 3), range(10, 5)];
    const result = shiftRangesAfter(input, 5, 3);
    expect(result).toEqual([range(0, 3), range(13, 5)]);
  });

  it("handles negative shift (deletion)", () => {
    const input = [range(0, 3), range(10, 5)];
    const result = shiftRangesAfter(input, 5, -2);
    expect(result).toEqual([range(0, 3), range(8, 5)]);
  });

  it("returns same array when shift is 0", () => {
    const input = [range(0, 3)];
    const result = shiftRangesAfter(input, 0, 0);
    expect(result).toEqual(input);
  });
});

describe("adjustRangesForInsert", () => {
  it("extends a range when inserting inside it with same source", () => {
    const input = [range(0, 10)];
    const result = adjustRangesForInsert(input, 5, 3, SourceType.SELF, "Self");
    expect(result).toEqual([range(0, 13)]);
  });

  it("splits a range when inserting inside with different source", () => {
    const input = [range(0, 10, SourceType.AI, "AI")];
    const result = adjustRangesForInsert(
      input, 5, 3, SourceType.SELF, "Self",
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ from: 0, length: 5, sourceType: SourceType.AI, authorName: "AI" });
    expect(result[1]).toEqual({ from: 5, length: 3, sourceType: SourceType.SELF, authorName: "Self" });
    expect(result[2]).toEqual({ from: 8, length: 5, sourceType: SourceType.AI, authorName: "AI" });
  });

  it("appends at the end of ranges", () => {
    const input = [range(0, 5)];
    const result = adjustRangesForInsert(input, 5, 3, SourceType.SELF, "Self");
    expect(result).toEqual([range(0, 8)]);
  });

  it("creates new range when no existing range contains position", () => {
    const input = [range(0, 3)];
    const result = adjustRangesForInsert(input, 5, 3, SourceType.SELF, "Self");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(range(5, 3));
  });
});

describe("adjustRangesForDelete", () => {
  it("shrinks a range when deleting inside it", () => {
    const input = [range(0, 10)];
    const result = adjustRangesForDelete(input, 3, 4);
    expect(result).toEqual([range(0, 6)]);
  });

  it("removes a range entirely when deleting covers it", () => {
    const input = [range(2, 3)];
    const result = adjustRangesForDelete(input, 0, 10);
    expect(result).toEqual([]);
  });

  it("shifts ranges after deletion point", () => {
    const input = [range(0, 3), range(10, 5)];
    const result = adjustRangesForDelete(input, 5, 3);
    expect(result).toEqual([range(0, 3), range(7, 5)]);
  });

  it("handles deletion that partially overlaps range start", () => {
    const input = [range(5, 10)];
    const result = adjustRangesForDelete(input, 3, 4);
    expect(result).toEqual([range(3, 8)]);
  });

  it("handles deletion that partially overlaps range end", () => {
    const input = [range(0, 10)];
    const result = adjustRangesForDelete(input, 7, 5);
    expect(result).toEqual([range(0, 7)]);
  });
});

describe("removeEmptyRanges", () => {
  it("removes ranges with zero length", () => {
    const input = [range(0, 5), range(5, 0), range(10, 3)];
    expect(removeEmptyRanges(input)).toEqual([range(0, 5), range(10, 3)]);
  });

  it("returns empty array when all ranges are empty", () => {
    expect(removeEmptyRanges([range(0, 0)])).toEqual([]);
  });

  it("returns same array when no ranges are empty", () => {
    const input = [range(0, 5)];
    expect(removeEmptyRanges(input)).toEqual(input);
  });
});
