import { describe, it, expect } from "vitest";
import {
  buildSegmentMap,
  utf16ToGrapheme,
  graphemeToUtf16,
  graphemeLength,
  graphemeSlice,
} from "../../src/utils/grapheme";

describe("buildSegmentMap", () => {
  it("returns offsets for ASCII text", () => {
    const map = buildSegmentMap("hello");
    expect(map).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns empty array for empty string", () => {
    expect(buildSegmentMap("")).toEqual([]);
  });

  it("handles emoji as single grapheme cluster", () => {
    const map = buildSegmentMap("a👍b");
    expect(map).toHaveLength(3);
    expect(map[0]).toBe(0);
    expect(map[2]).toBe(3);
  });

  it("handles compound emoji (family) as single grapheme", () => {
    const map = buildSegmentMap("x👨‍👩‍👧y");
    expect(map).toHaveLength(3);
    expect(map[0]).toBe(0);
    expect(map[1]).toBe(1);
    expect(map[2]).toBe(1 + "👨‍👩‍👧".length);
  });

  it("handles accented characters with combining marks", () => {
    const text = "e\u0301";
    const map = buildSegmentMap(text);
    expect(map).toHaveLength(1);
    expect(map[0]).toBe(0);
  });

  it("handles CJK characters", () => {
    const map = buildSegmentMap("你好世界");
    expect(map).toEqual([0, 1, 2, 3]);
  });
});

describe("utf16ToGrapheme", () => {
  it("returns same position for ASCII text", () => {
    const map = buildSegmentMap("hello");
    expect(utf16ToGrapheme(map, 0)).toBe(0);
    expect(utf16ToGrapheme(map, 3)).toBe(3);
    expect(utf16ToGrapheme(map, 5)).toBe(5);
  });

  it("converts position after emoji correctly", () => {
    const text = "a👍b";
    const map = buildSegmentMap(text);
    expect(utf16ToGrapheme(map, 0)).toBe(0);
    expect(utf16ToGrapheme(map, 1)).toBe(1);
    expect(utf16ToGrapheme(map, 3)).toBe(2);
  });

  it("handles position at end of text", () => {
    const text = "abc";
    const map = buildSegmentMap(text);
    expect(utf16ToGrapheme(map, 3)).toBe(3);
  });

  it("handles position 0 on empty text", () => {
    const map = buildSegmentMap("");
    expect(utf16ToGrapheme(map, 0)).toBe(0);
  });
});

describe("graphemeToUtf16", () => {
  it("returns same position for ASCII text", () => {
    const map = buildSegmentMap("hello");
    expect(graphemeToUtf16(map, 0)).toBe(0);
    expect(graphemeToUtf16(map, 3)).toBe(3);
    expect(graphemeToUtf16(map, 5)).toBe(5);
  });

  it("converts position after emoji correctly", () => {
    const text = "a👍b";
    const map = buildSegmentMap(text);
    expect(graphemeToUtf16(map, 0)).toBe(0);
    expect(graphemeToUtf16(map, 1)).toBe(1);
    expect(graphemeToUtf16(map, 2)).toBe(3);
  });

  it("handles position at end of text", () => {
    const text = "a👍b";
    const map = buildSegmentMap(text);
    expect(graphemeToUtf16(map, 3)).toBe(4);
  });
});

describe("graphemeLength", () => {
  it("returns character count for ASCII", () => {
    expect(graphemeLength("hello")).toBe(5);
  });

  it("counts emoji as one", () => {
    expect(graphemeLength("a👍b")).toBe(3);
  });

  it("counts compound emoji as one", () => {
    expect(graphemeLength("👨‍👩‍👧")).toBe(1);
  });

  it("returns 0 for empty string", () => {
    expect(graphemeLength("")).toBe(0);
  });

  it("counts combining marks as part of base character", () => {
    expect(graphemeLength("e\u0301")).toBe(1);
  });
});

describe("graphemeSlice", () => {
  it("slices ASCII like normal substring", () => {
    expect(graphemeSlice("hello", 1, 3)).toBe("el");
  });

  it("slices around emoji correctly", () => {
    const text = "a👍b";
    expect(graphemeSlice(text, 0, 1)).toBe("a");
    expect(graphemeSlice(text, 1, 2)).toBe("👍");
    expect(graphemeSlice(text, 2, 3)).toBe("b");
  });

  it("slices from start when from is 0", () => {
    expect(graphemeSlice("abc", 0, 2)).toBe("ab");
  });

  it("slices to end when to equals length", () => {
    expect(graphemeSlice("abc", 1, 3)).toBe("bc");
  });

  it("returns empty string for equal from and to", () => {
    expect(graphemeSlice("abc", 1, 1)).toBe("");
  });
});
