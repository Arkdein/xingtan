// Passages for the Read-aloud tool (朗读篇章). Like Dictation word lists, they
// are shared by every board in this browser and go into backups. A shared board
// file carries a copy of the passage its Read-aloud tool shows.
//
//   { id, name, lang: 'zh' | 'en', text, marks: [i], pyFix: { [i]: 'xíng' }, updatedAt }
//   marks: positions (in text) of the characters that show pinyin when the tool
//          shows pinyin on chosen characters only
//   pyFix: the teacher's corrections to the pinyin the app works out
import * as store from './store.js';
import { t } from './i18n.js';

export const all = () => (Array.isArray(store.get().passages) ? store.get().passages : []);
export const byId = (id) => (id ? all().find((p) => p.id === id) || null : null);

const tidy = (p) => ({
  id: p.id,
  name: String(p.name || ''),
  lang: p.lang === 'en' ? 'en' : 'zh',
  text: String(p.text || ''),
  marks: Array.isArray(p.marks) ? [...new Set(p.marks.filter(Number.isInteger))].sort((a, b) => a - b) : [],
  pyFix: p.pyFix && typeof p.pyFix === 'object' ? { ...p.pyFix } : {},
  updatedAt: new Date().toISOString(),
});

// Saving tells the rest of the app, so other Read-aloud tools pick up the change.
export function save(passage) {
  const copy = tidy(passage);
  store.update((m) => {
    m.passages = Array.isArray(m.passages) ? m.passages : [];
    const i = m.passages.findIndex((x) => x.id === copy.id);
    if (i >= 0) m.passages[i] = copy; else m.passages.push(copy);
    m.changedAt = copy.updatedAt;
  });
  return copy;
}

export function remove(id) {
  store.update((m) => {
    m.passages = (m.passages || []).filter((x) => x.id !== id);
    m.changedAt = new Date().toISOString();
  });
}

export function blank(lang = 'zh') {
  return { id: 'ps-' + store.uid(), name: '', lang, text: '', marks: [], pyFix: {} };
}

// Adds a passage that arrived in a shared board file. One with the same id that
// is already here is kept as it is; one with the same name gets “(shared)”.
export function adopt(p) {
  if (!p || !p.id || typeof p.text !== 'string') return null;
  if (byId(p.id)) return byId(p.id);
  const taken = all().some((x) => x.name === p.name);
  return save({ ...p, name: taken ? t('{name} (shared)', { name: p.name }) : p.name });
}

// When the text is edited, keeps chosen characters and pinyin fixes on the same
// characters: positions before the change stay, those after it move with it, and
// those inside the changed part are dropped.
export function remap(oldText, newText, positions) {
  if (oldText === newText) return positions;
  let pre = 0;
  const max = Math.min(oldText.length, newText.length);
  while (pre < max && oldText[pre] === newText[pre]) pre++;
  let suf = 0;
  while (suf < max - pre && oldText[oldText.length - 1 - suf] === newText[newText.length - 1 - suf]) suf++;
  const delta = newText.length - oldText.length;
  const move = (i) => (i < pre ? i : i >= oldText.length - suf ? i + delta : null);
  if (Array.isArray(positions)) return positions.map(move).filter((i) => i != null);
  const out = {};
  Object.entries(positions || {}).forEach(([k, v]) => { const i = move(Number(k)); if (i != null) out[i] = v; });
  return out;
}
