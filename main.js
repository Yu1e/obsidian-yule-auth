'use strict';

var obsidian = require('obsidian');

// ─── Constants ───────────────────────────────────────────────────────────────
const PLUGIN_ID   = 'yule-auth';
const DB_FILENAME = 'authorship-db.json';

const SourceType = {
  SELF:  'self',
  AI:    'ai',
  OTHER: 'other',
};

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18n = {
  ru: {
    settingsTitle:           'yule-auth',
    language:                'Язык / Language',
    languageDesc:            'Язык настроек плагина',
    trackingSection:         'Отслеживание',
    tracking:                'Отслеживание авторства',
    trackingDesc:            'Включить/выключить отслеживание и подсветку авторства',
    authorName:              'Ваше имя',
    authorNameDesc:          'Как ваши тексты помечаются в базе данных',
    authorNamePh:            'Я',
    pasteSection:            'Диалог при вставке',
    pasteDialog:             'Диалог при вставке',
    pasteDialogDesc:         'Показывать окно выбора авторства при вставке текста длиннее 5 слов с точкой',
    pasteDialogRestore:      'Восстанавливать диалог при перезапуске',
    pasteDialogRestoreDesc:  'Автоматически включать диалог вставки при следующем открытии Obsidian',
    defaultPaste:            'Авторство вставки по умолчанию',
    defaultPasteDesc:        'Что считать источником текста, если диалог отключён или пропущен',
    selfLabel:               'Мой текст',
    aiLabel:                 'ИИ',
    otherLabel:              'Чужой текст',
    dialogTitle:             'Чей это текст?',
    dialogSkip:              'Пропустить',
    dialogDisable:           'Отключить навсегда',
    dialogDisableSession:    'Отключить до перезапуска',
    tagSection:              'Автопометка по тегам',
    tagAutoMark:             'Автопометка по тегам',
    tagAutoMarkDesc:         'Предлагать пометить всю заметку как «чужой текст» при добавлении указанных тегов',
    tagAutoMarkTags:         'Теги-триггеры',
    tagAutoMarkTagsDesc:     'Теги через запятую (без #). При наличии любого из них появится предложение пометить заметку.',
    tagAutoMarkTagsPh:       'цитации, выписки, вырезки',
    tagModalTitle:           'Пометить как чужой текст?',
    tagModalDesc:            'Заметка содержит тег #{tag}. Пометить весь текст как «чужой текст»?',
    tagModalYes:             'Пометить всю заметку',
    tagModalNo:              'Пропустить',
    tagModalNever:           'Не спрашивать для этой заметки',
    highlightSection:        'Настройка выделений',
    showSelf:                'Показывать: мой текст',
    showAi:                  'Показывать: ИИ',
    showOther:               'Показывать: чужой текст',
    selfSection:             'Мой текст',
    aiSection:               'ИИ',
    otherSection:            'Чужой текст',
    bgEnabled:               'Фоновый градиент',
    bgEnabledDesc:           'Подсвечивать фон под текстом градиентом',
    bgColor1:                'Фон: цвет 1 (левый)',
    bgColor2:                'Фон: цвет 2 (центр)',
    bgColor3:                'Фон: цвет 3 (правый)',
    bgOpacity:               'Фон: интенсивность (%)',
    textGradient:            'Градиент шрифта',
    textGradientDesc:        'Окрашивать сам текст градиентом (как в iA Writer)',
    textColor1:              'Шрифт: цвет 1 (левый)',
    textColor2:              'Шрифт: цвет 2 (центр)',
    textColor3:              'Шрифт: цвет 3 (правый)',
    textOpacity:             'Шрифт: интенсивность (%)',
    italic:                  'Курсив',
    italicDesc:              'Отображать текст курсивом',
  },
  en: {
    settingsTitle:           'yule-auth',
    language:                'Language / Язык',
    languageDesc:            'Settings language',
    trackingSection:         'Tracking',
    tracking:                'Authorship tracking',
    trackingDesc:            'Enable/disable authorship tracking and highlighting',
    authorName:              'Your author name',
    authorNameDesc:          'How your texts are labeled in the database',
    authorNamePh:            'Self',
    pasteSection:            'Paste dialog',
    pasteDialog:             'Paste dialog',
    pasteDialogDesc:         'Show authorship dialog when pasting ≥5 words with punctuation',
    pasteDialogRestore:      'Restore paste dialog on restart',
    pasteDialogRestoreDesc:  'Automatically re-enable paste dialog on next Obsidian launch',
    defaultPaste:            'Default paste authorship',
    defaultPasteDesc:        'How pasted text is classified when dialog is off or skipped',
    selfLabel:               'My text (Self)',
    aiLabel:                 'AI',
    otherLabel:              'Other (human)',
    dialogTitle:             'Who wrote this text?',
    dialogSkip:              'Skip',
    dialogDisable:           'Disable permanently',
    dialogDisableSession:    'Disable until restart',
    tagSection:              'Tag auto-mark',
    tagAutoMark:             'Tag auto-mark',
    tagAutoMarkDesc:         'Suggest marking the entire note as "other text" when specified tags are present',
    tagAutoMarkTags:         'Trigger tags',
    tagAutoMarkTagsDesc:     'Comma-separated tags without #. When any is present, a prompt will appear.',
    tagAutoMarkTagsPh:       'citations, excerpts, clippings',
    tagModalTitle:           'Mark as other text?',
    tagModalDesc:            'Note has tag #{tag}. Mark the entire note as "other text"?',
    tagModalYes:             'Mark entire note',
    tagModalNo:              'Skip',
    tagModalNever:           "Don't ask for this note",
    highlightSection:        'Highlight settings',
    showSelf:                'Show highlight: my text',
    showAi:                  'Show highlight: AI',
    showOther:               'Show highlight: other text',
    selfSection:             'My text (Self)',
    aiSection:               'AI',
    otherSection:            'Other text',
    bgEnabled:               'Background gradient',
    bgEnabledDesc:           'Highlight text background with a gradient',
    bgColor1:                'Background: color 1 (left)',
    bgColor2:                'Background: color 2 (center)',
    bgColor3:                'Background: color 3 (right)',
    bgOpacity:               'Background: intensity (%)',
    textGradient:            'Text gradient',
    textGradientDesc:        'Color the text itself with a gradient (like iA Writer)',
    textColor1:              'Text: color 1 (left)',
    textColor2:              'Text: color 2 (center)',
    textColor3:              'Text: color 3 (right)',
    textOpacity:             'Text: intensity (%)',
    italic:                  'Italic',
    italicDesc:              'Display text in italics',
  },
};

