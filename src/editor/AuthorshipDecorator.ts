import type { EditorView } from "@codemirror/view";
import { authorshipField } from "./AuthorshipExtension";
import type { AuthorshipRange } from "../types";
import { SourceType } from "../types";

export interface AuthorStats {
  readonly authorName: string;
  readonly sourceType: SourceType;
  readonly charCount: number;
}

export function getAuthorshipRanges(
  view: EditorView,
): readonly AuthorshipRange[] {
  return view.state.field(authorshipField).ranges;
}

export function isAuthorshipEnabled(view: EditorView): boolean {
  return view.state.field(authorshipField).enabled;
}

export function computeAuthorStats(
  ranges: readonly AuthorshipRange[],
): AuthorStats[] {
  const statsMap = new Map<string, AuthorStats>();

  for (const r of ranges) {
    const key = `${r.sourceType}:${r.authorName}`;
    const existing = statsMap.get(key);

    if (existing) {
      statsMap.set(key, {
        ...existing,
        charCount: existing.charCount + r.length,
      });
    } else {
      statsMap.set(key, {
        authorName: r.authorName,
        sourceType: r.sourceType,
        charCount: r.length,
      });
    }
  }

  return [...statsMap.values()].sort((a, b) => b.charCount - a.charCount);
}
