'use strict';
var obsidian = require('obsidian');

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════
const PLUGIN_ID   = 'yule-auth';          // папка плагина — не менять
const DB_FILENAME = 'authorship-db.json';
const RAINBOW_MAX = 10000;
const MAX_COLORS  = 8;

const ST = { SELF: 'self', AI: 'ai', OTHER: 'other' };

const BRACKET_PAIRS_UNIVERSAL = [
  ['〈','〉'],['《','》'],['「','」'],['『','』'],['【','】'],
  ['〔','〕'],['〖','〗'],['〚','〛'],['〘','〙'],
  ['❨','❩'],['❪','❫'],['❬','❭'],['❮','❯'],['❲','❳'],['❴','❵'],
];
const BRACKET_PAIRS_OTHER = [
  ['⌈','⌉'],['⌊','⌋'],['⟦','⟧'],['⟨','⟩'],['⟪','⟫'],
  ['⦃','⦄'],['⦅','⦆'],['⦗','⦘'],['⁅','⁆'],
  ['⟬','⟭'],['⦇','⦈'],['⦉','⦊'],['⧼','⧽'],
  ['༺','༻'],['᚛','᚜'],['⸢','⸣'],['⸤','⸥'],
  ['⎡','⎤'],['⎣','⎦'],['⎧','⎫'],['⎩','⎭'],
  ['⸂','⸃'],['⸄','⸅'],['⸜','⸝'],['⸠','⸡'],
];
const BRACKET_PAIRS = [...BRACKET_PAIRS_UNIVERSAL, ...BRACKET_PAIRS_OTHER];

// Parse all inline authorship pseudo-tags from document text.
// Returns [{from, to, contentFrom, contentTo, sourceType}]
function parseFragmentTags(text, settings) {
  const results = [];
  // Build map: openChar → {type, closeChar}
  const tagMap = new Map();
  const types = [
    { type: ST.SELF,  open: settings.selfTagOpen,  close: settings.selfTagClose },
    { type: ST.AI,    open: settings.aiTagOpen,     close: settings.aiTagClose },
    { type: ST.OTHER, open: settings.otherTagOpen,  close: settings.otherTagClose },
    ...(settings.customAuthors||[]).filter(ca => ca.tagOpen && ca.authValue).map(ca => ({
      type: customAuthorId(ca.authValue), open: ca.tagOpen, close: ca.tagClose,
    })),
  ];
  for (const t of types) {
    if (t.open && t.close && t.open !== t.close) tagMap.set(t.open, t);
  }
  if (!tagMap.size) return results;

  const stack = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    // Check open tags
    for (const [open, info] of tagMap) {
      if (text.startsWith(open, i)) {
        stack.push({ type: info.type, openPos: i, openLen: open.length, close: info.close, closeLen: info.close.length });
        i += open.length; matched = true; break;
      }
    }
    if (matched) continue;
    // Check close tag for top of stack
    if (stack.length) {
      const top = stack[stack.length - 1];
      if (text.startsWith(top.close, i)) {
        stack.pop();
        results.push({ from: top.openPos, to: i + top.closeLen,
          contentFrom: top.openPos + top.openLen, contentTo: i,
          sourceType: top.type });
        i += top.closeLen; matched = true;
      }
    }
    if (!matched) i++;
  }
  return results;
}

// Parse frontmatter `auth:` value → canonical class.
// selfName = settings.selfAuthorName (any language/case).
const CANONICAL = { self:'self', ai:'ai', other:'other', none:'none', tempor_off:'tempor_off', off:'tempor_off' /* legacy */ };
function parseAuthClass(v, settings) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (CANONICAL[s]) return CANONICAL[s];
  // User-defined synonyms
  for (const [type, key] of [['self','selfSynonyms'],['ai','aiSynonyms'],['other','otherSynonyms'],['none','noneSynonyms'],['tempor_off','offSynonyms']]) {
    const syns = (settings?.[key] || []).map(x => x.toLowerCase().trim());
    if (syns.includes(s)) return type;
  }
  // Custom types (fragment-level)
  for (const ct of (settings?.customTypes || [])) {
    if (!ct.id) continue;
    if (s === ct.id.toLowerCase()) return ct.id;
    const ctSyns = (ct.synonyms || []).map(x => x.toLowerCase().trim());
    if (ctSyns.includes(s)) return ct.id;
  }
  // Custom authors (note-level)
  for (const ca of (settings?.customAuthors || [])) {
    if (!ca.authValue) continue;
    const caId = customAuthorId(ca.authValue);
    const values = [ca.authValue.toLowerCase().trim(), caId];
    // synonyms: comma-separated additional auth: values
    for (const syn of (ca.synonyms || [])) {
      const st = syn.toLowerCase().trim();
      if (st) values.push(st, customAuthorId(st));
    }
    if (values.includes(s)) return caId;
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
    offLabel: 'Разметка временно отключена (tempor_off)',
    pasteSection: 'Вставка',
    pasteDialog: 'Диалог при вставке', pasteDialogDesc: 'Запрашивать авторство при вставке ≥5 слов с пунктуацией',
    pasteDialogRestore: 'Восстанавливать при перезапуске', pasteDialogRestoreDesc: 'Включать диалог снова при следующем открытии Obsidian',
    defaultPaste: 'Авторство вставки', defaultPasteDesc: 'По умолчанию, если диалог отключён',
    customTypesSection: 'Свои авторства', addCustomType: '+ Добавить авторство', removeCustomType: '× Удалить',
    customTypeNamePh: 'Название (например: редактор)',
    customTypeValueLabel: 'Значение auth: и синонимы',
    synonymsSection: 'Синонимы значений auth:', synonymsDesc: 'Свои слова для поля auth: — через запятую. Регистр не важен.',
    synonymsHint: 'Поле auth: во frontmatter заметки задаёт класс авторства: подсветку фрагментов, фон и полосу.',
    selfLabel: 'Мой текст (self)', aiLabel: 'ИИ', otherLabel: 'Чужой текст',
    dialogTitle: 'Чей это текст?', dialogSkip: 'Пропустить',
    dialogMarkNote: 'Отметить классом всю заметку',
    dialogDisable: 'Отключить до включения вручную',
    dialogDisableSession: 'Отключить это окно до перезапуска Obsidian',
    dialogDisableNote: 'Отключить это окно для данной заметки',
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
    noteBgEnabled: 'Фон', noteBgColor: 'Цвет фона',
    noteStripeEnabled: 'Правая полоса', noteStripeColor: 'Цвет полосы', noteStripeWidth: 'Толщина (px)', noteGlow: 'Свечение',
    noteBgHint: 'Только по классу, для целой заметки.',
    previewSample: 'Образец текста с подсветкой авторства',
    highlightMode: 'Режим подсветки',
    hlGapped: 'С просветами (стандартный)', hlSolid: 'Сплошной (без разрывов)',
    cornerStyle: 'Скругление углов',
    cSharp: 'Прямые', cRound: 'Скруглённые', cPill: 'Пилюля',
    bgEnabled: 'Подсветка', bgEnabledDesc: 'С градиентом шрифта или разноцветными буквами отобразится только первый цвет.',
    bgColors: 'Цвета подсветки', bgOpacity: 'Интенсивность (%)',
    textGradient: 'Градиент шрифта', textGradientDesc: 'Окрашивать текст градиентом (как в iA Writer)',
    textColors: 'Цвета шрифта', textOpacity: 'Интенсивность шрифта (%)',
    italic: 'Курсив', italicDesc: 'Отображать этот тип текста курсивом',
    bold: 'Полужирный', boldDesc: 'Отображать этот тип текста полужирным',
    underline: 'Подчёркивание', underlineDesc: 'Подчёркивать этот тип текста',
    underlineColor: 'Цвет подчёркивания', underlineWidth: 'Толщина подчёркивания (px)',
    rainbow: '🌈 Разноцветные буквы', rainbowDesc: `Каждая буква своего цвета (до ${RAINBOW_MAX} символов на диапазон). Отключает градиент шрифта.`,
    rainbowColors: 'Цвета букв',
    addColor: '+ цвет', removeColor: '×',
    collapse: 'Свернуть', expand: 'Развернуть',
    pasteMarkNoteDefault: 'Отмечать класс всей заметки по умолчанию', pasteMarkNoteDefaultDesc: 'В диалоге галочка отмечена автоматически.',
    selfTopStripe: 'Плашка «мои пометки»',
    selfBadgeText: 'Есть мои пометки',
    visRowLabel: 'Показывать раскраску авторств:',
    dialogNoShowGroup: 'Не показывать это окно:',
    dialogNoShowNote: 'для этой заметки',
    dialogNoShowSession: 'до перезапуска Obsidian',
    dialogNoShowForever: 'совсем (вернуть можно в настройках)',
    stripePlacement: 'Полосы абзацев и заголовков',
    stripePlacementDesc: 'Где рисовать сегменты полос для фрагментов-абзацев и блоков заголовков',
    spEdge: 'У края заметки, в основной полосе (с градиентом)',
    spText: 'Вплотную к тексту',
    selfTopStripeDesc: 'В заметке с чужим/ИИ авторством показывать плашку в правом верхнем углу, если есть фрагменты моего авторства. Текст плашки — в поле рядом.',
    pseudoTagsSection: 'Выбор разметки авторства для фрагмента (псевдотеги)',
    pseudoTagsDesc: 'Символы-скобки для разметки фрагментов в тексте. Открывающий ≠ закрывающему.',
    tagOpen: 'Открывающий', tagClose: 'Закрывающий', tagChoose: 'Изменить',
    customAuthorsSection: 'Другие авторы',
    customAuthorsHint: 'только для заметок целиком',
    addCustomAuthor: 'Добавить автора', removeCustomAuthor: 'Удалить этого автора',
    customAuthorAuthValue: 'Значение auth:',
  },
  en: {
    language: 'Language / Язык', languageDesc: 'Settings interface language',
    generalSection: 'General',
    tracking: 'Authorship tracking', trackingDesc: 'Enable/disable authorship highlighting',
    noneLabel: 'No class (none)',
    offLabel: 'Markup temporarily off (tempor_off)',
    pasteSection: 'Paste',
    pasteDialog: 'Paste dialog', pasteDialogDesc: 'Ask for authorship when pasting ≥5 words with punctuation',
    pasteDialogRestore: 'Restore on restart', pasteDialogRestoreDesc: 'Re-enable dialog on next Obsidian launch',
    defaultPaste: 'Default paste authorship', defaultPasteDesc: 'When dialog is off',
    customTypesSection: 'Custom authorship types', addCustomType: '+ Add type', removeCustomType: '× Remove',
    customTypeNamePh: 'Name (e.g. editor)',
    customTypeValueLabel: 'auth: value and synonyms',
    synonymsSection: 'auth: field synonyms', synonymsDesc: 'Custom words for the auth: field — comma-separated. Case-insensitive.',
    synonymsHint: 'The auth: frontmatter field sets the note\'s authorship class: fragment highlights, background and stripe.',
    selfLabel: 'My text (self)', aiLabel: 'AI', otherLabel: 'Other text',
    dialogTitle: 'Who wrote this?', dialogSkip: 'Skip',
    dialogMarkNote: 'Mark whole note with this class',
    dialogDisable: 'Disable until manually enabled',
    dialogDisableSession: 'Disable this dialog until Obsidian restarts',
    dialogDisableNote: 'Disable this dialog for this note',
    selfTopStripe: 'Badge “my insertions”',
    selfTopStripeDesc: 'In notes with other/AI authorship show a top-right badge when fragments of my authorship are present.',
    selfBadgeText: 'My insertions here',
    visRowLabel: 'Show authorship colouring:',
    dialogNoShowGroup: 'Do not show this dialog:',
    dialogNoShowNote: 'for this note',
    dialogNoShowSession: 'until Obsidian restarts',
    dialogNoShowForever: 'permanently (re-enable in settings)',
    stripePlacement: 'Paragraph/heading stripes',
    stripePlacementDesc: 'Where to draw stripe segments for paragraph fragments and heading blocks',
    spEdge: 'At the note edge, inside the main stripe (with glow)',
    spText: 'Next to the text',
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
    noteBgEnabled: 'Background', noteBgColor: 'Background color',
    noteStripeEnabled: 'Right stripe', noteStripeColor: 'Stripe color', noteStripeWidth: 'Width (px)', noteGlow: 'Glow',
    noteBgHint: 'Only when note class is set (whole note).',
    previewSample: 'Sample text with authorship highlight',
    highlightMode: 'Highlight mode',
    hlGapped: 'Gapped (standard)', hlSolid: 'Solid (no line-break gaps)',
    cornerStyle: 'Corner style',
    cSharp: 'Sharp', cRound: 'Rounded', cPill: 'Pill',
    bgEnabled: 'Highlight', bgEnabledDesc: 'With text gradient or rainbow, only the first color is used.',
    bgColors: 'Highlight colors', bgOpacity: 'Intensity (%)',
    textGradient: 'Text gradient', textGradientDesc: 'Color text with gradient (like iA Writer)',
    textColors: 'Text colors', textOpacity: 'Text intensity (%)',
    italic: 'Italic', italicDesc: 'Display this text type in italics',
    bold: 'Bold', boldDesc: 'Display this text type in bold',
    underline: 'Underline', underlineDesc: 'Underline this text type',
    underlineColor: 'Underline color', underlineWidth: 'Underline thickness (px)',
    rainbow: '🌈 Rainbow letters', rainbowDesc: `Each letter a different color (up to ${RAINBOW_MAX} chars per range). Overrides text gradient.`,
    rainbowColors: 'Letter colors',
    addColor: '+ color', removeColor: '×',
    collapse: 'Collapse', expand: 'Expand',
    pasteMarkNoteDefault: 'Pre-check "Mark whole note"', pasteMarkNoteDefaultDesc: 'Checkbox is ticked by default in the paste dialog. Turn off to let the user decide each time.',
    customAuthorsSection: 'Other authors',
    customAuthorsHint: 'whole-note only',
    addCustomAuthor: 'Add author', removeCustomAuthor: '× Remove',
    customAuthorAuthValue: 'auth: value',
  },
};

