import { Modal, Setting, App } from "obsidian";
import { SourceType } from "../types";

export interface MarkAsResult {
  readonly sourceType: SourceType;
  readonly authorName: string;
}

export class AuthorModal extends Modal {
  private result: MarkAsResult | null = null;
  private readonly onSubmit: (result: MarkAsResult) => void;

  constructor(app: App, onSubmit: (result: MarkAsResult) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Mark selection as..." });

    let sourceType = SourceType.AI;
    let authorName = "AI";

    new Setting(contentEl).setName("Source type").addDropdown((dropdown) =>
      dropdown
        .addOption(SourceType.SELF, "Self (typed)")
        .addOption(SourceType.AI, "AI generated")
        .addOption(SourceType.PASTED, "Pasted")
        .addOption(SourceType.REFERENCE, "Reference material")
        .setValue(sourceType)
        .onChange((value) => {
          sourceType = value as SourceType;
          if (sourceType === SourceType.SELF) authorName = "Self";
          else if (sourceType === SourceType.AI) authorName = "AI";
          else if (sourceType === SourceType.REFERENCE) authorName = "Reference";
          else authorName = "Pasted";
        }),
    );

    new Setting(contentEl).setName("Author name").addText((text) =>
      text
        .setPlaceholder("Author name")
        .setValue(authorName)
        .onChange((value) => {
          authorName = value;
        }),
    );

    new Setting(contentEl).addButton((btn) =>
      btn.setButtonText("Apply").setCta().onClick(() => {
        this.result = { sourceType, authorName };
        this.onSubmit(this.result);
        this.close();
      }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
