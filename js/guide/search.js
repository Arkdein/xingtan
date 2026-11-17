// Search the user guide: every tool card and every part of the guide (quick
// start, each recipe, each group of points, each question), in English and in
// Chinese, plus the everyday words in keywords.js. Used by the guide page and by
// the boards screen. Everything runs in the browser; nothing is sent anywhere.
//
//   searchGuide('抽签')           -> [{ id, kind, type, title, label, snippet, score }]
//   guideSearchBox({ onPick })    -> a search box with a results list
import { h } from '../ui.js';
import { getLang, tIn } from '../i18n.js';
import { icon } from '../icons.js';
import { widgets, widgetByType } from '../widgets/index.js';
import { CARDS, LABELS } from './index.js';
import * as S from './sections.js';
import { KEYWORDS } from './keywords.js';

const LANGS = ['en', 'zh'];
const MAX_RESULTS = 8;

const L = {
  en: {
    placeholder: 'Search the guide, e.g. random, backup, 听写',
    label: 'Search the user guide',
    none: 'Nothing found for “{q}”.',
    tryWords: 'Try another word, such as timer, groups, backup or 抽签.',
    results: 'Results',
  },
  zh: {
    placeholder: '搜索使用指南，例如：抽签、备份、timer',
    label: '搜索使用指南',
    none: '找不到“{q}”。',
    tryWords: '试试别的词，例如：计时、分组、备份、random。',
    results: '搜索结果',
  },
};
export const searchLabels = (lang = getLang()) => L[lang] || L.en;

// Strings in the guide may hold **bold**, *italic* and `code`; search the words only.
const plain = (s) => String(s ?? '').replace(/\*\*|`/g, '').replace(/\*(?=\S)|(?<=\S)\*/g, '');
const norm = (s) => plain(s).normalize('NFKC').toLowerCase();

// ---- The index: one entry per card or part, holding both languages ----
let INDEX = null;

function entry(id, kind, extra, perLang) {
  const e = { id, kind, ...extra, title: {}, label: {}, kw: {}, head: {}, body: {} };
  LANGS.forEach((lang) => {
    const p = perLang(lang) || {};
    e.title[lang] = plain(p.title || '');
    e.label[lang] = plain(p.label || '');
    e.head[lang] = (p.head || []).filter(Boolean).map(plain);
    e.body[lang] = (p.body || []).filter(Boolean).map(plain);
    e.kw[lang] = norm(KEYWORDS[extra.type || id]?.[lang] || '');
  });
  // Lower-case copies for matching.
  e.n = {};
  LANGS.forEach((lang) => {
    e.n[lang] = { title: norm(e.title[lang]), head: e.head[lang].map(norm), body: e.body[lang].map(norm) };
  });
  return e;
}

function buildIndex() {
  const list = [];
  // Tool cards.
  widgets.forEach((def) => {
    list.push(entry(`tool-${def.type}`, 'tool', { type: def.type }, (lang) => {
      const c = CARDS[def.type]?.[lang];
      return {
        title: tIn(lang, def.title),
        label: LABELS[lang].tools,
        head: [c?.for],
        body: c ? [...(c.start || []), ...(c.know || []).flatMap((g) => [g.heading, ...(g.items || [])]), c.tip, c.data] : [],
      };
    }));
  });
  const toolName = (type, lang) => (widgetByType[type] ? tIn(lang, widgetByType[type].title) : '');

  // Quick start.
  list.push(entry('quick-start', 'section', {}, (lang) => {
    const s = S.quickstart[lang];
    return { title: s.title, label: s.title, head: [s.intro], body: [...s.steps, s.outro] };
  }));
  // In the classroom: the section, then each recipe.
  list.push(entry('in-the-classroom', 'section', {}, (lang) => {
    const s = S.recipes[lang];
    return { title: s.title, label: s.title, head: [s.intro], body: s.recipes.map((r) => r.title) };
  }));
  S.recipes.en.recipes.forEach((r, i) => {
    list.push(entry(`in-the-classroom-r${i + 1}`, 'section', {}, (lang) => {
      const s = S.recipes[lang];
      const rr = s.recipes[i] || r;
      return { title: rr.title, label: s.title, head: [(rr.tools || []).map((tp) => toolName(tp, lang)).join(' · ')], body: [...rr.steps, rr.note] };
    }));
  });
  // Boards, classes and the dock; Your data: one entry for each group of points.
  [['boards', S.boards], ['data', S.data]].forEach(([id, sec]) => {
    if (sec.en.intro || sec.en.table) {
      list.push(entry(id, 'section', {}, (lang) => {
        const s = sec[lang];
        return { title: s.title, label: s.title, head: [s.intro], body: [...(s.table?.rows || []).map((row) => row.join(' · ')), s.outro] };
      }));
    }
    sec.en.groups.forEach((g, i) => {
      list.push(entry(`${id}-g${i + 1}`, 'section', {}, (lang) => {
        const s = sec[lang];
        const gg = s.groups[i] || g;
        return { title: gg.heading, label: s.title, head: [], body: gg.items };
      }));
    });
  });
  // When something doesn't work: each question.
  S.faq.en.qa.forEach((item, i) => {
    list.push(entry(`help-q${i + 1}`, 'section', { faqKw: true }, (lang) => {
      const s = S.faq[lang];
      const q = s.qa[i] || item;
      return { title: q.q, label: s.title, head: [], body: [q.a] };
    }));
  });
  // The questions share the section's keywords.
  list.filter((e) => e.faqKw).forEach((e) => { LANGS.forEach((lang) => { e.kw[lang] = norm(KEYWORDS.help?.[lang] || ''); }); });
  return list;
}

// ---- Matching ----
// "minutes" also finds "minute", "groups" "group", and so on.
function variants(term) {
  const v = [term];
  if (/^[a-z]{4,}$/.test(term)) {
    if (term.endsWith('ies')) v.push(`${term.slice(0, -3)}y`);
    else if (term.endsWith('es')) v.push(term.slice(0, -2));
    if (term.endsWith('s')) v.push(term.slice(0, -1));
    if (term.endsWith('ing') && term.length > 5) v.push(term.slice(0, -3));
    if (term.endsWith('ed') && term.length > 4) v.push(term.slice(0, -2));
  }
  return v;
}

// A one- or two-letter English word only counts as a whole word ("qr", "b").
function has(text, term) {
  if (!text) return false;
  if (/^[a-z0-9]{1,2}$/.test(term)) return new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`).test(text);
  return text.includes(term);
}

