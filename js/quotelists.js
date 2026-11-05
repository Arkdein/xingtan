// Teachers' own quote collections for the Quotes tool (名言佳句). Like Dictation
// word lists, they are shared by every board in this browser and go into
// backups. A shared board file carries a copy of the collections its Quotes
// tool shows, so a colleague gets them too.
//
//   { id, name, updatedAt,
//     quotes: [{ id, lang: 'zh' | 'en', text, py, gloss, en, by, src, tags }] }
//   Chinese quotes: py is one syllable per Chinese character (space-separated).
//   English quotes: by (who said it) and src (where).
import * as store from './store.js';
import { t } from './i18n.js';

export const all = () => (Array.isArray(store.get().quoteLists) ? store.get().quoteLists : []);
export const byId = (id) => all().find((l) => l.id === id) || null;

export function save(list) {
  const copy = { ...list, updatedAt: new Date().toISOString() };
  store.update((m) => {
    m.quoteLists = Array.isArray(m.quoteLists) ? m.quoteLists : [];
    const i = m.quoteLists.findIndex((x) => x.id === copy.id);
    if (i >= 0) m.quoteLists[i] = copy; else m.quoteLists.push(copy);
  });
  return copy;
}

export function remove(id) {
  store.update((m) => { m.quoteLists = (m.quoteLists || []).filter((x) => x.id !== id); });
}

export function blank() {
  return { id: 'ql-' + store.uid(), name: '', quotes: [] };
}

// Adds a collection that arrived in a shared board file. One with the same id
// that is already here is kept as it is; one with the same name gets “(shared)”.
export function adopt(list) {
  if (!list || !list.id || !Array.isArray(list.quotes)) return null;
  if (byId(list.id)) return byId(list.id);
  const taken = all().some((l) => l.name === list.name);
  return save({ ...list, name: taken ? t('{name} (shared)', { name: list.name }) : list.name });
}

const HAN = /\p{Script=Han}/u;
export const hasHan = (s) => HAN.test(s || '');
export const hanChars = (s) => [...(s || '')].filter((c) => HAN.test(c));
