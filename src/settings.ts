import { SourceType } from "./types";
import type { AuthorshipPluginSettings } from "./types";

export { DEFAULT_SETTINGS } from "./types";
export type { AuthorshipPluginSettings } from "./types";

export function updateSettings(
  current: AuthorshipPluginSettings,
  partial: Partial<AuthorshipPluginSettings>,
): AuthorshipPluginSettings {
  return { ...current, ...partial };
}

export function isValidSourceType(value: string): value is SourceType {
  return Object.values(SourceType).includes(value as SourceType);
}