function termScore(e, vs, lang) {
  const n = e.n[lang];
  let best = 0;
  for (const v of vs) {
    if (has(n.title, v)) best = Math.max(best, n.title.startsWith(v) ? 16 : 10);
    if (has(e.kw[lang], v)) best = Math.max(best, 7);
    if (n.head.some((x) => has(x, v))) best = Math.max(best, 3);
    const inBody = n.body.filter((x) => has(x, v)).length;
    if (inBody) best = Math.max(best, 1 + Math.min(inBody - 1, 3) * 0.3);
  }
  return best;
}

// Words that don't help find anything ("how do I…", "我的…怎么…").
const STOP_EN = new Set('a an the i my me we our you your to of in on at for with and or is are was it its this that how do does did can could what why where when which who not no dont don\'t doesnt doesn\'t cant can\'t wont won\'t isnt isn\'t please'.split(' '));
const STOP_ZH = /怎么样|怎么|怎样|如何|为什么|什么|可以|能不能|我们|我的|我|的|了|吗|呢|吧|要|想|用/g;

// Words typed with spaces between them, or with Chinese punctuation.
function splitQuery(q) {
  return norm(q).split(/[\s,，、。;；:：/?？!！]+/)
    .map((w) => (/[\u3400-\u9fff]/.test(w) ? w.replace(STOP_ZH, ' ').trim().split(/\s+/) : [w]))
    .flat()
    .filter((w) => w && !STOP_EN.has(w));
}

export function searchGuide(query, lang = getLang(), { limit = MAX_RESULTS } = {}) {
  const terms = splitQuery(query);
  if (!terms.length) return [];
  if (!INDEX) INDEX = buildIndex();
  const other = lang === 'zh' ? 'en' : 'zh';
  // Every word should match. If nothing has them all, the parts with the most of them.
  let found = rank(terms, lang, other);
  // Still nothing: a run of Chinese typed without spaces (白板不见) is tried as pairs of characters.
  if (!found.length) {
    const pairs = terms.flatMap((w) => (/^[\u3400-\u9fff]{3,}$/.test(w) ? [...w].slice(0, -1).map((c, i) => c + w[i + 1]) : [w]));
    if (pairs.length > terms.length) found = rank(pairs, lang, other);
  }
  return found.slice(0, limit).map(({ e, score }) => ({
    id: e.id, kind: e.kind, type: e.type || null,
    title: e.title[lang] || e.title.en, label: e.label[lang] || e.label.en,
    snippet: snippet(e, terms, lang), score,
  }));
}

function rank(terms, lang, other) {
  const scored = INDEX.map((e) => {
    let total = 0;
    let hits = 0;
    for (const term of terms) {
      const vs = variants(term);
      const s = Math.max(termScore(e, vs, lang), termScore(e, vs, other) * 0.9);
      if (s) { hits += 1; total += s; }
    }
    return { e, hits, score: total + (e.kind === 'tool' ? 0.5 : 0) };
  }).filter((x) => x.hits);
  let found = scored.filter((x) => x.hits === terms.length);
  if (!found.length && terms.length > 1) found = scored.filter((x) => x.hits >= Math.ceil(terms.length / 2));
  found.sort((a, b) => (b.hits - a.hits) || (b.score - a.score));
  return found;
}