// ─── Default settings ────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  enabled:            true,
  language:           'ru',
  selfAuthorName:     'Я',
  defaultPasteSource: SourceType.OTHER,
  pasteDialogEnabled: true,
  pasteDialogRestore: true,
  // Tag auto-mark
  tagAutoMark:        true,
  tagAutoMarkTags:    ['цитации', 'выписки', 'вырезки'],
  // Visibility
  showSelf:           false,
  showAi:             true,
  showOther:          true,
  // Self
  selfBgEnabled:      false,
  selfBgColor1:       '#34d399',
  selfBgColor2:       '#34d399',
  selfBgColor3:       '#34d399',
  selfBgOpacity:      20,
  selfTextGradient:   false,
  selfTextColor1:     '#34d399',
  selfTextColor2:     '#10b981',
  selfTextColor3:     '#34d399',
  selfTextOpacity:    100,
  selfItalic:         false,
  // AI
  aiBgEnabled:        true,
  aiBgColor1:         '#a78bfa',
  aiBgColor2:         '#f472b6',
  aiBgColor3:         '#38bdf8',
  aiBgOpacity:        18,
  aiTextGradient:     false,
  aiTextColor1:       '#a78bfa',
  aiTextColor2:       '#f472b6',
  aiTextColor3:       '#38bdf8',
  aiTextOpacity:      100,
  aiItalic:           false,
  // Other
  otherBgEnabled:     false,
  otherBgColor1:      '#fb923c',
  otherBgColor2:      '#fb923c',
  otherBgColor3:      '#fb923c',
  otherBgOpacity:     15,
  otherTextGradient:  false,
  otherTextColor1:    '#9ca3af',
  otherTextColor2:    '#9ca3af',
  otherTextColor3:    '#9ca3af',
  otherTextOpacity:   65,
  otherItalic:        true,
};

// ─── Database ────────────────────────────────────────────────────────────────
class YuleAuthDB {
  constructor(app) {
    this.app  = app;
    this.data = {};
  }

  _path() {
    return `${this.app.vault.configDir}/plugins/${PLUGIN_ID}/${DB_FILENAME}`;
  }

  async load() {
    try {
      const adapter = this.app.vault.adapter;
      const p = this._path();
      if (await adapter.exists(p)) {
        this.data = JSON.parse(await adapter.read(p));
      }
    } catch (e) {
      console.warn('[yule-auth] DB load error', e);
      this.data = {};
    }
  }

