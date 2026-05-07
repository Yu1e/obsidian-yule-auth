'use strict';
var obsidian = require('obsidian');

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════
const PLUGIN_ID   = 'yule-auth';
const DB_FILENAME = 'authorship-db.json';
const RAINBOW_MAX = 2000;
const MAX_COLORS  = 8;

const ST = { SELF: 'self', AI: 'ai', OTHER: 'other' };

// ═══════════════════════════════════════════════════════════════
//  i18n
// ═══════════════════════════════════════════════════════════════
const LNG = {
  ru: {
    language: 'Язык / Language', languageDesc: 'Язык интерфейса настроек',
    generalSection: '⚙ Общее',
    tracking: 'Отслеживание авторства', trackingDesc: 'Включить/выключить подсветку авторства',
    authorName: 'Ваше имя', authorNameDesc: 'Имя автора для пометки «мой текст»', authorNamePh: 'Я',
    pasteSection: '📋 Вставка',
    pasteDialog: 'Диалог при вставке', pasteDialogDesc: 'Запрашивать авторство при вставке ≥5 слов с пунктуацией',
    pasteDialogRestore: 'Восстанавливать при перезапуске', pasteDialogRestoreDesc: 'Включать диалог снова при следующем открытии Obsidian',
    defaultPaste: 'Авторство вставки', defaultPasteDesc: 'По умолчанию, если диалог отключён',
    selfLabel: 'Мой текст', aiLabel: 'ИИ', otherLabel: 'Чужой текст',
    dialogTitle: 'Чей это текст?', dialogSkip: 'Пропустить',
    dialogDisable: 'Отключить до включения вручную',
    dialogDisableSession: 'Отключить до перезапуска',
    tagSection: '🏷 Автопометка по тегам',
    tagAutoEnabled: 'Автопометка по тегам', tagAutoEnabledDesc: 'При обнаружении тега автоматически присваивать класс заметке (без диалога)',
    tagsSelf: 'Теги → мой текст', tagsAi: 'Теги → ИИ', tagsOther: 'Теги → чужой текст',
    tagsDesc: 'Один тег на строку, без символа #',
    highlightSection: '🎨 Выделения',
    showSelf: 'Показывать: мой текст', showAi: 'Показывать: ИИ', showOther: 'Показывать: чужой текст',
    selfSection: '✏ Мой текст', aiSection: '🤖 ИИ', otherSection: '📖 Чужой текст',
    previewSample: 'Образец текста с подсветкой авторства',
    highlightMode: 'Режим подсветки',
    hlGapped: 'С просветами (стандартный)', hlSolid: 'Сплошной (без разрывов)',
    cornerStyle: 'Скругление углов',
    cSharp: 'Прямые', cRound: 'Скруглённые', cPill: 'Пилюля',
    bgEnabled: 'Фоновый градиент', bgEnabledDesc: 'Подсвечивать фон цветом или градиентом',
    bgColors: 'Цвета фона', bgOpacity: 'Интенсивность фона (%)',
    textGradient: 'Градиент шрифта', textGradientDesc: 'Окрашивать текст градиентом (как в iA Writer)',
    textColors: 'Цвета шрифта', textOpacity: 'Интенсивность шрифта (%)',
    italic: 'Курсив', italicDesc: 'Отображать этот тип текста курсивом',
    underline: 'Подчёркивание', underlineDesc: 'Подчёркивать этот тип текста',
    underlineColor: 'Цвет подчёркивания', underlineWidth: 'Толщина подчёркивания (px)',
    rainbow: '🌈 Разноцветные буквы', rainbowDesc: `Каждая буква своего цвета (до ${RAINBOW_MAX} символов на диапазон). Отключает градиент шрифта.`,
    rainbowColors: 'Цвета букв',
    addColor: '+ цвет', removeColor: '×',
  },
  en: {
    language: 'Language / Язык', languageDesc: 'Settings interface language',
    generalSection: '⚙ General',
    tracking: 'Authorship tracking', trackingDesc: 'Enable/disable authorship highlighting',
    authorName: 'Your name', authorNameDesc: 'Author name for "my text" label', authorNamePh: 'Self',
    pasteSection: '📋 Paste',
    pasteDialog: 'Paste dialog', pasteDialogDesc: 'Ask for authorship when pasting ≥5 words with punctuation',
    pasteDialogRestore: 'Restore on restart', pasteDialogRestoreDesc: 'Re-enable dialog on next Obsidian launch',
    defaultPaste: 'Default paste authorship', defaultPasteDesc: 'When dialog is off',
    selfLabel: 'My text', aiLabel: 'AI', otherLabel: 'Other text',
    dialogTitle: 'Who wrote this?', dialogSkip: 'Skip',
    dialogDisable: 'Disable until manually enabled',
    dialogDisableSession: 'Disable until restart',
    tagSection: '🏷 Tag auto-mark',
    tagAutoEnabled: 'Tag auto-mark', tagAutoEnabledDesc: 'Automatically assign note class when a trigger tag is detected (no dialog)',
    tagsSelf: 'Tags → my text', tagsAi: 'Tags → AI', tagsOther: 'Tags → other text',
    tagsDesc: 'One tag per line, without the # symbol',
    highlightSection: '🎨 Highlights',
    showSelf: 'Show: my text', showAi: 'Show: AI', showOther: 'Show: other text',
    selfSection: '✏ My text', aiSection: '🤖 AI', otherSection: '📖 Other text',
    previewSample: 'Sample text with authorship highlight',
    highlightMode: 'Highlight mode',
    hlGapped: 'Gapped (standard)', hlSolid: 'Solid (no line-break gaps)',
    cornerStyle: 'Corner style',
    cSharp: 'Sharp', cRound: 'Rounded', cPill: 'Pill',
    bgEnabled: 'Background gradient', bgEnabledDesc: 'Highlight background with color or gradient',
    bgColors: 'Background colors', bgOpacity: 'Background intensity (%)',
    textGradient: 'Text gradient', textGradientDesc: 'Color text with gradient (like iA Writer)',
    textColors: 'Text colors', textOpacity: 'Text intensity (%)',
    italic: 'Italic', italicDesc: 'Display this text type in italics',
    underline: 'Underline', underlineDesc: 'Underline this text type',
    underlineColor: 'Underline color', underlineWidth: 'Underline thickness (px)',
    rainbow: '🌈 Rainbow letters', rainbowDesc: `Each letter a different color (up to ${RAINBOW_MAX} chars per range). Overrides text gradient.`,
    rainbowColors: 'Letter colors',
    addColor: '+ color', removeColor: '×',
  },
};