// ═══════════════════════════════════════════════════════════════
//  Default settings
// ═══════════════════════════════════════════════════════════════
const DEFAULTS = {
  enabled: true,
  language: 'ru',
  selfSynonyms: [],
  customTypes: [],  // [{id, name, synonyms, ...}] — fragment-level custom types
  customAuthors: [], // [{authValue, stripeEnabled, stripeColor, stripeWidth, glowEnabled}] — note-level only
  aiSynonyms: ['ии'],
  otherSynonyms: ['сохранёнка', 'кто-то', 'чьё-то', 'чужое'],
  noneSynonyms: [],
  offSynonyms: ['off', 'временно_откл', 'пауза', 'temporary_off'],
  defaultPasteSource: ST.OTHER,
  pasteDialogEnabled: true,
  pasteDialogRestore: true,
  pasteMarkNoteDefault: true,
  selfTopStripeEnabled: true,
  selfBadgeText: 'Есть мои пометки',
  tagAutoEnabled: true,
  tagsSelf:  [],
  tagsAi:    [],
  tagsOther: ['выписки', 'вырезки', 'цитаты'],
  showSelf: true, showAi: true, showOther: true,
  // Pseudo-tags
  selfTagOpen: '〖', selfTagClose: '〗',
  aiTagOpen: '❴', aiTagClose: '❵',
  otherTagOpen: '《', otherTagClose: '》',
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
  selfItalic:false, selfBold:false, selfUnderline:true, selfUnderlineColor:'#d3fdd8', selfUnderlineWidth:8,
  selfRainbow:true, selfRainbowColors:['#295142','#226d39','#223f6d','#415d41','#8a8a8a','#597197','#156140'],
  // AI
  aiHighlightMode:'solid', aiCornerStyle:'round',
  aiBgEnabled:true, aiBgColors:['#faf0ff','#f1f0ff'], aiBgOpacity:31,
  aiTextGradient:true, aiTextColors:['#413663','#684c2c','#266e8c','#919191','#6f3916','#907f41'], aiTextOpacity:100,
  aiItalic:false, aiBold:false, aiUnderline:false, aiUnderlineColor:'#a78bfa', aiUnderlineWidth:2,
  aiRainbow:false, aiRainbowColors:['#4d436b','#6d3150','#184153','#1c5f46','#723170','#522014'],
  // Other
  otherHighlightMode:'gapped', otherCornerStyle:'round',
  otherBgEnabled:false, otherBgColors:['#fff8f0','#fff3f0'], otherBgOpacity:8,
  otherTextGradient:false, otherTextColors:['#213b78','#542876','#721d3b','#6b7280','#261674'], otherTextOpacity:100,
  otherItalic:true, otherBold:false, otherUnderline:true, otherUnderlineColor:'#e8e8bf', otherUnderlineWidth:6,
  otherRainbow:true, otherRainbowColors:['#4a311c','#1c402f','#512424','#403857','#443c5d'],
};

// ═══════════════════════════════════════════════════════════════
//  Database — stores only noteClass per file (ranges live in text)
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
          // migrate old format (had ranges)
          this.data[k] = typeof v === 'object' && !Array.isArray(v) ? { noteClass: v.noteClass || null } : { noteClass: null };
        }
      }
    } catch (e) { console.warn('[auth] DB load error', e); this.data = {}; }
  }
  async save() {
    try { await this.app.vault.adapter.write(this._path(), JSON.stringify(this.data, null, 2)); }
    catch (e) { console.error('[auth] DB save error', e); }
  }
  getNoteClass(path) { return this.data[path]?.noteClass || null; }
  setNoteClass(path, noteClass) {
    const e = this.data[path] || {};
    if (noteClass) e.noteClass = noteClass; else delete e.noteClass;
    if (Object.keys(e).length) this.data[path] = e; else delete this.data[path];
  }
  getNoDialog(path) { return !!this.data[path]?.noDialog; }
  setNoDialog(path, v) {
    const e = this.data[path] || {};
    if (v) e.noDialog = true; else delete e.noDialog;
    if (Object.keys(e).length) this.data[path] = e; else delete this.data[path];
  }
  deleteFile(p)        { delete this.data[p]; }
  renameFile(old, neo) { if (this.data[old]) { this.data[neo] = this.data[old]; delete this.data[old]; } }
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

// Smooth edge glow: solid stripe (solidW) + eased fade (fadeW), many stops → no banding.
function makeEdgeGlow(color, solidW, fadeW, dir = 'to right', peakOp = 85, glowOp = 45, steps = 10) {
  const stops = [];
  if (solidW > 0) stops.push(`${hexToRgba(color, peakOp)} 0px`, `${hexToRgba(color, peakOp)} ${solidW}px`);
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const op = glowOp * (1 - k) * (1 - k); // quadratic ease-out
    stops.push(`${hexToRgba(color, +op.toFixed(1))} ${(solidW + fadeW * k).toFixed(1)}px`);
  }
  return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

