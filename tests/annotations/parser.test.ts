import { describe, it, expect } from "vitest";
import { parseAnnotationBlock, extractAnnotationBlock } from "../../src/annotations/AnnotationParser";
import { SourceType } from "../../src/types";

describe("extractAnnotationBlock", () => {
  it("extracts annotation block from end of text", () => {
    const text = `Some text here.

---
Annotations: 0,15 SHA-256 abc123def456789012345678
@Self: 0,15
...`;
    const result = extractAnnotationBlock(text);
    expect(result).not.toBeNull();
    expect(result!.body).toBe("Some text here.");
    expect(result!.annotationRaw).toContain("Annotations:");
  });

  it("returns null when no annotation block exists", () => {
    const text = "Just plain markdown with no annotations.";
    expect(extractAnnotationBlock(text)).toBeNull();
  });

  it("handles text with frontmatter and annotation block", () => {
    const text = `---
title: Test
---

Hello world.

---
Annotations: 0,12 SHA-256 abc123def456789012345678
@Self: 0,12
...`;
    const result = extractAnnotationBlock(text);
    expect(result).not.toBeNull();
    expect(result!.body).toContain("Hello world.");
    expect(result!.body).toContain("title: Test");
  });

  it("returns correct body without trailing newlines before block", () => {
    const text = `Content here.

---
Annotations: 0,13 SHA-256 abc123def456789012345678
@Self: 0,13
...`;
    const result = extractAnnotationBlock(text);
    expect(result!.body).toBe("Content here.");
  });

  it("handles annotation block with no trailing newline", () => {
    const text = `Text.

---
Annotations: 0,5 SHA-256 abc123def456789012345678
@Self: 0,5
...`;
    const result = extractAnnotationBlock(text);
    expect(result).not.toBeNull();
  });
});

describe("parseAnnotationBlock", () => {
  it("parses a simple annotation block with one author", () => {
    const raw = `Annotations: 0,15 SHA-256 abc123def456789012345678
@Self: 0,15`;

    const result = parseAnnotationBlock(raw);
    expect(result).not.toBeNull();
    expect(result!.hash.algorithm).toBe("SHA-256");
    expect(result!.hash.hash).toBe("abc123def456789012345678");
    expect(result!.hash.textRange).toEqual({ from: 0, length: 15 });
    expect(result!.authors).toHaveLength(1);
    expect(result!.authors[0].author.prefix).toBe("@");
    expect(result!.authors[0].author.name).toBe("Self");
    expect(result!.authors[0].ranges).toEqual([{ from: 0, length: 15 }]);
  });

  it("parses multiple authors", () => {
    const raw = `Annotations: 0,95 SHA-256 1132bf5e376a605f5beed4b204456114
@Human: 0,20 33,4 45,6 62,4
&AI: 20,13 37,8 51,11 66,29`;

    const result = parseAnnotationBlock(raw);
    expect(result).not.toBeNull();
    expect(result!.authors).toHaveLength(2);
    expect(result!.authors[0].author.prefix).toBe("@");
    expect(result!.authors[0].author.name).toBe("Human");
    expect(result!.authors[0].ranges).toHaveLength(4);
    expect(result!.authors[1].author.prefix).toBe("&");
    expect(result!.authors[1].author.name).toBe("AI");
    expect(result!.authors[1].ranges).toHaveLength(4);
  });

  it("parses reference material author", () => {
    const raw = `Annotations: 0,20 SHA-256 abcdef01234567890123
*Wikipedia: 5,10`;

    const result = parseAnnotationBlock(raw);
    expect(result!.authors[0].author.prefix).toBe("*");
    expect(result!.authors[0].author.name).toBe("Wikipedia");
  });

  it("parses ranges with no length (defaults to 1)", () => {
    const raw = `Annotations: 0,20 SHA-256 abcdef01234567890123
@Self: 5`;

    const result = parseAnnotationBlock(raw);
    expect(result!.authors[0].ranges).toEqual([{ from: 5, length: 1 }]);
  });

  it("parses hash annotation with truncated hash", () => {
    const raw = `Annotations: 0,100 SHA-256 1132bf5e376a605f5bee
@Self: 0,100`;

    const result = parseAnnotationBlock(raw);
    expect(result!.hash.hash).toBe("1132bf5e376a605f5bee");
  });

  it("returns null for invalid annotation block", () => {
    expect(parseAnnotationBlock("not an annotation")).toBeNull();
  });

  it("returns null for missing hash line", () => {
    expect(parseAnnotationBlock("@Self: 0,10")).toBeNull();
  });
});
