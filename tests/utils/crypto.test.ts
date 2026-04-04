import { describe, it, expect } from "vitest";
import { sha256, sha256Truncated } from "../../src/utils/crypto";

describe("sha256", () => {
  it("hashes empty string correctly", async () => {
    const hash = await sha256("");
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes a known string correctly", async () => {
    const hash = await sha256("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("returns 64-character hex string", async () => {
    const hash = await sha256("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes unicode text", async () => {
    const hash = await sha256("你好");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sha256Truncated", () => {
  it("truncates to specified length", async () => {
    const hash = await sha256Truncated("hello", 32);
    expect(hash).toHaveLength(32);
  });

  it("enforces minimum of 20 characters", async () => {
    const hash = await sha256Truncated("hello", 10);
    expect(hash).toHaveLength(20);
  });

  it("enforces maximum of 64 characters", async () => {
    const hash = await sha256Truncated("hello", 100);
    expect(hash).toHaveLength(64);
  });

  it("defaults to 32 characters", async () => {
    const hash = await sha256Truncated("hello");
    expect(hash).toHaveLength(32);
  });
});
