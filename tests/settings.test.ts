import { describe, it, expect } from "vitest";
import { updateSettings, isValidSourceType } from "../src/settings";
import { DEFAULT_SETTINGS, SourceType } from "../src/types";

describe("updateSettings", () => {
  it("returns new object with updated fields", () => {
    const result = updateSettings(DEFAULT_SETTINGS, { enabled: false });
    expect(result.enabled).toBe(false);
    expect(result.selfAuthorName).toBe(DEFAULT_SETTINGS.selfAuthorName);
  });

  it("does not mutate original settings", () => {
    const original = { ...DEFAULT_SETTINGS };
    updateSettings(DEFAULT_SETTINGS, { enabled: false });
    expect(DEFAULT_SETTINGS).toEqual(original);
  });

  it("applies multiple updates", () => {
    const result = updateSettings(DEFAULT_SETTINGS, {
      enabled: false,
      selfAuthorName: "Alice",
    });
    expect(result.enabled).toBe(false);
    expect(result.selfAuthorName).toBe("Alice");
  });
});

describe("isValidSourceType", () => {
  it("returns true for valid source types", () => {
    expect(isValidSourceType("self")).toBe(true);
    expect(isValidSourceType("ai")).toBe(true);
    expect(isValidSourceType("pasted")).toBe(true);
    expect(isValidSourceType("reference")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isValidSourceType("invalid")).toBe(false);
    expect(isValidSourceType("")).toBe(false);
    expect(isValidSourceType("SELF")).toBe(false);
  });
});