// ═══════════════════════════════════════════════════════════════
//  Default settings
// ═══════════════════════════════════════════════════════════════
const DEFAULTS = {
  enabled: true,
  language: 'ru',
  selfAuthorName: 'Я',
  defaultPasteSource: ST.OTHER,
  pasteDialogEnabled: true,
  pasteDialogRestore: true,
  tagAutoEnabled: true,
  tagsSelf:  [],
  tagsAi:    [],
  tagsOther: ['цитации', 'выписки', 'вырезки'],
  showSelf: true, showAi: true, showOther: true,
  // Self
  selfHighlightMode:'gapped', selfCornerStyle:'round',
  selfBgEnabled:false, selfBgColors:['#34d399','#10b981'], selfBgOpacity:20,
  selfTextGradient:false, selfTextColors:['#34d399','#10b981'], selfTextOpacity:100,
  selfItalic:false, selfUnderline:true, selfUnderlineColor:'#34d399', selfUnderlineWidth:2,
  selfRainbow:false, selfRainbowColors:['#34d399','#3b82f6','#f472b6'],
  // AI
  aiHighlightMode:'gapped', aiCornerStyle:'round',
  aiBgEnabled:true, aiBgColors:['#a78bfa','#f472b6','#38bdf8'], aiBgOpacity:18,
  aiTextGradient:false, aiTextColors:['#a78bfa','#f472b6','#38bdf8'], aiTextOpacity:100,
  aiItalic:false, aiUnderline:false, aiUnderlineColor:'#a78bfa', aiUnderlineWidth:2,
  aiRainbow:false, aiRainbowColors:['#a78bfa','#f472b6','#38bdf8','#34d399'],
  // Other
  otherHighlightMode:'gapped', otherCornerStyle:'round',
  otherBgEnabled:false, otherBgColors:['#fb923c','#fbbf24'], otherBgOpacity:15,
  otherTextGradient:false, otherTextColors:['#9ca3af','#6b7280'], otherTextOpacity:65,
  otherItalic:true, otherUnderline:false, otherUnderlineColor:'#9ca3af', otherUnderlineWidth:1,
  otherRainbow:false, otherRainbowColors:['#fb923c','#fbbf24','#f87171','#a78bfa'],
};

// ═══════════════════════════════════════════════════════════════
//  Database
//  Each entry: { noteClass: null|'self'|'ai'|'other'|'none', ranges: [] }
//  noteClass: null  = range-based (only marked ranges have style)
//             'none' = no tracking in this note
//             'self'/'ai'/'other' = whole note has this type; ranges = exceptions
// ═══════════════════════════════════════════════════════════════
class YuleAuthDB {
  constructor(app) { this.app = app; this.data = {}; }

  _path() { return `${this.app.vault.configDir}/plugins/${PLUGIN_ID}/${DB_FILENAME}`; }

  async load() {
    try {
      const p = this._path();
      if (await this.app.vault.adapter.exists(p)) {
        const raw = JSON.parse(await this.app.vault.adapter.read(p));
        // Migrate old array format → new object format
        for (const [k, v] of Object.entries(raw)) {
          this.data[k] = Array.isArray(v) ? { noteClass: null, ranges: v } : v;
        }
      }
    } catch (e) { console.warn('[yule-auth] DB load error', e); this.data = {}; }
  }

  async save() {
    try {
      await this.app.vault.adapter.write(this._path(), JSON.stringify(this.data, null, 2));
    } catch (e) { console.error('[yule-auth] DB save error', e); }
  }

  getEntry(path) {
    const e = this.data[path];
    if (!e) return { noteClass: null, ranges: [] };
    return Array.isArray(e) ? { noteClass: null, ranges: e } : { noteClass: null, ranges: [], ...e };
  }

  setEntry(path, entry) {
    if (!entry.ranges.length && entry.noteClass == null) delete this.data[path];
    else this.data[path] = entry;
  }

  deleteFile(p)           { delete this.data[p]; }
  renameFile(old, neo)    { if (this.data[old]) { this.data[neo] = this.data[old]; delete this.data[old]; } }
}

// ═══════════════════════════════════════════════════════════════
//  Range utilities
// ═══════════════════════════════════════════════════════════════
function mergeAdjacent(ranges) {
  if (!ranges.length) return [];
  const s = [...ranges].sort((a, b) => a.from - b.from);
  const out = [{ ...s[0] }];
  for (let i = 1; i < s.length; i++) {
    const prev = out[out.length - 1], cur = s[i];
    if (cur.sourceType === prev.sourceType && cur.from <= prev.from + prev.length) {
      const end = Math.max(prev.from + prev.length, cur.from + cur.length);
      out[out.length - 1] = { ...prev, length: end - prev.from };
    } else out.push({ ...cur });
  }
  return out.filter(r => r.length > 0);
}

// Typed text SPLITS a range rather than extending it (new text = unmarked)
function adjustForInsert(ranges, at, len) {
  return ranges.flatMap(r => {
    const end = r.from + r.length;
    if (r.from >= at) return [{ ...r, from: r.from + len }];          // shift
    if (end > at) return [                                              // split
      { ...r, length: at - r.from },
      { ...r, from: at + len, length: end - at },
    ];
    return [{ ...r }];                                                  // before
  }).filter(r => r.length > 0);
}

