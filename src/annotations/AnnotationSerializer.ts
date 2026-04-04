import type { AnnotationBlock, CharacterRange } from "../types";

function serializeRange(range: CharacterRange): string {
  if (range.length === 1) return `${range.from}`;
  return `${range.from},${range.length}`;
}

function serializeRanges(ranges: readonly CharacterRange[]): string {
  return ranges.map(serializeRange).join(" ");
}

export function serializeAnnotationBlock(block: AnnotationBlock): string {
  const lines: string[] = [];

  lines.push("---");

  const hashRange = serializeRange(block.hash.textRange);
  lines.push(
    `Annotations: ${hashRange} ${block.hash.algorithm} ${block.hash.hash}`,
  );

  for (const authorAnnotation of block.authors) {
    const { prefix, name } = authorAnnotation.author;
    const ranges = serializeRanges(authorAnnotation.ranges);
    lines.push(`${prefix}${name}: ${ranges}`);
  }

  lines.push("...");

  return lines.join("\n");
}

export function appendAnnotationToBody(
  body: string,
  annotationBlock: string,
): string {
  const trimmedBody = body.replace(/\n+$/, "");
  return `${trimmedBody}\n\n${annotationBlock}`;
}
