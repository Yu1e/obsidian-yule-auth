const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function buildSegmentMap(text: string): number[] {
  if (text.length === 0) return [];
  return [...segmenter.segment(text)].map((s) => s.index);
}

export function utf16ToGrapheme(
  segmentMap: readonly number[],
  utf16Pos: number,
): number {
  if (segmentMap.length === 0) return utf16Pos;

  let lo = 0;
  let hi = segmentMap.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (segmentMap[mid] < utf16Pos) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  if (lo < segmentMap.length && segmentMap[lo] === utf16Pos) return lo;
  if (lo === segmentMap.length) return segmentMap.length;
  return lo;
}

export function graphemeToUtf16(
  segmentMap: readonly number[],
  graphemePos: number,
): number {
  if (graphemePos >= segmentMap.length) {
    if (segmentMap.length === 0) return graphemePos;
    const lastStart = segmentMap[segmentMap.length - 1];
    const overshoot = graphemePos - segmentMap.length;
    return lastStart + 1 + overshoot;
  }
  return segmentMap[graphemePos];
}

export function graphemeLength(text: string): number {
  if (text.length === 0) return 0;
  return [...segmenter.segment(text)].length;
}

export function graphemeSlice(
  text: string,
  from: number,
  to: number,
): string {
  if (from === to) return "";
  const map = buildSegmentMap(text);
  const utf16From = graphemeToUtf16(map, from);
  const utf16To = graphemeToUtf16(map, to);
  return text.slice(utf16From, utf16To);
}
