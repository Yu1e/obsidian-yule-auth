import type { Transaction } from "@codemirror/state";
import { SourceType } from "../types";

export function classifyTransaction(
  tr: Transaction,
  defaultPasteSource: SourceType,
): SourceType | null {
  if (!tr.docChanged) return null;

  if (tr.isUserEvent("input.paste")) return defaultPasteSource;
  if (tr.isUserEvent("input.type")) return SourceType.SELF;
  if (tr.isUserEvent("input.type.compose")) return SourceType.SELF;
  if (tr.isUserEvent("input.drop")) return defaultPasteSource;
  if (tr.isUserEvent("input")) return SourceType.SELF;

  return SourceType.SELF;
}
