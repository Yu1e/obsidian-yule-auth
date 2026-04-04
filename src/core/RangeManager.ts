import type { AuthorshipRange } from "../types";
import type { SourceType } from "../types";

export function insertRange(
  ranges: readonly AuthorshipRange[],
  newRange: AuthorshipRange,
): AuthorshipRange[] {
  const result = [...ranges];
  const idx = result.findIndex((r) => r.from > newRange.from);
  if (idx === -1) {
    result.push(newRange);
  } else {
    result.splice(idx, 0, newRange);
  }
  return result;
}

export function mergeAdjacentRanges(
  ranges: readonly AuthorshipRange[],
): AuthorshipRange[] {
  if (ranges.length <= 1) return [...ranges];

  const result: AuthorshipRange[] = [{ ...ranges[0] }];

  for (let i = 1; i < ranges.length; i++) {
    const prev = result[result.length - 1];
    const curr = ranges[i];

    const adjacent = prev.from + prev.length === curr.from;
    const sameSource = prev.sourceType === curr.sourceType;
    const sameAuthor = prev.authorName === curr.authorName;

    if (adjacent && sameSource && sameAuthor) {
      result[result.length - 1] = {
        ...prev,
        length: prev.length + curr.length,
      };
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

export function splitRange(
  range: AuthorshipRange,
  position: number,
): [AuthorshipRange, AuthorshipRange] {
  const relativePos = position - range.from;
  const leftLength = Math.max(0, Math.min(relativePos, range.length));
  const rightLength = range.length - leftLength;

  return [
    { ...range, length: leftLength },
    { ...range, from: range.from + leftLength, length: rightLength },
  ];
}

export function shiftRangesAfter(
  ranges: readonly AuthorshipRange[],
  position: number,
  offset: number,
): AuthorshipRange[] {
  return ranges.map((r) => {
    if (r.from >= position) {
      return { ...r, from: r.from + offset };
    }
    return r;
  });
}

export function adjustRangesForInsert(
  ranges: readonly AuthorshipRange[],
  position: number,
  insertLength: number,
  sourceType: SourceType,
  authorName: string,
): AuthorshipRange[] {
  const containingIdx = ranges.findIndex(
    (r) => position >= r.from && position <= r.from + r.length,
  );

  if (containingIdx === -1) {
    const shifted = shiftRangesAfter(ranges, position, insertLength);
    const newRange: AuthorshipRange = {
      from: position,
      length: insertLength,
      sourceType,
      authorName,
    };
    return insertRange(shifted, newRange);
  }

  const containing = ranges[containingIdx];
  const sameSource =
    containing.sourceType === sourceType &&
    containing.authorName === authorName;

  if (sameSource) {
    const before = ranges.slice(0, containingIdx);
    const after = ranges.slice(containingIdx + 1);
    const extended: AuthorshipRange = {
      ...containing,
      length: containing.length + insertLength,
    };
    const shiftedAfter = shiftRangesAfter(after, position, insertLength);
    return [...before, extended, ...shiftedAfter];
  }

  const [left, right] = splitRange(containing, position);
  const shiftedRight: AuthorshipRange = {
    ...right,
    from: right.from + insertLength,
  };
  const newRange: AuthorshipRange = {
    from: position,
    length: insertLength,
    sourceType,
    authorName,
  };

  const before = ranges.slice(0, containingIdx);
  const after = ranges.slice(containingIdx + 1);
  const shiftedAfter = shiftRangesAfter(after, position, insertLength);

  const result: AuthorshipRange[] = [...before];
  if (left.length > 0) result.push(left);
  result.push(newRange);
  if (shiftedRight.length > 0) result.push(shiftedRight);
  result.push(...shiftedAfter);

  return result;
}

export function adjustRangesForDelete(
  ranges: readonly AuthorshipRange[],
  position: number,
  deleteLength: number,
): AuthorshipRange[] {
  const deleteEnd = position + deleteLength;

  const adjusted = ranges.map((r): AuthorshipRange | null => {
    const rangeEnd = r.from + r.length;

    if (rangeEnd <= position) return r;

    if (r.from >= deleteEnd) {
      return { ...r, from: r.from - deleteLength };
    }

    if (r.from >= position && rangeEnd <= deleteEnd) return null;

    if (r.from < position && rangeEnd > deleteEnd) {
      return { ...r, length: r.length - deleteLength };
    }

    if (r.from < position) {
      return { ...r, length: position - r.from };
    }

    const overlap = deleteEnd - r.from;
    return {
      ...r,
      from: position,
      length: r.length - overlap,
    };
  });

  return adjusted.filter((r): r is AuthorshipRange => r !== null);
}

export function removeEmptyRanges(
  ranges: readonly AuthorshipRange[],
): AuthorshipRange[] {
  return ranges.filter((r) => r.length > 0);
}
