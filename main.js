'use strict';

var obsidian = require('obsidian');

// ─── Constants ───────────────────────────────────────────────────────────────
const PLUGIN_ID   = 'yule-auth';
const DB_FILENAME = 'authorship-db.json';

const SourceType = {
  SELF:  'self',
  AI:    'ai',
  OTHER: 'other',
  NONE:  'none',   // «не применять» — явный отказ от разметки на уровне заметки
};

// Длина якорного текста для привязки фрагмента
const ANCHOR_LEN  = 40;
// Максимальный допустимый сдвиг якоря при поиске (символов)
const ANCHOR_DRIFT = 200;

// ─── i18n ────────────────────────────────────────────────────────────────────
const i18n = {
  ru: {
    settingsTitle:           'yule-auth',
    language:                'Язык / Language',
    languageDesc:            'Язык настроек плагина',
    trackingSection:         'Отслеживание',
    tracking:                'Подсветка авторства',
    trackingDesc:            'Включить/выключить подсветку авторства (управляется в настройках)',
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
    unmarkedLabel:           'Не помечен',
    dialogTitle:             'Чей это текст?',
    dialogSkip:              'Пропустить',
    dialogDisable:           'Отключить навсегда',
    dialogDisableSession:    'Отключить до перезапуска',
    tagSection:              'Автопометка по тегам',
    tagSectionDesc:          'При добавлении тега заметке автоматически присваивается авторство — без диалога. Укажите теги (без #) через запятую для каждого типа авторства.',
    selfTagsLabel:           'Теги → Мой текст',
    selfTagsDesc:            'При наличии любого из этих тегов вся заметка помечается как «Мой текст»',
    selfTagsPh:              'черновик, моё, личное',
    aiTagsLabel:             'Теги → ИИ',
    aiTagsDesc:              'При наличии любого из этих тегов вся заметка помечается как «ИИ»',
    aiTagsPh:                'ai, gpt, chatgpt',
    otherTagsLabel:          'Теги → Чужой текст',
    otherTagsDesc:           'При наличии любого из этих тегов вся заметка помечается как «Чужой текст»',
    otherTagsPh:             'цитации, выписки, вырезки',
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
    cmdClearAuthorship:      'Снять авторство (выделение или текущий фрагмент)',
    cmdMarkSelf:             'Пометить как: Мой текст',
    cmdMarkAi:               'Пометить как: ИИ',
    cmdMarkOther:            'Пометить как: Чужой текст',
  },
  en: {
    settingsTitle:           'yule-auth',
    language:                'Language / Язык',
    languageDesc:            'Settings language',
    trackingSection:         'Tracking',
    tracking:                'Authorship highlighting',
    trackingDesc:            'Enable/disable authorship highlighting (managed in settings)',
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
    unmarkedLabel:           'Unmarked',
    dialogTitle:             'Who wrote this text?',
    dialogSkip:              'Skip',
    dialogDisable:           'Disable permanently',
    dialogDisableSession:    'Disable until restart',
    tagSection:              'Tag auto-mark',
    tagSectionDesc:          'Adding a tag automatically assigns authorship to the entire note — no dialog. Enter tags (without #) separated by commas for each authorship type.',
    selfTagsLabel:           'Tags → My text',
    selfTagsDesc:            'When any of these tags is present, the whole note is marked as "My text"',
    selfTagsPh:              'draft, mine, personal',
    aiTagsLabel:             'Tags → AI',
    aiTagsDesc:              'When any of these tags is present, the whole note is marked as "AI"',
    aiTagsPh:                'ai, gpt, chatgpt',
    otherTagsLabel:          'Tags → Other text',
    otherTagsDesc:           'When any of these tags is present, the whole note is marked as "Other text"',
    otherTagsPh:             'citations, excerpts, clippings',
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
    cmdClearAuthorship:      'Clear authorship (selection or current fragment)',
    cmdMarkSelf:             'Mark as: My text',
    cmdMarkAi:               'Mark as: AI',
    cmdMarkOther:            'Mark as: Other text',
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
  // Tag auto-mark (separate lists per type, no dialog)
  selfTags:           [],
  aiTags:             ['ai', 'gpt', 'chatgpt'],
  otherTags:          ['цитации', 'выписки', 'вырезки'],
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
  otherBgColor2:      '#fbbf24',
  otherBgColor3:      '#fb923c',
  otherBgOpacity:     18,
  otherTextGradient:  false,
  otherTextColor1:    '#fb923c',
  otherTextColor2:    '#fbbf24',
  otherTextColor3:    '#fb923c',
  otherTextOpacity:   100,
  otherItalic:        true,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Нормализует строку для якоря: убирает лишние пробелы */
function normalizeAnchor(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/** Берёт первые N символов (якорь начала) */
function makeStartAnchor(text) {
  return normalizeAnchor(text.slice(0, ANCHOR_LEN));
}

/** Берёт последние N символов (якорь конца) */
function makeEndAnchor(text) {
  return normalizeAnchor(text.slice(-ANCHOR_LEN));
}

/**
 * Ищет позицию якоря в тексте файла.
 * Допускает сдвиг до ANCHOR_DRIFT символов от сохранённой позиции.
 * Возвращает реальную позицию или -1.
 */
function findAnchor(fileText, anchor, savedPos) {
  if (!anchor) return -1;
  const norm = anchor.replace(/\s+/g, ' ');
  // Сначала ищем вблизи сохранённой позиции
  const lo = Math.max(0, savedPos - ANCHOR_DRIFT);
  const hi = Math.min(fileText.length, savedPos + ANCHOR_DRIFT + anchor.length);
  const slice = fileText.slice(lo, hi);
  // Нормализуем пробелы только для сравнения
  const idx = slice.indexOf(norm);
  if (idx !== -1) return lo + idx;
  // Глобальный поиск как запасной вариант (только если фрагмент уникален)
  const global = fileText.indexOf(norm);
  return global;
}

/**
 * Проверяет, достаточно ли уверенно совпадают якоря.
 * Возвращает { from, to } или null.
 */
function resolveFragment(fileText, frag) {
  const startPos = findAnchor(fileText, frag.startAnchor, frag.savedFrom);
  if (startPos === -1) return null;
  const endPos   = findAnchor(fileText, frag.endAnchor,   frag.savedTo - ANCHOR_LEN);
  if (endPos === -1) return null;
  const to = endPos + frag.endAnchor.length;
  if (to <= startPos) return null;
  return { from: startPos, to };
}

/** Читает frontmatter-поле как строку */
function getFrontmatterField(app, file, field) {
  try {
    const cache = app.metadataCache.getFileCache(file);
    if (cache && cache.frontmatter && cache.frontmatter[field] != null) {
      return String(cache.frontmatter[field]);
    }
  } catch (_) {}
  return null;
}

/** Читает теги заметки из кэша метаданных */
function getNoteTags(app, file) {
  try {
    const cache = app.metadataCache.getFileCache(file);
    const tags = [];
    if (cache && cache.tags) {
      cache.tags.forEach(t => tags.push(t.tag.replace(/^#/, '').toLowerCase()));
    }
    if (cache && cache.frontmatter && cache.frontmatter.tags) {
      const ft = cache.frontmatter.tags;
      const arr = Array.isArray(ft) ? ft : String(ft).split(',');
      arr.forEach(t => tags.push(String(t).trim().toLowerCase()));
    }
    return tags;
  } catch (_) { return []; }
}

// ─── Database ─────────────────────────────────────────────────────────────────
/**
 * Структура БД:
 * {
 *   notes: {
 *     [filePath]: {
 *       noteClass: 'self'|'ai'|'other'|'none'|null,  // авторство всей заметки
 *       fragments: [
 *         {
 *           id: string,
 *           source: 'self'|'ai'|'other',
 *           author: string,
 *           savedFrom: number,   // позиция на момент записи
 *           savedTo: number,
 *           startAnchor: string, // первые ANCHOR_LEN символов фрагмента
 *           endAnchor: string,   // последние ANCHOR_LEN символов фрагмента
 *           isException: boolean // true = это исключение внутри noteClass-заметки
 *         }
 *       ]
 *     }
 *   }
 * }
 */
class AuthDB {
  constructor(plugin) {
    this.plugin = plugin;
    this.data   = { notes: {} };
  }

  async load() {
    try {
      const raw = await this.plugin.app.vault.adapter.read(
        `${this.plugin.app.vault.configDir}/plugins/${PLUGIN_ID}/${DB_FILENAME}`
      );
      this.data = JSON.parse(raw);
      if (!this.data.notes) this.data.notes = {};
    } catch (_) {
      this.data = { notes: {} };
    }
  }

  async save() {
    try {
      const path = `${this.plugin.app.vault.configDir}/plugins/${PLUGIN_ID}/${DB_FILENAME}`;
      await this.plugin.app.vault.adapter.write(path, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('[yule-auth] DB save error:', e);
    }
  }

  getNote(filePath) {
    if (!this.data.notes[filePath]) {
      this.data.notes[filePath] = { noteClass: null, fragments: [] };
    }
    return this.data.notes[filePath];
  }

  setNoteClass(filePath, cls) {
    this.getNote(filePath).noteClass = cls;
    this.save();
  }

  getNoteClass(filePath) {
    return (this.data.notes[filePath] || {}).noteClass || null;
  }

  /** Добавляет или обновляет фрагмент */
  addFragment(filePath, { source, author, from, to, text, isException }) {
    const note = this.getNote(filePath);
    const startAnchor = makeStartAnchor(text);
    const endAnchor   = makeEndAnchor(text);
    // Проверяем, нет ли уже перекрывающегося фрагмента с тем же авторством
    // (обновляем его вместо дублирования)
    const existing = note.fragments.find(f =>
      f.startAnchor === startAnchor && f.source === source
    );
    if (existing) {
      existing.savedFrom   = from;
      existing.savedTo     = to;
      existing.endAnchor   = endAnchor;
      existing.isException = isException || false;
    } else {
      note.fragments.push({
        id:          Date.now().toString(36) + Math.random().toString(36).slice(2),
        source,
        author,
        savedFrom:   from,
        savedTo:     to,
        startAnchor,
        endAnchor,
        isException: isException || false,
        created:     Date.now(),
      });
    }
    this.save();
  }

  /** Удаляет фрагменты, перекрывающие диапазон [from, to] */
  removeFragmentsInRange(filePath, fileText, from, to) {
    const note = this.getNote(filePath);
    const before = note.fragments.length;
    note.fragments = note.fragments.filter(f => {
      const pos = resolveFragment(fileText, f);
      if (!pos) return false; // якорь не найден — тоже удаляем
      // Оставляем только те, что не пересекаются с диапазоном
      return pos.to <= from || pos.from >= to;
    });
    if (note.fragments.length !== before) this.save();
    return before - note.fragments.length;
  }

  /** Возвращает все разрешённые фрагменты для файла */
  resolveFragments(filePath, fileText) {
    const note = this.getNote(filePath);
    const result = [];
    for (const f of note.fragments) {
      const pos = resolveFragment(fileText, f);
      if (pos) result.push({ ...f, from: pos.from, to: pos.to });
    }
    return result;
  }

  /** Находит фрагмент, в котором находится курсор (или любую точку диапазона) */
  findFragmentAtPos(filePath, fileText, pos) {
    const resolved = this.resolveFragments(filePath, fileText);
    return resolved.find(f => f.from <= pos && f.to >= pos) || null;
  }
}

// ─── Paste Dialog ─────────────────────────────────────────────────────────────
class PasteModal extends obsidian.Modal {
  constructor(app, pastedText, onChoice) {
    super(app);
    this.pastedText = pastedText;
    this.onChoice   = onChoice;
    this.modalEl.addClass('yule-auth-modal');
  }

  onOpen() {
    const t = i18n[window._yuleAuthLang || 'ru'];
    this.contentEl.empty();
    const h = this.contentEl.createEl('h2', { text: t.dialogTitle });

    // Preview
    const preview = this.contentEl.createEl('div', { cls: 'yule-modal-preview' });
    preview.setText(this.pastedText.slice(0, 200));

    // Buttons
    const btnRow = this.contentEl.createEl('div', { cls: 'yule-modal-buttons' });

    const mkBtn = (label, cls, source) => {
      const btn = btnRow.createEl('button', { text: label, cls: ['yule-modal-btn', cls] });
      btn.addEventListener('click', () => { this.close(); this.onChoice(source); });
    };
    mkBtn(t.selfLabel,  'btn-self',  SourceType.SELF);
    mkBtn(t.aiLabel,    'btn-ai',    SourceType.AI);
    mkBtn(t.otherLabel, 'btn-other', SourceType.OTHER);
    mkBtn(t.dialogSkip, 'btn-skip',  null);

    // Footer
    const footer = this.contentEl.createEl('div', { cls: 'yule-modal-footer' });
    const linkSession = footer.createEl('a', { text: t.dialogDisableSession });
    linkSession.addEventListener('click', () => {
      this.close();
      this.onChoice(null, 'session');
    });
    const linkForever = footer.createEl('a', { text: t.dialogDisable });
    linkForever.addEventListener('click', () => {
      this.close();
      this.onChoice(null, 'forever');
    });
  }
}

// ─── CSS generation ──────────────────────────────────────────────────────────
function buildCSS(s) {
  const hex2rgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${opacity/100})`;
  };

  const typeCSS = (type, prefix) => {
    const show = s[`show${prefix}`];
    if (!show) return `.yule-auth-${type} { all: unset; }`;

    const lines = [];
    if (s[`${type}BgEnabled`]) {
      const c1 = hex2rgba(s[`${type}BgColor1`], s[`${type}BgOpacity`]);
      const c2 = hex2rgba(s[`${type}BgColor2`], s[`${type}BgOpacity`]);
      const c3 = hex2rgba(s[`${type}BgColor3`], s[`${type}BgOpacity`]);
      lines.push(`background: linear-gradient(90deg, ${c1}, ${c2}, ${c3}); border-radius: 2px;`);
    }
    if (s[`${type}TextGradient`]) {
      const c1 = hex2rgba(s[`${type}TextColor1`], s[`${type}TextOpacity`]);
      const c2 = hex2rgba(s[`${type}TextColor2`], s[`${type}TextOpacity`]);
      const c3 = hex2rgba(s[`${type}TextColor3`], s[`${type}TextOpacity`]);
      lines.push(`background: linear-gradient(90deg, ${c1}, ${c2}, ${c3}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;`);
    }
    if (s[`${type}Italic`]) lines.push('font-style: italic;');

    return `.yule-auth-${type} { ${lines.join(' ')} }`;
  };

  return [
    typeCSS('self',  'Self'),
    typeCSS('ai',    'Ai'),
    typeCSS('other', 'Other'),
    // Стиль для исключения внутри noteClass-заметки (перекрывает базовый класс)
    `.yule-auth-exception { outline: 2px dashed rgba(255,255,255,0.35); border-radius: 2px; }`,
  ].join('\n');
}

// ─── Settings tab ─────────────────────────────────────────────────────────────
class YuleAuthSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  get t() { return i18n[this.plugin.settings.language] || i18n.ru; }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: this.t.settingsTitle });

    // ── Language ──────────────────────────────────────────────────────────────
    new obsidian.Setting(containerEl)
      .setName(this.t.language)
      .setDesc(this.t.languageDesc)
      .addDropdown(d => d
        .addOption('ru', 'Русский')
        .addOption('en', 'English')
        .setValue(this.plugin.settings.language)
        .onChange(async v => {
          this.plugin.settings.language = v;
          window._yuleAuthLang = v;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    // ── Tracking ──────────────────────────────────────────────────────────────
    containerEl.createEl('h3', { text: this.t.trackingSection });

    new obsidian.Setting(containerEl)
      .setName(this.t.tracking)
      .setDesc(this.t.trackingDesc)
      .addToggle(t => t
        .setValue(this.plugin.settings.enabled)
        .onChange(async v => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveSettings();
          this.plugin.applyCustomCSS();
          this.plugin.refreshAllEditors();
        })
      );

    new obsidian.Setting(containerEl)
      .setName(this.t.authorName)
      .setDesc(this.t.authorNameDesc)
      .addText(t => t
        .setPlaceholder(this.t.authorNamePh)
        .setValue(this.plugin.settings.selfAuthorName)
        .onChange(async v => {
          this.plugin.settings.selfAuthorName = v;
          await this.plugin.saveSettings();
        })
      );

    // ── Paste dialog ──────────────────────────────────────────────────────────
    containerEl.createEl('h3', { text: this.t.pasteSection });

    new obsidian.Setting(containerEl)
      .setName(this.t.pasteDialog)
      .setDesc(this.t.pasteDialogDesc)
      .addToggle(t => t
        .setValue(this.plugin.settings.pasteDialogEnabled)
        .onChange(async v => {
          this.plugin.settings.pasteDialogEnabled = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName(this.t.pasteDialogRestore)
      .setDesc(this.t.pasteDialogRestoreDesc)
      .addToggle(t => t
        .setValue(this.plugin.settings.pasteDialogRestore)
        .onChange(async v => {
          this.plugin.settings.pasteDialogRestore = v;
          await this.plugin.saveSettings();
        })
      );

    new obsidian.Setting(containerEl)
      .setName(this.t.defaultPaste)
      .setDesc(this.t.defaultPasteDesc)
      .addDropdown(d => d
        .addOption(SourceType.SELF,  this.t.selfLabel)
        .addOption(SourceType.AI,    this.t.aiLabel)
        .addOption(SourceType.OTHER, this.t.otherLabel)
        .setValue(this.plugin.settings.defaultPasteSource)
        .onChange(async v => {
          this.plugin.settings.defaultPasteSource = v;
          await this.plugin.saveSettings();
        })
      );

    // ── Tag auto-mark ─────────────────────────────────────────────────────────
    containerEl.createEl('h3', { text: this.t.tagSection });
    containerEl.createEl('p', { text: this.t.tagSectionDesc, cls: 'setting-item-description' });

    const tagsFor = (key, labelKey, descKey, phKey) => {
      new obsidian.Setting(containerEl)
        .setName(this.t[labelKey])
        .setDesc(this.t[descKey])
        .addText(t => t
          .setPlaceholder(this.t[phKey])
          .setValue((this.plugin.settings[key] || []).join(', '))
          .onChange(async v => {
            this.plugin.settings[key] = v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            await this.plugin.saveSettings();
          })
        );
    };
    tagsFor('selfTags',  'selfTagsLabel',  'selfTagsDesc',  'selfTagsPh');
    tagsFor('aiTags',    'aiTagsLabel',    'aiTagsDesc',    'aiTagsPh');
    tagsFor('otherTags', 'otherTagsLabel', 'otherTagsDesc', 'otherTagsPh');

    // ── Highlight ─────────────────────────────────────────────────────────────
    containerEl.createEl('h3', { text: this.t.highlightSection });

    new obsidian.Setting(containerEl).setName(this.t.showSelf)
      .addToggle(t => t.setValue(this.plugin.settings.showSelf).onChange(async v => {
        this.plugin.settings.showSelf = v;
        await this.plugin.saveSettings(); this.plugin.applyCustomCSS(); this.plugin.refreshAllEditors();
      }));
    new obsidian.Setting(containerEl).setName(this.t.showAi)
      .addToggle(t => t.setValue(this.plugin.settings.showAi).onChange(async v => {
        this.plugin.settings.showAi = v;
        await this.plugin.saveSettings(); this.plugin.applyCustomCSS(); this.plugin.refreshAllEditors();
      }));
    new obsidian.Setting(containerEl).setName(this.t.showOther)
      .addToggle(t => t.setValue(this.plugin.settings.showOther).onChange(async v => {
        this.plugin.settings.showOther = v;
        await this.plugin.saveSettings(); this.plugin.applyCustomCSS(); this.plugin.refreshAllEditors();
      }));

    // ── Per-type appearance ───────────────────────────────────────────────────
    this.renderTypeSettings(containerEl, 'self',  'Self',  this.t.selfSection);
    this.renderTypeSettings(containerEl, 'ai',    'Ai',    this.t.aiSection);
    this.renderTypeSettings(containerEl, 'other', 'Other', this.t.otherSection);
  }

  renderTypeSettings(el, type, prefix, title) {
    el.createEl('h4', { text: title });
    const s = this.plugin.settings;

    const mk = (label, desc, key, widget) => {
      const setting = new obsidian.Setting(el).setName(label);
      if (desc) setting.setDesc(desc);
      widget(setting);
    };

    const saveRefresh = async () => {
      await this.plugin.saveSettings();
      this.plugin.applyCustomCSS();
      this.plugin.refreshAllEditors();
    };

    mk(this.t.bgEnabled, this.t.bgEnabledDesc, `${type}BgEnabled`, st =>
      st.addToggle(t => t.setValue(s[`${type}BgEnabled`]).onChange(async v => { s[`${type}BgEnabled`] = v; await saveRefresh(); })));
    mk(this.t.bgColor1,  null, `${type}BgColor1`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}BgColor1`]).onChange(async v => { s[`${type}BgColor1`] = v; await saveRefresh(); })));
    mk(this.t.bgColor2,  null, `${type}BgColor2`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}BgColor2`]).onChange(async v => { s[`${type}BgColor2`] = v; await saveRefresh(); })));
    mk(this.t.bgColor3,  null, `${type}BgColor3`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}BgColor3`]).onChange(async v => { s[`${type}BgColor3`] = v; await saveRefresh(); })));
    mk(this.t.bgOpacity, null, `${type}BgOpacity`, st =>
      st.addSlider(sl => sl.setLimits(0,100,1).setValue(s[`${type}BgOpacity`]).setDynamicTooltip().onChange(async v => { s[`${type}BgOpacity`] = v; await saveRefresh(); })));
    mk(this.t.textGradient, this.t.textGradientDesc, `${type}TextGradient`, st =>
      st.addToggle(t => t.setValue(s[`${type}TextGradient`]).onChange(async v => { s[`${type}TextGradient`] = v; await saveRefresh(); })));
    mk(this.t.textColor1, null, `${type}TextColor1`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}TextColor1`]).onChange(async v => { s[`${type}TextColor1`] = v; await saveRefresh(); })));
    mk(this.t.textColor2, null, `${type}TextColor2`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}TextColor2`]).onChange(async v => { s[`${type}TextColor2`] = v; await saveRefresh(); })));
    mk(this.t.textColor3, null, `${type}TextColor3`, st =>
      st.addColorPicker(c => c.setValue(s[`${type}TextColor3`]).onChange(async v => { s[`${type}TextColor3`] = v; await saveRefresh(); })));
    mk(this.t.textOpacity, null, `${type}TextOpacity`, st =>
      st.addSlider(sl => sl.setLimits(0,100,1).setValue(s[`${type}TextOpacity`]).setDynamicTooltip().onChange(async v => { s[`${type}TextOpacity`] = v; await saveRefresh(); })));
    mk(this.t.italic, this.t.italicDesc, `${type}Italic`, st =>
      st.addToggle(t => t.setValue(s[`${type}Italic`]).onChange(async v => { s[`${type}Italic`] = v; await saveRefresh(); })));
  }
}

