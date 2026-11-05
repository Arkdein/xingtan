// The user guide's content and how it is drawn. The guide page (guide.html,
// js/guide/page.js) and each tool's "?" panel (js/guide/panel.js) both use this,
// so one edit to the content updates both.
import { h } from '../ui.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import timePeople from './tools-time-people.js';
import thinkingSignals from './tools-thinking-signals.js';
import mediaLanguage from './tools-media-language.js';

// One card per tool, keyed by the tool's type.
export const CARDS = { ...timePeople, ...thinkingSignals, ...mediaLanguage };

// Tool groups in the order the dock colours them.
export const GROUPS = [
  { tone: 'time', en: 'Time', zh: '时间' },
  { tone: 'people', en: 'Students', zh: '学生' },
  { tone: 'signal', en: 'Class signals', zh: '课堂信号' },
  { tone: 'content', en: 'Content and thinking', zh: '内容与思维' },
  { tone: 'language', en: 'Language', zh: '语文' },
];

export const LABELS = {
  en: {
    guide: 'User guide', tools: 'Tools', for: 'What it’s for', start: 'Getting started', know: 'You might not know',
    tip: 'Classroom tip', data: 'Where its data goes', uses: 'Uses', fullGuide: 'Open the full guide',
    openApp: 'Open 杏坛', contents: 'Contents', privacy: 'Privacy notice', back: 'Back to top', missing: 'This tool’s card is still being written.',
    newest: 'What’s new',
  },
  zh: {
    guide: '使用指南', tools: '工具说明', for: '用途', start: '上手', know: '你可能不知道',
    tip: '课堂小贴士', data: '数据去向', uses: '用到', fullGuide: '打开完整的使用指南',
    openApp: '打开杏坛', contents: '目录', privacy: '隐私说明', back: '回到顶部', missing: '这个工具的说明还在编写中。',
    newest: '最近更新',
  },
};

// **bold**, *italic* and `code` in guide strings. Everything else is plain text,
// so nothing in the content can add HTML.
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
export function inline(str) {
  const frag = document.createDocumentFragment();
  String(str ?? '').split(INLINE).forEach((part) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) frag.append(h('strong', {}, part.slice(2, -2)));
    else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) frag.append(h('code', {}, part.slice(1, -1)));
    else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) frag.append(h('em', {}, part.slice(1, -1)));
    else frag.append(part);
  });
  return frag;
}

const para = (tag, str, attrs = {}) => h(tag, attrs, inline(str));
const list = (tag, items) => h(tag, {}, ...(items || []).map((it) => para('li', it)));

export function toolTitle(def) {
  return t(def.title);
}

// One tool's card. `def` is the tool's widget definition (title, icon, tone).
// With `heading: false` the card leaves out its own title (the "?" panel has one).
export function renderCard(def, lang, { heading = true } = {}) {
  const L = LABELS[lang] || LABELS.en;
  const card = CARDS[def.type]?.[lang] || CARDS[def.type]?.en;
  const el = h('article', { class: 'g-card', id: `tool-${def.type}` });
  if (heading) {
    el.append(h('header', { class: 'g-card-head' },
      h('span', { class: `tool-tile tone-${def.tone || 'content'}` }, icon(def.icon)),
      h('h3', {}, toolTitle(def))));
  }
  if (!card) {
    el.append(h('p', { class: 'g-muted' }, L.missing));
    return el;
  }
  el.append(para('p', card.for, { class: 'g-for' }));
  if (card.start?.length) el.append(h('h4', {}, L.start), list('ol', card.start));
  if (card.know?.length) {
    el.append(h('h4', {}, L.know));
    card.know.forEach((g) => {
      if (g.heading) el.append(h('h5', {}, g.heading));
      el.append(list('ul', g.items));
    });
  }
  if (card.tip) el.append(h('div', { class: 'g-tip' }, h('h4', {}, L.tip), para('p', card.tip)));
  if (card.data) el.append(h('div', { class: 'g-data' }, h('h4', {}, L.data), para('p', card.data)));
  return el;
}

// A general section (quick start, recipes, boards, data, troubleshooting).
// `toolLink(type)` returns a link to a tool's card, for recipes.
export function renderSection(id, sec, lang, { toolLink } = {}) {
  const L = LABELS[lang] || LABELS.en;
  const el = h('section', { class: 'g-section', id });
  el.append(h('h2', {}, sec.title));
  if (sec.intro) el.append(para('p', sec.intro, { class: 'g-lead' }));
  if (sec.steps) el.append(list('ol', sec.steps));
  (sec.recipes || []).forEach((r) => {
    const box = h('div', { class: 'g-recipe' }, h('h3', {}, r.title));
    if (r.tools?.length && toolLink) {
      box.append(h('p', { class: 'g-uses' }, `${L.uses}: `, ...r.tools.flatMap((type, i) => [i ? ' · ' : '', toolLink(type)])));
    }
    box.append(list('ol', r.steps));
    if (r.note) box.append(para('p', r.note, { class: 'g-note' }));
    el.append(box);
  });
  if (sec.table) {
    el.append(h('div', { class: 'g-table-wrap' }, h('table', { class: 'g-table' },
      h('thead', {}, h('tr', {}, ...sec.table.head.map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, ...sec.table.rows.map((row) => h('tr', {}, ...row.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, inline(c)) : para('td', c)))))))));
  }
  (sec.groups || []).forEach((g) => {
    if (g.heading) el.append(h('h3', {}, g.heading));
    el.append(list('ul', g.items));
  });
  (sec.qa || []).forEach((item) => {
    el.append(h('details', { class: 'g-qa' }, para('summary', item.q), para('p', item.a)));
  });
  if (sec.outro) el.append(para('p', sec.outro));
  return el;
}