function adjustForDelete(ranges, from, len) {
  const to = from + len;
  return ranges.map(r => {
    const end = r.from + r.length;
    if (r.from >= to)   return { ...r, from: r.from - len };
    if (end  <= from)   return { ...r };
    const nf = Math.min(r.from, from);
    const ne = Math.max(end - len, from);
    return { ...r, from: nf, length: ne - nf };
  }).filter(r => r.length > 0);
}

// Build full non-overlapping range list for noteClass mode
function effectiveRanges(exRanges, noteClass, docLen) {
  const sorted = [...exRanges].sort((a, b) => a.from - b.from);
  const out = [];
  let pos = 0;
  for (const r of sorted) {
    if (r.from > pos) out.push({ from: pos, length: r.from - pos, sourceType: noteClass });
    out.push({ ...r });
    pos = Math.max(pos, r.from + r.length);
  }
  if (pos < docLen) out.push({ from: pos, length: docLen - pos, sourceType: noteClass });
  return out;
}

// ═══════════════════════════════════════════════════════════════
//  CSS builder (also injects UI styles)
// ═══════════════════════════════════════════════════════════════
function hexToRgba(hex, pct) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${(pct / 100).toFixed(2)})`;
}

function makeGradient(colors, opacity, dir = '90deg') {
  if (!colors || !colors.length) return 'transparent';
  if (colors.length === 1) return hexToRgba(colors[0], opacity);
  const stops = colors.map((c, i) => `${hexToRgba(c, opacity)} ${Math.round(i / (colors.length - 1) * 100)}%`);
  return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

function buildTypeCSS(type, s) {
  const hlMode  = s[`${type}HighlightMode`] || 'gapped';
  const corner  = s[`${type}CornerStyle`]   || 'round';
  const bgOn    = s[`${type}BgEnabled`];
  const bgC     = s[`${type}BgColors`]      || [];
  const bgOp    = s[`${type}BgOpacity`]     || 20;
  const tgOn    = s[`${type}TextGradient`];
  const tC      = s[`${type}TextColors`]    || [];
  const tOp     = s[`${type}TextOpacity`]   || 100;
  const it      = s[`${type}Italic`];
  const ul      = s[`${type}Underline`];
  const ulC     = s[`${type}UnderlineColor`]|| '#888';
  const ulW     = s[`${type}UnderlineWidth`]|| 2;
  const rainbow = s[`${type}Rainbow`];

  const br  = corner === 'sharp' ? '0' : corner === 'pill' ? '999px' : '3px';
  const bdb = hlMode === 'solid' ? 'clone' : 'slice';

  let css = `border-radius:${br};-webkit-box-decoration-break:${bdb};box-decoration-break:${bdb};`;

  // Rainbow overrides text gradient
  if (!rainbow) {
    if (tgOn && tC.length) {
      css += `background:${makeGradient(tC, tOp)};`;
      css += `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
      if (bgOn && bgC.length) css += `box-shadow:inset 0 0 0 1000px ${hexToRgba(bgC[0], bgOp)};`;
    } else if (bgOn && bgC.length) {
      css += `background:${makeGradient(bgC, bgOp)};`;
    }
  }

  if (it) css += 'font-style:italic;';

  if (ul) {
    css += `text-decoration:underline;text-decoration-color:${ulC};text-decoration-thickness:${ulW}px;text-underline-offset:2px;`;
    // Ensure underline shows even when using -webkit-text-fill-color
    if (tgOn && !rainbow) css += '-webkit-text-decoration-color:' + ulC + ';';
  }

  return css;
}

function buildFullCSS(s) {
  return `
/* ── Authorship highlight classes ── */
.yule-auth-self  { ${buildTypeCSS('self',  s)} }
.yule-auth-ai    { ${buildTypeCSS('ai',    s)} }
.yule-auth-other { ${buildTypeCSS('other', s)} }

/* ── Settings: sticky preview ── */
.yule-preview-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: var(--background-primary);
  padding: 10px 0 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  margin-bottom: 14px;
}
.yule-preview-inner {
  padding: 7px 12px;
  background: var(--background-secondary);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.8;
}

/* ── Settings: colour array ── */
.yule-color-array { padding: 4px 0 8px; }
.yule-color-array-label { font-size: 0.85em; color: var(--text-muted); margin-bottom: 4px; }
.yule-color-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.yule-color-row input[type=color] { width: 36px; height: 28px; border: none; background: none; cursor: pointer; border-radius: 4px; }
.yule-color-rm { cursor: pointer; font-size: 13px; opacity: 0.55; padding: 0 4px; }
.yule-color-rm:hover { opacity: 1; }
.yule-add-color { margin-top: 2px; font-size: 0.82em; cursor: pointer; color: var(--text-accent); }
.yule-add-color:hover { text-decoration: underline; }

/* ── Settings: tag textarea ── */
.yule-tag-area {
  width: 100%; min-height: 120px;
  font-family: var(--font-monospace); font-size: 0.82em;
  resize: vertical;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px; padding: 6px 8px;
  color: var(--text-normal);
}

/* ── Paste modal ── */
.yule-auth-modal .modal-content { padding: 1.4rem 1.6rem; }
.yule-auth-modal h2 { font-size: 1.05rem; font-weight: 700; margin-bottom: .75rem; }
.yule-paste-preview {
  max-height: 72px; overflow: hidden; word-break: break-word; white-space: pre-wrap;
  font-size: .82em; color: var(--text-muted); padding: 7px 10px;
  background: var(--background-secondary); border-radius: 5px;
  margin-bottom: 12px; position: relative;
}
.yule-paste-preview::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 22px;
  background: linear-gradient(transparent, var(--background-secondary));
  border-radius: 0 0 5px 5px;
}
.yule-modal-buttons { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.yule-modal-btn {
  flex: 1; min-width: 68px; padding: 6px 10px;
  border-radius: 7px; border: 1px solid var(--background-modifier-border);
  cursor: pointer; font-size: .84em; font-weight: 600;
  background: var(--background-secondary); color: var(--text-normal);
}
.yule-modal-btn.btn-self  { border-color: rgba(52,211,153,.55); background: rgba(52,211,153,.08); }
.yule-modal-btn.btn-ai    { border-color: rgba(167,139,250,.55); background: rgba(167,139,250,.08); }
.yule-modal-btn.btn-other { border-color: rgba(251,146,60,.55);  background: rgba(251,146,60,.08); }
.yule-modal-btn.btn-skip  { opacity: .6; }
.yule-modal-footer {
  display: flex; gap: 10px; flex-wrap: wrap;
  border-top: 1px solid var(--background-modifier-border);
  padding-top: 8px; font-size: .77em; color: var(--text-muted);
}
.yule-modal-footer a { color: var(--text-accent); cursor: pointer; text-decoration: underline; }
.yule-tag-modal-desc { color: var(--text-muted); font-size: .9em; margin-bottom: 14px; }
`;
}