  async save() {
    try {
      await this.app.vault.adapter.write(
        this._path(),
        JSON.stringify(this.data, null, 2)
      );
    } catch (e) {
      console.error('[yule-auth] DB save error', e);
    }
  }

  getRanges(filePath)          { return this.data[filePath] || []; }
  setRanges(filePath, ranges)  {
    if (!ranges || !ranges.length) delete this.data[filePath];
    else this.data[filePath] = ranges;
  }
  deleteFile(filePath)         { delete this.data[filePath]; }
  renameFile(oldPath, newPath) {
    if (this.data[oldPath]) {
      this.data[newPath] = this.data[oldPath];
      delete this.data[oldPath];
    }
  }
}

// ─── Range utilities ─────────────────────────────────────────────────────────
function mergeAdjacentRanges(ranges) {
  if (!ranges || !ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const result = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];
    if (curr.sourceType === prev.sourceType &&
        curr.from <= prev.from + prev.length) {
      const end = Math.max(prev.from + prev.length, curr.from + curr.length);
      result[result.length - 1] = { ...prev, length: end - prev.from };
    } else {
      result.push({ ...curr });
    }
  }
  return result.filter(r => r.length > 0);
}

function adjustRangesForInsert(ranges, insertAt, insertLen, sourceType, authorName) {
  const shifted = ranges.map(r => {
    if (r.from >= insertAt)
      return { ...r, from: r.from + insertLen };
    if (r.from < insertAt && r.from + r.length > insertAt)
      return { ...r, length: r.length + insertLen };
    return { ...r };
  });
  shifted.push({ from: insertAt, length: insertLen, sourceType, authorName });
  return mergeAdjacentRanges(shifted.filter(r => r.length > 0));
}

function adjustRangesForDelete(ranges, deleteFrom, deleteLen) {
  const deleteTo = deleteFrom + deleteLen;
  return ranges.map(r => {
    const rEnd = r.from + r.length;
    if (r.from >= deleteTo)  return { ...r, from: r.from - deleteLen };
    if (rEnd  <= deleteFrom) return { ...r };
    const newFrom = Math.min(r.from, deleteFrom);
    const newEnd  = Math.max(rEnd - deleteLen, deleteFrom);
    return { ...r, from: newFrom, length: newEnd - newFrom };
  }).filter(r => r.length > 0);
}

// ─── CodeMirror 6 extension ──────────────────────────────────────────────────
function createEditorExtension(plugin) {
  let cm6;
  try {
    const state = require('@codemirror/state');
    const view  = require('@codemirror/view');
    cm6 = {
      StateField:  state.StateField,
      StateEffect: state.StateEffect,
      Decoration:  view.Decoration,
      EditorView:  view.EditorView,
    };
  } catch (e) {
    console.error('[yule-auth] Cannot access CodeMirror 6:', e);
    return null;
  }

  const setRangesEffect = cm6.StateEffect.define();
  const markEffect      = cm6.StateEffect.define();
  plugin._cmEffects = { setRangesEffect, markEffect };

  const authorshipField = cm6.StateField.define({
    create: () => ({ ranges: [] }),

    update(state, tr) {
      let ranges = state.ranges;

      for (const eff of tr.effects) {
        if (eff.is(setRangesEffect)) {
          ranges = eff.value ? [...eff.value] : [];
        }
        if (eff.is(markEffect)) {
          const { from, to, sourceType, authorName } = eff.value;
          const length = to - from;
          let rs = ranges.flatMap(r => {
            const rEnd = r.from + r.length;
            if (r.from >= to || rEnd <= from) return [{ ...r }];
            const parts = [];
            if (r.from < from) parts.push({ ...r, length: from - r.from });
            if (rEnd > to)     parts.push({ ...r, from: to, length: rEnd - to });
            return parts;
          });
          rs.push({ from, length, sourceType, authorName });
          ranges = mergeAdjacentRanges(rs.filter(r => r.length > 0));
        }
      }

      if (tr.docChanged && plugin.settings.enabled) {
        let source = null;
        if (tr.isUserEvent('input.paste') || tr.isUserEvent('input.drop')) {
          source = plugin.settings.defaultPasteSource;
        } else if (
          tr.isUserEvent('input.type') ||
          tr.isUserEvent('input.type.compose') ||
          tr.isUserEvent('input')
        ) {
          source = SourceType.SELF;
        }

        if (source !== null) {
          const authorName =
            source === SourceType.SELF ? plugin.settings.selfAuthorName :
            source === SourceType.AI   ? 'AI' : 'Other';
          let rs = [...ranges];
          let offset = 0;
          tr.changes.iterChanges((fromA, toA, fromB, toB) => {
            const adjFrom   = fromA + offset;
            const deleteLen = toA - fromA;
            const insertLen = toB - fromB;
            if (deleteLen > 0) rs = adjustRangesForDelete(rs, adjFrom, deleteLen);
            if (insertLen > 0) rs = adjustRangesForInsert(rs, adjFrom, insertLen, source, authorName);
            offset += insertLen - deleteLen;
          });
          ranges = mergeAdjacentRanges(rs);
        } else {
          let rs = [...ranges];
          let offset = 0;
          tr.changes.iterChanges((fromA, toA, fromB, toB) => {
            const adjFrom   = fromA + offset;
            const deleteLen = toA - fromA;
            const insertLen = toB - fromB;
            if (deleteLen > 0) rs = adjustRangesForDelete(rs, adjFrom, deleteLen);
            offset += insertLen - deleteLen;
          });
          ranges = mergeAdjacentRanges(rs);
        }
      }

      return { ranges };
    },

    provide(field) {
      return cm6.EditorView.decorations.from(field, state => {
        if (!plugin.settings.enabled) return cm6.Decoration.none;
        return buildDecorations(state.ranges, plugin.settings, cm6);
      });
    },
  });

  plugin._authorshipField = authorshipField;
  return authorshipField;
}

