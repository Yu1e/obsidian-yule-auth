import { Plugin, Notice, MarkdownView } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { DEFAULT_SETTINGS } from "./types";
import type { AuthorshipPluginSettings } from "./types";
import { createAuthorshipExtension, setAuthorshipRanges, authorshipField } from "./editor/AuthorshipExtension";
import { computeAuthorStats } from "./editor/AuthorshipDecorator";
import { loadAnnotations, saveAnnotations } from "./annotations/AnnotationStore";
import { extractAnnotationBlock } from "./annotations/AnnotationParser";
import { registerCommands } from "./commands";
import { AuthorshipSettingTab } from "./ui/SettingsTab";
import { StatusBarManager } from "./ui/StatusBarItem";

export default class AuthorshipPlugin extends Plugin {
  settings: AuthorshipPluginSettings = DEFAULT_SETTINGS;
  private statusBar: StatusBarManager | null = null;
  private settingsTab: AuthorshipSettingTab | null = null;

  async onload(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData()),
    };

    this.registerEditorExtension(createAuthorshipExtension());
    registerCommands(this);

    this.settingsTab = new AuthorshipSettingTab(
      this.app,
      this,
      this.settings,
      async (newSettings) => {
        this.settings = newSettings;
        this.settingsTab?.updateSettings(newSettings);
        await this.saveData(newSettings);
      },
    );
    this.addSettingTab(this.settingsTab);

    if (this.settings.showInStatusBar) {
      this.statusBar = new StatusBarManager(this);
    }

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file) this.handleFileOpen(file.path);
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.debounceUpdateStatusBar();
      }),
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.debounceUpdateStatusBar();
      }),
    );
  }

  onunload(): void {
    this.statusBar = null;
  }

  private async handleFileOpen(filePath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!file || !("extension" in file)) return;

    try {
      const content = await this.app.vault.read(file as any);
      const result = await loadAnnotations(content);

      if (result.hasAnnotations && !result.hashValid) {
        new Notice(
          "Authorship: Annotations may be misaligned. " +
            "The file was modified outside Obsidian.",
          8000,
        );
      }

      if (result.ranges.length > 0) {
        const view = this.getActiveEditorView();
        if (view) {
          view.dispatch({
            effects: setAuthorshipRanges.of(result.ranges),
          });
        }
      }
    } catch {
      // File read error -- silently continue without annotations
    }
  }

  private updateStatusBarTimeout: ReturnType<typeof setTimeout> | null = null;

  private debounceUpdateStatusBar(): void {
    if (this.updateStatusBarTimeout) {
      clearTimeout(this.updateStatusBarTimeout);
    }
    this.updateStatusBarTimeout = setTimeout(() => {
      this.updateStatusBar();
    }, 500);
  }

  private updateStatusBar(): void {
    if (!this.statusBar || !this.settings.showInStatusBar) return;

    const view = this.getActiveEditorView();
    if (!view) {
      this.statusBar.hide();
      return;
    }

    const state = view.state.field(authorshipField, false);
    if (!state) {
      this.statusBar.hide();
      return;
    }

    const stats = computeAuthorStats(state.ranges);
    this.statusBar.update(stats);
  }

  private getActiveEditorView(): EditorView | null {
    const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!mdView) return null;
    // @ts-expect-error accessing internal CM6 editor
    return mdView.editor?.cm ?? null;
  }
}
