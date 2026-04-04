import type { Plugin } from "obsidian";
import type { AuthorStats } from "../editor/AuthorshipDecorator";

export class StatusBarManager {
  private readonly el: HTMLElement;

  constructor(plugin: Plugin) {
    this.el = plugin.addStatusBarItem();
    this.el.addClass("authorship-status-bar");
  }

  update(stats: AuthorStats[]): void {
    if (stats.length === 0) {
      this.el.textContent = "";
      return;
    }

    const total = stats.reduce((sum, s) => sum + s.charCount, 0);
    const parts = stats
      .slice(0, 3)
      .map((s) => {
        const pct = total > 0 ? Math.round((s.charCount / total) * 100) : 0;
        return `${s.authorName}: ${pct}%`;
      });

    this.el.textContent = `Authorship: ${parts.join(" | ")}`;
  }

  hide(): void {
    this.el.textContent = "";
  }
}