function buildTypeCSS(type, s) {
  const corner  = s[`${type}CornerStyle`]   || 'round';
  const bgOn    = s[`${type}BgEnabled`];
  const bgC     = s[`${type}BgColors`]      || [];
  const bgOp    = s[`${type}BgOpacity`]     || 20;
  const tgOn    = s[`${type}TextGradient`];
  const tC      = s[`${type}TextColors`]    || [];
  const tOp     = s[`${type}TextOpacity`]   || 100;
  const it      = s[`${type}Italic`];
  const bd      = s[`${type}Bold`];
  const ul      = s[`${type}Underline`];
  const ulC     = s[`${type}UnderlineColor`]|| '#888';
  const ulW     = s[`${type}UnderlineWidth`]|| 2;
  const rainbow = s[`${type}Rainbow`];

  const br = corner === 'sharp' ? '0' : corner === 'round' ? '12px' : '999px';
  let css = `border-radius:${br};`;
  // Padding only when something is visually shown — prevents phantom indent
  const hasVisual = bgOn || ul || it || bd;
  if (hasVisual && corner === 'round') css += 'padding:0 6px;';

  // Accumulate box-shadows so they don't overwrite each other
  const shadows = [];

  // Priority: rainbow > text gradient > bg
  if (rainbow) {
    if (bgOn && bgC.length) shadows.push(`inset 0 0 0 200px ${hexToRgba(bgC[0], bgOp)}`);
  } else if (tgOn && tC.length) {
    css += `background:${makeGradient(tC, tOp)};`;
    css += `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
    if (bgOn && bgC.length) shadows.push(`inset 0 0 0 200px ${hexToRgba(bgC[0], bgOp)}`);
  } else if (bgOn && bgC.length) {
    css += `background:${makeGradient(bgC, bgOp)};`;
    // Узкая по вертикали подсветка: полоса фона по центру строки, впритык к буквам
    css += `background-size:100% 1.08em;background-position:0 50%;background-repeat:no-repeat;`;
  }

  if (it) css += 'font-style:italic;';
  if (bd) css += 'font-weight:700;';
  if (ul) {
    css += `text-decoration:underline;text-decoration-color:${ulC};text-decoration-thickness:${ulW}px;text-underline-offset:2px;`;
  }

  if (shadows.length) css += `box-shadow:${shadows.join(',')};`;

  return css;
}

// Merge custom type definition with default-like keys expected by buildTypeCSS
function buildCustomSettings(ct, s) {
  const d = {};
  const id = ct.id;
  const keys = ['HighlightMode','CornerStyle','BgEnabled','BgColors','BgOpacity','TextGradient','TextColors','TextOpacity','Italic','Bold','Underline','UnderlineColor','UnderlineWidth','Rainbow','RainbowColors'];
  for (const k of keys) d[`${id}${k}`] = ct[k.charAt(0).toLowerCase()+k.slice(1)] ?? DEFAULTS[`other${k}`];
  return { ...s, ...d };
}

// Safe CSS class id for a custom author's auth: value
function customAuthorId(authValue) {
  return String(authValue).toLowerCase().trim().replace(/\s+/g, '_');
}

function buildFullCSS(s) {
  // Note backgrounds/stripe: applied to .auth-note-X .cm-editor / .markdown-reading-view
  const noteBgRules = ['self', 'ai', 'other'].map(type => {
    const lines = [];
    const sel = `.auth-note-${type} .cm-editor, .auth-note-${type} .markdown-reading-view`;
    if (s[`${type}NoteBgEnabled`])
      lines.push(`${sel} { background-color: ${s[`${type}NoteBgColor`] || '#fff'} !important; }`);
    if (s[`${type}NoteStripeEnabled`] || s[`${type}NoteGlowEnabled`]) {
      const w    = s[`${type}NoteStripeWidth`] || 3;
      const sc   = s[`${type}NoteStripeColor`] || '#888';
      const stripeW = s[`${type}NoteStripeEnabled`] ? w : 0;
      const fadeW   = s[`${type}NoteGlowEnabled`]   ? 48 : 0;
      const totalW  = stripeW + fadeW;
      if (totalW > 0) {
        // Smooth multi-stop glow on the LEFT edge (same total width)
        const grad  = makeEdgeGlow(sc, stripeW, fadeW);
        lines.push(`${sel} { background-image: ${grad} !important; background-repeat: no-repeat !important; padding-left: 12px !important; }`);
      }
    }
    return lines.join('\n');
  }).join('\n');

  // Custom authors (note-level only)
  const customAuthorRules = (s.customAuthors || []).map(ca => {
    if (!ca.authValue) return '';
    const safeId = customAuthorId(ca.authValue);
    const lines = [];
    const sel = `.auth-note-${safeId} .cm-editor, .auth-note-${safeId} .markdown-reading-view`;
    if (ca.stripeEnabled || ca.glowEnabled) {
      const w      = ca.stripeWidth || 3;
      const sc     = ca.stripeColor || '#888';
      const stripeW = ca.stripeEnabled ? w : 0;
      const fadeW   = ca.glowEnabled   ? 48 : 0;
      const totalW  = stripeW + fadeW;
      if (totalW > 0) {
        const grad = makeEdgeGlow(sc, stripeW, fadeW);
        lines.push(`${sel} { background-image: ${grad} !important; background-repeat: no-repeat !important; padding-left: 12px !important; }`);
      }
    }
    return lines.join('\n');
  }).filter(Boolean).join('\n');

  return `
/* ── Pseudo-tag chars: shown in source mode, hidden in live preview ── */
.auth-tag-char { opacity: 0.4; font-size: .82em; color: var(--text-muted); vertical-align: baseline; }
.is-live-preview .auth-tag-char { display: none; }

/* ── Authorship inline highlight classes ── */
.auth-self  { ${buildTypeCSS('self',  s)} }
.auth-ai    { ${buildTypeCSS('ai',    s)} }
.auth-other { ${buildTypeCSS('other', s)} }

/* ── Custom authorship types ── */
${(s.customTypes||[]).map(ct => ct.id ? `.auth-custom-${ct.id} { ${buildTypeCSS(ct.id, buildCustomSettings(ct, s))} }` : '').join('\n')}

.auth-bracket-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 6px 0 12px;
}
.auth-bracket-cell {
  padding: 7px 4px; text-align: center; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-secondary); font-size: 1em;
  transition: background .12s;
}
.auth-bracket-cell:hover { background: var(--background-modifier-hover); }
.auth-picker-head { font-size: .88em; color: var(--text-muted); margin: 10px 0 4px; font-weight: 600; }
.auth-picker-custom-row { display: flex; gap: 8px; margin-top: 6px; align-items: center; }
.auth-picker-custom-inp { flex: 1; padding: 4px 8px; border-radius: 5px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); font-size: 1.1em; text-align: center; }
.auth-picker-custom-btn { padding: 4px 14px; border-radius: 5px; cursor: pointer; background: var(--interactive-accent); color: var(--text-on-accent); border: none; font-size: .88em; }
/* ── Self top-edge accent (when note is non-self but has self fragments) ── */
${(s.selfTopStripeEnabled ?? true) ? `
.auth-self-frags-badge {
  position: sticky;
  top: 8px;
  z-index: 101;
  margin-left: 2px;
  margin-right: auto;
  margin-bottom: -26px;       /* висит поверх, контент не сдвигает */
  width: max-content;
  max-width: 60%;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: .78em;
  font-weight: 600;
  letter-spacing: .02em;
  color: ${s.selfNoteStripeColor || '#888'};
  background: ${hexToRgba(s.selfNoteStripeColor || '#888', 12)};
  border: 1px solid ${hexToRgba(s.selfNoteStripeColor || '#888', 45)};
  pointer-events: none;
  backdrop-filter: blur(2px);
}` : '.auth-self-frags-badge { display: none; }'}
.auth-self-top-stripe { display: none; }

/* ── Line-level stripes: уровни «абзац+» и «блок заголовка» ── */
.auth-no-ul { text-decoration: none !important; }
${['self','ai','other'].map(tp => `.auth-line-stripe-${tp} { box-shadow: inset ${(s[tp+'NoteStripeWidth']||3)}px 0 0 0 ${s[tp+'NoteStripeColor']||'#888'}; padding-left: ${((s[tp+'NoteStripeWidth']||3)+7)}px !important; }`).join('\n')}
${(s.customTypes||[]).map(ct => ct.id ? `.auth-line-stripe-${ct.id} { box-shadow: inset 3px 0 0 0 ${(ct.bgColors&&ct.bgColors[0])||ct.underlineColor||'#888'}; padding-left: 10px !important; }` : '').join('\n')}

/* ── Note background / left stripe by class ── */
${noteBgRules}

/* ── Custom author stripes ── */
${customAuthorRules}

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
/* Header-style collapsible (Synonyms, Tags) */
.auth-section-h3.auth-section-h3-collapsible {
  cursor: pointer; user-select: none;
  display: flex; align-items: center; justify-content: space-between;
}
.auth-section-h3.auth-section-h3-collapsible .auth-collapse-arrow {
  font-size: .75em; font-weight: 400; opacity: .55; margin-left: 6px;
}
.auth-section-h3.auth-section-h3-collapsible .auth-collapse-title {
  font-size: inherit !important; font-weight: inherit !important;
  color: inherit !important; letter-spacing: inherit;
}
.auth-modal-noshow { margin-top: .4rem; padding-top: .55rem; border-top: 1px solid var(--background-modifier-border); }
.auth-noshow-title { font-size: .78em; color: var(--text-muted); margin-bottom: .3rem; }
.auth-modal-noshow .auth-modal-mark-note { margin-bottom: .35rem; }