// ═══════════════════════════════════════════════════════════════
//  CodeMirror 6 extension
// ═══════════════════════════════════════════════════════════════
function createEditorExtension(plugin) {
  let cm6;
  try {
    const S = require('@codemirror/state');
    const V = require('@codemirror/view');
    cm6 = { StateField: S.StateField, StateEffect: S.StateEffect, Decoration: V.Decoration, EditorView: V.EditorView };
  } catch (e) { console.error('[yule-auth] CM6 unavailable', e); return null; }

  const FX = {
    setEntry:  cm6.StateEffect.define(),   // { noteClass, ranges }
    mark:      cm6.StateEffect.define(),   // { from, to, sourceType, authorName }
    remove:    cm6.StateEffect.define(),   // { from, to }
    setClass:  cm6.StateEffect.define(),   // string | null  (noteClass for whole file)
  };
  plugin._fx = FX;

  const field = cm6.StateField.define({
    create: () => ({ noteClass: null, ranges: [], docLen: 0 }),

    update(val, tr) {
      let { noteClass, ranges, docLen } = val;
      docLen = tr.newDoc.length;

      for (const fx of tr.effects) {
        if (fx.is(FX.setEntry)) {
          noteClass = fx.value.noteClass ?? null;
          ranges    = fx.value.ranges ? [...fx.value.ranges] : [];
        }
        if (fx.is(FX.setClass)) {
          noteClass = fx.value;
        }
        if (fx.is(FX.mark)) {
          const { from, to, sourceType, authorName } = fx.value;
          const len = to - from;
          let rs = ranges.flatMap(r => {
            const rEnd = r.from + r.length;
            if (r.from >= to || rEnd <= from) return [{ ...r }];
            const parts = [];
            if (r.from < from) parts.push({ ...r, length: from - r.from });
            if (rEnd > to)     parts.push({ ...r, from: to, length: rEnd - to });
            return parts;
          });
          rs.push({ from, length: len, sourceType, authorName });
          ranges = mergeAdjacent(rs.filter(r => r.length > 0));
        }
        if (fx.is(FX.remove)) {
          const { from, to } = fx.value;
          ranges = ranges.flatMap(r => {
            const rEnd = r.from + r.length;
            if (r.from >= to || rEnd <= from) return [{ ...r }];
            const parts = [];
            if (r.from < from) parts.push({ ...r, length: from - r.from });
            if (rEnd > to)     parts.push({ ...r, from: to, length: rEnd - to });
            return parts;
          }).filter(r => r.length > 0);
        }
      }

      if (tr.docChanged) {
        // All edits just adjust positions — no auto-assignment
        // Typing inside a range SPLITS it (typed text = unmarked)
        let rs = [...ranges];
        let offset = 0;
        tr.changes.iterChanges((fromA, toA, fromB, toB) => {
          const adj  = fromA + offset;
          const delL = toA - fromA;
          const insL = toB - fromB;
          if (delL > 0) rs = adjustForDelete(rs, adj, delL);
          if (insL > 0) rs = adjustForInsert(rs, adj, insL);  // splits, no new range
          offset += insL - delL;
        });
        ranges = mergeAdjacent(rs);
      }

      return { noteClass, ranges, docLen };
    },

    provide(f) {
      return cm6.EditorView.decorations.compute([f], state => {
        if (!plugin.settings.enabled) return cm6.Decoration.none;
        const v = state.field(f);
        return buildDecorations(v, plugin.settings, cm6);
      });
    },
  });

  plugin._field = field;
  return field;
}

function visibleFor(type, s) {
  return type === ST.SELF  ? s.showSelf :
         type === ST.AI    ? s.showAi   :
         type === ST.OTHER ? s.showOther : false;
}

function buildDecorations(val, settings, cm6) {
  const { noteClass, ranges, docLen } = val;
  if (noteClass === 'none') return cm6.Decoration.none;

  const decos = [];

  const addMark = (from, to, cls) => {
    if (to <= from || from < 0) return;
    to = Math.min(to, docLen);
    if (to <= from) return;
    try { decos.push(cm6.Decoration.mark({ class: cls }).range(from, to)); } catch {}
  };

  let allRanges;
  if (noteClass !== null) {
    allRanges = effectiveRanges(ranges, noteClass, docLen);
  } else {
    allRanges = ranges;
  }

  for (const r of allRanges) {
    if (!r || r.length <= 0) continue;
    if (!visibleFor(r.sourceType, settings)) continue;
    addMark(r.from, r.from + r.length, `yule-auth-${r.sourceType}`);
  }

  // Rainbow: per-character colour marks (override text gradient)
  for (const r of allRanges) {
    if (!r || r.length <= 0) continue;
    if (!visibleFor(r.sourceType, settings)) continue;
    if (!settings[`${r.sourceType}Rainbow`]) continue;
    const colors = settings[`${r.sourceType}RainbowColors`] || [];
    if (!colors.length) continue;
    const end = Math.min(r.from + r.length, r.from + RAINBOW_MAX, docLen);
    for (let i = r.from; i < end; i++) {
      const c = colors[(i - r.from) % colors.length];
      try {
        decos.push(cm6.Decoration.mark({ attributes: { style: `color:${c};-webkit-text-fill-color:${c}` } }).range(i, i + 1));
      } catch {}
    }
  }

  decos.sort((a, b) => a.from !== b.from ? a.from - b.from : (a.to || 0) - (b.to || 0));
  try { return cm6.Decoration.set(decos, true); }
  catch { return cm6.Decoration.none; }
}