function buildDecorations(ranges, settings, cm6) {
  const decos = [];
  for (const r of ranges) {
    if (!r || r.length <= 0) continue;
    const show =
      (r.sourceType === SourceType.SELF  && settings.showSelf)  ||
      (r.sourceType === SourceType.AI    && settings.showAi)    ||
      (r.sourceType === SourceType.OTHER && settings.showOther);
    if (!show) continue;
    try {
      decos.push(
        cm6.Decoration.mark({ class: `yule-auth-${r.sourceType}` })
          .range(r.from, r.from + r.length)
      );
    } catch { /* skip invalid ranges */ }
  }
  decos.sort((a, b) => a.from - b.from || a.to - b.to);
  try   { return cm6.Decoration.set(decos, true); }
  catch { return cm6.Decoration.none; }
}

// ─── Paste dialog ────────────────────────────────────────────────────────────
class PasteAuthorshipModal extends obsidian.Modal {
  constructor(app, plugin, pastedText, callback) {
    super(app);
    this.plugin = plugin; this.pastedText = pastedText; this.callback = callback;
    this.modalEl.addClass('yule-auth-modal');
  }

  onOpen() {
    const t = i18n[this.plugin.settings.language] || i18n.ru;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: t.dialogTitle });

    const preview = contentEl.createDiv({ cls: 'yule-modal-preview' });
    preview.textContent = this.pastedText.slice(0, 130) + (this.pastedText.length > 130 ? '…' : '');

    const buttons = contentEl.createDiv({ cls: 'yule-modal-buttons' });
    const btn = (label, cls, cb) => {
      const el = buttons.createEl('button', { text: label, cls: ['yule-modal-btn', cls] });
      el.addEventListener('click', () => { this.close(); cb(); });
    };
    btn(t.selfLabel,  'btn-self',  () => this.callback(SourceType.SELF));
    btn(t.aiLabel,    'btn-ai',    () => this.callback(SourceType.AI));
    btn(t.otherLabel, 'btn-other', () => this.callback(SourceType.OTHER));
    btn(t.dialogSkip, 'btn-skip',  () => this.callback(null));

    const footer = contentEl.createDiv({ cls: 'yule-modal-footer' });
    const linkSession = footer.createEl('a', { text: t.dialogDisableSession });
    linkSession.addEventListener('click', () => {
      this.plugin._pasteDialogSuppressed = true;
      if (!this.plugin.settings.pasteDialogRestore) {
        this.plugin.settings.pasteDialogEnabled = false;
        void this.plugin.saveSettings();
      }
      this.close(); this.callback(null);
    });
    const linkPerm = footer.createEl('a', { text: t.dialogDisable });
    linkPerm.style.marginLeft = '1rem';
    linkPerm.addEventListener('click', () => {
      this.plugin.settings.pasteDialogEnabled = false;
      void this.plugin.saveSettings();
      this.close(); this.callback(null);
    });
  }

  onClose() { this.contentEl.empty(); }
}