/* ── Settings: note-level subsection label ── */
.auth-note-settings-head {
  grid-column: 1 / -1;
  font-size: .78em; color: var(--text-muted);
  margin: 14px 0 2px; border-top: 1px solid var(--background-modifier-border);
  padding-top: 8px;
}
.auth-section-hint { font-size: .82em; font-weight: 400; color: var(--text-muted); }
/* ── Pseudo-tags row ── */
.auth-pt-row { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
.auth-pt-char { font-size: 1.1em; font-weight: 600; color: var(--text-accent); min-width: 1.2em; text-align: center; }
.auth-pt-preview { color: var(--text-muted); font-size: .9em; }
.auth-pt-btn { font-size: .82em; cursor: pointer; color: var(--text-accent); background: none; border: 1px solid var(--text-accent); border-radius: 5px; padding: 3px 10px; }

/* ── Settings: custom authors ── */
.auth-ca-list { margin-top: 6px; }
.auth-ca-row {
  border: 1px solid var(--background-modifier-border);
  border-radius: 7px; padding: 10px 12px; margin-bottom: 8px;
  background: var(--background-secondary);
}
.auth-ca-val-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.auth-ca-label { font-size: .85em; color: var(--text-muted); white-space: nowrap; }
.auth-ca-input {
  flex: 1; padding: 4px 8px; border-radius: 5px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-primary); color: var(--text-normal); font-size: .9em;
}
.auth-ca-stripe-wrap { margin-bottom: 4px; }
.auth-ca-remove {
  font-size: .8em; opacity: .55; cursor: pointer;
  background: none; border: none; color: var(--text-muted); padding: 2px 4px;
}
.auth-ca-remove:hover { opacity: 1; color: var(--text-error); }
.auth-ca-add {
  font-size: .85em; cursor: pointer; color: var(--text-accent);
  background: none; border: 1px dashed var(--text-accent); border-radius: 6px;
  padding: 5px 14px; margin-top: 2px; width: 100%;
}
.auth-ca-add:hover { opacity: .75; }

/* ── Settings: colour array ── */
.auth-color-array { padding: 4px 0 8px; }
.auth-full-row { grid-column: 1 / -1; }
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
//  CodeMirror 6 extension — parses inline pseudo-tags from doc
// ═══════════════════════════════════════════════════════════════
function createEditorExtension(plugin) {
  let cm6;
  try {
    const S = require('@codemirror/state');
    const V = require('@codemirror/view');
    cm6 = {
      StateField:  S.StateField,
      StateEffect: S.StateEffect,
      Transaction: S.Transaction,
      Decoration:  V.Decoration,
      EditorView:  V.EditorView,
      WidgetType:  V.WidgetType,
      ViewPlugin:  V.ViewPlugin,
    };
  } catch (e) { console.error('[auth] CM6 unavailable', e); return null; }

  const FX = {
    setClass: cm6.StateEffect.define(),  // string | null — noteClass
  };
  plugin._fx = FX;

  const field = cm6.StateField.define({
    create(state) {
      const fragments = parseFragmentTags(state.doc.toString(), plugin.settings);
      const noteClass = null;
      const built = buildDecorations({ noteClass, fragments, doc: state.doc, docLen: state.doc.length }, plugin.settings, cm6);
      return { noteClass, fragments, decos: built.decos, stripes: built.stripes, _key: '' };
    },

    update(val, tr) {
      let { noteClass, fragments } = val;

      for (const fx of tr.effects) {
        if (fx.is(FX.setClass)) noteClass = fx.value;
      }

      if (tr.docChanged) {
        fragments = parseFragmentTags(tr.newDoc.toString(), plugin.settings);
      }

      const hasSelfFrags = fragments.some(f => f.sourceType === ST.SELF);
      const key = noteClass + '|' + hasSelfFrags + '|' + fragments.map(f => f.from + ':' + f.to + ':' + f.sourceType).join(',')
                + '|' + (plugin._settingsVersion || 0) + '|' + plugin.settings.enabled;
      let decos = val.decos;
      let stripes = val.stripes;
      if (key !== val._key) {
        if (plugin.settings.enabled) {
          const built = buildDecorations({ noteClass, fragments, doc: tr.newDoc, docLen: tr.newDoc.length }, plugin.settings, cm6);
          decos = built.decos; stripes = built.stripes;
        } else {
          decos = cm6.Decoration.none; stripes = new Map();
        }
        setTimeout(() => plugin._refreshBadges(), 0);
      }
      return { noteClass, fragments, decos, stripes, _key: key };
    },

    provide: f => cm6.EditorView.decorations.from(f, v => v.decos),
  });

  plugin._field = field;

  // Плашка «мои пометки»: моё авторство + любое другое в одной заметке.
  // Только в окнах заметок (markdown), не в боковых панелях.
  // Прячется при auth: none, выключенном «Отслеживании авторства» и выключенном плагине.
  plugin._refreshBadges = () => {
    // 1) Сначала подчистить всё старое: боковые панели, закрытые вкладки, прошлые заметки
    document.querySelectorAll('.auth-self-frags-badge, .auth-self-top-stripe').forEach(e => e.remove());
    document.querySelectorAll('.auth-has-self-frags').forEach(e => e.classList.remove('auth-has-self-frags'));
    if (!plugin.settings.enabled) return;
    // 2) Затем вставить туда, где нужно — только в окна заметок, по их СОБСТВЕННОМУ содержимому
    for (const leaf of plugin.app.workspace.getLeavesOfType('markdown')) {
      try {
        const view = leaf.view;
        const el = view?.contentEl;
        if (!el || !view.file) continue;
        const raw = plugin.app.metadataCache.getFileCache(view.file)?.frontmatter?.auth;
        const noteClass = parseAuthClass(raw, plugin.settings);
        if (noteClass === 'none') continue;
        const text = view.editor?.getValue?.() ?? (typeof view.data === 'string' ? view.data : '');
        const fragments = parseFragmentTags(text, plugin.settings);
        const selfPresent  = noteClass === 'self' || fragments.some(f => f && f.sourceType === ST.SELF);
        const otherPresent = (noteClass && noteClass !== 'self' && noteClass !== 'tempor_off')
                          || fragments.some(f => f && f.sourceType !== ST.SELF);
        if (!selfPresent || !otherPresent) continue;
        el.classList.add('auth-has-self-frags');
        const b = document.createElement('div');
        b.className = 'auth-self-frags-badge';
        b.textContent = plugin.settings.selfBadgeText
          || ((plugin.settings.language === 'en') ? 'My insertions here' : 'Есть мои пометки');
        el.insertBefore(b, el.firstChild);
      } catch {}
    }
  };

  return field;
}

function visibleFor(type, s) {
  // Пофрагментные тумблеры видимости убраны: всё включает/выключает «Отслеживание авторства»
  if (type === ST.SELF || type === ST.AI || type === ST.OTHER) return true;
  // Custom type
  const ct = (s.customTypes || []).find(x => x.id === type);
  return ct ? true : false;
}

