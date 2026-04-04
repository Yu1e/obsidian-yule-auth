export const SOURCE_PREFIX = {
  HUMAN: "@",
  AI: "&",
  REFERENCE: "*",
} as const;

export type SourcePrefix = (typeof SOURCE_PREFIX)[keyof typeof SOURCE_PREFIX];

export enum SourceType {
  SELF = "self",
  AI = "ai",
  PASTED = "pasted",
  REFERENCE = "reference",
}

export const SOURCE_TYPE_TO_PREFIX: Record<SourceType, SourcePrefix> = {
  [SourceType.SELF]: SOURCE_PREFIX.HUMAN,
  [SourceType.AI]: SOURCE_PREFIX.AI,
  [SourceType.PASTED]: SOURCE_PREFIX.HUMAN,
  [SourceType.REFERENCE]: SOURCE_PREFIX.REFERENCE,
};

export const PREFIX_TO_DEFAULT_SOURCE: Record<SourcePrefix, SourceType> = {
  [SOURCE_PREFIX.HUMAN]: SourceType.SELF,
  [SOURCE_PREFIX.AI]: SourceType.AI,
  [SOURCE_PREFIX.REFERENCE]: SourceType.REFERENCE,
};

export interface AuthorshipRange {
  readonly from: number;
  readonly length: number;
  readonly sourceType: SourceType;
  readonly authorName: string;
}

export interface AuthorDefinition {
  readonly name: string;
  readonly prefix: SourcePrefix;
  readonly identifier?: string;
}

export interface CharacterRange {
  readonly from: number;
  readonly length: number;
}

export interface HashAnnotation {
  readonly textRange: CharacterRange;
  readonly algorithm: "SHA-256";
  readonly hash: string;
}

export interface AuthorAnnotation {
  readonly author: AuthorDefinition;
  readonly ranges: readonly CharacterRange[];
}

export interface AnnotationBlock {
  readonly hash: HashAnnotation;
  readonly authors: readonly AuthorAnnotation[];
}

export interface AuthorshipState {
  readonly ranges: readonly AuthorshipRange[];
  readonly enabled: boolean;
}

export const EMPTY_AUTHORSHIP_STATE: AuthorshipState = {
  ranges: [],
  enabled: true,
};

export interface AuthorshipPluginSettings {
  readonly enabled: boolean;
  readonly defaultPasteSource: SourceType;
  readonly selfAuthorName: string;
  readonly showInStatusBar: boolean;
  readonly authorColors: Record<string, string>;
}

export const DEFAULT_SETTINGS: AuthorshipPluginSettings = {
  enabled: true,
  defaultPasteSource: SourceType.PASTED,
  selfAuthorName: "Self",
  showInStatusBar: true,
  authorColors: {},
};