// ═══════════════════════════════════════════════════════════════
//  Paste authorship modal
// ═══════════════════════════════════════════════════════════════
class PasteModal extends obsidian.Modal {
  constructor(app, plugin, text, cb) {
    super(app);
    this.plugin = plugin; this.text = text; this.cb = cb;
    this.modalEl.addClass('yule-auth-modal');
  }
  onOpen() {
    const t = LNG[this.plugin.settings.language] || LNG.ru;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: t.dialogTitle });

    const preview = contentEl.createDiv({ cls: 'yule-paste-preview' });
    preview.textContent = this.text.slice(0, 180) + (this.text.length > 180 ? '…' : '');

    const btns = contentEl.createDiv({ cls: 'yule-modal-buttons' });
    const btn = (label, cls, type) => {
      const b = btns.createEl('button', { text: label, cls: ['yule-modal-btn', cls] });
      b.addEventListener('click', () => { this.close(); this.cb(type); });
    };
    btn(t.selfLabel, 'btn-self',  ST.SELF);
    btn(t.aiLabel,   'btn-ai',    ST.AI);
    btn(t.otherLabel,'btn-other', ST.OTHER);
    btn(t.dialogSkip,'btn-skip',  null);

    const footer = contentEl.createDiv({ cls: 'yule-modal-footer' });
    const lkSess = footer.createEl('a', { text: t.dialogDisableSession });
    lkSess.onclick = () => {
      this.plugin._pasteSuppressed = true;
      this.close(); this.cb(null);
    };
    const lkPerm = footer.createEl('a', { text: t.dialogDisable });
    lkPerm.onclick = () => {
      this.plugin.settings.pasteDialogEnabled = false;
      void this.plugin.saveSettings();
      this.close(); this.cb(null);
    };
  }
  onClose() { this.contentEl.empty(); }
}

