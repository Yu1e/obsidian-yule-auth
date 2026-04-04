import { describe, it, expect } from "vitest";
import { classifyTransaction } from "../../src/editor/InputDetector";
import { SourceType } from "../../src/types";

function mockTransaction(userEvent: string | null, docChanged = true) {
  return {
    docChanged,
    isUserEvent(event: string): boolean {
      if (!userEvent) return false;
      return userEvent === event || userEvent.startsWith(event + ".");
    },
  } as any;
}

describe("classifyTransaction", () => {
  it("returns null when document did not change", () => {
    const tr = mockTransaction("input.type", false);
    expect(classifyTransaction(tr, SourceType.PASTED)).toBeNull();
  });

  it("classifies typed input as SELF", () => {
    const tr = mockTransaction("input.type");
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.SELF);
  });

  it("classifies paste as the default paste source", () => {
    const tr = mockTransaction("input.paste");
    expect(classifyTransaction(tr, SourceType.AI)).toBe(SourceType.AI);
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.PASTED);
  });

  it("classifies composition input as SELF", () => {
    const tr = mockTransaction("input.type.compose");
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.SELF);
  });

  it("classifies drop as the default paste source", () => {
    const tr = mockTransaction("input.drop");
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.PASTED);
  });

  it("defaults unknown input events to SELF", () => {
    const tr = mockTransaction("some.other.event");
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.SELF);
  });

  it("defaults no user event to SELF", () => {
    const tr = mockTransaction(null);
    expect(classifyTransaction(tr, SourceType.PASTED)).toBe(SourceType.SELF);
  });
});