function buildDecorations(val, settings, cm6) {
  const { noteClass, fragments, docLen, doc } = val;

  const decos = [];

  const addMark = (from, to, cls) => {
    if (to <= from || from < 0) return;
    to = Math.min(to, docLen);
    if (to <= from) return;
    try { decos.push(cm6.Decoration.mark({ class: cls }).range(from, to)); } catch {}
  };

  // Tag chars get a class — CSS hides them in live-preview, shows them in source mode
  const addTagMark = (from, to) => {
    if (to <= from) return;
    try { decos.push(cm6.Decoration.mark({ class: 'auth-tag-char' }).range(from, to)); } catch {}
  };

  // Скобки прячутся в live preview ВСЕГДА (видны только в source mode).
  // tempor_off / совпадение с классом заметки / выключенная видимость — отключают только раскраску.
  const lineStripes  = new Map();   // line.from → sourceType (поздние фрагменты перекрывают — полоса сегментируется)
  const stripedFrags = new Set();   // фрагменты «только полоса» — без rainbow
  const markStripeLines = (fromPos, toPos, type) => {
    if (!doc) return;
    let l = doc.lineAt(Math.min(fromPos, doc.length));
    const endLine = doc.lineAt(Math.min(Math.max(toPos - 1, fromPos), doc.length));
    for (;;) {
      lineStripes.set(l.from, type);
      if (l.number >= endLine.number) break;
      l = doc.line(l.number + 1);
    }
  };

  for (const f of fragments) {
    if (!f || f.contentFrom >= f.contentTo) continue;
    addTagMark(f.from, f.contentFrom);
    addTagMark(f.contentTo, f.to);
    if (noteClass === 'tempor_off') continue;
    if (f.sourceType === noteClass) continue;
    if (!visibleFor(f.sourceType, settings)) continue;
    const cls = ['self','ai','other'].includes(f.sourceType)
      ? `auth-${f.sourceType}`
      : `auth-custom-${f.sourceType}`;

    // ── Три длины оформления ──
    let tier = 'inline';
    let headLevel = 0;
    let ls = null;
    if (doc) {
      ls = doc.lineAt(Math.min(f.from, doc.length));
      const le = doc.lineAt(Math.min(f.to, doc.length));
      const before = doc.sliceString(ls.from, f.from);
      const after  = doc.sliceString(f.to, le.to);
      const wholeLines = before.trim() === '' && after.trim() === '';
      // Заголовок: либо 〖## Заголовок〗 (решётки внутри), либо ## 〖Заголовок〗 (решётки снаружи)
      const inHead  = /^(#{1,6})\s/.exec(doc.sliceString(f.contentFrom, Math.min(f.contentFrom + 8, f.contentTo)));
      const outHead = /^(#{1,6})\s*$/.exec(before);
      if (after.trim() === '' && wholeLines && inHead) headLevel = inHead[1].length;
      else if (after.trim() === '' && le.number === ls.number && outHead) headLevel = outHead[1].length;

      if (headLevel > 0) tier = 'headingBlock';
      else if (wholeLines) tier = 'paragraph';
      else if (le.number > ls.number) tier = 'multiline';
    }

    if (tier === 'headingBlock') {
      // Полоса вдоль всего блока заголовка (до следующего заголовка того же/старшего уровня)
      let end = ls;
      for (let n = ls.number + 1; n <= doc.lines; n++) {
        const L = doc.line(n);
        const m = /^(#{1,6})\s/.exec(L.text);
        if (m && m[1].length <= headLevel) break;
        end = L;
      }
      markStripeLines(ls.from, end.to, f.sourceType);
      stripedFrags.add(f);
      continue; // оформление текста под заголовком не применяется
    }
    if (tier === 'paragraph') {
      // ≥ абзаца: только сегмент полосы, оформление текста снято
      markStripeLines(f.from, f.to, f.sourceType);
      stripedFrags.add(f);
      continue;
    }
    if (tier === 'multiline') {
      // > 1 строки исходника: оформление без подчёркивания
      addMark(f.contentFrom, f.contentTo, cls + ' auth-no-ul');
      continue;
    }
    addMark(f.contentFrom, f.contentTo, cls);
  }

  // Rainbow per-character colours
  for (const f of fragments) {
    if (noteClass === 'tempor_off') break;
    if (!f || f.contentFrom >= f.contentTo) continue;
    if (stripedFrags.has(f)) continue;
    if (f.sourceType === noteClass) continue;
    if (!visibleFor(f.sourceType, settings)) continue;
    const rainbowOn = settings[`${f.sourceType}Rainbow`];
    if (!rainbowOn) continue;
    const colors = settings[`${f.sourceType}RainbowColors`] || [];
    if (!colors.length) continue;
    const len = f.contentTo - f.contentFrom;
    if (len > RAINBOW_MAX) continue;
    for (let i = 0; i < len; i++) {
      const col = colors[i % colors.length];
      try {
        decos.push(cm6.Decoration.mark({
          attributes: { style: `color:${col};-webkit-text-fill-color:${col}` }
        }).range(f.contentFrom + i, f.contentFrom + i + 1));
      } catch {}
    }
  }

  for (const [lineFrom, type] of lineStripes) {
    try { decos.push(cm6.Decoration.line({ class: `auth-line-stripe auth-line-stripe-${type}` }).range(lineFrom)); } catch {}
  }

  decos.sort((a, b) => a.from - b.from || (a.startSide || 0) - (b.startSide || 0));
  let set;
  try { set = cm6.Decoration.set(decos, true); }
  catch { set = cm6.Decoration.none; }
  return { decos: set, stripes: lineStripes };
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

    const file = this.app.workspace.getActiveFile();
    // «Отметить классом всю заметку» — по умолчанию только в пустой заметке с пустым auth
    const rawDoc = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView)?.editor?.getValue() ?? '';
    const bodyTxt = rawDoc.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
    const fmAuthRaw = file ? this.app.metadataCache.getFileCache(file)?.frontmatter?.auth : null;
    const authEmpty = fmAuthRaw == null || String(fmAuthRaw).trim() === '';
    const markNoteRow = contentEl.createDiv({ cls: 'auth-modal-mark-note' });
    const markNoteChk = markNoteRow.createEl('input');
    markNoteChk.type    = 'checkbox';
    markNoteChk.checked = bodyTxt.length === 0 && authEmpty && (this.plugin.settings.pasteMarkNoteDefault ?? true);
    markNoteChk.id      = 'auth-mark-note-chk';
    const markNoteLbl = markNoteRow.createEl('label', { text: t.dialogMarkNote });
    markNoteLbl.htmlFor = 'auth-mark-note-chk';

    // «Не показывать это окно» — единый блок из трёх одинаковых галок
    const noShow = contentEl.createDiv({ cls: 'auth-modal-noshow' });
    noShow.createDiv({ text: t.dialogNoShowGroup, cls: 'auth-noshow-title' });
    const mkChk = (id, label, checked, onChange) => {
      const row = noShow.createDiv({ cls: 'auth-modal-mark-note' });
      const chk = row.createEl('input');
      chk.type = 'checkbox'; chk.id = id; chk.checked = checked;
      chk.addEventListener('change', () => onChange(chk.checked));
      const lbl = row.createEl('label', { text: label });
      lbl.htmlFor = id;
    };
    mkChk('auth-nodlg-note', t.dialogNoShowNote,
      file ? this.plugin.db.getNoDialog(file.path) : false,
      v => { if (file) { this.plugin.db.setNoDialog(file.path, v); void this.plugin.db.save(); } });
    mkChk('auth-nodlg-sess', t.dialogNoShowSession,
      !!this.plugin._pasteSuppressed,
      v => { this.plugin._pasteSuppressed = v; });
    mkChk('auth-nodlg-perm', t.dialogNoShowForever,
      !(this.plugin.settings.pasteDialogEnabled ?? true),
      v => { this.plugin.settings.pasteDialogEnabled = !v; void this.plugin.saveSettings(); });
  }

  onClose() { this.contentEl.empty(); }
}

// ═══════════════════════════════════════════════════════════════
//  Bracket Picker Modal
// ═══════════════════════════════════════════════════════════════
class BracketPickerModal extends obsidian.Modal {
  constructor(app, onPick) {
    super(app);
    this.onPick = onPick;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Выбрать пару скобок' });

    const makeGrid = (pairs, container) => {
      const grid = container.createDiv({ cls: 'auth-bracket-grid' });
      for (const [open, close] of pairs) {
        const cell = grid.createDiv({ cls: 'auth-bracket-cell' });
        cell.textContent = open + 'а' + close;
        cell.title = `${open} … ${close}`;
        cell.addEventListener('click', () => { this.close(); this.onPick(open, close); });
      }
    };

    contentEl.createEl('h3', { text: 'Наиболее универсальные', cls: 'auth-picker-head' });
    makeGrid(BRACKET_PAIRS_UNIVERSAL, contentEl);
    contentEl.createEl('h3', { text: 'Менее рекомендуемые', cls: 'auth-picker-head' });
    makeGrid(BRACKET_PAIRS_OTHER, contentEl);

    contentEl.createEl('h3', { text: 'Ввести свои знаки разметки', cls: 'auth-picker-head' });
    const customRow = contentEl.createDiv({ cls: 'auth-picker-custom-row' });
    const openInp  = customRow.createEl('input', { type: 'text', cls: 'auth-picker-custom-inp' });
    openInp.placeholder = 'Открывающий';
    const closeInp = customRow.createEl('input', { type: 'text', cls: 'auth-picker-custom-inp' });
    closeInp.placeholder = 'Закрывающий';
    const applyBtn = customRow.createEl('button', { text: 'Применить', cls: 'auth-picker-custom-btn' });
    applyBtn.addEventListener('click', () => {
      const o = openInp.value.trim(), c = closeInp.value.trim();
      if (!o || !c || o === c) { new obsidian.Notice('Введите два разных символа'); return; }
      this.close(); this.onPick(o, c);
    });
  }
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
        el.style.cssText = '';
        void el.offsetHeight;
        // Apply rainbow inline if enabled for this type
        const type = el.className.replace('auth-', '');
        if (['self','ai','other'].includes(type) && this.plugin.settings[`${type}Rainbow`]) {
          const rc = this.plugin.settings[`${type}RainbowColors`] || [];
          if (rc.length) {
            const txt = el.textContent || '';
            el.innerHTML = txt.split('').map((ch, i) =>
              `<span style="color:${rc[i % rc.length]};-webkit-text-fill-color:${rc[i % rc.length]}">${ch}</span>`
            ).join('');
          }
        } else {
          el.textContent = el.textContent; // reset innerHTML
        }
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
    new obsidian.Setting(containerEl).setName(t.pasteMarkNoteDefault).setDesc(t.pasteMarkNoteDefaultDesc)
      .addToggle(tg => tg.setValue(s.pasteMarkNoteDefault ?? true).onChange(v => save({ pasteMarkNoteDefault: v })));

    // ── Плашка → размещение полос ──
    new obsidian.Setting(containerEl).setName(t.selfTopStripe).setDesc(t.selfTopStripeDesc)
      .addText(tx => tx.setPlaceholder('Есть мои пометки').setValue(s.selfBadgeText || '').onChange(v => save({ selfBadgeText: v })))
      .addToggle(tg => tg.setValue(s.selfTopStripeEnabled ?? true).onChange(v => save({ selfTopStripeEnabled: v })));

    // Shared accordion: one section open at a time
    const accordion = { body: null, arrow: null };

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
    }, true, accordion, true);

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
    }, true, accordion, true);

    // ── Per-type highlight sections ───────────────────────
    containerEl.createEl('h3', { text: t.markupSection, cls: 'auth-section-h3 auth-section-orange' });
    for (const [type, label] of [['self', t.selfSection], ['other', t.otherSection], ['ai', t.aiSection]]) {
      this._typeSection(containerEl, type, label, t, s, save, null, accordion);
    }

    // ── Custom authors — тот же уровень, что self/other/ai, свёрнуты ──
    this._collapsibleSection(containerEl, t.customAuthorsSection, body => {
      body.createEl('p', { text: t.customAuthorsHint, cls: 'auth-tag-modal-desc' });
      this._renderCustomAuthors(body, t, s, save);
    }, true, accordion, false);
  }

  _renderCustomAuthors(containerEl, t, s, save) {
    const p = this.plugin;
    const listEl = containerEl.createDiv({ cls: 'auth-ca-list' });

    const render = () => {
      listEl.empty();
      const authors = p.settings.customAuthors || [];
      authors.forEach((ca, i) => {
        const row = listEl.createDiv({ cls: 'auth-ca-row' });

        // auth: value + synonyms
        const valWrap = row.createDiv({ cls: 'auth-ca-val-wrap' });
        valWrap.createEl('span', { text: t.customAuthorAuthValue, cls: 'auth-ca-label' });
        const inp = valWrap.createEl('input', { type: 'text', cls: 'auth-ca-input' });
        inp.value = ca.authValue || '';
        inp.addEventListener('input', () => {
          p.settings.customAuthors[i].authValue = inp.value.trim();
          save({});
        });

        const synWrap = row.createDiv({ cls: 'auth-ca-val-wrap' });
        synWrap.createEl('span', { text: t.synonymsSection, cls: 'auth-ca-label' });
        const synInp = synWrap.createEl('input', { type: 'text', cls: 'auth-ca-input' });
        synInp.value = (ca.synonyms || []).join(', ');
        synInp.addEventListener('input', () => {
          p.settings.customAuthors[i].synonyms = synInp.value.split(',').map(x => x.trim()).filter(Boolean);
          save({});
        });

        // Stripe + glow
        const stripeWrap = row.createDiv({ cls: 'auth-ca-stripe-wrap' });
        new obsidian.Setting(stripeWrap)
          .setName(t.noteStripeEnabled)
          .addToggle(tg => tg.setValue(!!ca.stripeEnabled).onChange(v => {
            p.settings.customAuthors[i].stripeEnabled = v; save({});
          }))
          .addColorPicker(cp => cp.setValue(ca.stripeColor || '#888888').onChange(v => {
            p.settings.customAuthors[i].stripeColor = v; save({});
          }))
          .addSlider(sl => sl.setLimits(1, 16, 1).setValue(ca.stripeWidth || 8)
            .setDynamicTooltip().onChange(v => { p.settings.customAuthors[i].stripeWidth = v; save({}); }));
        new obsidian.Setting(stripeWrap)
          .setName(t.noteGlow)
          .addToggle(tg => tg.setValue(!!ca.glowEnabled).onChange(v => {
            p.settings.customAuthors[i].glowEnabled = v; save({});
          }));

        const rmBtn = row.createEl('button', { text: t.removeCustomAuthor, cls: 'auth-ca-remove' });
        rmBtn.onclick = () => { p.settings.customAuthors.splice(i, 1); save({}); render(); };
      });

      const addBtn = listEl.createEl('button', { text: t.addCustomAuthor, cls: 'auth-ca-add' });
      addBtn.onclick = () => {
        p.settings.customAuthors.push({ authValue: '', synonyms: [], stripeEnabled: true, stripeColor: '#888888', stripeWidth: 8, glowEnabled: true });
        save({}); render();
      };
    };
    render();
  }

  _collapsibleSection(containerEl, title, buildFn, startCollapsed = true, accordion = null, isHeader = false) {
    const head = containerEl.createDiv({ cls: isHeader ? 'auth-section-h3 auth-section-h3-collapsible' : 'auth-collapse-head' });
    head.createEl('span', { text: title, cls: 'auth-collapse-title' });
    const arrow = head.createSpan({ cls: 'auth-collapse-arrow', text: startCollapsed ? '▶' : '▼' });
    const body = containerEl.createDiv({ cls: 'auth-collapse-body' });
    if (startCollapsed) body.classList.add('is-collapsed');
    head.addEventListener('click', () => {
      const isCurrentlyCollapsed = body.classList.contains('is-collapsed');
      if (isCurrentlyCollapsed && accordion) {
        // Close previously open section
        if (accordion.body && accordion.body !== body) {
          accordion.body.classList.add('is-collapsed');
          accordion.arrow.textContent = '▶';
        }
        accordion.body = body;
        accordion.arrow = arrow;
      }
      const nowCollapsed = body.classList.toggle('is-collapsed');
      arrow.textContent = nowCollapsed ? '▶' : '▼';
      if (nowCollapsed && accordion && accordion.body === body) {
        accordion.body = null; accordion.arrow = null;
      }
    });
    buildFn(body);
  }

  _typeSection(el, type, label, t, s, save, ct = null, accordion = null) {
    // Collapsible header
    const head = el.createDiv({ cls: 'auth-collapse-head' });
    head.createEl('span', { text: label, cls: 'auth-collapse-title' });
    const arrow = head.createSpan({ cls: 'auth-collapse-arrow', text: '▶' });
    const body = el.createDiv({ cls: 'auth-collapse-body is-collapsed' });
    head.addEventListener('click', () => {
      const isCurrentlyCollapsed = body.classList.contains('is-collapsed');
      if (isCurrentlyCollapsed && accordion) {
        if (accordion.body && accordion.body !== body) {
          accordion.body.classList.add('is-collapsed');
          accordion.arrow.textContent = '▶';
        }
        accordion.body = body;
        accordion.arrow = arrow;
      }
      const nowCollapsed = body.classList.toggle('is-collapsed');
      arrow.textContent = nowCollapsed ? '▶' : '▼';
      if (nowCollapsed && accordion && accordion.body === body) {
        accordion.body = null; accordion.arrow = null;
      }
    });

    // For custom types, wrap save to persist into customTypes array
    const saveType = ct ? (patch) => {
      const idx = (this.plugin.settings.customTypes||[]).findIndex(x => x.id === type);
      if (idx < 0) return save(patch);
      const keyMap = { HighlightMode:'highlightMode', CornerStyle:'cornerStyle', BgEnabled:'bgEnabled', BgColors:'bgColors', BgOpacity:'bgOpacity', TextGradient:'textGradient', TextColors:'textColors', TextOpacity:'textOpacity', Italic:'italic', Bold:'bold', Underline:'underline', UnderlineColor:'underlineColor', UnderlineWidth:'underlineWidth', Rainbow:'rainbow', RainbowColors:'rainbowColors' };
      const ctPatch = {};
      for (const [k, v] of Object.entries(patch)) {
        const stripped = k.replace(type, '');
        const mapped = keyMap[stripped];
        if (mapped) ctPatch[mapped] = v;
      }
      Object.assign(this.plugin.settings.customTypes[idx], ctPatch);
      save({});
    } : save;

    // Sticky live preview
    const wrap = body.createDiv({ cls: 'auth-preview-wrap' });
    const inner = wrap.createDiv({ cls: 'auth-preview-inner' });
    inner.createSpan({ cls: `auth-${type}`, text: t.previewSample });

    // Two-column grid for settings
    // Two columns: left = highlight + colors; right = corner + opacity + text settings
    const grid = body.createDiv({ cls: 'auth-two-col' });

    const gs = (container, name, desc, addFn) => {
      const s2 = new obsidian.Setting(container).setName(name);
      if (desc) s2.setDesc(desc);
      addFn(s2); return s2;
    };

    // LEFT column
    const col1 = grid.createDiv();
    gs(col1, t.bgEnabled, t.bgEnabledDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}BgEnabled`]).onChange(v => saveType({ [`${type}BgEnabled`]: v }))));
    this._colorArray(col1, `${type}BgColors`, t.bgColors, t, s, saveType);

    // RIGHT column
    const col2 = grid.createDiv();
    gs(col2, t.cornerStyle, null, s2 => s2.addDropdown(d => d
      .addOption('sharp', t.cSharp).addOption('round', t.cRound).addOption('pill', t.cPill)
      .setValue(s[`${type}CornerStyle`])
      .onChange(v => saveType({ [`${type}CornerStyle`]: v }))));
    gs(col2, t.bgOpacity, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 100, 1).setValue(s[`${type}BgOpacity`])
        .setDynamicTooltip().onChange(v => saveType({ [`${type}BgOpacity`]: v }))));

    // Full-width: font settings in two columns
    const fontGrid = body.createDiv({ cls: 'auth-two-col' });
    const fontCol1 = fontGrid.createDiv();
    const fontCol2 = fontGrid.createDiv();

    gs(fontCol1, t.textGradient, t.textGradientDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}TextGradient`]).onChange(v => {
        const patch = { [`${type}TextGradient`]: v };
        if (v) patch[`${type}Rainbow`] = false;
        saveType(patch);
      })));
    gs(fontCol1, t.textOpacity, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 100, 1).setValue(s[`${type}TextOpacity`])
        .setDynamicTooltip().onChange(v => saveType({ [`${type}TextOpacity`]: v }))));
    this._colorArray(fontCol1, `${type}TextColors`, t.textColors, t, s, saveType);

    gs(fontCol2, t.italic, t.italicDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Italic`]).onChange(v => saveType({ [`${type}Italic`]: v }))));
    gs(fontCol2, t.bold, t.boldDesc, s2 => s2.addToggle(tg =>
      tg.setValue(!!s[`${type}Bold`]).onChange(v => saveType({ [`${type}Bold`]: v }))));
    gs(fontCol2, t.underline, t.underlineDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Underline`]).onChange(v => saveType({ [`${type}Underline`]: v }))));
    gs(fontCol2, t.underlineColor, null, s2 => s2.addColorPicker(cp =>
      cp.setValue(s[`${type}UnderlineColor`]).onChange(v => saveType({ [`${type}UnderlineColor`]: v }))));
    gs(fontCol2, t.underlineWidth, null, s2 => s2.addSlider(sl =>
      sl.setLimits(1, 8, 1).setValue(s[`${type}UnderlineWidth`])
        .setDynamicTooltip().onChange(v => saveType({ [`${type}UnderlineWidth`]: v }))));
    gs(fontCol2, t.rainbow, t.rainbowDesc, s2 => s2.addToggle(tg =>
      tg.setValue(s[`${type}Rainbow`]).onChange(v => {
        const patch = { [`${type}Rainbow`]: v };
        if (v) patch[`${type}TextGradient`] = false;
        saveType(patch);
      })));
    this._colorArray(fontCol2, `${type}RainbowColors`, t.rainbowColors, t, s, saveType);

    // ── Note-level settings (whole note, class-only) ──────
    const noteHead = body.createEl('div', { cls: 'auth-note-settings-head', text: t.noteBgHint });
    const noteGrid = body.createDiv({ cls: 'auth-two-col' });
    const nc1 = noteGrid.createDiv();
    const nc2 = noteGrid.createDiv();

    gs(nc1, t.noteBgEnabled, null, s2 => s2
      .addToggle(tg => tg.setValue(s[`${type}NoteBgEnabled`]).onChange(v => save({ [`${type}NoteBgEnabled`]: v })))
      .addColorPicker(cp => cp.setValue(s[`${type}NoteBgColor`] || '#ffffff').onChange(v => save({ [`${type}NoteBgColor`]: v }))));

    gs(nc2, t.noteStripeEnabled, null, s2 => s2
      .addToggle(tg => tg.setValue(s[`${type}NoteStripeEnabled`]).onChange(v => save({ [`${type}NoteStripeEnabled`]: v })))
      .addColorPicker(cp => cp.setValue(s[`${type}NoteStripeColor`] || '#888').onChange(v => save({ [`${type}NoteStripeColor`]: v })))
      .addSlider(sl => sl.setLimits(1, 16, 1).setValue(s[`${type}NoteStripeWidth`] || 3).setDynamicTooltip().onChange(v => save({ [`${type}NoteStripeWidth`]: v }))));

    gs(nc1, t.noteGlow, null, s2 => s2
      .addToggle(tg => tg.setValue(s[`${type}NoteGlowEnabled`] || false).onChange(v => save({ [`${type}NoteGlowEnabled`]: v }))));

    // ── Pseudo-tags ───────────────────────────────────────
    body.createEl('div', { cls: 'auth-note-settings-head', text: t.pseudoTagsSection });
    const ptRow = body.createDiv({ cls: 'auth-pt-row' });
    const openKey = `${type}TagOpen`, closeKey = `${type}TagClose`;
    const openDisp = ptRow.createEl('span', { cls: 'auth-pt-char', text: s[openKey] || '?' });
    ptRow.createEl('span', { text: ' текст ', cls: 'auth-pt-preview' });
    const closeDisp = ptRow.createEl('span', { cls: 'auth-pt-char', text: s[closeKey] || '?' });
    const pickBtn = ptRow.createEl('button', { text: t.tagChoose, cls: 'auth-pt-btn' });
    pickBtn.onclick = () => new BracketPickerModal(this.app, (open, close) => {
      save({ [openKey]: open, [closeKey]: close });
      openDisp.textContent = open; closeDisp.textContent = close;
    }).open();
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
    document.querySelectorAll('.auth-self-frags-badge, .auth-self-top-stripe').forEach(e => e.remove());
    document.querySelectorAll('.auth-has-self-frags').forEach(e => e.classList.remove('auth-has-self-frags'));
    console.log('[auth] unloaded');
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this._settingsVersion = (this._settingsVersion || 0) + 1;
    // Пинок активному редактору: пересобрать декорации/сегменты без ожидания правки
    const cm = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView)?.editor?.cm;
    if (cm && this._fx && this._field) {
      try {
        const cur = cm.state.field(this._field, false)?.noteClass ?? null;
        cm.dispatch({ effects: this._fx.setClass.of(cur) });
      } catch {}
    }
  }

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
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const el = view?.containerEl?.querySelector('.view-content');
    if (!el) return;
    // Remove any existing auth-note-* class (including custom authors)
    for (const cls of [...el.classList]) {
      if (cls.startsWith('auth-note-')) el.classList.remove(cls);
    }
    if (noteClass && noteClass !== 'none' && noteClass !== 'tempor_off') {
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
      name: 'auth: Suspend all markup for this note (tempor_off)',
      editorCallback: (_, ctx) => this._setNoteClass('tempor_off'),
    });
    this.addCommand({
      id:   'auth-toggle-note-dialog',
      name: 'auth: Toggle paste dialog for this note (окно вставки вкл/выкл)',
      editorCallback: () => {
        const f = this.app.workspace.getActiveFile();
        if (!f) return;
        const v = !this.db.getNoDialog(f.path);
        this.db.setNoDialog(f.path, v); void this.db.save();
        new obsidian.Notice(v ? '[auth] Окно вставки отключено для заметки' : '[auth] Окно вставки включено для заметки');
      },
    });
    // Note class commands removed from palette (set via paste dialog or tags)
  }

  _markSel(ctx, sourceType) {
    if (!this._fx || !this._field) return;
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    let { from, to } = cm.state.selection.main;
    const noSel = from === to;
    if (from === to) {
      // No selection — use current line (абзац = строка)
      const line = cm.state.doc.lineAt(from);
      from = line.from;
      to   = line.to;
      if (from === to) { new obsidian.Notice('[auth] Пустая строка'); return; }
    }
    const len = to - from;
    const rainbowOn = this.settings[`${sourceType}Rainbow`];
    if (rainbowOn && len > 2000) {
      const modal = new obsidian.Modal(this.app);
      modal.titleEl.setText('Слишком длинный фрагмент');
      modal.contentEl.createEl('p', { text: `Фрагмент ${len} знаков. Возможны проблемы с производительностью. Применить авторство ко всей заметке?` });
      const btns = modal.contentEl.createDiv({ cls: 'auth-modal-buttons' });
      const btnYes = btns.createEl('button', { text: 'Да — ко всей заметке', cls: 'auth-modal-btn btn-self' });
      btnYes.onclick = () => { modal.close(); this._setNoteClass(sourceType); };
      const btnNo = btns.createEl('button', { text: 'Нет — разметить фрагмент', cls: 'auth-modal-btn btn-skip' });
      btnNo.onclick = () => { modal.close(); this._doMark(cm, from, to, sourceType, noSel); };
      modal.open();
      return;
    }
    this._doMark(cm, from, to, sourceType, noSel);
  }

  _getTag(type) {
    const s = this.settings;
    if (type === ST.SELF)  return [s.selfTagOpen,  s.selfTagClose];
    if (type === ST.AI)    return [s.aiTagOpen,    s.aiTagClose];
    if (type === ST.OTHER) return [s.otherTagOpen, s.otherTagClose];
    const ca = (s.customAuthors||[]).find(x => customAuthorId(x.authValue) === type);
    return ca?.tagOpen ? [ca.tagOpen, ca.tagClose] : [s.otherTagOpen, s.otherTagClose];
  }

  _doMark(cm, from, to, sourceType, clearOverlaps = false) {
    const [open, close] = this._getTag(sourceType);
    const changes = [{ from: to, insert: close }, { from, insert: open }];
    if (clearOverlaps) {
      // Заменить авторство всей строки: удалить скобки всех фрагментов,
      // пересекающих [from, to] — без вложения авторств.
      const frags = parseFragmentTags(cm.state.doc.toString(), this.settings);
      for (const f of frags) {
        if (f.from < to && f.to > from) {
          changes.push({ from: f.contentTo, to: f.to });
          changes.push({ from: f.from, to: f.contentFrom });
        }
      }
    }
    cm.dispatch({ changes });
  }

  _removeAuth(ctx) {
    const cm = ctx?.editor?.cm;
    if (!cm) return;
    const { from, to } = cm.state.selection.main;
    const doc = cm.state.doc;
    const frags = parseFragmentTags(doc.toString(), this.settings);
    // Выделение: снять ВСЕ авторства, пересекающие его (любое чередование).
    let targets;
    if (from !== to) {
      targets = frags.filter(f => f.from < to && f.to > from);
    } else {
      const hits = frags.filter(f => f.from <= from && from <= f.to);
      if (hits.length) {
        // Курсор внутри фрагмента: снимается только этот один (самый внутренний)
        targets = [hits.reduce((a, b) => (b.from >= a.from ? b : a))];
      } else {
        // Курсор в чистом тексте: обнулить авторство всего абзаца (строки до Enter)
        const line = doc.lineAt(from);
        targets = frags.filter(f => f.from < line.to && f.to > line.from);
      }
    }
    if (!targets.length) { new obsidian.Notice('[auth] Нет авторства у курсора / в выделении'); return; }
    const changes = [];
    for (const f of targets) {
      changes.push({ from: f.contentTo, to: f.to });
      changes.push({ from: f.from, to: f.contentFrom });
    }
    cm.dispatch({ changes });
  }

  _setNoteClass(noteClass, file) {
    file = file || this.app.workspace.getActiveFile();
    if (!file) return;
    const displayVal = noteClass || null;
    this.app.fileManager.processFrontMatter(file, fm => {
      if (displayVal) fm['auth'] = displayVal;
      else delete fm['auth'];
    });
    // Use setClass — never setEntry — to avoid overwriting live ranges
    const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const cm   = view?.editor?.cm;
    if (cm && this._fx) {
      try { cm.dispatch({ effects: this._fx.setClass.of(noteClass) }); } catch {}
    }
    this._applyNoteBgClass(noteClass);
  }

  // ── Events ─────────────────────────────────────────────────
  _registerEvents() {
    const refresh = () => setTimeout(() => this._refreshBadges?.(), 0);
    this.registerEvent(this.app.workspace.on('layout-change', refresh));
    this.registerEvent(this.app.workspace.on('active-leaf-change', refresh));
    this.registerEvent(this.app.metadataCache.on('changed', refresh));

    // File open: load entry — use setTimeout(0) so CM has finished
    // initializing the new state before we push the entry into it.
    this.registerEvent(this.app.workspace.on('file-open', async (file) => {
      if (!file) return;
      await this._loadEntry(file);
      this._refreshBadges?.();
      setTimeout(() => { this._loadEntry(file); this._refreshBadges?.(); }, 0);
      setTimeout(() => { this._loadEntry(file); this._refreshBadges?.(); }, 150);
      setTimeout(() => this._refreshBadges?.(), 400);
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

    // Rename / delete
    this.registerEvent(this.app.vault.on('rename', (file, old) => {
      this.db.renameFile(old, file.path); void this.db.save();
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      this.db.deleteFile(file.path); void this.db.save();
    }));

    // Track real user paste gesture (Ctrl/Cmd+V).
    // In Electron, programmatic paste events can also have isTrusted=true,
    // so we track the keyboard shortcut instead.
    this._userPasteGesture = false;
    this.registerDomEvent(document, 'keydown', (e) => {
      const isCtrlV    = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'v' || e.code === 'KeyV');
      const isShiftIns = e.shiftKey && (e.key === 'Insert' || e.code === 'Insert');
      if (isCtrlV || isShiftIns) {
        this._userPasteGesture = true;
        setTimeout(() => { this._userPasteGesture = false; }, 300);
      }
    }, true);

    // Paste intercept — only real user Ctrl/Cmd+V, not macro/template inserts.
    // stopImmediatePropagation prevents CM6's own paste handler from double-inserting.
    this.registerDomEvent(document, 'paste', (e) => {
      if (!this._userPasteGesture) return;  // not a keyboard paste gesture
      this._userPasteGesture = false;
      if (!this.settings.enabled || !this.settings.pasteDialogEnabled) return;
      if (this._pasteSuppressed) return;
      // Only intercept if focus is inside a markdown editor, not in modals/settings
      const focused = document.activeElement;
      const inEditor = focused?.closest('.cm-content, .cm-editor') !== null;
      if (!inEditor) return;
      const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) return;
      const pf = view.file;
      if (pf && this.db.getNoDialog(pf.path)) return; // окно отключено для этой заметки
      if (pf && parseAuthClass(this.app.metadataCache.getFileCache(pf)?.frontmatter?.auth, this.settings) === 'none') return;
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!this._dialogWorthy(text)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      new PasteModal(this.app, this, text,
        (type, markNote) => this._applyPaste(view, text, type, markNote)
      ).open();
    }, true);

    // Drop from external apps: capture on window (fires before document/CM6 handlers)
    this._dragFromEditor = false;
    this.registerDomEvent(document, 'dragstart', (e) => {
      // В Live Preview dragstart.target — не .cm-content (CM6 стартует драг из
      // отдельного слоя), поэтому определяем внутренний драг не по target, а по
      // наличию непустого выделения в любом markdown-редакторе: когда тащат
      // текст, выделение есть всегда. Это надёжно и в Live Preview, и в исходнике.
      let internal = false;
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (internal) return;
        const ed = leaf.view?.editor;
        if (ed && ed.somethingSelected && ed.somethingSelected()) internal = true;
      });
      this._dragFromEditor = internal;
    }, true);
    this.registerDomEvent(document, 'dragend', () => { this._dragFromEditor = false; }, true);

    const dropHandler = (e) => {
      if (this._dragFromEditor) return; // internal drag — don't intercept
      if (!this.settings.enabled || !this.settings.pasteDialogEnabled) return;
      if (this._pasteSuppressed) return;
      const inEditor = !!e.target?.closest('.cm-content, .cm-editor');
      if (!inEditor) return;
      const view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      if (!view) return;
      const pf = view.file;
      if (pf && this.db.getNoDialog(pf.path)) return;
      if (pf && parseAuthClass(this.app.metadataCache.getFileCache(pf)?.frontmatter?.auth, this.settings) === 'none') return;
      const text = e.dataTransfer?.getData('text/plain') || '';
      if (!text.trim() || text.trim().split(/\s+/).length < 2) return;
      // Prevent CM6 from inserting — we do it ourselves in the callback
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const cm = view.editor?.cm;
      if (!cm) return;
      const dropPos = cm.posAtCoords({ x: e.clientX, y: e.clientY }) ?? cm.state.doc.length;
      new PasteModal(this.app, this, text, (type, markNote) => {
        this._applyDrop(cm, text, dropPos, type, markNote);
      }).open();
    };
    // window capture fires before document capture (where CM6 listens)
    window.addEventListener('drop', dropHandler, true);
    this.register(() => window.removeEventListener('drop', dropHandler, true));

    // Reading view: hide pseudo-tags and apply highlight spans
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.settings.enabled) return;
      const fmA = parseAuthClass(ctx?.frontmatter?.auth, this.settings);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      for (const tn of textNodes) {
        const raw = tn.textContent || '';
        const frags = parseFragmentTags(raw, this.settings);
        if (!frags.length) continue;
        // Трёхуровневость в чтении: фрагмент на весь блок → полоса вместо оформления
        const par = tn.parentElement;
        const f0 = frags[0];
        const wholeNode = frags.length === 1 &&
          raw.slice(0, f0.from).trim() === '' && raw.slice(f0.to).trim() === '';
        const stripeTier = wholeNode &&
          fmA !== 'tempor_off' && f0.sourceType !== fmA && visibleFor(f0.sourceType, this.settings);
        if (stripeTier && par) par.classList.add('auth-line-stripe', 'auth-line-stripe-' + f0.sourceType);
        const frag = document.createDocumentFragment();
        let pos = 0;
        for (const f of frags) {
          if (f.from > pos) frag.appendChild(document.createTextNode(raw.slice(pos, f.from)));
          const noColor = stripeTier || fmA === 'tempor_off' || f.sourceType === fmA || !visibleFor(f.sourceType, this.settings);
          const span = document.createElement('span');
          if (!noColor) span.className = ['self','ai','other'].includes(f.sourceType)
            ? `auth-${f.sourceType}` : `auth-custom-${f.sourceType}`;
          span.textContent = raw.slice(f.contentFrom, f.contentTo);
          frag.appendChild(span);
          pos = f.to;
        }
        if (pos < raw.length) frag.appendChild(document.createTextNode(raw.slice(pos)));
        tn.parentNode?.replaceChild(frag, tn);
      }
    });
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
      this._setNoteClass(sourceType);
    } else {
      if (!cm || insertFrom === null) return;
      const normalized = text.replace(/\r\n/g, '\n');
      const insertTo = insertFrom + normalized.length;
      const [open, close] = this._getTag(sourceType);
      // Wrap the inserted text with pseudo-tags
      cm.dispatch({ changes: [{ from: insertTo, insert: close }, { from: insertFrom, insert: open }] });
    }

    this._scheduleSave();
  }

  _applyDrop(cm, text, pos, sourceType, markNote) {
    const normalized = text.replace(/\r\n/g, '\n');
    cm.dispatch({ changes: { from: pos, insert: normalized }, selection: { anchor: pos + normalized.length } });
    if (!sourceType) return;
    if (markNote) { this._setNoteClass(sourceType); return; }
    const to = pos + normalized.length;
    this._doMark(cm, pos, to, sourceType);
  }
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
    // If auth: is already set to any valid value, don't overwrite it
    if (curClass !== null) {
      void this._refreshNoteClass(file);
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
    let cm = null;
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view instanceof obsidian.MarkdownView && leaf.view.file?.path === file.path)
        cm = leaf.view.editor?.cm;
    });
    if (!cm) return;
    try { cm.dispatch({ effects: this._fx.setClass.of(noteClass) }); } catch {}
    this._applyNoteBgClass(noteClass);
  }

  async _saveCurrentEntry() {
    // Ranges now live in the document text — nothing to persist here.
    // DB only tracks noteClass (already in frontmatter, so DB is redundant but kept for potential future use).
  }

  _scheduleSave() { /* no-op: ranges are in text */ }
}

module.exports = AuthPlugin;
