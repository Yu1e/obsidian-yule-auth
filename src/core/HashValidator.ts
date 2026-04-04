import { sha256Truncated } from "../utils/crypto";
import { graphemeLength } from "../utils/grapheme";
import type { HashAnnotation } from "../types";

export async function computeHash(
  text: string,
  truncateLength: number = 32,
): Promise<HashAnnotation> {
  const gLen = graphemeLength(text);
  const hash = await sha256Truncated(text, truncateLength);

  return {
    textRange: { from: 0, length: gLen },
    algorithm: "SHA-256",
    hash,
  };
}

export async function validateHash(
  text: string,
  expected: HashAnnotation,
): Promise<boolean> {
  const computed = await sha256Truncated(text, expected.hash.length);
  return computed === expected.hash;
}