// ─── Tag auto-mark modal ─────────────────────────────────────────────────────
class TagMarkModal extends obsidian.Modal {
  constructor(app, plugin, file, triggerTag, callback) {
    super(app);
    this.plugin = plugin; this.file = file;
    this.triggerTag = triggerTag; this.callback = callback;
    this.modalEl.addClass('yule-auth-modal');
  }

  onOpen() {
    const t = i18n[this.plugin.settings.language] || i18n.ru;
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: t.tagModalTitle });
    contentEl.createEl('p', {
      text: t.tagModalDesc.replace('{tag}', this.triggerTag),
      cls: 'yule-tag-modal-desc',
    });

    const buttons = contentEl.createDiv({ cls: 'yule-modal-buttons' });

    const yesBtn = buttons.createEl('button', {
      text: t.tagModalYes,
      cls: ['yule-modal-btn', 'btn-other', 'mod-cta'],
    });
    yesBtn.addEventListener('click', () => { this.close(); this.callback('mark'); });

    const noBtn = buttons.createEl('button', {
      text: t.tagModalNo, cls: ['yule-modal-btn', 'btn-skip'],
    });
    noBtn.addEventListener('click', () => { this.close(); this.callback('skip'); });

    const footer = contentEl.createDiv({ cls: 'yule-modal-footer' });
    const neverLink = footer.createEl('a', { text: t.tagModalNever });
    neverLink.addEventListener('click', () => { this.close(); this.callback('never'); });
  }

  onClose() { this.contentEl.empty(); }
}

