import type { AuthorshipRange, AnnotationBlock } from "../types";
import {
  extractAnnotationBlock,
  parseAnnotationBlock,
} from "./AnnotationParser";
import { serializeAnnotationBlock, appendAnnotationToBody } from "./AnnotationSerializer";
import { computeHash, validateHash } from "../core/HashValidator";
import {
  annotationBlockToRanges,
  rangesToAnnotationAuthors,
} from "../core/AuthorshipTracker";

export interface LoadResult {
  readonly body: string;
  readonly ranges: AuthorshipRange[];
  readonly hashValid: boolean;
  readonly hasAnnotations: boolean;
}

export async function loadAnnotations(
  fileContent: string,
): Promise<LoadResult> {
  const extracted = extractAnnotationBlock(fileContent);

  if (!extracted) {
    return {
      body: fileContent,
      ranges: [],
      hashValid: true,
      hasAnnotations: false,
    };
  }

  const block = parseAnnotationBlock(extracted.annotationRaw);
  if (!block) {
    return {
      body: extracted.body,
      ranges: [],
      hashValid: false,
      hasAnnotations: true,
    };
  }

  const hashValid = await validateHash(extracted.body, block.hash);
  const ranges = annotationBlockToRanges(block, extracted.body);

  return {
    body: extracted.body,
    ranges,
    hashValid,
    hasAnnotations: true,
  };
}

export async function saveAnnotations(
  body: string,
  ranges: readonly AuthorshipRange[],
): Promise<string> {
  if (ranges.length === 0) return body;

  const hash = await computeHash(body);
  const authors = rangesToAnnotationAuthors(ranges, body);

  const block: AnnotationBlock = { hash, authors };
  const serialized = serializeAnnotationBlock(block);

  return appendAnnotationToBody(body, serialized);
}