// A line from the card or part showing the word, or its first line.
function snippet(e, terms, lang) {
  const raw = [...e.head[lang], ...e.body[lang]];
  const low = [...e.n[lang].head, ...e.n[lang].body];
  const vs = terms.flatMap(variants).sort((a, b) => b.length - a.length);
  for (const v of vs) {
    const i = low.findIndex((x) => has(x, v));
    if (i < 0) continue;
    const at = low[i].indexOf(v);
    if (at < 0) continue;
    const text = raw[i];
    let from = Math.max(0, at - 36);
    // Start at a word, not in the middle of one (English).
    if (from > 0 && /\w/.test(text[from - 1] || '')) {
      const sp = text.slice(from, at).search(/\s/);
      if (sp >= 0) from += sp + 1;
    }
    const to = Math.min(text.length, at + v.length + 70);
    return {
      pre: (from > 0 ? '…' : '') + text.slice(from, at),
      hit: text.slice(at, at + v.length),
      post: text.slice(at + v.length, to) + (to < text.length ? '…' : ''),
    };
  }
  const first = raw.find(Boolean) || '';
  return { pre: first.length > 110 ? `${first.slice(0, 108)}…` : first, hit: '', post: '' };
}

// ---- The search box ----
// onPick(result) runs when a result is chosen (click, or Enter).
export function guideSearchBox({ onPick, lang = getLang(), value = '', className = '' } = {}) {
  const T = searchLabels(lang);
  const listId = `gs-list-${Math.random().toString(36).slice(2, 8)}`;
  const input = h('input', {
    type: 'search', class: 'gs-input', placeholder: T.placeholder, value,
    'aria-label': T.label, title: T.label, autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search',
    role: 'combobox', 'aria-expanded': 'false', 'aria-controls': listId, 'aria-autocomplete': 'list',
  });
  const list = h('ul', { class: 'gs-results', id: listId, role: 'listbox', 'aria-label': T.results, hidden: true });
  const box = h('div', { class: `gs ${className}`.trim() }, h('span', { class: 'gs-icon', 'aria-hidden': 'true' }, icon('search')), input, list);

  let results = [];
  let active = -1;

  function setActive(i) {
    active = i;
    [...list.querySelectorAll('.gs-item')].forEach((el, k) => {
      el.classList.toggle('on', k === i);
      el.setAttribute('aria-selected', String(k === i));
      if (k === i) el.scrollIntoView({ block: 'nearest' });
    });
    if (i >= 0) input.setAttribute('aria-activedescendant', `${listId}-${i}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }

  function pick(r) {
    if (!r) return;
    close();
    onPick?.(r);
  }

  function draw() {
    const q = input.value.trim();
    results = q ? searchGuide(q, lang) : [];
    active = -1;
    if (!q) { list.replaceChildren(); close(); return; }
    if (!results.length) {
      list.replaceChildren(h('li', { class: 'gs-none', role: 'presentation' },
        h('strong', {}, T.none.replace('{q}', q)), h('span', {}, T.tryWords)));
    } else {
      list.replaceChildren(...results.map((r, i) => {
        const def = r.type ? widgetByType[r.type] : null;
        const tile = def
          ? h('span', { class: `tool-tile mini tone-${def.tone || 'content'}` }, icon(def.icon))
          : h('span', { class: 'gs-sec-ico' }, icon('book'));
        const sn = r.snippet;
        return h('li', {
          class: 'gs-item', id: `${listId}-${i}`, role: 'option', 'aria-selected': 'false',
          onmousedown: (e) => e.preventDefault(), // keep focus in the box
          onclick: () => pick(r),
          onmousemove: () => { if (active !== i) setActive(i); },
        },
        tile,
        h('span', { class: 'gs-text' },
          h('span', { class: 'gs-title' }, r.title, r.kind === 'section' ? h('span', { class: 'gs-label' }, r.label) : null),
          sn && (sn.pre || sn.hit) ? h('span', { class: 'gs-snip' }, sn.pre, sn.hit ? h('mark', {}, sn.hit) : null, sn.post) : null));
      }));
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    // Open upwards when the box is near the bottom of the screen (as on the boards screen).
    const r = input.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 300 && above > below;
    list.classList.toggle('up', up);
    list.style.maxHeight = `${Math.max(160, Math.min(480, (up ? above : below) - 8))}px`;
  }

  const onInput = (e) => { if (e.isComposing) return; draw(); };
  input.addEventListener('input', onInput);
  input.addEventListener('compositionend', onInput); // Chinese input: after the word is chosen
  input.addEventListener('focus', () => { if (input.value.trim()) draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); if (list.hidden) draw(); setActive((active + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(active <= 0 ? results.length - 1 : active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden || input.value.trim()) { if (list.hidden) draw(); pick(results[Math.max(0, active)]); } }
    else if (e.key === 'Escape') {
      if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
      else if (input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; draw(); }
    }
  });
  input.addEventListener('blur', () => setTimeout(close, 120));

  return {
    el: box, input,
    focus() { input.focus(); input.select(); },
    setQuery(q) { input.value = q; draw(); },
  };
}