// ─── Settings tab ────────────────────────────────────────────────────────────
class YuleAuthSettingsTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const t    = i18n[this.plugin.settings.language] || i18n.ru;
    const s    = this.plugin.settings;
    const save = async (patch) => {
      Object.assign(this.plugin.settings, patch);
      await this.plugin.saveSettings();
      this.plugin.applyCustomCSS();
      this.plugin.refreshAllEditors();
    };

    // Language
    new obsidian.Setting(containerEl)
      .setName(t.language).setDesc(t.languageDesc)
      .addDropdown(d => d
        .addOption('ru', 'Русский').addOption('en', 'English')
        .setValue(s.language)
        .onChange(async v => { await save({ language: v }); this.display(); })
      );

    // Tracking
    containerEl.createEl('h3', { text: t.trackingSection });
    new obsidian.Setting(containerEl).setName(t.tracking).setDesc(t.trackingDesc)
      .addToggle(tg => tg.setValue(s.enabled).onChange(v => save({ enabled: v })));
    new obsidian.Setting(containerEl).setName(t.authorName).setDesc(t.authorNameDesc)
      .addText(tx => tx.setPlaceholder(t.authorNamePh).setValue(s.selfAuthorName)
        .onChange(v => save({ selfAuthorName: v || t.authorNamePh })));

    // Paste dialog
    containerEl.createEl('h3', { text: t.pasteSection });
    new obsidian.Setting(containerEl).setName(t.pasteDialog).setDesc(t.pasteDialogDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogEnabled).onChange(v => save({ pasteDialogEnabled: v })));
    new obsidian.Setting(containerEl).setName(t.pasteDialogRestore).setDesc(t.pasteDialogRestoreDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogRestore).onChange(v => save({ pasteDialogRestore: v })));
    new obsidian.Setting(containerEl).setName(t.defaultPaste).setDesc(t.defaultPasteDesc)
      .addDropdown(d => d
        .addOption(SourceType.SELF,  t.selfLabel)
        .addOption(SourceType.AI,    t.aiLabel)
        .addOption(SourceType.OTHER, t.otherLabel)
        .setValue(s.defaultPasteSource)
        .onChange(v => save({ defaultPasteSource: v }))
      );

    // Tag auto-mark
    containerEl.createEl('h3', { text: t.tagSection });
    new obsidian.Setting(containerEl).setName(t.tagAutoMark).setDesc(t.tagAutoMarkDesc)
      .addToggle(tg => tg.setValue(s.tagAutoMark).onChange(v => save({ tagAutoMark: v })));
    new obsidian.Setting(containerEl).setName(t.tagAutoMarkTags).setDesc(t.tagAutoMarkTagsDesc)
      .addText(tx => tx
        .setPlaceholder(t.tagAutoMarkTagsPh)
        .setValue((s.tagAutoMarkTags || []).join(', '))
        .onChange(v => {
          const tags = v.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean);
          save({ tagAutoMarkTags: tags });
        })
      );

    // Visibility toggles
    containerEl.createEl('h3', { text: t.highlightSection });
    new obsidian.Setting(containerEl).setName(t.showSelf)
      .addToggle(tg => tg.setValue(s.showSelf).onChange(v => save({ showSelf: v })));
    new obsidian.Setting(containerEl).setName(t.showAi)
      .addToggle(tg => tg.setValue(s.showAi).onChange(v => save({ showAi: v })));
    new obsidian.Setting(containerEl).setName(t.showOther)
      .addToggle(tg => tg.setValue(s.showOther).onChange(v => save({ showOther: v })));

    // Per-type style sections
    const addTypeSection = (type, label) => {
      containerEl.createEl('h3', { text: label });

      new obsidian.Setting(containerEl).setName(t.bgEnabled).setDesc(t.bgEnabledDesc)
        .addToggle(tg => tg.setValue(s[`${type}BgEnabled`])
          .onChange(v => save({ [`${type}BgEnabled`]: v })));
      new obsidian.Setting(containerEl).setName(t.bgColor1)
        .addColorPicker(cp => cp.setValue(s[`${type}BgColor1`])
          .onChange(v => save({ [`${type}BgColor1`]: v })));
      new obsidian.Setting(containerEl).setName(t.bgColor2)
        .addColorPicker(cp => cp.setValue(s[`${type}BgColor2`])
          .onChange(v => save({ [`${type}BgColor2`]: v })));
      new obsidian.Setting(containerEl).setName(t.bgColor3)
        .addColorPicker(cp => cp.setValue(s[`${type}BgColor3`])
          .onChange(v => save({ [`${type}BgColor3`]: v })));
      new obsidian.Setting(containerEl).setName(t.bgOpacity)
        .addSlider(sl => sl.setLimits(1, 100, 1).setValue(s[`${type}BgOpacity`])
          .setDynamicTooltip().onChange(v => save({ [`${type}BgOpacity`]: v })));

      new obsidian.Setting(containerEl).setName(t.textGradient).setDesc(t.textGradientDesc)
        .addToggle(tg => tg.setValue(s[`${type}TextGradient`])
          .onChange(v => save({ [`${type}TextGradient`]: v })));
      new obsidian.Setting(containerEl).setName(t.textColor1)
        .addColorPicker(cp => cp.setValue(s[`${type}TextColor1`])
          .onChange(v => save({ [`${type}TextColor1`]: v })));
      new obsidian.Setting(containerEl).setName(t.textColor2)
        .addColorPicker(cp => cp.setValue(s[`${type}TextColor2`])
          .onChange(v => save({ [`${type}TextColor2`]: v })));
      new obsidian.Setting(containerEl).setName(t.textColor3)
        .addColorPicker(cp => cp.setValue(s[`${type}TextColor3`])
          .onChange(v => save({ [`${type}TextColor3`]: v })));
      new obsidian.Setting(containerEl).setName(t.textOpacity)
        .addSlider(sl => sl.setLimits(1, 100, 1).setValue(s[`${type}TextOpacity`])
          .setDynamicTooltip().onChange(v => save({ [`${type}TextOpacity`]: v })));

      new obsidian.Setting(containerEl).setName(t.italic).setDesc(t.italicDesc)
        .addToggle(tg => tg.setValue(s[`${type}Italic`])
          .onChange(v => save({ [`${type}Italic`]: v })));
    };

    addTypeSection('self',  t.selfSection);
    addTypeSection('ai',    t.aiSection);
    addTypeSection('other', t.otherSection);
  }
}

