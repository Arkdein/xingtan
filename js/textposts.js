// Saved posts for the Text tool (文稿). Like Dictation word lists and quote
// collections, they are shared by every board in this browser and go into
// backups. A Text tool shows one post at a time; closing the tool keeps the
// post, and a post is only deleted from the list of saved posts.
//
//   { id, html, text, size, bg, createdAt, updatedAt }
//   html: the formatted text (cleaned by richtext.js); text: a plain copy for the list
//   size: font size in px; bg: card colour or null
//
// Each Text tool on a board also keeps a copy of its post in its own state, so
// a shared board file (or Undo after closing the tool) carries the post with it.
// A tool whose post isn't in this browser yet (from a colleague's board file)
// adds it to the list. Posts deleted here are remembered (`textPostsDeleted`),
// so a Text tool on another board doesn't bring a deleted post back.
//
// Text tools from before saved posts are added to the list once, the first time
// the list is read (`textPostsMigrated`).
import * as store from './store.js';
import { textToHtml } from './richtext.js';

const KEEP_DELETED = 300; // how many deleted ids to remember
const DEFAULT_SIZE = 32;
const listeners = new Set();

// fn() is called when posts are added, changed or deleted in this window.
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => { try { fn(); } catch (err) { console.warn(err); } });
// For a Text tool that opened or left a post, so other Text tools can mark it.
export const notify = emit;

const list = () => (Array.isArray(store.get().textPosts) ? store.get().textPosts : []);
const deleted = () => (Array.isArray(store.get().textPostsDeleted) ? store.get().textPostsDeleted : []);

export const isBlank = (p) => !p || !String(p.text || '').trim();

// The id a Text tool from before saved posts gets, so it finds its post again.
export const legacyId = (boardId, widgetId) => `tp-${boardId}-${widgetId}`;

// The post a Text tool shows: its own postId, or the id it gets from the move above.
export function postIdOf(boardId, w) {
  const st = w?.state || {};
  if ('postId' in st) return st.postId || null;
  return (st.html || st.text) ? legacyId(boardId, w.id) : null;
}

// Newest first.
export function all() {
  migrate();
  return [...list()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export const byId = (id) => (id ? list().find((p) => p.id === id) || null : null);
export const wasDeleted = (id) => deleted().includes(id);

export function blank(fields = {}) {
  return { id: 'tp-' + store.uid(), html: '', text: '', size: DEFAULT_SIZE, bg: null, ...fields };
}

const tidy = (p) => ({
  id: p.id,
  html: String(p.html || ''),
  text: String(p.text || ''),
  size: Number.isFinite(p.size) ? p.size : DEFAULT_SIZE,
  bg: p.bg || null,
  createdAt: p.createdAt || new Date().toISOString(),
  updatedAt: p.updatedAt || new Date().toISOString(),
});

// Adds or updates a post. Typing saves often, so the rest of the app isn't
// told about it (no dock or class-list refresh); other Text tools are.
export function save(post, { touch = true } = {}) {
  const now = new Date().toISOString();
  const copy = tidy({ ...post, updatedAt: touch ? now : post.updatedAt });
  store.update((m) => {
    m.textPosts = Array.isArray(m.textPosts) ? m.textPosts : [];
    const i = m.textPosts.findIndex((x) => x.id === copy.id);
    if (i >= 0) m.textPosts[i] = { ...copy, createdAt: m.textPosts[i].createdAt || copy.createdAt };
    else m.textPosts.push(copy);
    m.changedAt = now;
  }, { notify: false });
  emit();
  return copy;
}

// Deletes a post from the list. Returns it, for Undo.
export function remove(id) {
  const post = byId(id);
  if (!post) return null;
  store.update((m) => {
    m.textPosts = (m.textPosts || []).filter((x) => x.id !== id);
    m.textPostsDeleted = [...(m.textPostsDeleted || []).filter((x) => x !== id), id].slice(-KEEP_DELETED);
    m.changedAt = new Date().toISOString();
  }, { notify: false });
  emit();
  return post;
}

// Puts a deleted post back (Undo).
export function restore(post) {
  if (!post) return;
  store.update((m) => {
    m.textPostsDeleted = (m.textPostsDeleted || []).filter((x) => x !== post.id);
  }, { notify: false });
  save(post, { touch: false });
}

// Drops a post that was left empty, without remembering it as deleted.
export function discard(id) {
  if (!byId(id)) return;
  store.update((m) => { m.textPosts = (m.textPosts || []).filter((x) => x.id !== id); }, { notify: false });
  emit();
}

// Adds a post a Text tool carries (from a shared board file, or after Undo),
// unless it was deleted here. Returns the post in the list, or null.
export function adopt(post) {
  if (!post?.id || isBlank(post) || wasDeleted(post.id)) return null;
  return byId(post.id) || save(post, { touch: false });
}

// How many other boards have a Text tool showing this post.
export function openOnOtherBoards(id, exceptBoardId) {
  let n = 0;
  store.listBoards().forEach((b) => {
    if (b.id === exceptBoardId) return;
    if ((b.widgets || []).some((w) => w.type === 'text' && postIdOf(b.id, w) === id)) n += 1;
  });
  return n;
}

// Text tools from before saved posts: add what they show to the list, once.
function migrate() {
  const m = store.get();
  if (m.textPostsMigrated) return;
  const found = [];
  const have = new Set(list().map((p) => p.id));
  store.listBoards().forEach((b) => {
    (b.widgets || []).forEach((w) => {
      if (w.type !== 'text') return;
      const st = w.state || {};
      if ('postId' in st || !String(st.text || '').trim()) return;
      const id = legacyId(b.id, w.id);
      if (have.has(id)) return;
      have.add(id);
      found.push(tidy({ id, html: st.html != null ? st.html : textToHtml(st.text), text: st.text, size: st.size, bg: st.bg,
        createdAt: b.createdAt, updatedAt: b.updatedAt }));
    });
  });
  store.update((x) => {
    x.textPosts = [...(Array.isArray(x.textPosts) ? x.textPosts : []), ...found];
    x.textPostsMigrated = true;
  }, { notify: false });
}
