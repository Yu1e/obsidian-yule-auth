'use strict';
var obsidian = require('obsidian');

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════
const PLUGIN_ID   = 'yule-auth';          // папка плагина — не менять
const DB_FILENAME = 'authorship-db.json';
const RAINBOW_MAX = 2000;
const MAX_COLORS  = 8;

const ST = { SELF: 'self', AI: 'ai', OTHER: 'other' };

// Parse frontmatter `auth:` value → canonical class.
// selfName = settings.selfAuthorName (any language/case).
const CANONICAL = { self:'self', ai:'ai', other:'other', none:'none', off:'off' };
function parseAuthClass(v, settings) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (CANONICAL[s]) return CANONICAL[s];
  // User-defined synonyms
  for (const [type, key] of [['self','selfSynonyms'],['ai','aiSynonyms'],['other','otherSynonyms'],['none','noneSynonyms'],['off','offSynonyms']]) {
    const syns = (settings?.[key] || []).map(x => x.toLowerCase().trim());
    if (syns.includes(s)) return type;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  i18n
// ═══════════════════════════════════════════════════════════════
const LNG = {
  ru: {
    language: 'Язык / Language', languageDesc: 'Язык интерфейса настроек',
    generalSection: 'Общее',
    tracking: 'Отслеживание авторства', trackingDesc: 'Включить/выключить подсветку авторства',
    noneLabel: 'Без класса (none)',
    offLabel: 'Разметка отключена (off)',
    pasteSection: 'Вставка',
    pasteDialog: 'Диалог при вставке', pasteDialogDesc: 'Запрашивать авторство при вставке ≥5 слов с пунктуацией',
    pasteDialogRestore: 'Восстанавливать при перезапуске', pasteDialogRestoreDesc: 'Включать диалог снова при следующем открытии Obsidian',
    defaultPaste: 'Авторство вставки', defaultPasteDesc: 'По умолчанию, если диалог отключён',
    synonymsSection: 'Синонимы значений auth:', synonymsDesc: 'Свои слова для поля auth: — через запятую. Регистр не важен.',
    synonymsHint: 'Поле auth: во frontmatter заметки задаёт класс авторства: подсветку фрагментов, фон и полосу.',
    selfLabel: 'Мой текст (self)', aiLabel: 'ИИ', otherLabel: 'Чужой текст',
    dialogTitle: 'Чей это текст?', dialogSkip: 'Пропустить',
    dialogMarkNote: 'Отметить классом всю заметку',
    dialogDisable: 'Отключить до включения вручную',
    dialogDisableSession: 'Отключить до перезапуска Obsidian',
    tagSection: 'Автопометка по тегам',
    tagAutoEnabled: 'Автопометка по тегам', tagAutoEnabledDesc: 'При обнаружении тега автоматически присваивать класс заметке (без диалога)',
    tagsSelf: 'Теги → мой текст', tagsAi: 'Теги → ИИ', tagsOther: 'Теги → чужой текст',
    tagsDesc: 'Один тег на строку, без символа #',
    highlightSection: 'Разметка авторства',
    showSelf: 'Показывать: мой текст', showAi: 'Показывать: ИИ', showOther: 'Показывать: чужой текст',
    selfSection: 'Мой текст', aiSection: 'ИИ', otherSection: 'Чужой текст',
    noteBgSection: 'Фон заметки по классу',
    noteBgDesc: 'Фоновый цвет всей заметки (только когда задан класс заметки)',
    noteBgEnabled: 'Включить фон', noteBgColor: 'Цвет фона',
    noteStripeEnabled: 'Полоса', noteStripeColor: 'Цвет полосы', noteStripeWidth: 'Толщина (px)', noteGlow: 'Свечение от полосы',
    noteBgHint: 'Класс задаётся через диалог вставки (галка «Отметить классом всю заметку») или по тегам.',
    previewSample: 'Образец текста с подсветкой авторства',
    highlightMode: 'Режим подсветки',
    hlGapped: 'С просветами (стандартный)', hlSolid: 'Сплошной (без разрывов)',
    cornerStyle: 'Скругление углов',
    cSharp: 'Прямые', cRound: 'Скруглённые', cPill: 'Пилюля',
    bgEnabled: 'Подсветка', bgEnabledDesc: 'Подсвечивать текст цветом или градиентом сзади',
    bgColors: 'Цвета подсветки', bgOpacity: 'Интенсивность (%)',
    textGradient: 'Градиент шрифта', textGradientDesc: 'Окрашивать текст градиентом (как в iA Writer)',
    textColors: 'Цвета шрифта', textOpacity: 'Интенсивность шрифта (%)',
    italic: 'Курсив', italicDesc: 'Отображать этот тип текста курсивом',
    underline: 'Подчёркивание', underlineDesc: 'Подчёркивать этот тип текста',
    underlineColor: 'Цвет подчёркивания', underlineWidth: 'Толщина подчёркивания (px)',
    rainbow: '🌈 Разноцветные буквы', rainbowDesc: `Каждая буква своего цвета (до ${RAINBOW_MAX} символов на диапазон). Отключает градиент шрифта.`,
    rainbowColors: 'Цвета букв',
    addColor: '+ цвет', removeColor: '×',
    collapse: 'Свернуть', expand: 'Развернуть',
  },
  en: {
    language: 'Language / Язык', languageDesc: 'Settings interface language',
    generalSection: 'General',
    tracking: 'Authorship tracking', trackingDesc: 'Enable/disable authorship highlighting',
    noneLabel: 'No class (none)',
    offLabel: 'Markup off (off)',
    pasteSection: 'Paste',
    pasteDialog: 'Paste dialog', pasteDialogDesc: 'Ask for authorship when pasting ≥5 words with punctuation',
    pasteDialogRestore: 'Restore on restart', pasteDialogRestoreDesc: 'Re-enable dialog on next Obsidian launch',
    defaultPaste: 'Default paste authorship', defaultPasteDesc: 'When dialog is off',
    synonymsSection: 'auth: field synonyms', synonymsDesc: 'Custom words for the auth: field — comma-separated. Case-insensitive.',
    synonymsHint: 'The auth: frontmatter field sets the note\'s authorship class: fragment highlights, background and stripe.',
    selfLabel: 'My text (self)', aiLabel: 'AI', otherLabel: 'Other text',
    dialogTitle: 'Who wrote this?', dialogSkip: 'Skip',
    dialogMarkNote: 'Mark whole note with this class',
    dialogDisable: 'Disable until manually enabled',
    dialogDisableSession: 'Disable until Obsidian restarts',
    tagSection: 'Tag auto-mark',
    tagAutoEnabled: 'Tag auto-mark', tagAutoEnabledDesc: 'Automatically assign note class when a trigger tag is detected (no dialog)',
    tagsSelf: 'Tags → my text', tagsAi: 'Tags → AI', tagsOther: 'Tags → other text',
    tagsDesc: 'One tag per line, without the # symbol',
    highlightSection: 'Markup visibility',
    showSelf: 'Show: my text', showAi: 'Show: AI', showOther: 'Show: other text',
    markupSection: 'Authorship markup styles',
    selfSection: 'My text', aiSection: 'AI', otherSection: 'Other text',
    noteBgSection: 'Note background by class',
    noteBgDesc: 'Background color for the whole note (only when a note class is set)',
    noteBgEnabled: 'Enable background', noteBgColor: 'Background color',
    noteStripeEnabled: 'Left stripe', noteStripeColor: 'Stripe color', noteStripeWidth: 'Width (px)', noteGlow: 'Edge glow',
    noteBgHint: 'Class is set via the paste dialog (Mark whole note checkbox) or by tags.',
    previewSample: 'Sample text with authorship highlight',
    highlightMode: 'Highlight mode',
    hlGapped: 'Gapped (standard)', hlSolid: 'Solid (no line-break gaps)',
    cornerStyle: 'Corner style',
    cSharp: 'Sharp', cRound: 'Rounded', cPill: 'Pill',
    bgEnabled: 'Highlight', bgEnabledDesc: 'Highlight text background with color or gradient',
    bgColors: 'Highlight colors', bgOpacity: 'Intensity (%)',
    textGradient: 'Text gradient', textGradientDesc: 'Color text with gradient (like iA Writer)',
    textColors: 'Text colors', textOpacity: 'Text intensity (%)',
    italic: 'Italic', italicDesc: 'Display this text type in italics',
    underline: 'Underline', underlineDesc: 'Underline this text type',
    underlineColor: 'Underline color', underlineWidth: 'Underline thickness (px)',
    rainbow: '🌈 Rainbow letters', rainbowDesc: `Each letter a different color (up to ${RAINBOW_MAX} chars per range). Overrides text gradient.`,
    rainbowColors: 'Letter colors',
    addColor: '+ color', removeColor: '×',
    collapse: 'Collapse', expand: 'Expand',
  },
};

// ═══════════════════════════════════════════════════════════════
//  Default settings
// ═══════════════════════════════════════════════════════════════
const DEFAULTS = {
  enabled: true,
  language: 'ru',
  selfSynonyms: [],
  aiSynonyms: ['ии'],
  otherSynonyms: ['сохранёнка', 'кто-то', 'чьё-то', 'чужое'],
  noneSynonyms: [],
  offSynonyms: ['временно_откл', 'пауза', 'temporary_off'],
  defaultPasteSource: ST.OTHER,
  pasteDialogEnabled: true,
  pasteDialogRestore: true,
  tagAutoEnabled: true,
  tagsSelf:  [],
  tagsAi:    [],
  tagsOther: ['выписки', 'вырезки', 'цитаты'],
  showSelf: true, showAi: true, showOther: true,
  // Note backgrounds (light theme, very subtle)
  selfNoteBgEnabled:  false, selfNoteBgColor:  '#fafffd',
  selfNoteStripeEnabled: true, selfNoteStripeColor: '#36d341', selfNoteStripeWidth: 8, selfNoteGlowEnabled: true,
  aiNoteBgEnabled:    true,  aiNoteBgColor:    '#f2f2f2',
  aiNoteStripeEnabled: true, aiNoteStripeColor: '#a78bfa', aiNoteStripeWidth: 8, aiNoteGlowEnabled: true,
  otherNoteBgEnabled: true, otherNoteBgColor: '#fffffa',
  otherNoteStripeEnabled: true, otherNoteStripeColor: '#fb923c', otherNoteStripeWidth: 8, otherNoteGlowEnabled: true,
  // Self
  selfHighlightMode:'gapped', selfCornerStyle:'round',
  selfBgEnabled:true, selfBgColors:['#e8faf3','#e0fffe'], selfBgOpacity:89,
  selfTextGradient:false, selfTextColors:['#40523d','#40523d'], selfTextOpacity:100,
  selfItalic:false, selfUnderline:true, selfUnderlineColor:'#d3fdd8', selfUnderlineWidth:8,
  selfRainbow:true, selfRainbowColors:['#295142','#226d39','#223f6d','#415d41','#8a8a8a','#597197','#156140'],
  // AI
  aiHighlightMode:'solid', aiCornerStyle:'round',
  aiBgEnabled:true, aiBgColors:['#faf0ff','#f1f0ff'], aiBgOpacity:31,
  aiTextGradient:true, aiTextColors:['#413663','#684c2c','#266e8c','#919191','#6f3916','#907f41'], aiTextOpacity:100,
  aiItalic:false, aiUnderline:false, aiUnderlineColor:'#a78bfa', aiUnderlineWidth:2,
  aiRainbow:false, aiRainbowColors:['#4d436b','#6d3150','#184153','#1c5f46','#723170','#522014'],
  // Other
  otherHighlightMode:'gapped', otherCornerStyle:'round',
  otherBgEnabled:false, otherBgColors:['#fff8f0','#fff3f0'], otherBgOpacity:8,
  otherTextGradient:false, otherTextColors:['#213b78','#542876','#721d3b','#6b7280','#261674'], otherTextOpacity:100,
  otherItalic:true, otherUnderline:true, otherUnderlineColor:'#e8e8bf', otherUnderlineWidth:6,
  otherRainbow:true, otherRainbowColors:['#4a311c','#1c402f','#512424','#403857','#443c5d'],
};

// ═══════════════════════════════════════════════════════════════
//  Database
//  Entry: { noteClass: null|'self'|'ai'|'other'|'none'|'off', ranges: [] }
// ═══════════════════════════════════════════════════════════════
class AuthDB {
  constructor(app) { this.app = app; this.data = {}; }

  _path() { return `${this.app.vault.configDir}/plugins/${PLUGIN_ID}/${DB_FILENAME}`; }

  async load() {
    try {
      const p = this._path();
      if (await this.app.vault.adapter.exists(p)) {
        const raw = JSON.parse(await this.app.vault.adapter.read(p));
        for (const [k, v] of Object.entries(raw)) {
          this.data[k] = Array.isArray(v) ? { noteClass: null, ranges: v } : v;
        }
      }
    } catch (e) { console.warn('[auth] DB load error', e); this.data = {}; }
  }

  async save() {
    try {
      await this.app.vault.adapter.write(this._path(), JSON.stringify(this.data, null, 2));
    } catch (e) { console.error('[auth] DB save error', e); }
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

  deleteFile(p)        { delete this.data[p]; }
  renameFile(old, neo) { if (this.data[old]) { this.data[neo] = this.data[old]; delete this.data[old]; } }
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

// Typed text SPLITS a range rather than extending it (new chars = unmarked)

// Expand noteClass into full range list including exceptions
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
//  CSS builder
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

  const br  = corner === 'sharp' ? '0' : corner === 'pill' ? '999px' : '5px';
  const bdb = hlMode === 'solid' ? 'clone' : 'slice';

  const pillPad = corner === 'pill' ? 'padding:0 5px;' : '';
  let css = `border-radius:${br};${pillPad}-webkit-box-decoration-break:${bdb};box-decoration-break:${bdb};`;

  // bg: always box-shadow so it never clips text regardless of rainbow/gradient
  if (bgOn && bgC.length) {
    css += `box-shadow:inset 0 0 0 200px ${hexToRgba(bgC[0], bgOp)};`;
  }
  if (!rainbow && tgOn && tC.length) {
    css += `background:${makeGradient(tC, tOp)};`;
    css += `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  }

  if (it) css += 'font-style:italic;';

  if (ul) {
    css += `text-decoration:underline;text-decoration-color:${ulC};text-decoration-thickness:${ulW}px;text-underline-offset:2px;`;
    if (tgOn && !rainbow) css += `-webkit-text-decoration-color:${ulC};`;
  }

  return css;
}

function buildFullCSS(s) {
  // Note backgrounds: applied to .workspace-leaf-content[data-auth-class="X"]
  const noteBgRules = ['self', 'ai', 'other'].map(type => {
    const lines = [];
    const sel = `.auth-note-${type} .cm-editor, .auth-note-${type} .markdown-reading-view`;
    if (s[`${type}NoteBgEnabled`])
      lines.push(`${sel} { background-color: ${s[`${type}NoteBgColor`] || '#fff'} !important; }`);
    if (s[`${type}NoteStripeEnabled`] || s[`${type}NoteGlowEnabled`]) {
      const w = s[`${type}NoteStripeWidth`] || 3;
      const sc = s[`${type}NoteStripeColor`] || '#888';
      // Stripe + glow as single left-edge gradient: solid stripe fading right
      const stripeW = s[`${type}NoteStripeEnabled`] ? w : 0;
      const fadeW   = s[`${type}NoteGlowEnabled`]   ? 48 : 0;
      const totalW  = stripeW + fadeW;
      if (totalW > 0) {
        const rgba = hexToRgba(sc, 85);
        const grad = stripeW > 0
          ? `linear-gradient(to right, ${rgba} ${stripeW}px, ${hexToRgba(sc, 40)} ${Math.round(stripeW*1.5)}px, transparent ${totalW}px)`
          : `linear-gradient(to right, ${hexToRgba(sc, 40)} 0px, transparent ${fadeW}px)`;
        lines.push(`${sel} { background-image: ${grad} !important; background-repeat: no-repeat !important; padding-left: 12px !important; }`);
      }
    }
    return lines.join('\n');
  }).join('\n');

  return `
/* ── Authorship inline highlight classes ── */
.auth-self  { ${buildTypeCSS('self',  s)} }
.auth-ai    { ${buildTypeCSS('ai',    s)} }
.auth-other { ${buildTypeCSS('other', s)} }

/* ── Note background by class ── */
${noteBgRules}

/* ── Settings: sticky preview ── */
.auth-preview-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: var(--background-primary);
  padding: 10px 0 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  margin-bottom: 14px;
}
.auth-preview-inner {
  padding: 7px 12px;
  background: var(--background-secondary);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.8;
}

/* ── Settings: 2-column grid ── */
.auth-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
  align-items: start;
}
.auth-two-col > * { min-width: 0; }

/* ── Settings: section headings ── */
.auth-section-h3 {
  font-size: 1.05em !important; font-weight: 800 !important; letter-spacing: .03em;
  color: var(--text-accent) !important;
  margin: 20px 0 2px !important;
  border-bottom: 2px solid var(--background-modifier-border);
  padding-bottom: 4px;
}
.auth-section-orange { color: #c97000 !important; border-color: #e8a84055 !important; }
.auth-syn-item { padding: 2px 0 !important; border: none !important; }
.auth-syn-item .setting-item-info { padding-bottom: 2px !important; min-height: 0 !important; }
.auth-syn-item .auth-tag-area { min-height: 40px !important; }

/* ── Settings: visibility row ── */
.auth-vis-row { display: flex; gap: 16px; align-items: center; padding: 8px 0; flex-wrap: wrap; }
.auth-vis-cell { display: flex; align-items: center; gap: 6px; font-size: .9em; }

/* ── Settings: three-column tags ── */
.auth-three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
.auth-tag-col { display: flex; flex-direction: column; gap: 4px; }
.auth-tag-col-label { font-size: .85em; font-weight: 600; color: var(--text-muted); }

/* ── Settings: collapsible section ── */
.auth-collapse-head {
  display: flex; align-items: center; justify-content: space-between;
  cursor: pointer; user-select: none;
  padding: 6px 8px 6px;
  background: var(--background-secondary);
  border-radius: 5px;
  margin: 10px 0 6px;
}
.auth-collapse-title { font-size: .95em; font-weight: 600; color: var(--text-normal); }
.auth-collapse-arrow { font-size: .8em; opacity: .55; transition: transform .2s; }
.auth-collapse-body.is-collapsed { display: none; }

/* ── Settings: colour array ── */
.auth-color-array { padding: 4px 0 8px; grid-column: 1 / -1; }
.auth-color-array-label { font-size: 0.85em; color: var(--text-muted); margin-bottom: 4px; }
.auth-color-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.auth-color-swatch { display: flex; align-items: center; gap: 2px; }
.auth-color-row input[type=color] { width: 32px; height: 26px; border: none; background: none; cursor: pointer; border-radius: 4px; }
.auth-color-rm { cursor: pointer; font-size: 12px; opacity: 0.5; padding: 0 2px; line-height: 1; }
.auth-color-rm:hover { opacity: 1; }
.auth-add-color { font-size: 0.82em; cursor: pointer; color: var(--text-accent); margin-left: 4px; }
.auth-add-color:hover { text-decoration: underline; }

/* ── Settings: tag textarea ── */
.auth-tag-area {
  width: 100%; min-height: 120px;
  font-family: var(--font-monospace); font-size: 0.82em;
  resize: vertical;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px; padding: 6px 8px;
  color: var(--text-normal);
}

/* ── Paste modal ── */
.auth-modal .modal-content { padding: 1.4rem 1.6rem; }
.auth-modal h2 { font-size: 1.05rem; font-weight: 700; margin-bottom: .75rem; }
.auth-paste-preview {
  max-height: 72px; overflow: hidden; word-break: break-word; white-space: pre-wrap;
  font-size: .82em; color: var(--text-muted); padding: 7px 10px;
  background: var(--background-secondary); border-radius: 5px;
  margin-bottom: 12px; position: relative;
}
.auth-paste-preview::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 22px;
  background: linear-gradient(transparent, var(--background-secondary));
  border-radius: 0 0 5px 5px;
}
.auth-modal-buttons { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.auth-modal-btn {
  flex: 1; min-width: 68px; padding: 6px 10px;
  border-radius: 7px; border: 1px solid var(--background-modifier-border);
  cursor: pointer; font-size: .84em; font-weight: 600;
  background: var(--background-secondary); color: var(--text-normal);
}
.auth-modal-btn.btn-self  { border-color: rgba(52,211,153,.55); background: rgba(52,211,153,.08); }
.auth-modal-btn.btn-ai    { border-color: rgba(167,139,250,.55); background: rgba(167,139,250,.08); }
.auth-modal-btn.btn-other { border-color: rgba(251,146,60,.55);  background: rgba(251,146,60,.08); }
.auth-modal-btn.btn-skip  { opacity: .6; }
.auth-modal-mark-note {
  display: flex; align-items: center; gap: 6px;
  font-size: .84em; color: var(--text-normal);
  margin-bottom: 10px;
}
.auth-modal-mark-note input[type=checkbox] { cursor: pointer; }
.auth-modal-footer {
  display: flex; gap: 10px; flex-wrap: wrap;
  border-top: 1px solid var(--background-modifier-border);
  padding-top: 8px; font-size: .77em; color: var(--text-muted);
}
.auth-modal-footer a { color: var(--text-accent); cursor: pointer; text-decoration: underline; }
.auth-tag-modal-desc { color: var(--text-muted); font-size: .9em; margin-bottom: 14px; }
`;
}

// ═══════════════════════════════════════════════════════════════
//  CodeMirror 6 extension
//  — StateField stores decos directly; provide uses .from() for
//    stable delivery; no recompute-on-view-update needed.
// ═══════════════════════════════════════════════════════════════
function createEditorExtension(plugin) {
  let cm6;
  try {
    const S = require('@codemirror/state');
    const V = require('@codemirror/view');
    cm6 = {
      StateField: S.StateField,
      StateEffect: S.StateEffect,
      Decoration: V.Decoration,
      EditorView: V.EditorView,
    };
  } catch (e) { console.error('[auth] CM6 unavailable', e); return null; }

  const FX = {
    setEntry: cm6.StateEffect.define(),  // { noteClass, ranges }
    mark:     cm6.StateEffect.define(),  // { from, to, sourceType, authorName }
    remove:   cm6.StateEffect.define(),  // { from, to }
    setClass: cm6.StateEffect.define(),  // string | null
  };
  plugin._fx = FX;

  const field = cm6.StateField.define({
    create: () => ({
      noteClass: null,
      ranges:    [],
      docLen:    0,
      decos:     cm6.Decoration.none,
    }),

    update(val, tr) {
      let { noteClass, ranges } = val;
      const docLen = tr.newDoc.length;

      // ── Process effects ──────────────────────────────────
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

      // ── Adjust positions on edits ────────────────────────
      if (tr.docChanged) {
        ranges = ranges.map(r => {
          const nf = tr.changes.mapPos(r.from, -1);
          const nt = tr.changes.mapPos(r.from + r.length, 1);
          return nt > nf ? { ...r, from: nf, length: nt - nf } : null;
        }).filter(Boolean);
        ranges = mergeAdjacent(ranges);
      }

      // ── Always recompute decos so settings changes propagate ──
      const decos = plugin.settings.enabled
        ? buildDecorations({ noteClass, ranges, docLen }, plugin.settings, cm6)
        : cm6.Decoration.none;

      return { noteClass, ranges, docLen, decos };
    },

    // Stable delivery: decorations come straight from state, no
    // extra compute step that could miss a view-update cycle.
    provide: f => cm6.EditorView.decorations.from(f, v => v.decos),
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
  if (noteClass === 'off') return cm6.Decoration.none;

  const decos = [];

  const addMark = (from, to, cls) => {
    if (to <= from || from < 0) return;
    to = Math.min(to, docLen);
    if (to <= from) return;
    try { decos.push(cm6.Decoration.mark({ class: cls }).range(from, to)); } catch {}
  };

  // When noteClass is set: CSS background covers same-type text.
  // Only highlight fragments that differ from the note class (exceptions).
  const allRanges = noteClass !== null
    ? ranges.filter(r => r.sourceType !== noteClass)
    : ranges;

  for (const r of allRanges) {
    if (!r || r.length <= 0) continue;
    if (!visibleFor(r.sourceType, settings)) continue;
    addMark(r.from, r.from + r.length, `auth-${r.sourceType}`);
  }

  // Rainbow per-character colours — only on exception fragments
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
    this.plugin = plugin;
    this.text   = text;
    this.cb     = cb;           // cb(sourceType, markWholeNote)
    this.modalEl.addClass('auth-modal');
  }

  onOpen() {
    const t = LNG[this.plugin.settings.language] || LNG.ru;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: t.dialogTitle });

    // Text preview
    const preview = contentEl.createDiv({ cls: 'auth-paste-preview' });
    preview.textContent = this.text.slice(0, 180) + (this.text.length > 180 ? '…' : '');

    // Author buttons
    const btns = contentEl.createDiv({ cls: 'auth-modal-buttons' });
    const btn = (label, cls, type) => {
      const b = btns.createEl('button', { text: label, cls: ['auth-modal-btn', cls] });
      b.addEventListener('click', () => {
        this.close();
        this.cb(type, markNoteChk.checked);
      });
    };
    btn(t.selfLabel,  'btn-self',  ST.SELF);
    btn(t.aiLabel,    'btn-ai',    ST.AI);
    btn(t.otherLabel, 'btn-other', ST.OTHER);
    btn(t.dialogSkip, 'btn-skip',  null);

    // «Mark whole note» checkbox — checked by default
    const markNoteRow = contentEl.createDiv({ cls: 'auth-modal-mark-note' });
    const markNoteChk = markNoteRow.createEl('input');
    markNoteChk.type    = 'checkbox';
    markNoteChk.checked = true;
    markNoteChk.id      = 'auth-mark-note-chk';
    const markNoteLbl = markNoteRow.createEl('label', { text: t.dialogMarkNote });
    markNoteLbl.htmlFor = 'auth-mark-note-chk';

    // Footer links
    const footer = contentEl.createDiv({ cls: 'auth-modal-footer' });
    const lkSess = footer.createEl('a', { text: t.dialogDisableSession });
    lkSess.onclick = () => {
      this.plugin._pasteSuppressed = true;
      this.close(); this.cb(null, false);
    };
    const lkPerm = footer.createEl('a', { text: t.dialogDisable });
    lkPerm.onclick = () => {
      this.plugin.settings.pasteDialogEnabled = false;
      void this.plugin.saveSettings();
      this.close(); this.cb(null, false);
    };
  }

  onClose() { this.contentEl.empty(); }
}

// ═══════════════════════════════════════════════════════════════
//  Settings tab
// ═══════════════════════════════════════════════════════════════
class AuthSettings extends obsidian.PluginSettingTab {
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
      // Force settings preview to repaint
      document.querySelectorAll('.auth-preview-inner [class^="auth-"]').forEach(el => {
        el.style.display = 'none'; void el.offsetHeight; el.style.display = '';
      });
    };

    // ── Language ──────────────────────────────────────────
    new obsidian.Setting(containerEl)
      .setName(t.language).setDesc(t.languageDesc)
      .addDropdown(d => d
        .addOption('ru', 'Русский').addOption('en', 'English')
        .setValue(s.language)
        .onChange(async v => { await save({ language: v }); this.display(); }));

    // ── General ───────────────────────────────────────────
    new obsidian.Setting(containerEl).setName(t.tracking).setDesc(t.trackingDesc)
      .addToggle(tg => tg.setValue(s.enabled).onChange(v => save({ enabled: v })));

    // ── Paste ─────────────────────────────────────────────
    containerEl.createEl('h3', { text: t.pasteSection, cls: 'auth-section-h3' });
    new obsidian.Setting(containerEl).setName(t.pasteDialog).setDesc(t.pasteDialogDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogEnabled).onChange(v => save({ pasteDialogEnabled: v })));
    new obsidian.Setting(containerEl).setName(t.pasteDialogRestore).setDesc(t.pasteDialogRestoreDesc)
      .addToggle(tg => tg.setValue(s.pasteDialogRestore).onChange(v => save({ pasteDialogRestore: v })));
    new obsidian.Setting(containerEl).setName(t.defaultPaste).setDesc(t.defaultPasteDesc)
      .addDropdown(d => d
        .addOption(ST.SELF, t.selfLabel).addOption(ST.OTHER, t.otherLabel).addOption(ST.AI, t.aiLabel)
        .setValue(s.defaultPasteSource)
        .onChange(v => save({ defaultPasteSource: v })));

    // ── Synonyms ──────────────────────────────────────────
    this._collapsibleSection(containerEl, t.synonymsSection, body => {
      body.createEl('p', { text: t.synonymsHint, cls: 'auth-tag-modal-desc' });
      body.createEl('p', { text: t.synonymsDesc, cls: 'auth-tag-modal-desc' });
      for (const [key, label] of [
        ['selfSynonyms', t.selfLabel], ['otherSynonyms', t.otherLabel],
        ['aiSynonyms', t.aiLabel], ['noneSynonyms', t.noneLabel], ['offSynonyms', t.offLabel],
      ]) {
        const wr = body.createDiv({ cls: 'setting-item auth-syn-item' });
        wr.createDiv({ cls: 'setting-item-info' }).createDiv({ cls: 'setting-item-name', text: label });
        const ct = wr.createDiv({ cls: 'setting-item-control' }); ct.style.flex = '1';
        const ta = ct.createEl('textarea', { cls: 'auth-tag-area' });
        ta.style.minHeight = '48px';
        ta.value = (s[key] || []).join(', ');
        ta.addEventListener('input', () => {
          save({ [key]: ta.value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) });
        });
      }
    }, true);

    // ── Tags ──────────────────────────────────────────────
    this._collapsibleSection(containerEl, t.tagSection, body => {
      new obsidian.Setting(body).setName(t.tagAutoEnabled).setDesc(t.tagAutoEnabledDesc)
        .addToggle(tg => tg.setValue(s.tagAutoEnabled).onChange(v => save({ tagAutoEnabled: v })));
      const tagGrid = body.createDiv({ cls: 'auth-three-col' });
      for (const [key, label] of [['tagsSelf', t.selfLabel], ['tagsOther', t.otherLabel], ['tagsAi', t.aiLabel]]) {
        const col = tagGrid.createDiv({ cls: 'auth-tag-col' });
        col.createDiv({ cls: 'auth-tag-col-label', text: label });
        const ta = col.createEl('textarea', { cls: 'auth-tag-area' });
        ta.placeholder = t.tagsDesc;
        ta.value = (s[key] || []).join('\n');
        ta.addEventListener('input', () => {
          save({ [key]: ta.value.split('\n').map(x => x.trim().replace(/^#/, '')).filter(Boolean) });
        });
      }
    }, true);

    // ── Markup visibility ─────────────────────────────────
    containerEl.createEl('h3', { text: t.highlightSection, cls: 'auth-section-h3' });
    const visRow = containerEl.createDiv({ cls: 'auth-vis-row' });
    for (const [key, label] of [['showSelf', t.selfLabel], ['showOther', t.otherLabel], ['showAi', t.aiLabel]]) {
      const cell = visRow.createDiv({ cls: 'auth-vis-cell' });
      cell.createSpan({ text: label });
      const tog = new obsidian.ToggleComponent(cell);
      tog.setValue(s[key]).onChange(v => save({ [key]: v }));
    }

    // ── Note background ───────────────────────────────────
    this._collapsibleSection(containerEl, t.noteBgSection, body => {
      body.createEl('p', { text: t.noteBgHint, cls: 'auth-tag-modal-desc' });
      const nbGrid = body.createDiv({ cls: 'auth-two-col' });
      for (const [type, label] of [['self', t.selfLabel], ['other', t.otherLabel], ['ai', t.aiLabel]]) {
        const col = nbGrid.createDiv();
        new obsidian.Setting(col).setName(label).setDesc(t.noteBgEnabled)
          .addToggle(tg => tg.setValue(s[`${type}NoteBgEnabled`]).onChange(v => save({ [`${type}NoteBgEnabled`]: v })))
          .addColorPicker(cp => cp.setValue(s[`${type}NoteBgColor`] || '#ffffff').onChange(v => save({ [`${type}NoteBgColor`]: v })));
        new obsidian.Setting(col).setName(t.noteStripeEnabled)
          .addToggle(tg => tg.setValue(s[`${type}NoteStripeEnabled`]).onChange(v => save({ [`${type}NoteStripeEnabled`]: v })))
          .addColorPicker(cp => cp.setValue(s[`${type}NoteStripeColor`] || '#888').onChange(v => save({ [`${type}NoteStripeColor`]: v })))
          .addSlider(sl => sl.setLimits(1, 8, 1).setValue(s[`${type}NoteStripeWidth`] || 3).setDynamicTooltip().onChange(v => save({ [`${type}NoteStripeWidth`]: v })));
        new obsidian.Setting(col).setName(t.noteGlow)
          .addToggle(tg => tg.setValue(s[`${type}NoteGlowEnabled`] || false).onChange(v => save({ [`${type}NoteGlowEnabled`]: v })));
      }
    }, true);

    // ── Per-type highlight sections ───────────────────────
    containerEl.createEl('h3', { text: t.markupSection, cls: 'auth-section-h3 auth-section-orange' });
    for (const [type, label] of [['self', t.selfSection], ['other', t.otherSection], ['ai', t.aiSection]]) {
      this._typeSection(containerEl, type, label, t, s, save);
    }
  }

  _collapsibleSection(containerEl, title, buildFn, startCollapsed = true) {
    const head = containerEl.createDiv({ cls: 'auth-collapse-head' });
    head.createEl('span', { text: title, cls: 'auth-collapse-title' });
    const arrow = head.createSpan({ cls: 'auth-collapse-arrow', text: startCollapsed ? '▶' : '▼' });
    const body = containerEl.createDiv({ cls: 'auth-collapse-body' });
    if (startCollapsed) body.classList.add('is-collapsed');
    head.addEventListener('click', () => {
      const col = body.classList.toggle('is-collapsed');
      arrow.textContent = col ? '▶' : '▼';
    });
    buildFn(body);
  }

  _typeSection(el, type, label, t, s, save) {
    // Collapsible header
    const head = el.createDiv({ cls: 'auth-collapse-head' });
    head.createEl('span', { text: label, cls: 'auth-collapse-title' });
    const arrow = head.createSpan({ cls: 'auth-collapse-arrow', text: '▶' });
    const body = el.createDiv({ cls: 'auth-collapse-body is-collapsed' });
    head.addEventListener('click', () => {
      const collapsed = body.classList.toggle('is-collapsed');
      arrow.textContent = collapsed ? '▶' : '▼';
    });

    // Sticky live preview
    const wrap = body.createDiv({ cls: 'auth-preview-wrap' });
    const inner = wrap.createDiv({ cls: 'auth-preview-inner' });
    inner.createSpan({ cls: `auth-${type}`, text: t.previewSample });

    // Two-column grid for settings
    const grid = body.createDiv({ cls: 'auth-two-col' });

    // Helper: add a setting into the grid
    const gs = (name, desc, addFn) => {
      const s2 = new obsidian.Setting(grid).setName(name);
      if (desc) s2.setDesc(desc);
      addFn(s2);
      return s2;
    };

    gs(t.highlightMode, null, s2 => s2.addDropdown(d => d
      .addOption('gapped', t.hlGapped).addOption('solid', t.hlSolid)
      .setValue(s[`${type}HighlightMode`])
      .onChange(v => save({ [`${type}HighlightMode`]: v }))));

    gs(t.cornerStyle, null, s2 => s2.addDropdown(d => d
      .addOption('sharp', t.cSharp).addOption('round', t.cRound).addOption('pill', t.cPill)
      .setValue(s[`${type}CornerStyle`])
      .onChange(v => save({ [`${type}CornerStyle`]: v }))));

    gs(t.bgEnabled, t.bgEnabledDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}BgEnabled`]).onChange(v => save({ [`${type}BgEnabled`]: v }))));

    gs(t.bgOpacity, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 100, 1).setValue(s[`${type}BgOpacity`])
        .setDynamicTooltip().onChange(v => save({ [`${type}BgOpacity`]: v }))));

    this._colorArray(grid, `${type}BgColors`, t.bgColors, t, s, save);

    gs(t.textGradient, t.textGradientDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}TextGradient`]).onChange(v => save({ [`${type}TextGradient`]: v }))));

    gs(t.textOpacity, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 100, 1).setValue(s[`${type}TextOpacity`])
        .setDynamicTooltip().onChange(v => save({ [`${type}TextOpacity`]: v }))));

    this._colorArray(grid, `${type}TextColors`, t.textColors, t, s, save);

    gs(t.italic, t.italicDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Italic`]).onChange(v => save({ [`${type}Italic`]: v }))));

    gs(t.underline, t.underlineDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Underline`]).onChange(v => save({ [`${type}Underline`]: v }))));

    gs(t.underlineColor, null, s2 => s2.addColorPicker(cp =>
      cp.setValue(s[`${type}UnderlineColor`]).onChange(v => save({ [`${type}UnderlineColor`]: v }))));

    gs(t.underlineWidth, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 8, 1).setValue(s[`${type}UnderlineWidth`])
        .setDynamicTooltip().onChange(v => save({ [`${type}UnderlineWidth`]: v }))));

    gs(t.rainbow, t.rainbowDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Rainbow`]).onChange(v => save({ [`${type}Rainbow`]: v }))));

    this._colorArray(grid, `${type}RainbowColors`, t.rainbowColors, t, s, save);
  }

  _colorArray(containerEl, key, label, t, s, save) {
    const p = this.plugin;
    const wrap = containerEl.createDiv({ cls: 'auth-color-array' });

    const render = () => {
      wrap.empty();
      wrap.createDiv({ cls: 'auth-color-array-label', text: label });
      const colors = [...(p.settings[key] || [])];
      const row = wrap.createDiv({ cls: 'auth-color-row' });
      colors.forEach((c, i) => {
        const sw = row.createDiv({ cls: 'auth-color-swatch' });
        const picker = sw.createEl('input');
        picker.type  = 'color';
        picker.value = c;
        picker.addEventListener('input', ev => {
          const nc = [...p.settings[key]]; nc[i] = ev.target.value;
          save({ [key]: nc });
        });
        if (colors.length > 1) {
          const rm = sw.createEl('span', { text: t.removeColor, cls: 'auth-color-rm' });
          rm.addEventListener('click', () => {
            const nc = [...p.settings[key]]; nc.splice(i, 1);
            save({ [key]: nc }); render();
          });
        }
      });
      if (colors.length < MAX_COLORS) {
        const add = wrap.createEl('div', { text: t.addColor, cls: 'auth-add-color' });
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
class AuthPlugin extends obsidian.Plugin {

  async onload() {
    const raw = await this.loadData() || {};
    this.settings = Object.assign({}, DEFAULTS, raw);
    this._migrateSettings();
    if (this.settings.pasteDialogRestore) this.settings.pasteDialogEnabled = true;
    this._pasteSuppressed = false;

    this.db = new AuthDB(this.app);
    await this.db.load();

    this._field = null;
    this._fx    = null;

    const ext = createEditorExtension(this);
    if (ext) this.registerEditorExtension(ext);

    this.addSettingTab(new AuthSettings(this.app, this));
    this.applyCSS();
    this._registerCommands();
    this._registerEvents();
    // Load currently open file — file-open doesn't fire on plugin reload
    setTimeout(() => {
      const f = this.app.workspace.getActiveFile();
      if (f) void this._loadEntry(f);
    }, 300);
    console.log('[auth] loaded');
  }

  onunload() {
    document.getElementById('auth-css')?.remove();
    // Save synchronously before plugin tears down
    this._debounceSave?.cancel?.();
    // Snapshot current ranges into DB, then write
    try {
      const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      const cm = view?.editor?.cm;
      if (cm && this._field) {
        const fv = cm.state.field(this._field, false);
        if (fv && view.file) {
          const ex = this.db.getEntry(view.file.path);
          this.db.setEntry(view.file.path, { noteClass: ex.noteClass, ranges: [...fv.ranges] });
        }
      }
    } catch {}
    // Fire-and-forget but synchronous adapter write is best-effort
    void this.db.save();
    console.log('[auth] unloaded');
  }

  async saveSettings() { await this.saveData(this.settings); }

  // ── Migrations ─────────────────────────────────────────────
  _migrateSettings() {
    const s = this.settings;
    for (const type of ['self', 'ai', 'other']) {
      if (s[`${type}BgColor1`] !== undefined && !s[`${type}BgColors`]) {
        s[`${type}BgColors`] = [s[`${type}BgColor1`], s[`${type}BgColor2`], s[`${type}BgColor3`]].filter(Boolean);
        delete s[`${type}BgColor1`]; delete s[`${type}BgColor2`]; delete s[`${type}BgColor3`];
      }
      if (s[`${type}TextColor1`] !== undefined && !s[`${type}TextColors`]) {
        s[`${type}TextColors`] = [s[`${type}TextColor1`], s[`${type}TextColor2`], s[`${type}TextColor3`]].filter(Boolean);
        delete s[`${type}TextColor1`]; delete s[`${type}TextColor2`]; delete s[`${type}TextColor3`];
      }
      if (s[`${type}HighlightMode`] === undefined) s[`${type}HighlightMode`] = 'gapped';
      if (s[`${type}CornerStyle`]   === undefined) s[`${type}CornerStyle`]   = 'round';
      if (s[`${type}Underline`]     === undefined) s[`${type}Underline`]     = false;
      if (s[`${type}UnderlineColor`]=== undefined) s[`${type}UnderlineColor`]= DEFAULTS[`${type}UnderlineColor`];
      if (s[`${type}UnderlineWidth`]=== undefined) s[`${type}UnderlineWidth`]= DEFAULTS[`${type}UnderlineWidth`];
      if (s[`${type}Rainbow`]       === undefined) s[`${type}Rainbow`]       = false;
      if (!s[`${type}RainbowColors`])              s[`${type}RainbowColors`] = DEFAULTS[`${type}RainbowColors`];
      // Note background defaults
      if (s[`${type}NoteBgEnabled`] === undefined) s[`${type}NoteBgEnabled`] = false;
      if (!s[`${type}NoteBgColor`])                s[`${type}NoteBgColor`]   = DEFAULTS[`${type}NoteBgColor`];
    }
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
    let el = document.getElementById('auth-css');
    if (!el) {
      el = document.createElement('style');
      el.id = 'auth-css';
      document.head.appendChild(el);
    }
    el.textContent = buildFullCSS(this.settings);
  }

  refreshEditors() {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      try { leaf.view?.editor?.cm?.dispatch({}); } catch {}
    }
  }

  // ── Note background DOM class ──────────────────────────────
  _applyNoteBgClass(noteClass) {
    // Apply .auth-note-X to the active markdown view-content element
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const el = view?.containerEl?.querySelector('.view-content');
    if (!el) return;
    el.classList.remove('auth-note-self', 'auth-note-ai', 'auth-note-other');
    if (noteClass && noteClass !== 'none' && noteClass !== 'off') {
      el.classList.add(`auth-note-${noteClass}`);
    }
  }

  // ── Commands ───────────────────────────────────────────────
  _registerCommands() {
    this.addCommand({
      id:   'auth-mark-self',
      name: 'auth: Mark selection as my text',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.SELF),
    });
    this.addCommand({
      id:   'auth-mark-ai',
      name: 'auth: Mark selection as AI',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.AI),
    });
    this.addCommand({
      id:   'auth-mark-other',
      name: 'auth: Mark selection as other text',
      editorCallback: (_, ctx) => this._markSel(ctx, ST.OTHER),
    });
    this.addCommand({
      id:   'auth-remove',
      name: 'auth: Remove authorship at cursor / selection',
      editorCallback: (_, ctx) => this._removeAuth(ctx),
    });
    this.addCommand({
      id:   'auth-off',
      name: 'auth: Suspend all markup for this note (off)',
      editorCallback: (_, ctx) => this._setNoteClass('off'),
    });
    // Note class commands removed from palette (set via paste dialog or tags)
  }

  _markSel(ctx, sourceType) {
    if (!this._fx || !this._field) return;
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    const { from, to } = cm.state.selection.main;
    if (from === to) { new obsidian.Notice('[auth] No text selected'); return; }
    const authorName = sourceType === ST.SELF ? 'self' :
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
      const fState = cm.state.field(this._field, false);
      if (!fState) return;
      const hit = fState.ranges.find(r => r.from <= from && r.from + r.length >= from);
      if (!hit) { new obsidian.Notice('[auth] No authorship at cursor'); return; }
      from = hit.from; to = hit.from + hit.length;
    }

    cm.dispatch({ effects: this._fx.remove.of({ from, to }) });
    this._scheduleSave();
  }

  _setNoteClass(noteClass, file) {
    file = file || this.app.workspace.getActiveFile();
    if (!file) return;
    // Write to frontmatter; display value = selfAuthorName for self, else canonical
    const displayVal = noteClass || null;
    this.app.fileManager.processFrontMatter(file, fm => {
      if (displayVal) fm['auth'] = displayVal;
      else delete fm['auth'];
    });
    // Update CM state
    const entry = { ...this.db.getEntry(file.path), noteClass };
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm   = view?.editor?.cm;
    if (cm && this._fx) {
      try { cm.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
    }
    this._applyNoteBgClass(noteClass);
  }

  // ── Events ─────────────────────────────────────────────────
  _registerEvents() {
    // File open: load entry — use setTimeout(0) so CM has finished
    // initializing the new state before we push the entry into it.
    this.registerEvent(this.app.workspace.on('file-open', async (file) => {
      if (!file) return;
      // If no auth: field but frontmatter has 'source', default to other
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm?.['source'] !== undefined && fm?.['source'] !== null && fm?.['source'] !== '') {
        const existing = parseAuthClass(fm?.['auth'], this.settings);
        if (!existing) this.app.fileManager.processFrontMatter(file, f => { if (!f['auth']) f['auth'] = 'other'; });
      }
      await this._loadEntry(file);
      setTimeout(() => this._loadEntry(file), 0);
      setTimeout(() => this._loadEntry(file), 150);
    }));

    // Also reload on active-leaf-change for tab switches
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      const file = this.app.workspace.getActiveFile();
      if (file) setTimeout(() => this._loadEntry(file), 0);
    }));

    // Metadata changes: re-read auth: field + tag auto-mark
    this.registerEvent(this.app.metadataCache.on('changed', (file) => {
      const active = this.app.workspace.getActiveFile();
      if (!active || active.path !== file.path) return;
      // Only refresh noteClass — never reload ranges from DB (would overwrite live positions)
      void this._refreshNoteClass(file);
      if (this.settings.tagAutoEnabled) this._checkTagAutoMark(file);
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
    // stopImmediatePropagation prevents CM6's own paste handler from also
    // firing and inserting a second copy of the text.
    this.registerDomEvent(document, 'paste', (e) => {
      if (!this.settings.enabled || !this.settings.pasteDialogEnabled) return;
      if (this._pasteSuppressed) return;
      const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) return;
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!this._dialogWorthy(text)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();   // ← prevents CM6's own handler
      new PasteModal(this.app, this, text,
        (type, markNote) => this._applyPaste(view, text, type, markNote)
      ).open();
    }, true);
  }

  _dialogWorthy(text) {
    return text.trim().split(/\s+/).length >= 5 && /[.!?…]/.test(text);
  }

  // cb from PasteModal: type = ST.* | null, markNote = bool
  _applyPaste(view, text, sourceType, markNote) {
    const editor = view.editor;
    if (!editor) return;
    const cm = view.editor?.cm;

    // Capture insert position BEFORE replaceSelection.
    // sel.from = start of selection (= cursor when nothing selected).
    const insertFrom = cm ? cm.state.selection.main.from : null;

    // Insert the text
    editor.replaceSelection(text);

    if (!sourceType) return;  // Skip was chosen

    if (markNote) {
      // «Mark whole note» mode: set note class, no fragment range
      this._setNoteClass(sourceType);
    } else {
      // Fragment mode: mark only the pasted range
      if (!cm || !this._fx || insertFrom === null) return;

      // Normalize \r\n: CM6 stores only \n, so Windows pastes
      // have fewer doc-position bytes than text.length.
      const normalizedLen = text.replace(/\r\n/g, '\n').length;
      const insertTo = insertFrom + normalizedLen;

      const authorName = sourceType === ST.SELF ? 'self' :
                         sourceType === ST.AI   ? 'AI' : 'Other';
      try {
        cm.dispatch({ effects: this._fx.mark.of({
          from: insertFrom, to: insertTo, sourceType, authorName,
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
    const matched = check(this.settings.tagsSelf, ST.SELF) ||
                    check(this.settings.tagsAi,   ST.AI)   ||
                    check(this.settings.tagsOther, ST.OTHER);
    if (!matched) return;

    // Check current frontmatter to avoid redundant writes
    const curFm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const curClass = parseAuthClass(curFm?.['auth'], this.settings);
    if (curClass === matched) {
      // Ensure CM state is in sync
      const entry = { ...this.db.getEntry(file.path), noteClass: matched };
      const view2 = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      const cm2   = view2?.editor?.cm;
      if (cm2 && this._fx) try { cm2.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
      this._applyNoteBgClass(matched);
      return;
    }
    this._setNoteClass(matched, file);
  }

  // ── DB helpers ─────────────────────────────────────────────
  // Refresh only noteClass from frontmatter, keep live ranges untouched
  async _refreshNoteClass(file) {
    if (!this._fx || !this._field) return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const noteClass = parseAuthClass(fm?.['auth'], this.settings);
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm   = view?.editor?.cm;
    if (!cm) return;
    try { cm.dispatch({ effects: this._fx.setClass.of(noteClass) }); } catch {}
    this._applyNoteBgClass(noteClass);
  }

  async _loadEntry(file) {
    if (!this._fx || !this._field) return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const noteClass = parseAuthClass(fm?.['auth'], this.settings);
    const dbEntry = this.db.getEntry(file.path);
    const entry = { noteClass, ranges: dbEntry.ranges || [] };
    // Find the leaf that owns this specific file (not just the active view)
    let cm = null;
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof obsidian.MarkdownView && leaf.view.file?.path === file.path) {
        cm = leaf.view.editor?.cm;
      }
    });
    if (!cm) return;
    try { cm.dispatch({ effects: this._fx.setEntry.of(entry) }); } catch {}
    this._applyNoteBgClass(noteClass);
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
      // noteClass lives in frontmatter; only persist ranges here
      const existing = this.db.getEntry(view.file.path);
      this.db.setEntry(view.file.path, { noteClass: existing.noteClass, ranges: [...fv.ranges] });
      await this.db.save();
    } catch {}
  }

  _scheduleSave() { setTimeout(() => void this._saveCurrentEntry(), 100); }
}

module.exports = AuthPlugin;