// ═══════════════════════════════════════════════════════════════
//  Settings tab
// ═══════════════════════════════════════════════════════════════
class YuleAuthSettings extends obsidian.PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const t = LNG[this.plugin.settings.language] || LNG.ru;
    const s = this.plugin.settings;

    const save = async (patch) => {
      Object.assign(s, patch);
      await this.plugin.saveSettings();
      this.plugin.applyCSS();
      this.plugin.refreshEditors();
    };

    // ── Language ──────────────────────────────────────────
    new obsidian.Setting(containerEl)
      .setName(t.language).setDesc(t.languageDesc)
      .addDropdown(d => d
        .addOption('ru','Русский').addOption('en','English')
        .setValue(s.language)
        .onChange(async v => { await save({ language: v }); this.display(); }));

    // ── General ───────────────────────────────────────────
    containerEl.createEl('h3', { text: t.generalSection });

    new obsidian.Setting(containerEl).setName(t.tracking).setDesc(t.trackingDesc)
      .addToggle(tg => tg.setValue(s.enabled).onChange(v => save({ enabled: v })));

    new obsidian.Setting(containerEl).setName(t.authorName).setDesc(t.authorNameDesc)
      .addText(tx => tx.setPlaceholder(t.authorNamePh).setValue(s.selfAuthorName)
        .onChange(v => save({ selfAuthorName: v || t.authorNamePh })));

    // ── Paste ─────────────────────────────────────────────
    containerEl.createEl('h3', { text: t.pasteSection });

    new obsidian.Setting(containerEl).setName(t.pasteDialog).setDesc(t.pasteDialogDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogEnabled).onChange(v => save({ pasteDialogEnabled: v })));
    new obsidian.Setting(containerEl).setName(t.pasteDialogRestore).setDesc(t.pasteDialogRestoreDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogRestore).onChange(v => save({ pasteDialogRestore: v })));
    new obsidian.Setting(containerEl).setName(t.defaultPaste).setDesc(t.defaultPasteDesc)
      .addDropdown(d => d
        .addOption(ST.SELF, t.selfLabel).addOption(ST.AI, t.aiLabel).addOption(ST.OTHER, t.otherLabel)
        .setValue(s.defaultPasteSource)
        .onChange(v => save({ defaultPasteSource: v })));

    // ── Tags ──────────────────────────────────────────────
    containerEl.createEl('h3', { text: t.tagSection });
    new obsidian.Setting(containerEl).setName(t.tagAutoEnabled).setDesc(t.tagAutoEnabledDesc)
      .addToggle(tg => tg.setValue(s.tagAutoEnabled).onChange(v => save({ tagAutoEnabled: v })));

    const tagPairs = [
      ['tagsSelf',  t.tagsSelf,  ST.SELF],
      ['tagsAi',    t.tagsAi,    ST.AI],
      ['tagsOther', t.tagsOther, ST.OTHER],
    ];
    for (const [key, label] of tagPairs) {
      const wrap = containerEl.createDiv({ cls: 'setting-item' });
      wrap.createDiv({ cls: 'setting-item-info' })
        .createDiv({ cls: 'setting-item-name', text: label });
      const ctrl = wrap.createDiv({ cls: 'setting-item-control' });
      ctrl.style.flex = '1';
      const ta = ctrl.createEl('textarea', { cls: 'yule-tag-area' });
      ta.placeholder = t.tagsDesc;
      ta.value = (s[key] || []).join('\n');
      ta.addEventListener('input', () => {
        const tags = ta.value.split('\n').map(x => x.trim().replace(/^#/, '')).filter(Boolean);
        save({ [key]: tags });
      });
    }

    // ── Visibility ────────────────────────────────────────
    containerEl.createEl('h3', { text: t.highlightSection });
    new obsidian.Setting(containerEl).setName(t.showSelf)
      .addToggle(tg => tg.setValue(s.showSelf).onChange(v => save({ showSelf: v })));
    new obsidian.Setting(containerEl).setName(t.showAi)
      .addToggle(tg => tg.setValue(s.showAi).onChange(v => save({ showAi: v })));
    new obsidian.Setting(containerEl).setName(t.showOther)
      .addToggle(tg => tg.setValue(s.showOther).onChange(v => save({ showOther: v })));

    // ── Per-type sections ─────────────────────────────────
    const typeSections = [['self', t.selfSection], ['ai', t.aiSection], ['other', t.otherSection]];
    for (const [type, label] of typeSections) {
      this._typeSection(containerEl, type, label, t, s, save);
    }
  }

  _typeSection(el, type, label, t, s, save) {
    el.createEl('h3', { text: label });

    // Sticky live preview
    const wrap = el.createDiv({ cls: 'yule-preview-wrap' });
    const inner = wrap.createDiv({ cls: 'yule-preview-inner' });
    inner.createSpan({ cls: `yule-auth-${type}`, text: t.previewSample });

    // Highlight mode
    new obsidian.Setting(el).setName(t.highlightMode)
      .addDropdown(d => d
        .addOption('gapped', t.hlGapped).addOption('solid', t.hlSolid)
        .setValue(s[`${type}HighlightMode`])
        .onChange(v => save({ [`${type}HighlightMode`]: v })));

    // Corner style
    new obsidian.Setting(el).setName(t.cornerStyle)
      .addDropdown(d => d
        .addOption('sharp', t.cSharp).addOption('round', t.cRound).addOption('pill', t.cPill)
        .setValue(s[`${type}CornerStyle`])
        .onChange(v => save({ [`${type}CornerStyle`]: v })));

    // Background
    new obsidian.Setting(el).setName(t.bgEnabled).setDesc(t.bgEnabledDesc)
      .addToggle(tg => tg.setValue(s[`${type}BgEnabled`]).onChange(v => save({ [`${type}BgEnabled`]: v })));
    this._colorArray(el, `${type}BgColors`, t.bgColors, t, s, save);
    new obsidian.Setting(el).setName(t.bgOpacity)
      .addSlider(sl => sl.setLimits(1, 100, 1).setValue(s[`${type}BgOpacity`])
        .setDynamicTooltip().onChange(v => save({ [`${type}BgOpacity`]: v })));

    // Text gradient
    new obsidian.Setting(el).setName(t.textGradient).setDesc(t.textGradientDesc)
      .addToggle(tg => tg.setValue(s[`${type}TextGradient`]).onChange(v => save({ [`${type}TextGradient`]: v })));
    this._colorArray(el, `${type}TextColors`, t.textColors, t, s, save);
    new obsidian.Setting(el).setName(t.textOpacity)
      .addSlider(sl => sl.setLimits(1, 100, 1).setValue(s[`${type}TextOpacity`])
        .setDynamicTooltip().onChange(v => save({ [`${type}TextOpacity`]: v })));

    // Italic
    new obsidian.Setting(el).setName(t.italic).setDesc(t.italicDesc)
      .addToggle(tg => tg.setValue(s[`${type}Italic`]).onChange(v => save({ [`${type}Italic`]: v })));

    // Underline
    new obsidian.Setting(el).setName(t.underline).setDesc(t.underlineDesc)
      .addToggle(tg => tg.setValue(s[`${type}Underline`]).onChange(v => save({ [`${type}Underline`]: v })));
    new obsidian.Setting(el).setName(t.underlineColor)
      .addColorPicker(cp => cp.setValue(s[`${type}UnderlineColor`]).onChange(v => save({ [`${type}UnderlineColor`]: v })));
    new obsidian.Setting(el).setName(t.underlineWidth)
      .addSlider(sl => sl.setLimits(1, 8, 1).setValue(s[`${type}UnderlineWidth`])
        .setDynamicTooltip().onChange(v => save({ [`${type}UnderlineWidth`]: v })));

    // Rainbow
    new obsidian.Setting(el).setName(t.rainbow).setDesc(t.rainbowDesc)
      .addToggle(tg => tg.setValue(s[`${type}Rainbow`]).onChange(v => save({ [`${type}Rainbow`]: v })));
    this._colorArray(el, `${type}RainbowColors`, t.rainbowColors, t, s, save);
  }

  _colorArray(containerEl, key, label, t, s, save) {
    const p = this.plugin;
    const wrap = containerEl.createDiv({ cls: 'yule-color-array' });

    const render = () => {
      wrap.empty();
      wrap.createDiv({ cls: 'yule-color-array-label', text: label });
      const colors = [...(p.settings[key] || [])];
      colors.forEach((c, i) => {
        const row = wrap.createDiv({ cls: 'yule-color-row' });
        const picker = row.createEl('input');
        picker.type = 'color';
        picker.value = c;
        picker.addEventListener('input', (ev) => {
          const nc = [...p.settings[key]]; nc[i] = ev.target.value;
          save({ [key]: nc });
        });
        if (colors.length > 2) {
          const rm = row.createEl('span', { text: t.removeColor, cls: 'yule-color-rm' });
          rm.addEventListener('click', () => {
            const nc = [...p.settings[key]]; nc.splice(i, 1);
            save({ [key]: nc }); render();
          });
        }
      });
      if (colors.length < MAX_COLORS) {
        const add = wrap.createEl('div', { text: t.addColor, cls: 'yule-add-color' });
        add.addEventListener('click', () => {
          const nc = [...p.settings[key], colors[colors.length - 1] || '#888888'];
          save({ [key]: nc }); render();
        });
      }
    };

    render();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Main plugin
// ═══════════════════════════════════════════════════════════════
class YuleAuthPlugin extends obsidian.Plugin {

  async onload() {
    const raw = await this.loadData() || {};
    this.settings = Object.assign({}, DEFAULTS, raw);
    this._migrateSettings();
    if (this.settings.pasteDialogRestore) this.settings.pasteDialogEnabled = true;
    this._pasteSuppressed = false;

    this.db = new YuleAuthDB(this.app);
    await this.db.load();

    this._field = null;
    this._fx    = null;

    const ext = createEditorExtension(this);
    if (ext) this.registerEditorExtension(ext);

    this.addSettingTab(new YuleAuthSettings(this.app, this));
    this.applyCSS();
    this._registerCommands();
    this._registerEvents();
    console.log('[yule-auth] loaded');
  }

  onunload() {
    document.getElementById('yule-auth-css')?.remove();
    void this.db.save();
    console.log('[yule-auth] unloaded');
  }

  async saveSettings() { await this.saveData(this.settings); }

  // ── Migrations ─────────────────────────────────────────────
  _migrateSettings() {
    const s = this.settings;
    for (const type of ['self', 'ai', 'other']) {
      // Old fixed color keys → arrays
      if (s[`${type}BgColor1`] !== undefined && !s[`${type}BgColors`]) {
        s[`${type}BgColors`] = [s[`${type}BgColor1`], s[`${type}BgColor2`], s[`${type}BgColor3`]].filter(Boolean);
        delete s[`${type}BgColor1`]; delete s[`${type}BgColor2`]; delete s[`${type}BgColor3`];
      }
      if (s[`${type}TextColor1`] !== undefined && !s[`${type}TextColors`]) {
        s[`${type}TextColors`] = [s[`${type}TextColor1`], s[`${type}TextColor2`], s[`${type}TextColor3`]].filter(Boolean);
        delete s[`${type}TextColor1`]; delete s[`${type}TextColor2`]; delete s[`${type}TextColor3`];
      }
      // New fields
      if (s[`${type}HighlightMode`] === undefined) s[`${type}HighlightMode`] = 'gapped';
      if (s[`${type}CornerStyle`]   === undefined) s[`${type}CornerStyle`]   = 'round';
      if (s[`${type}Underline`]     === undefined) s[`${type}Underline`]     = type === 'self';
      if (s[`${type}UnderlineColor`]=== undefined) s[`${type}UnderlineColor`]= DEFAULTS[`${type}UnderlineColor`];
      if (s[`${type}UnderlineWidth`]=== undefined) s[`${type}UnderlineWidth`]= DEFAULTS[`${type}UnderlineWidth`];
      if (s[`${type}Rainbow`]       === undefined) s[`${type}Rainbow`]       = false;
      if (!s[`${type}RainbowColors`])              s[`${type}RainbowColors`] = DEFAULTS[`${type}RainbowColors`];
    }
    // Old tag fields
    if (s.tagAutoMark !== undefined && s.tagAutoEnabled === undefined) {
      s.tagAutoEnabled = s.tagAutoMark; delete s.tagAutoMark;
    }
    if (s.tagAutoMarkTags && !s.tagsOther) {
      s.tagsOther = s.tagAutoMarkTags; delete s.tagAutoMarkTags;
    }
    if (!Array.isArray(s.tagsSelf))  s.tagsSelf  = [];
    if (!Array.isArray(s.tagsAi))    s.tagsAi    = [];
    if (!Array.isArray(s.tagsOther)) s.tagsOther = [];
  }

  // ── CSS ────────────────────────────────────────────────────
  applyCSS() {
    let el = document.getElementById('yule-auth-css');
    if (!el) { el = document.createElement('style'); el.id = 'yule-auth-css'; document.head.appendChild(el); }
    el.textContent = buildFullCSS(this.settings);
  }

  refreshEditors() {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      try { leaf.view?.editor?.cm?.dispatch({}); } catch {}
    }
  }

  // ── Commands ───────────────────────────────────────────────
  _registerCommands() {
    this.addCommand({
      id: 'mark-as-self', name: 'Mark selection as self',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.SELF),
    });
    this.addCommand({
      id: 'mark-as-ai', name: 'Mark selection as AI',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.AI),
    });
    this.addCommand({
      id: 'mark-as-other', name: 'Mark selection as other (human)',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.OTHER),
    });
    this.addCommand({
      id: 'remove-authorship', name: 'Remove authorship at cursor / selection',
      editorCallback: (_, ctx) => this._removeAuth(ctx),
    });
    // Note class commands
    for (const [val, name] of [
      [ST.SELF,  'Set note class: my text'],
      [ST.AI,    'Set note class: AI'],
      [ST.OTHER, 'Set note class: other text'],
      ['none',   'Set note class: no tracking'],
      [null,     'Clear note class (range-based)'],
    ]) {
      const v = val; // capture
      this.addCommand({
        id: `set-note-class-${val ?? 'clear'}`,
        name,
        callback: () => this._setNoteClass(v),
      });
    }
  }

  _markSel(ctx, sourceType) {
    if (!this._fx || !this._field) return;
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    const { from, to } = cm.state.selection.main;
    if (from === to) { new obsidian.Notice('[yule-auth] No text selected'); return; }
    const authorName = sourceType === ST.SELF ? this.settings.selfAuthorName :
                       sourceType === ST.AI   ? 'AI' : 'Other';
    cm.dispatch({ effects: this._fx.mark.of({ from, to, sourceType, authorName }) });
    this._scheduleSave();
  }

  _removeAuth(ctx) {
    if (!this._fx || !this._field) return;
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    const sel  = cm.state.selection.main;
    let from = sel.from, to = sel.to;

    if (from === to) {
      // No selection: find the range under cursor
      const fState = cm.state.field(this._field, false);
      if (!fState) return;
      const hit = fState.ranges.find(r => r.from <= from && r.from + r.length >= from);
      if (!hit) { new obsidian.Notice('[yule-auth] No authorship at cursor'); return; }
      from = hit.from; to = hit.from + hit.length;
    }

    cm.dispatch({ effects: this._fx.remove.of({ from, to }) });
    this._scheduleSave();
  }

  _setNoteClass(noteClass) {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;
    const entry = this.db.getEntry(file.path);
    entry.noteClass = noteClass;
    this.db.setEntry(file.path, entry);
    void this.db.save();

    // Push to CM
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm   = view?.editor?.cm;
    if (cm && this._fx) {
      try { cm.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
    }
    const label = noteClass === null   ? '(range-based)' :
                  noteClass === 'none' ? 'No tracking'   : noteClass;
    new obsidian.Notice(`[yule-auth] Note class: ${label}`);
  }

  // ── Events ─────────────────────────────────────────────────
  _registerEvents() {
    // File open: load entry
    this.registerEvent(this.app.workspace.on('file-open', async (file) => {
      if (file) await this._loadEntry(file);
    }));

    // Metadata changes: tag auto-mark
    this.registerEvent(this.app.metadataCache.on('changed', (file) => {
      if (!this.settings.tagAutoEnabled) return;
      const active = this.app.workspace.getActiveFile();
      if (!active || active.path !== file.path) return;
      this._checkTagAutoMark(file);
    }));

    // Debounced save
    this._debounceSave = obsidian.debounce(() => this._saveCurrentEntry(), 1800, true);
    this.registerEvent(this.app.workspace.on('editor-change', () => this._debounceSave()));

    // Rename / delete
    this.registerEvent(this.app.vault.on('rename', (file, old) => {
      this.db.renameFile(old, file.path); void this.db.save();
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      this.db.deleteFile(file.path); void this.db.save();
    }));

    // Paste intercept
    this.registerDomEvent(document, 'paste', (e) => {
      if (!this.settings.enabled || !this.settings.pasteDialogEnabled) return;
      if (this._pasteSuppressed) return;
      const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) return;
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!this._dialogWorthy(text)) return;
      e.preventDefault(); e.stopPropagation();
      new PasteModal(this.app, this, text, (type) => this._applyPaste(view, text, type)).open();
    }, true);
  }

  _dialogWorthy(text) {
    return text.trim().split(/\s+/).length >= 5 && /[.!?…]/.test(text);
  }

  _applyPaste(view, text, sourceType) {
    const editor = view.editor;
    if (!editor) return;
    const cursor = editor.getCursor();
    const cm     = view.editor?.cm;
    let insertFrom = 0;
    if (cm) {
      try { const ln = cm.state.doc.line(cursor.line + 1); insertFrom = ln.from + cursor.ch; }
      catch {}
    }
    editor.replaceSelection(text);
    if (sourceType && this._fx && cm) {
      const authorName = sourceType === ST.SELF ? this.settings.selfAuthorName :
                         sourceType === ST.AI   ? 'AI' : 'Other';
      try {
        cm.dispatch({ effects: this._fx.mark.of({
          from: insertFrom, to: insertFrom + text.length, sourceType, authorName,
        }) });
      } catch {}
    }
    this._scheduleSave();
  }

  // ── Tag auto-mark ──────────────────────────────────────────
  _getFileTags(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const tags = [];
    if (cache.frontmatter?.tags) {
      const ft = cache.frontmatter.tags;
      Array.isArray(ft) ? tags.push(...ft) : tags.push(String(ft));
    }
    (cache.tags || []).forEach(t => tags.push(t.tag));
    return tags.map(t => t.replace(/^#/, '').toLowerCase().trim());
  }

  _checkTagAutoMark(file) {
    if (!file) return;
    const fileTags = this._getFileTags(file);
    const check = (list, type) => {
      if (!list || !list.length) return false;
      const normed = list.map(t => t.toLowerCase().trim());
      return fileTags.some(ft => normed.includes(ft)) ? type : null;
    };
    // Priority: self > ai > other
    const matched = check(this.settings.tagsSelf, ST.SELF) ||
                    check(this.settings.tagsAi,   ST.AI)   ||
                    check(this.settings.tagsOther, ST.OTHER);
    if (!matched) return;

    const entry = this.db.getEntry(file.path);
    if (entry.noteClass === matched) return;   // already set, no-op
    entry.noteClass = matched;
    this.db.setEntry(file.path, entry);
    void this.db.save();

    // Push to CM if this is the active file
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm   = view?.editor?.cm;
    if (cm && this._fx) {
      try { cm.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
    }
  }

  // ── DB helpers ─────────────────────────────────────────────
  async _loadEntry(file) {
    if (!this._fx || !this._field) return;
    const entry  = this.db.getEntry(file.path);
    const view   = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm     = view?.editor?.cm;
    if (!cm) return;
    try { cm.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
  }

  async _saveCurrentEntry() {
    if (!this._field) return;
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view?.file) return;
    const cm = view.editor?.cm;
    if (!cm) return;
    try {
      const fv = cm.state.field(this._field, false);
      if (!fv) return;
      this.db.setEntry(view.file.path, { noteClass: fv.noteClass, ranges: [...fv.ranges] });
      await this.db.save();
    } catch {}
  }

  _scheduleSave() { setTimeout(() => void this._saveCurrentEntry(), 100); }
}

module.exports = YuleAuthPlugin;