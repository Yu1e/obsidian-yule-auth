import { describe, it, expect } from "vitest";
import { loadAnnotations, saveAnnotations } from "../../src/annotations/AnnotationStore";
import { SourceType } from "../../src/types";
import type { AuthorshipRange } from "../../src/types";

describe("loadAnnotations", () => {
  it("returns empty ranges for plain markdown", async () => {
    const result = await loadAnnotations("Just some text.");
    expect(result.body).toBe("Just some text.");
    expect(result.ranges).toEqual([]);
    expect(result.hasAnnotations).toBe(false);
    expect(result.hashValid).toBe(true);
  });

  it("parses a file with valid annotations", async () => {
    const body = "Hello world.";
    const saved = await saveAnnotations(body, [
      { from: 0, length: 5, sourceType: SourceType.SELF, authorName: "Self" },
      { from: 5, length: 7, sourceType: SourceType.AI, authorName: "AI" },
    ]);

    const result = await loadAnnotations(saved);
    expect(result.hasAnnotations).toBe(true);
    expect(result.hashValid).toBe(true);
    expect(result.body).toBe("Hello world.");
    expect(result.ranges).toHaveLength(2);
  });

  it("detects hash mismatch when body is modified", async () => {
    const body = "Hello world.";
    const saved = await saveAnnotations(body, [
      { from: 0, length: 12, sourceType: SourceType.SELF, authorName: "Self" },
    ]);

    const tampered = saved.replace("Hello world.", "Tampered text");
    const result = await loadAnnotations(tampered);
    expect(result.hasAnnotations).toBe(true);
    expect(result.hashValid).toBe(false);
  });
});

describe("saveAnnotations", () => {
  it("returns body unchanged when no ranges", async () => {
    const result = await saveAnnotations("Hello.", []);
    expect(result).toBe("Hello.");
  });

  it("appends annotation block to body", async () => {
    const ranges: AuthorshipRange[] = [
      { from: 0, length: 5, sourceType: SourceType.SELF, authorName: "Self" },
    ];

    const result = await saveAnnotations("Hello", ranges);
    expect(result).toContain("Hello");
    expect(result).toContain("---");
    expect(result).toContain("Annotations:");
    expect(result).toContain("@Self:");
    expect(result).toContain("...");
  });

  it("produces round-trippable output", async () => {
    const body = "Some text here for testing.";
    const ranges: AuthorshipRange[] = [
      { from: 0, length: 10, sourceType: SourceType.SELF, authorName: "Self" },
      { from: 10, length: 16, sourceType: SourceType.AI, authorName: "AI" },
    ];

    const saved = await saveAnnotations(body, ranges);
    const loaded = await loadAnnotations(saved);

    expect(loaded.body).toBe(body);
    expect(loaded.hashValid).toBe(true);
    expect(loaded.ranges).toHaveLength(2);
    expect(loaded.ranges[0].from).toBe(0);
    expect(loaded.ranges[0].length).toBe(10);
    expect(loaded.ranges[1].from).toBe(10);
    expect(loaded.ranges[1].length).toBe(16);
  });
});