// ─── Main Plugin ─────────────────────────────────────────────────────────────
class YuleAuthPlugin extends obsidian.Plugin {

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.pasteDialogRestore) this.settings.pasteDialogEnabled = true;

    this._pasteDialogSuppressed = false;
    this._tagPromptedFiles      = new Set();
    this._tagIgnoredFiles       = new Set();

    this.db = new YuleAuthDB(this.app);
    await this.db.load();

    this._authorshipField = null;
    this._cmEffects       = null;

    const ext = createEditorExtension(this);
    if (ext) {
      this.registerEditorExtension(ext);
    } else {
      console.warn('[yule-auth] CodeMirror 6 extension could not be created.');
    }

    this.addSettingTab(new YuleAuthSettingsTab(this.app, this));
    this.applyCustomCSS();
    this._registerCommands();
    this._registerEvents();
    console.log('[yule-auth] Plugin loaded');
  }

  onunload() {
    const el = document.getElementById('yule-auth-css');
    if (el) el.remove();
    void this.db.save();
    console.log('[yule-auth] Plugin unloaded');
  }

  async saveSettings() { await this.saveData(this.settings); }

  // ── CSS generation ──────────────────────────────────────────────────────
  applyCustomCSS() {
    let style = document.getElementById('yule-auth-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'yule-auth-css';
      document.head.appendChild(style);
    }

    const s = this.settings;
    const op = (hex, pct) => {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${(pct / 100).toFixed(2)})`;
    };

    const buildCSS = (type) => {
      const bgOn = s[`${type}BgEnabled`];
      const bgC1 = s[`${type}BgColor1`], bgC2 = s[`${type}BgColor2`], bgC3 = s[`${type}BgColor3`];
      const bgOp = s[`${type}BgOpacity`];
      const tgOn = s[`${type}TextGradient`];
      const tC1  = s[`${type}TextColor1`], tC2  = s[`${type}TextColor2`], tC3  = s[`${type}TextColor3`];
      const tOp  = s[`${type}TextOpacity`];
      const it   = s[`${type}Italic`];
      let css    = '';

      if (tgOn) {
        // Text gradient via background-clip: text
        css += `background:linear-gradient(90deg,${op(tC1,tOp)},${op(tC2,tOp)},${op(tC3,tOp)});`
             + `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
        // Background highlight when both are on: use inset box-shadow
        // (doesn't interfere with background-clip: text)
        if (bgOn) {
          css += `box-shadow:inset 0 0 0 1000px ${op(bgC1, bgOp)};`;
        }
      } else if (bgOn) {
        css += `background:linear-gradient(90deg,${op(bgC1,bgOp)},${op(bgC2,bgOp)},${op(bgC3,bgOp)});`
             + `border-radius:2px;`;
      }

      if (it) css += 'font-style:italic;';
      return css;
    };

    style.textContent = `
      .yule-auth-self  { ${buildCSS('self')} }
      .yule-auth-ai    { ${buildCSS('ai')} }
      .yule-auth-other { ${buildCSS('other')} }
    `;
  }

  refreshAllEditors() {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    for (const leaf of leaves) {
      const cm = leaf.view?.editor?.cm;
      if (cm) { try { cm.dispatch({}); } catch { /* ignore */ } }
    }
  }

  // ── Commands ─────────────────────────────────────────────────────────────
  _registerCommands() {
    this.addCommand({
      id: 'mark-as-self', name: 'Mark selection as self',
      editorCallback: (_ed, ctx) => this._markSelection(ctx, SourceType.SELF),
    });
    this.addCommand({
      id: 'mark-as-ai', name: 'Mark selection as AI',
      editorCallback: (_ed, ctx) => this._markSelection(ctx, SourceType.AI),
    });
    this.addCommand({
      id: 'mark-as-other', name: 'Mark selection as other (human)',
      editorCallback: (_ed, ctx) => this._markSelection(ctx, SourceType.OTHER),
    });
    this.addCommand({
      id: 'toggle-highlighting', name: 'Toggle authorship highlighting',
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        void this.saveSettings();
        this.applyCustomCSS();
        this.refreshAllEditors();
      },
    });
  }

  _markSelection(ctx, sourceType) {
    if (!this._cmEffects || !this._authorshipField) return;
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    const { from, to } = cm.state.selection.main;
    if (from === to) { new obsidian.Notice('[yule-auth] No text selected'); return; }
    const authorName =
      sourceType === SourceType.SELF ? this.settings.selfAuthorName :
      sourceType === SourceType.AI   ? 'AI' : 'Other';
    cm.dispatch({ effects: this._cmEffects.markEffect.of({ from, to, sourceType, authorName }) });
    this._scheduleDBSave();
  }

  // ── Events ───────────────────────────────────────────────────────────────
  _registerEvents() {
    // File open: load ranges + check tags
    this.registerEvent(
      this.app.workspace.on('file-open', async (file) => {
        if (!file) return;
        await this._loadRangesForFile(file);
        this._checkTagsForAutoMark(file);
      })
    );

    // Metadata change: re-check tags on the currently open file
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const active = this.app.workspace.getActiveFile();
        if (!active || active.path !== file.path) return;
        this._checkTagsForAutoMark(file);
      })
    );

    // Debounced save on edit
    this._debouncedSave = obsidian.debounce(() => this._saveCurrentFileRanges(), 1800, true);
    this.registerEvent(this.app.workspace.on('editor-change', () => this._debouncedSave()));

    // Rename / delete
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      this.db.renameFile(oldPath, file.path); void this.db.save();
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      this.db.deleteFile(file.path); void this.db.save();
    }));

    // Paste intercept
    this.registerDomEvent(document, 'paste', (e) => {
      if (!this.settings.enabled || !this.settings.pasteDialogEnabled) return;
      if (this._pasteDialogSuppressed) return;
      const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!activeView) return;
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!this._isDialogWorthy(text)) return;
      e.preventDefault(); e.stopPropagation();
      this._handlePasteWithDialog(activeView, text);
    }, true);
  }

  _isDialogWorthy(text) {
    return text.trim().split(/\s+/).filter(Boolean).length >= 5 && /[.!?…]/.test(text);
  }

  _handlePasteWithDialog(activeView, text) {
    new PasteAuthorshipModal(this.app, this, text,
      (sourceType) => this._applyPastedText(activeView, text, sourceType)
    ).open();
  }

  _applyPastedText(activeView, text, sourceType) {
    const editor = activeView.editor;
    if (!editor) return;
    const cursor   = editor.getCursor();
    const cm       = activeView.editor?.cm;
    let insertFrom = 0;
    if (cm) {
      try { const line = cm.state.doc.line(cursor.line + 1); insertFrom = line.from + cursor.ch; }
      catch { insertFrom = 0; }
    }
    editor.replaceSelection(text);
    if (sourceType && this._cmEffects && this._authorshipField && cm) {
      const authorName =
        sourceType === SourceType.SELF ? this.settings.selfAuthorName :
        sourceType === SourceType.AI   ? 'AI' : 'Other';
      try {
        cm.dispatch({ effects: this._cmEffects.markEffect.of({
          from: insertFrom, to: insertFrom + text.length, sourceType, authorName,
        })});
      } catch (e) { console.warn('[yule-auth] mark after paste error', e); }
    }
    this._scheduleDBSave();
  }

  // ── Tag auto-mark ────────────────────────────────────────────────────────
  _getFileTags(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const tags = [];
    if (cache.frontmatter?.tags) {
      const ft = cache.frontmatter.tags;
      if (Array.isArray(ft)) tags.push(...ft);
      else if (typeof ft === 'string') tags.push(ft);
    }
    if (cache.tags) cache.tags.forEach(t => tags.push(t.tag.replace(/^#/, '')));
    return tags.map(t => t.replace(/^#/, '').toLowerCase().trim());
  }

  _checkTagsForAutoMark(file) {
    if (!file || !this.settings.tagAutoMark) return;
    const triggerList = (this.settings.tagAutoMarkTags || [])
      .map(t => t.toLowerCase().trim()).filter(Boolean);
    if (!triggerList.length) return;
    if (this._tagIgnoredFiles.has(file.path)) return;

    const matchedTag = this._getFileTags(file).find(tag => triggerList.includes(tag));
    if (!matchedTag) return;

    const promptKey = `${file.path}::${matchedTag}`;
    if (this._tagPromptedFiles.has(promptKey)) return;
    this._tagPromptedFiles.add(promptKey);

    new TagMarkModal(this.app, this, file, matchedTag, async (action) => {
      if (action === 'mark')  await this._markEntireFileAsOther(file);
      if (action === 'never') this._tagIgnoredFiles.add(file.path);
    }).open();
  }

  async _markEntireFileAsOther(file) {
    try {
      const content = await this.app.vault.read(file);
      this.db.setRanges(file.path, [{
        from: 0, length: content.length,
        sourceType: SourceType.OTHER, authorName: 'Other',
      }]);
      await this.db.save();
      await this._loadRangesForFile(file);
    } catch (e) { console.error('[yule-auth] markEntireFileAsOther error', e); }
  }

  // ── DB helpers ───────────────────────────────────────────────────────────
  async _loadRangesForFile(file) {
    if (!this._cmEffects || !this._authorshipField) return;
    const ranges     = this.db.getRanges(file.path);
    const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!activeView) return;
    const cm = activeView.editor?.cm;
    if (!cm) return;
    try { cm.dispatch({ effects: this._cmEffects.setRangesEffect.of(ranges) }); }
    catch (e) { console.warn('[yule-auth] load ranges error', e); }
  }

  async _saveCurrentFileRanges() {
    if (!this._authorshipField) return;
    const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!activeView?.file) return;
    const cm = activeView.editor?.cm;
    if (!cm) return;
    try {
      const state = cm.state.field(this._authorshipField, false);
      if (!state) return;
      this.db.setRanges(activeView.file.path, [...state.ranges]);
      await this.db.save();
    } catch (e) { console.warn('[yule-auth] save ranges error', e); }
  }

  _scheduleDBSave() { setTimeout(() => void this._saveCurrentFileRanges(), 100); }
}

module.exports = YuleAuthPlugin;