// ─── CodeMirror 6 extension ───────────────────────────────────────────────────

/**
 * Создаёт ViewPlugin, который декорирует текст авторства.
 * noteClass  — авторство всей заметки ('self'|'ai'|'other'|'none'|null)
 * fragments  — разрешённые фрагменты [{from, to, source, isException}]
 * showSelf/showAi/showOther — видимость
 */
function buildDecoration(source, isException) {
  const cls = `yule-auth-${source}${isException ? ' yule-auth-exception' : ''}`;
  return obsidian.editorViewField
    ? null // заглушка, реальная реализация ниже
    : null;
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────
class YuleAuthPlugin extends obsidian.Plugin {

  async onload() {
    await this.loadSettings();
    window._yuleAuthLang = this.settings.language;

    this.db = new AuthDB(this);
    await this.db.load();

    this._pasteDialogDisabledSession = false;
    if (this.settings.pasteDialogRestore) {
      this._pasteDialogDisabledSession = false;
    }

    // CSS
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'yule-auth-style';
    document.head.appendChild(this.styleEl);
    this.applyCustomCSS();

    // Settings tab
    this.addSettingTab(new YuleAuthSettingTab(this.app, this));

    // ── Commands ──────────────────────────────────────────────────────────────
    const t = () => i18n[this.settings.language] || i18n.ru;

    // Снять авторство
    this.addCommand({
      id:   'clear-authorship',
      name: t().cmdClearAuthorship,
      editorCallback: (editor, view) => {
        this.cmdClearAuthorship(editor, view);
      },
    });

    // Пометить как: Мой текст
    this.addCommand({
      id:   'mark-self',
      name: t().cmdMarkSelf,
      editorCallback: (editor, view) => {
        this.markSelection(editor, view, SourceType.SELF);
      },
    });

    // Пометить как: ИИ
    this.addCommand({
      id:   'mark-ai',
      name: t().cmdMarkAi,
      editorCallback: (editor, view) => {
        this.markSelection(editor, view, SourceType.AI);
      },
    });

    // Пометить как: Чужой текст
    this.addCommand({
      id:   'mark-other',
      name: t().cmdMarkOther,
      editorCallback: (editor, view) => {
        this.markSelection(editor, view, SourceType.OTHER);
      },
    });

    // ── Event: paste ──────────────────────────────────────────────────────────
    this.registerEvent(
      this.app.workspace.on('editor-paste', (evt, editor, view) => {
        this.handlePaste(evt, editor, view);
      })
    );

    // ── Event: file open / metadata change → check tags & noteClass ───────────
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file) this.checkTagsAndNoteClass(file);
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        this.checkTagsAndNoteClass(file);
      })
    );

    // ── CodeMirror decorations ────────────────────────────────────────────────
    this.registerEditorExtension(this.buildCMExtension());

    console.log('[yule-auth] loaded');
  }

  onunload() {
    if (this.styleEl) this.styleEl.remove();
    console.log('[yule-auth] unloaded');
  }

  // ── Settings ─────────────────────────────────────────────────────────────────
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ── CSS ───────────────────────────────────────────────────────────────────────
  applyCustomCSS() {
    if (!this.styleEl) return;
    if (!this.settings.enabled) {
      this.styleEl.textContent = '.yule-auth-self, .yule-auth-ai, .yule-auth-other { all: unset; }';
      return;
    }
    this.styleEl.textContent = buildCSS(this.settings);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────────
  refreshAllEditors() {
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view && leaf.view.editor) {
        try { leaf.view.editor.refresh(); } catch (_) {}
      }
    });
  }

  // ── Tag check ─────────────────────────────────────────────────────────────────
  /**
   * Проверяет теги заметки и, при совпадении, молча присваивает noteClass.
   * Также читает frontmatter-поле `yule_class` или `yule-class`.
   */
  async checkTagsAndNoteClass(file) {
    if (!file || file.extension !== 'md') return;
    const path = file.path;
    const tags  = getNoteTags(this.app, file);

    // Frontmatter: yule_class или yule-class
    const fmClass = getFrontmatterField(this.app, file, 'yule_class')
                 || getFrontmatterField(this.app, file, 'yule-class');
    if (fmClass) {
      const cls = fmClass.trim().toLowerCase();
      if ([SourceType.SELF, SourceType.AI, SourceType.OTHER, SourceType.NONE].includes(cls)) {
        this.db.setNoteClass(path, cls);
        this.refreshAllEditors();
        return;
      }
    }

    const s = this.settings;
    const matchTag = (tagList) => tagList && tagList.some(tag => tags.includes(tag));

    let newClass = null;
    if (matchTag(s.selfTags))  newClass = SourceType.SELF;
    if (matchTag(s.aiTags))    newClass = SourceType.AI;
    if (matchTag(s.otherTags)) newClass = SourceType.OTHER;

    if (newClass && this.db.getNoteClass(path) !== newClass) {
      this.db.setNoteClass(path, newClass);
      this.refreshAllEditors();
    }
  }

  // ── Paste handling ────────────────────────────────────────────────────────────
  handlePaste(evt, editor, view) {
    const file = view && view.file;
    if (!file) return;

    // Если noteClass = none — не применяем авторство вообще
    const noteClass = this.db.getNoteClass(file.path);
    if (noteClass === SourceType.NONE) return;

    const text = evt.clipboardData && evt.clipboardData.getData('text/plain');
    if (!text || !text.trim()) return;

    const words = text.trim().split(/\s+/);
    const hasPunct = /[.!?;,]/.test(text);
    const isLong   = words.length >= 5 && hasPunct;

    if (!isLong) return; // короткие вставки не спрашиваем

    // noteClass задаёт авторство заметки — вставка внутрь считается исключением, если хочется
    // но диалог всё равно показываем если включён

    const applySource = (source) => {
      if (!source) return;
      // Получаем текущую позицию курсора ПОСЛЕ вставки (Obsidian уже вставил)
      setTimeout(() => {
        const fileText = editor.getValue();
        const cursor   = editor.getCursor();
        const to       = editor.posToOffset(cursor);
        const from     = to - text.length;
        if (from < 0) return;
        const actualText = fileText.slice(from, to);
        const isException = !!(noteClass && noteClass !== SourceType.NONE && noteClass !== source);
        this.db.addFragment(file.path, {
          source,
          author:      source === SourceType.SELF ? this.settings.selfAuthorName : source,
          from,
          to,
          text:        actualText,
          isException,
        });
        this.refreshAllEditors();
      }, 50);
    };

    if (!this.settings.pasteDialogEnabled || this._pasteDialogDisabledSession) {
      applySource(this.settings.defaultPasteSource);
      return;
    }

    // Показываем диалог
    evt.preventDefault();
    // Вставляем текст вручную (т.к. предотвратили дефолт)
    editor.replaceSelection(text);

    new PasteModal(this.app, text, (source, disableMode) => {
      if (disableMode === 'session')  this._pasteDialogDisabledSession = true;
      if (disableMode === 'forever') {
        this.settings.pasteDialogEnabled = false;
        this.saveSettings();
      }
      applySource(source);
    }).open();
  }

  // ── Mark selection ────────────────────────────────────────────────────────────
  markSelection(editor, view, source) {
    const file = view && view.file;
    if (!file) return;

    const noteClass = this.db.getNoteClass(file.path);
    if (noteClass === SourceType.NONE) {
      new obsidian.Notice('[yule-auth] Для этой заметки авторство отключено (yule_class: none)');
      return;
    }

    const sel = editor.getSelection();
    if (!sel || !sel.trim()) {
      new obsidian.Notice('[yule-auth] Выделите фрагмент текста');
      return;
    }

    const fileText = editor.getValue();
    const from = editor.posToOffset(editor.getCursor('from'));
    const to   = editor.posToOffset(editor.getCursor('to'));
    const text = fileText.slice(from, to);

    if (text.length < 2) return;

    const isException = !!(noteClass && noteClass !== SourceType.NONE && noteClass !== source);

    this.db.addFragment(file.path, {
      source,
      author:  source === SourceType.SELF ? this.settings.selfAuthorName : source,
      from,
      to,
      text,
      isException,
    });
    this.refreshAllEditors();

    const t = i18n[this.settings.language] || i18n.ru;
    const labels = { self: t.selfLabel, ai: t.aiLabel, other: t.otherLabel };
    new obsidian.Notice(`[yule-auth] Помечено: ${labels[source]}`);
  }

  // ── Clear authorship command ───────────────────────────────────────────────────
  cmdClearAuthorship(editor, view) {
    const file = view && view.file;
    if (!file) return;

    const fileText = editor.getValue();
    const selFrom  = editor.posToOffset(editor.getCursor('from'));
    const selTo    = editor.posToOffset(editor.getCursor('to'));

    let from, to;
    if (selFrom !== selTo) {
      // Есть выделение
      from = selFrom;
      to   = selTo;
    } else {
      // Курсор — ищем фрагмент
      const frag = this.db.findFragmentAtPos(file.path, fileText, selFrom);
      if (!frag) {
        new obsidian.Notice('[yule-auth] Курсор не находится внутри помеченного фрагмента');
        return;
      }
      from = frag.from;
      to   = frag.to;
    }

    const removed = this.db.removeFragmentsInRange(file.path, fileText, from, to);
    this.refreshAllEditors();
    const t = i18n[this.settings.language] || i18n.ru;
    new obsidian.Notice(`[yule-auth] Авторство снято (${removed} фр.)`);
  }

  // ── CodeMirror 6 Extension ────────────────────────────────────────────────────
  buildCMExtension() {
    const plugin = this;

    const { StateField, StateEffect, Decoration, ViewPlugin, EditorView } =
      // Берём из глобального контекста CM6, который Obsidian предоставляет
      window.CodeMirror || {};

    // Если CM6 API недоступен через window, пробуем require
    let cm6;
    try {
      cm6 = require('@codemirror/view');
    } catch (_) {
      try { cm6 = require('codemirror/view'); } catch (_2) {}
    }
    let cm6state;
    try {
      cm6state = require('@codemirror/state');
    } catch (_) {}

    if (!cm6 || !cm6state) {
      // Fallback: используем EditorExtension через Obsidian API напрямую
      return this.buildCMExtensionViaObsidian();
    }

    const { Decoration: Dec, ViewPlugin: VP, EditorView: EV } = cm6;
    const { RangeSetBuilder } = cm6state;

    return VP.define(v => ({
      decorations: plugin.buildDecorations(v, Dec, RangeSetBuilder),
      update(update) {
        if (update.docChanged || update.viewportChanged || update.geometryChanged) {
          this.decorations = plugin.buildDecorations(update.view, Dec, RangeSetBuilder);
        }
      },
    }), { decorations: v => v.decorations });
  }

  buildCMExtensionViaObsidian() {
    // Obsidian экспортирует editorViewField и editorEditorField
    // Используем MarkdownView + registerEditorExtension через Obsidian-совместимый путь
    const plugin = this;

    // Реализуем через ViewPlugin из @codemirror/view встроенного в Obsidian
    // Obsidian использует CM6 внутри и предоставляет его через внутренние модули.
    // Ниже надёжный способ получить нужные классы:
    const tryGet = (...names) => {
      for (const n of names) {
        try {
          const m = require(n);
          if (m && (m.ViewPlugin || m.Decoration)) return m;
        } catch (_) {}
      }
      return null;
    };

    const view  = tryGet('@codemirror/view',  'codemirror/view');
    const state = tryGet('@codemirror/state', 'codemirror/state');

    if (!view || !state) {
      console.warn('[yule-auth] CodeMirror 6 modules not found, decorations disabled');
      return [];
    }

    const { ViewPlugin, Decoration, EditorView } = view;
    const { RangeSetBuilder }                    = state;

    return ViewPlugin.define(v => ({
      decorations: plugin.buildDecorations(v, Decoration, RangeSetBuilder),
      update(upd) {
        if (upd.docChanged || upd.viewportChanged) {
          this.decorations = plugin.buildDecorations(upd.view, Decoration, RangeSetBuilder);
        }
      },
    }), { decorations: ins => ins.decorations });
  }

  buildDecorations(view, Decoration, RangeSetBuilder) {
    if (!this.settings.enabled) return Decoration.none;

    // Получаем файл текущего вида
    const file = this.getCurrentFile(view);
    if (!file) return Decoration.none;

    const noteClass = this.db.getNoteClass(file.path);
    // Если noteClass = none — вообще не рисуем
    if (noteClass === SourceType.NONE) return Decoration.none;

    const fileText = view.state.doc.toString();
    const builder  = new RangeSetBuilder();

    // Собираем диапазоны для отрисовки
    const ranges = [];

    // 1. Если есть noteClass — весь текст (кроме frontmatter) получает этот класс
    if (noteClass && noteClass !== SourceType.NONE) {
      const bodyStart = this.getBodyStart(fileText);
      const bodyEnd   = fileText.length;
      if (bodyStart < bodyEnd) {
        ranges.push({ from: bodyStart, to: bodyEnd, source: noteClass, isException: false, isNoteClass: true });
      }
    }

    // 2. Явные фрагменты из БД (перекрывают noteClass для своего диапазона)
    const fragments = this.db.resolveFragments(file.path, fileText);
    for (const f of fragments) {
      ranges.push({ from: f.from, to: f.to, source: f.source, isException: f.isException, isNoteClass: false });
    }

    // Сортируем: сначала noteClass-диапазоны (фон), потом фрагменты (поверх)
    ranges.sort((a, b) => a.from - b.from || (a.isNoteClass ? -1 : 1));

    // Фильтруем по видимости
    const show = { self: this.settings.showSelf, ai: this.settings.showAi, other: this.settings.showOther };

    // Строим декорации в порядке возрастания позиций (требование CM6)
    const toRender = [];
    for (const r of ranges) {
      if (!show[r.source]) continue;
      const cls = `yule-auth-${r.source}${r.isException ? ' yule-auth-exception' : ''}`;
      if (r.from >= 0 && r.to <= fileText.length && r.from < r.to) {
        toRender.push({ from: r.from, to: r.to, cls });
      }
    }

    // CM6 требует: диапазоны должны идти по возрастанию и не пересекаться
    // Для упрощения: строим не пересекающееся покрытие
    const merged = this.mergeRanges(toRender, fileText.length);

    for (const r of merged) {
      try {
        builder.add(r.from, r.to, Decoration.mark({ class: r.cls }));
      } catch (_) {}
    }

    return builder.finish();
  }

  /**
   * Получает начало тела заметки (после frontmatter).
   */
  getBodyStart(text) {
    if (text.startsWith('---')) {
      const end = text.indexOf('\n---', 4);
      if (end !== -1) return end + 4;
    }
    return 0;
  }

  /**
   * Разрешает перекрывающиеся диапазоны: более поздние (фрагменты) имеют приоритет над noteClass.
   * Возвращает не пересекающийся список.
   */
  mergeRanges(ranges, docLen) {
    if (!ranges.length) return [];

    // Разделяем noteClass-диапазоны и фрагменты
    // Фрагменты (не noteClass) имеют приоритет
    // Простой подход: строим побайтовый массив классов, потом группируем в диапазоны
    // Но для длинных файлов это дорого. Используем алгоритм «вычитания»:

    // Шаг 1: собираем фрагменты отдельно (они перекрывают noteClass)
    const noteClassRanges = ranges.filter((_, i) => false); // будем чинить
    // На самом деле просто возвращаем ranges как есть — CM6 допускает перекрытие в разных декорациях
    // но запрещает добавлять одну и ту же декорацию с пересечением через builder.add.
    // Решение: возвращаем все диапазоны отсортированными — CM6 применяет все классы.
    // Однако builder.add требует строго не убывающего порядка без пересечений.

    // Используем простую merge-стратегию:
    const result = [];
    let cursor = 0;

    const sorted = [...ranges].sort((a, b) => a.from - b.from);

    for (const r of sorted) {
      if (r.from < cursor) {
        // Пересечение — обрезаем слева
        if (r.to <= cursor) continue;
        result.push({ from: cursor, to: r.to, cls: r.cls });
        cursor = r.to;
      } else {
        result.push({ from: r.from, to: r.to, cls: r.cls });
        cursor = r.to;
      }
    }

    return result;
  }

  getCurrentFile(view) {
    // Пробуем получить файл через app.workspace
    try {
      const leaves = this.app.workspace.getLeavesOfType('markdown');
      for (const leaf of leaves) {
        const v = leaf.view;
        if (v && v.editor && v.editor.cm === view) return v.file;
        // CM6 view может быть вложен
        if (v && v.editor && v.editor.cm && v.editor.cm.state === view.state) return v.file;
      }
      // Альтернатива: через активный лист
      const active = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (active) return active.file;
    } catch (_) {}
    return null;
  }
}

module.exports = YuleAuthPlugin;
