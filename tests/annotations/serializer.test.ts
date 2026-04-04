import { describe, it, expect } from "vitest";
import { serializeAnnotationBlock } from "../../src/annotations/AnnotationSerializer";
import { SourceType, SOURCE_PREFIX } from "../../src/types";
import type { AnnotationBlock, AuthorAnnotation } from "../../src/types";

function makeBlock(overrides?: Partial<AnnotationBlock>): AnnotationBlock {
  return {
    hash: {
      textRange: { from: 0, length: 15 },
      algorithm: "SHA-256",
      hash: "abc123def456789012345678",
    },
    authors: [
      {
        author: { name: "Self", prefix: SOURCE_PREFIX.HUMAN },
        ranges: [{ from: 0, length: 15 }],
      },
    ],
    ...overrides,
  };
}

describe("serializeAnnotationBlock", () => {
  it("serializes a simple block", () => {
    const block = makeBlock();
    const result = serializeAnnotationBlock(block);
    expect(result).toContain("---");
    expect(result).toContain("...");
    expect(result).toContain("Annotations: 0,15 SHA-256 abc123def456789012345678");
    expect(result).toContain("@Self: 0,15");
  });

  it("serializes multiple authors", () => {
    const authors: AuthorAnnotation[] = [
      {
        author: { name: "Human", prefix: SOURCE_PREFIX.HUMAN },
        ranges: [
          { from: 0, length: 20 },
          { from: 33, length: 4 },
        ],
      },
      {
        author: { name: "AI", prefix: SOURCE_PREFIX.AI },
        ranges: [
          { from: 20, length: 13 },
          { from: 37, length: 8 },
        ],
      },
    ];
    const block = makeBlock({
      hash: {
        textRange: { from: 0, length: 95 },
        algorithm: "SHA-256",
        hash: "1132bf5e376a605f5beed4b204456114",
      },
      authors,
    });
    const result = serializeAnnotationBlock(block);
    expect(result).toContain("@Human: 0,20 33,4");
    expect(result).toContain("&AI: 20,13 37,8");
  });

  it("serializes reference material with * prefix", () => {
    const block = makeBlock({
      authors: [
        {
          author: { name: "Wikipedia", prefix: SOURCE_PREFIX.REFERENCE },
          ranges: [{ from: 5, length: 10 }],
        },
      ],
    });
    const result = serializeAnnotationBlock(block);
    expect(result).toContain("*Wikipedia: 5,10");
  });

  it("omits length when it equals 1", () => {
    const block = makeBlock({
      authors: [
        {
          author: { name: "Self", prefix: SOURCE_PREFIX.HUMAN },
          ranges: [{ from: 5, length: 1 }],
        },
      ],
    });
    const result = serializeAnnotationBlock(block);
    expect(result).toContain("@Self: 5");
    expect(result).not.toContain("5,1");
  });

  it("starts with --- and ends with ...", () => {
    const result = serializeAnnotationBlock(makeBlock());
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("...");
  });

  it("has hash annotation as first line after ---", () => {
    const result = serializeAnnotationBlock(makeBlock());
    const lines = result.split("\n");
    expect(lines[1]).toMatch(/^Annotations:/);
  });
});
