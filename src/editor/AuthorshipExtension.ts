import {
  StateField,
  StateEffect,
  type Transaction,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  Decoration,
  type DecorationSet,
} from "@codemirror/view";
import { SourceType } from "../types";
import type { AuthorshipRange } from "../types";
import {
  adjustRangesForInsert,
  adjustRangesForDelete,
  mergeAdjacentRanges,
  removeEmptyRanges,
} from "../core/RangeManager";
import { classifyTransaction } from "./InputDetector";

export const setAuthorshipRanges = StateEffect.define<AuthorshipRange[]>();
export const markSelectionAs = StateEffect.define<{
  from: number;
  to: number;
  sourceType: SourceType;
  authorName: string;
}>();
export const toggleAuthorship = StateEffect.define<boolean>();

interface AuthorshipFieldState {
  readonly ranges: readonly AuthorshipRange[];
  readonly enabled: boolean;
  readonly defaultPasteSource: SourceType;
  readonly selfAuthorName: string;
}

const INITIAL_STATE: AuthorshipFieldState = {
  ranges: [],
  enabled: true,
  defaultPasteSource: SourceType.PASTED,
  selfAuthorName: "Self",
};

function processDocChanges(
  state: AuthorshipFieldState,
  tr: Transaction,
): AuthorshipFieldState {
  if (!tr.docChanged || !state.enabled) return state;

  const sourceType = classifyTransaction(tr, state.defaultPasteSource);
  if (sourceType === null) return state;

  const authorName =
    sourceType === SourceType.SELF
      ? state.selfAuthorName
      : sourceType === SourceType.AI
        ? "AI"
        : "Pasted";

  let ranges = [...state.ranges];

  tr.changes.iterChanges((fromA, toA, _fromB, toB) => {
    const deleteLen = toA - fromA;
    const insertLen = toB - (toA - deleteLen);

    if (deleteLen > 0) {
      ranges = adjustRangesForDelete(ranges, fromA, deleteLen);
    }
    if (insertLen > 0) {
      ranges = adjustRangesForInsert(
        ranges,
        fromA,
        insertLen,
        sourceType,
        authorName,
      );
    }
  });

  ranges = removeEmptyRanges(ranges);
  ranges = mergeAdjacentRanges(ranges);

  return { ...state, ranges };
}

function processEffects(
  state: AuthorshipFieldState,
  tr: Transaction,
): AuthorshipFieldState {
  let current = state;

  for (const effect of tr.effects) {
    if (effect.is(setAuthorshipRanges)) {
      current = { ...current, ranges: effect.value };
    }
    if (effect.is(toggleAuthorship)) {
      current = { ...current, enabled: effect.value };
    }
    if (effect.is(markSelectionAs)) {
      const { from, to, sourceType, authorName } = effect.value;
      const length = to - from;

      const newRanges = current.ranges.flatMap((r) => {
        const rangeEnd = r.from + r.length;

        if (r.from >= to || rangeEnd <= from) return [r];
        if (r.from >= from && rangeEnd <= to) return [];

        const result: AuthorshipRange[] = [];
        if (r.from < from) {
          result.push({ ...r, length: from - r.from });
        }
        if (rangeEnd > to) {
          result.push({ ...r, from: to, length: rangeEnd - to });
        }
        return result;
      });

      const markedRange: AuthorshipRange = {
        from,
        length,
        sourceType,
        authorName,
      };

      const withMarked = [...newRanges, markedRange].sort(
        (a, b) => a.from - b.from,
      );

      current = {
        ...current,
        ranges: mergeAdjacentRanges(removeEmptyRanges(withMarked)),
      };
    }
  }

  return current;
}

export const authorshipField = StateField.define<AuthorshipFieldState>({
  create() {
    return INITIAL_STATE;
  },

  update(state, tr) {
    let next = processEffects(state, tr);
    next = processDocChanges(next, tr);
    return next;
  },

  provide(field) {
    return EditorView.decorations.from(field, (state) => {
      if (!state.enabled) return Decoration.none;
      return buildDecorations(state.ranges);
    });
  },
});

const decorationCache = new Map<string, Decoration>();

function getDecoration(sourceType: SourceType): Decoration {
  const cached = decorationCache.get(sourceType);
  if (cached) return cached;

  const dec = Decoration.mark({
    class: `authorship-${sourceType}`,
  });
  decorationCache.set(sourceType, dec);
  return dec;
}

function buildDecorations(
  ranges: readonly AuthorshipRange[],
): DecorationSet {
  const decorations = ranges
    .filter((r) => r.length > 0 && r.sourceType !== SourceType.SELF)
    .map((r) => getDecoration(r.sourceType).range(r.from, r.from + r.length));

  return Decoration.set(decorations, true);
}

export const authorshipTheme = EditorView.baseTheme({
  ".authorship-ai": {
    background:
      "linear-gradient(90deg, rgba(167,139,250,0.13), rgba(244,114,182,0.13), rgba(56,189,248,0.13))",
    borderRadius: "2px",
  },
  ".authorship-pasted": {
    opacity: "0.75",
    borderBottom: "1px dashed var(--text-muted)",
  },
  ".authorship-reference": {
    fontStyle: "italic",
    opacity: "0.6",
  },
});

export function createAuthorshipExtension(): Extension {
  return [authorshipField, authorshipTheme];
}
