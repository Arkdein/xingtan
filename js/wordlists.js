// Word lists for the Dictation tool (听写词语表). They are shared by every board
// in this browser, like custom thinking routines, and go into backups.
// A shared board file carries a copy of the list its Dictation tool uses.
//
//   { id, name, lang: 'zh' | 'en' | 'ms' | 'ta', updatedAt,
//     words: [{ id, w, py, meaning, examples, phonetic, audio, src, trad }] }
import * as store from './store.js';

export const all = () => (Array.isArray(store.get().wordLists) ? store.get().wordLists : []);
export const byId = (id) => all().find((l) => l.id === id) || null;

export function save(list) {
  const copy = { ...list, updatedAt: new Date().toISOString() };
  store.update((m) => {
    m.wordLists = Array.isArray(m.wordLists) ? m.wordLists : [];
    const i = m.wordLists.findIndex((x) => x.id === copy.id);
    if (i >= 0) m.wordLists[i] = copy; else m.wordLists.push(copy);
  });
  return copy;
}

export function remove(id) {
  store.update((m) => { m.wordLists = (m.wordLists || []).filter((x) => x.id !== id); });
}

export function blank(lang = 'zh') {
  return { id: 'wl-' + store.uid(), name: '', lang, words: [] };
}

// Adds a list that arrived in a shared board file. A list with the same id that
// is already here is kept as it is; one with the same name gets “(shared)”.
export function adopt(list) {
  if (!list || !list.id || !Array.isArray(list.words)) return null;
  if (byId(list.id)) return byId(list.id);
  const taken = all().some((l) => l.name === list.name);
  return save({ ...list, name: taken ? `${list.name} (shared)` : list.name });
}
