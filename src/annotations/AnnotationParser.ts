import type {
  AnnotationBlock,
  HashAnnotation,
  AuthorAnnotation,
  AuthorDefinition,
  CharacterRange,
  SourcePrefix,
} from "../types";
import { SOURCE_PREFIX } from "../types";

export interface ExtractedAnnotation {
  readonly body: string;
  readonly annotationRaw: string;
}

const ANNOTATION_START = /^---\s*$/m;
const ANNOTATION_END = /^\.\.\.\s*$/m;
const HASH_LINE_RE =
  /^(\w+):\s*(\d+),(\d+)\s+SHA-256\s+([0-9a-fA-F]{20,64})\s*$/;
const AUTHOR_LINE_RE = /^([@&*])\s*([^:]*?):\s*(.*)$/;
const RANGE_RE = /(\d+)(?:,(\d+))?/g;

export function extractAnnotationBlock(
  text: string,
): ExtractedAnnotation | null {
  const lines = text.split("\n");

  let blockStartLine = -1;
  let blockEndLine = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (ANNOTATION_END.test(lines[i]) && blockEndLine === -1) {
      blockEndLine = i;
    }
    if (ANNOTATION_START.test(lines[i]) && blockEndLine !== -1) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      if (HASH_LINE_RE.test(nextLine.trim())) {
        blockStartLine = i;
        break;
      }
    }
  }

  if (blockStartLine === -1 || blockEndLine === -1) return null;

  const annotationLines = lines.slice(blockStartLine + 1, blockEndLine);
  const annotationRaw = annotationLines.join("\n");

  let body = lines.slice(0, blockStartLine).join("\n");
  body = body.replace(/\n+$/, "");

  return { body, annotationRaw };
}

function parseCharacterRanges(rangeStr: string): CharacterRange[] {
  const ranges: CharacterRange[] = [];
  let match: RegExpExecArray | null;

  const re = new RegExp(RANGE_RE.source, "g");
  while ((match = re.exec(rangeStr)) !== null) {
    const from = parseInt(match[1], 10);
    const length = match[2] !== undefined ? parseInt(match[2], 10) : 1;
    ranges.push({ from, length });
  }

  return ranges;
}

function parsePrefix(char: string): SourcePrefix | null {
  if (char === "@") return SOURCE_PREFIX.HUMAN;
  if (char === "&") return SOURCE_PREFIX.AI;
  if (char === "*") return SOURCE_PREFIX.REFERENCE;
  return null;
}

export function parseAnnotationBlock(raw: string): AnnotationBlock | null {
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const hashMatch = HASH_LINE_RE.exec(lines[0].trim());
  if (!hashMatch) return null;

  const hash: HashAnnotation = {
    textRange: {
      from: parseInt(hashMatch[2], 10),
      length: parseInt(hashMatch[3], 10),
    },
    algorithm: "SHA-256",
    hash: hashMatch[4],
  };

  const authors: AuthorAnnotation[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const authorMatch = AUTHOR_LINE_RE.exec(line);
    if (!authorMatch) continue;

    const prefix = parsePrefix(authorMatch[1]);
    if (!prefix) continue;

    const name = authorMatch[2].trim();
    const rangeStr = authorMatch[3].trim();
    const ranges = parseCharacterRanges(rangeStr);

    const author: AuthorDefinition = { name, prefix };
    authors.push({ author, ranges });
  }

  return { hash, authors };
}
