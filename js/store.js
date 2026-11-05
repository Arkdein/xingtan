// Local-only storage. Everything lives in this browser. Nothing is sent anywhere.
//
// Layout (v3): IndexedDB database "xingtan" (see db.js)
//   boards  <id>        { id, name, createdAt, updatedAt, background, bgDim, bgLum, viewport, widgets, toolData, dockHidden? }
//   kv      'meta'      { version, classes, activeClassId, lastBoardId, lastBackup, changedAt, savedAt, backupSnoozeUntil, points, polls, … }
//   kv      'migration' { at, boards, deleted } when data was moved from localStorage
//   images  <id>        uploaded backgrounds and Images-tool pictures (see images.js)
//   audio   <id>        music files added to the Music tool (see audio.js)
//
// IndexedDB has room for far more than localStorage's ~5 MB. Everything is
// read into memory when the app starts, so the rest of the app reads boards
// and class lists synchronously, as before. Changes are written back a moment
// later. Other windows of the app hear about them on a BroadcastChannel.
//
// Older versions kept data in localStorage ('xingtan:v2:*', and before that
// 'xingtan:v1'). It is copied into IndexedDB once and the old copy is kept for
// LEGACY_KEEP_DAYS as a fallback. Changes an older copy of the app (still open
// in another tab) makes to it in that time are picked up too.
// If IndexedDB can't be opened at all, the app keeps working from localStorage.

import * as images from './images.js';
import * as audio from './audio.js';
import { bgFields, imageKind } from './backgrounds.js';
import { openDB, reqP, done } from './db.js';
import { t } from './i18n.js';

const V1_KEY = 'xingtan:v1';
const META_KEY = 'xingtan:v2:meta';
const BOARD_PREFIX = 'xingtan:v2:board:';
const SESSION_KEY = 'xingtan:openBoard';      // sessionStorage: board open in this window
const UNSAVED_PREFIX = 'xingtan:v3:unsaved:'; // localStorage: emergency copy when a window closes mid-save
const LEGACY_KEEP_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export const BOARD_FILE_KIND = 'xingtan-board';
export const BACKUP_FILE_KIND = 'xingtan-backup';

const listeners = new Set();       // class / meta changes
const statusListeners = new Set(); // save status: 'saved' | 'saving' | 'error'
const windowId = Math.random().toString(36).slice(2, 10);

const metaDefaults = () => ({
  version: 3,
  classes: [],          // [{ id, name, students: [string] }]
  activeClassId: null,
  lastBoardId: null,
  lastBackup: null,
  changedAt: null,      // last change to class lists, points, routines or polls (boards keep their own updatedAt)
  savedAt: null,        // last time meta was written, to settle which copy is newer
  backupSnoozeUntil: null, // the backup reminder stays hidden until then
  points: {},           // { [classId]: behaviour points, see points.js }
  routines: [],         // custom thinking routines, see routines.js
  polls: {},            // { [classKey]: past poll results, newest last }, see polls.js
  wordLists: [],        // Dictation word lists shared by all boards, see wordlists.js
  quoteLists: [],       // the teacher's own quote collections for the Quotes tool, see quotelists.js
  textPosts: [],        // saved posts for the Text tool, shared by all boards, see textposts.js
  textPostsDeleted: [], // ids of deleted posts, so a Text tool on another board doesn't bring one back
  textPostsMigrated: false, // Text tools from before saved posts have been added to textPosts
  dictation: {},        // Dictation settings for this computer, such as the chosen voices
  google: {},           // { [email]: { folderId, sheets: { [classKey]: { id, url } } } }, see gforms.js
});

const boardDefaults = () => ({
  id: uid(),
  name: t('Untitled board'),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  background: 'navy',
  bgDim: 0,             // image only: -60 (lighter) … 60 (darker)
  bgLum: null,          // image only: average brightness 0–255
  viewport: null,       // { w, h } of the stage when last saved, for thumbnails
  widgets: [],          // [{ id, type, x, y, w, h, z, state }]
  toolData: {},         // { [type]: data a tool keeps on the board even after it is closed }
});

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const boardKey = (id) => BOARD_PREFIX + id;
const time = (iso) => (iso ? Date.parse(iso) || 0 : 0);

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Could not read', key, err);
    return null;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function lsKeys(prefix) {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch (err) { /* storage blocked */ }
  return keys;
}

function normaliseBoard(b) {
  const board = { ...boardDefaults(), ...b };
  if (!Array.isArray(board.widgets)) board.widgets = [];
  board.widgets = board.widgets.filter((w) => w && typeof w === 'object' && w.type);
  board.widgets.forEach((w) => { if (!w.state || typeof w.state !== 'object') w.state = {}; if (!w.id) w.id = uid(); });
  if (!board.toolData || typeof board.toolData !== 'object' || Array.isArray(board.toolData)) board.toolData = {};
  if (!board.name || typeof board.name !== 'string') board.name = t('Untitled board');
  if (typeof board.background !== 'string') board.background = 'navy';
  board.bgDim = Number.isFinite(board.bgDim) ? board.bgDim : 0;
  if (!Number.isFinite(board.bgLum)) board.bgLum = null;
  if (board.dockHidden !== true) delete board.dockHidden; // the dock is hidden on this board
  return board;
}

const normaliseMeta = (m) => ({ ...metaDefaults(), ...(m && typeof m === 'object' ? m : {}), version: 3 });

// v1 had one layout. It becomes the first board.
function boardFromV1(v1) {
  const hasLayout = (Array.isArray(v1.widgets) && v1.widgets.length > 0) || (v1.background && v1.background !== 'navy');
  if (!hasLayout) return null;
  return normaliseBoard({ name: t('My board'), background: v1.background || 'navy', widgets: v1.widgets || [] });
}

// ---- What older versions left in localStorage ----
function readLegacy() {
  const m = readJSON(META_KEY);
  if (m) {
    const boards = lsKeys(BOARD_PREFIX).map(readJSON).filter((b) => b && typeof b === 'object').map(normaliseBoard);
    return { meta: normaliseMeta(m), boards };
  }
  const v1 = readJSON(V1_KEY);
  if (v1 && typeof v1 === 'object') {
    const meta = metaDefaults();
    meta.classes = Array.isArray(v1.classes) ? v1.classes : [];
    meta.activeClassId = v1.activeClassId || null;
    meta.lastBackup = v1.lastBackup || null;
    const b = boardFromV1(v1);
    if (b) meta.lastBoardId = b.id;
    return { meta, boards: b ? [b] : [] };
  }
  return null;
}

function removeLegacy() {
  [...lsKeys(BOARD_PREFIX), META_KEY, V1_KEY].forEach((k) => { try { localStorage.removeItem(k); } catch (err) { /* ignore */ } });
}

// ---- Two places data can live ----
// Each backend: loadAll(), readBoard(id), readMeta(), write({ boards, deleted, meta }), replaceAll(meta, boards).

const idbBackend = (db) => ({
  kind: 'indexeddb',
  async loadAll() {
    const t = db.transaction(['boards', 'kv'], 'readonly');
    const [boards, meta] = await Promise.all([reqP(t.objectStore('boards').getAll()), reqP(t.objectStore('kv').get('meta'))]);
    return { boards, meta };
  },
  readBoard: (id) => reqP(db.transaction('boards', 'readonly').objectStore('boards').get(id)),
  readMeta: () => reqP(db.transaction('kv', 'readonly').objectStore('kv').get('meta')),
  readKv: (key) => reqP(db.transaction('kv', 'readonly').objectStore('kv').get(key)),
  writeKv(key, value) {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(value, key);
    return done(t);
  },
  // put() copies each record straight away, so later edits in memory don't leak into this write.
  write({ boards = [], deleted = [], meta = null }) {
    const t = db.transaction(['boards', 'kv'], 'readwrite');
    const bs = t.objectStore('boards');
    boards.forEach((b) => bs.put(b));
    deleted.forEach((id) => bs.delete(id));
    if (meta) t.objectStore('kv').put(meta, 'meta');
    return done(t);
  },
  replaceAll(meta, boards) {
    const t = db.transaction(['boards', 'kv'], 'readwrite');
    const bs = t.objectStore('boards');
    bs.clear();
    boards.forEach((b) => bs.put(b));
    t.objectStore('kv').put(meta, 'meta');
    return done(t);
  },
});

// Fallback for browsers that won't open IndexedDB: the old localStorage layout.
const lsBackend = () => ({
  kind: 'localstorage',
  async loadAll() { const l = readLegacy(); return { meta: l?.meta || null, boards: l?.boards || [] }; },
  async readBoard(id) { return readJSON(boardKey(id)); },
  async readMeta() { return readJSON(META_KEY); },
  async readKv() { return null; },
  async writeKv() {},
  write({ boards = [], deleted = [], meta = null }) {
    try {
      boards.forEach((b) => writeJSON(boardKey(b.id), b));
      deleted.forEach((id) => localStorage.removeItem(boardKey(id)));
      if (meta) writeJSON(META_KEY, meta);
      return Promise.resolve();
    } catch (err) { return Promise.reject(err); }
  },
  replaceAll(meta, boards) {
    try {
      lsKeys(BOARD_PREFIX).forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(V1_KEY);
      boards.forEach((b) => writeJSON(boardKey(b.id), b));
      writeJSON(META_KEY, meta);
      return Promise.resolve();
    } catch (err) { return Promise.reject(err); }
  },
});

// ---- State in memory ----
let backend = null;
let meta = metaDefaults();
const cache = new Map();   // id -> board (the open board is the same object as its entry)
let board = null;          // the board open in this window
let migration = null;      // { at, boards, deleted } while the old localStorage copy is kept
const dirtyBoards = new Set();
const deletedBoards = new Set();
let metaDirty = false;
let saveTimer = null;
let status = 'saved';
let inflight = 0;          // writes started but not yet confirmed
const unconfirmed = new Set(); // 'meta' and board ids in those writes
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('xingtan') : null;

export const storageKind = () => backend?.kind || 'none';

function setStatus(s) {
  if (s === status) return;
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getStatus() { return status; }
export function onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }

// ---- Starting up ----
// Copies an emergency save left by a window that closed before its last write finished.
async function recoverUnsaved() {
  const keys = lsKeys(UNSAVED_PREFIX);
  if (!keys.length) return;
  for (const key of keys) {
    const u = readJSON(key);
    const boards = (Array.isArray(u?.boards) ? u.boards : []).map(normaliseBoard)
      .filter((b) => { const have = cache.get(b.id); return !have || time(b.updatedAt) > time(have.updatedAt); });
    const newerMeta = u?.meta && time(u.meta.savedAt) > time(meta.savedAt) ? normaliseMeta(u.meta) : null;
    boards.forEach((b) => cache.set(b.id, b));
    if (newerMeta) meta = newerMeta;
    try {
      if (boards.length || newerMeta) await backend.write({ boards, meta: newerMeta });
      localStorage.removeItem(key);
    } catch (err) { console.warn('Could not recover unsaved changes', err); }
  }
}

// Picks up changes an older copy of the app (open in another tab) made to the
// localStorage copy after the move. Returns true if anything changed here.
function adoptLegacyChanges(onlyKey = null) {
  if (!migration || backend.kind !== 'indexeddb') return false;
  const since = time(migration.at);
  const boards = [];
  const keys = onlyKey ? (onlyKey.startsWith(BOARD_PREFIX) ? [onlyKey] : []) : lsKeys(BOARD_PREFIX);
  keys.forEach((k) => {
    const raw = readJSON(k);
    if (!raw || typeof raw !== 'object') return;
    const b = normaliseBoard(raw);
    const have = cache.get(b.id);
    const newer = have ? time(b.updatedAt) > time(have.updatedAt)
      : time(b.updatedAt) > since && !(migration.deleted || []).includes(b.id);
    if (newer) boards.push(b);
  });
  let newerMeta = null;
  if (!onlyKey || onlyKey === META_KEY) {
    const lm = readJSON(META_KEY);
    if (lm && time(lm.changedAt) > Math.max(since, time(meta.changedAt))) {
      newerMeta = { ...meta, classes: lm.classes || [], activeClassId: lm.activeClassId || null,
        points: lm.points || {}, routines: Array.isArray(lm.routines) ? lm.routines : meta.routines,
        wordLists: Array.isArray(lm.wordLists) ? lm.wordLists : meta.wordLists, changedAt: lm.changedAt };
    }
  }
  if (!boards.length && !newerMeta) return false;
  boards.forEach((b) => {
    if (board && board.id === b.id) { board = b; }
    cache.set(b.id, b);
    dirtyBoards.add(b.id);
  });
  if (newerMeta) { meta = newerMeta; metaDirty = true; }
  flush();
  return true;
}

async function init() {
  let db = null;
  try { db = await openDB(); } catch (err) { console.warn('IndexedDB unavailable; using localStorage', err); }
  backend = db ? idbBackend(db) : lsBackend();

  let loaded = { meta: null, boards: [] };
  try { loaded = await backend.loadAll(); } catch (err) { console.warn('Could not load saved data', err); }

  if (backend.kind === 'indexeddb' && !loaded.meta) {
    // First run of v3: move what older versions saved in localStorage.
    const legacy = readLegacy();
    const m = legacy?.meta || metaDefaults();
    const boards = legacy?.boards || [];
    m.savedAt = new Date().toISOString();
    await backend.replaceAll(m, boards);
    const check = await backend.loadAll();
    if (!check.meta || check.boards.length !== boards.length) throw new Error('Moving boards into IndexedDB did not complete');
    if (legacy) {
      migration = { at: new Date().toISOString(), boards: boards.length, deleted: [] };
      await backend.writeKv('migration', migration);
    }
    loaded = check;
  } else if (backend.kind === 'indexeddb') {
    migration = (await backend.readKv('migration')) || null;
  }

  meta = normaliseMeta(loaded.meta);
  loaded.boards.forEach((b) => cache.set(b.id, normaliseBoard(b)));
  await recoverUnsaved();

  if (migration) {
    if (Date.now() - time(migration.at) > LEGACY_KEEP_DAYS * DAY) {
      // The old copy has done its job; free the space for other apps on this site.
      removeLegacy();
      migration = null;
      try { await backend.writeKv('migration', null); } catch (err) { /* ignore */ }
    } else {
      adoptLegacyChanges();
    }
  }
}

try {
  await init();
} catch (err) {
  // Never start empty because of a failed move: fall back to the old copy.
  console.error('Storage start-up failed; using localStorage', err);
  backend = lsBackend();
  migration = null;
  const l = readLegacy();
  meta = normaliseMeta(l?.meta);
  cache.clear();
  (l?.boards || []).forEach((b) => cache.set(b.id, b));
}

// ---- Saving ----
// Starts writing anything pending. Returns false if the last save failed
// (for example, storage is full).
export function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!metaDirty && !dirtyBoards.size && !deletedBoards.size) {
    if (!inflight && status === 'saving') setStatus('saved');
    return status !== 'error';
  }
  const now = new Date().toISOString();
  if (metaDirty) meta.savedAt = now;
  const job = {
    boards: [...dirtyBoards].map((id) => cache.get(id)).filter(Boolean),
    deleted: [...deletedBoards],
    meta: metaDirty ? meta : null,
  };
  const keys = [...job.boards.map((b) => b.id), ...(job.meta ? ['meta'] : [])];
  dirtyBoards.clear(); deletedBoards.clear(); metaDirty = false;
  inflight++;
  keys.forEach((k) => unconfirmed.add(k));
  let p;
  try { p = backend.write(job); } catch (err) { p = Promise.reject(err); }
  setStatus('saving');
  p.then(() => {
    inflight--;
    if (!inflight) { unconfirmed.clear(); clearUnsavedCopy(); }
    if (!inflight && !metaDirty && !dirtyBoards.size && !deletedBoards.size) setStatus('saved');
    channel?.postMessage({ from: windowId, type: 'saved', boards: job.boards.map((b) => b.id), deleted: job.deleted, meta: !!job.meta });
  }, (err) => {
    inflight--;
    console.warn('Could not save', err);
    // Try again with the next change.
    job.boards.forEach((b) => { if (cache.has(b.id)) dirtyBoards.add(b.id); });
    job.deleted.forEach((id) => deletedBoards.add(id));
    if (job.meta) metaDirty = true;
    setStatus('error');
  });
  return true;
}

function schedule() {
  setStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

export function hasUnsaved() { return metaDirty || dirtyBoards.size > 0 || deletedBoards.size > 0 || inflight > 0 || status === 'error'; }

// For a window that is closing or being hidden. IndexedDB writes finish a moment
// later, which may be too late, so anything not yet confirmed is also copied into
// localStorage straight away. The next start picks it up (recoverUnsaved).
// Returns false only if even that failed, so the browser should warn.
export function flushOnExit() {
  flush();
  if (!inflight && status !== 'error') return true;
  if (backend.kind !== 'indexeddb') return status !== 'error';
  const copy = {
    savedAt: new Date().toISOString(),
    meta: unconfirmed.has('meta') || metaDirty ? meta : null,
    boards: [...unconfirmed, ...dirtyBoards].filter((k) => k !== 'meta').map((id) => cache.get(id)).filter(Boolean),
  };
  try {
    writeJSON(UNSAVED_PREFIX + windowId, copy);
    return true;
  } catch (err) {
    return false;
  }
}

function clearUnsavedCopy() {
  try { localStorage.removeItem(UNSAVED_PREFIX + windowId); } catch (err) { /* ignore */ }
}

// ---- Meta (class lists, shared settings) ----
export function get() { return meta; }

export function update(mutator, { notify = true } = {}) {
  mutator(meta);
  if (notify) meta.changedAt = new Date().toISOString();
  metaDirty = true;
  schedule();
  if (notify) listeners.forEach((fn) => fn(meta));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---- Current board ----
export function getBoard() { return board; }

export function updateBoard(mutator = () => {}, { viewport } = {}) {
  if (!board) return;
  mutator(board);
  board.updatedAt = new Date().toISOString();
  if (viewport) board.viewport = viewport;
  dirtyBoards.add(board.id);
  schedule();
}

export function openBoard(id) {
  flush();
  const b = cache.get(id);
  if (!b) return null;
  board = b;
  meta.lastBoardId = board.id;
  metaDirty = true;
  flush();
  try { sessionStorage.setItem(SESSION_KEY, board.id); } catch (err) { /* ignore */ }
  return board;
}

export function closeBoard() {
  flush();
  board = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
}

// The board this window had open before a reload, if it still exists.
export function sessionBoardId() {
  let id = null;
  try { id = sessionStorage.getItem(SESSION_KEY); } catch (err) { /* ignore */ }
  return id && cache.has(id) ? id : null;
}

// ---- All boards ----
export function listBoards() {
  return [...cache.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

const copyOf = (id) => (cache.has(id) ? JSON.parse(JSON.stringify(cache.get(id))) : null);

export function createBoard(name, fields = {}) {
  const b = normaliseBoard({ ...fields, id: uid(), name: (name || '').trim() || t('Untitled board'),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  cache.set(b.id, b);
  dirtyBoards.add(b.id);
  flush();
  return b;
}

export function renameBoard(id, name) {
  name = (name || '').trim();
  if (!name) return;
  if (board && board.id === id) { updateBoard((b) => { b.name = name; }); flush(); return; }
  const b = cache.get(id);
  if (!b) return;
  b.name = name;
  b.updatedAt = new Date().toISOString();
  dirtyBoards.add(id);
  flush();
}

// Data tools keep on the board after they are closed (such as saved YouTube videos).
// It never holds student names, so copies and shared files carry it as it is.
function copyToolData(d) {
  return d && typeof d === 'object' && !Array.isArray(d) ? JSON.parse(JSON.stringify(d)) : {};
}

// Fresh copy: new ids, and running timers are stopped.
function copyWidgets(widgets) {
  return JSON.parse(JSON.stringify(widgets || [])).map((w) => {
    w.id = uid();
    if (w.type === 'timer' && w.state) {
      w.state.endAt = null;
      if (w.state.duration != null) w.state.remaining = w.state.duration;
      w.state.swStart = null;
      w.state.swElapsed = 0;
      w.state.laps = [];
    }
    // A copied board starts a new lesson: a routine or poll in progress (with its
    // Google Form, answers and students' names) stays on the original board.
    if ((w.type === 'routine' || w.type === 'poll') && w.state) {
      w.state.run = null;
      if (w.type === 'routine') { w.state.notes = []; w.state.view = 'setup'; }
      else { w.state.answers = []; w.state.tally = null; }
    }
    return w;
  });
}

export function duplicateBoard(id) {
  const src = copyOf(id);
  if (!src) return null;
  return createBoard(t('{name} (copy)', { name: src.name }), {
    ...bgFields(src), viewport: src.viewport, widgets: copyWidgets(src.widgets), toolData: copyToolData(src.toolData),
    ...(src.dockHidden ? { dockHidden: true } : {}),
  });
}

// Pictures a board keeps in its Images tool (ids in IndexedDB).
function toolImageIds(b) {
  const items = b?.toolData?.images?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((it) => [it?.imageId, ...(Array.isArray(it?.pages) ? it.pages.map((p) => p?.imageId) : [])]).filter(Boolean);
}

// Upload ids used by any saved board: backgrounds and Images-tool pictures.
function uploadsInUse(exceptId = null) {
  const ids = new Set();
  listBoards().forEach((b) => {
    if (b.id === exceptId) return;
    const k = imageKind(b.background || '');
    if (k?.kind === 'upload') ids.add(k.id);
    toolImageIds(b).forEach((id) => ids.add(id));
  });
  return ids;
}

// Music files a board keeps in its Music tool (ids in IndexedDB).
function toolAudioIds(b) {
  const items = b?.toolData?.music?.items;
  if (!Array.isArray(items)) return [];
  return items.filter((it) => it?.kind === 'file' && it.ref).map((it) => it.ref);
}

function audioInUse(exceptId = null) {
  const ids = new Set();
  listBoards().forEach((b) => { if (b.id !== exceptId) toolAudioIds(b).forEach((id) => ids.add(id)); });
  return ids;
}

// Deletes stored music files that no board uses any more (after the open board changed).
export function freeUnusedAudio(ids) {
  flush();
  const used = audioInUse();
  (ids || []).filter((id) => id && !used.has(id)).forEach((id) => audio.remove(id).catch(() => {}));
}

// Music files stay on this computer: shared board files list only library tracks and Spotify links.
function shareableToolData(d) {
  const copy = copyToolData(d);
  if (Array.isArray(copy.music?.items)) copy.music.items = copy.music.items.filter((it) => it?.kind !== 'file');
  return copy;
}

// Deletes stored pictures that no board uses any more (after the open board changed).
export function freeUnusedImages(ids) {
  flush();
  const used = uploadsInUse();
  (ids || []).filter((id) => id && !used.has(id)).forEach((id) => images.remove(id).catch(() => {}));
}

export function deleteBoard(id) {
  const b = cache.get(id);
  cache.delete(id);
  dirtyBoards.delete(id);
  deletedBoards.add(id);
  if (migration) { // so the old localStorage copy doesn't bring it back
    migration.deleted = [...(migration.deleted || []), id];
    backend.writeKv('migration', migration).catch(() => {});
  }
  if (board && board.id === id) board = null;
  flush();
  if (meta.lastBoardId === id) update((m) => { m.lastBoardId = null; }, { notify: false });
  // Free uploaded images once no board uses them.
  const k = imageKind(b?.background || '');
  const mine = [...(k?.kind === 'upload' ? [k.id] : []), ...toolImageIds(b)];
  const used = uploadsInUse(id);
  mine.filter((x) => !used.has(x)).forEach((x) => images.remove(x).catch(() => {}));
  const songs = audioInUse(id);
  toolAudioIds(b).filter((x) => !songs.has(x)).forEach((x) => audio.remove(x).catch(() => {}));
}

// Uploaded images stay on this computer, so shared board files use a plain colour instead.
function shareableBg(b) {
  if (imageKind(b.background || '')?.kind === 'upload') return { background: 'navy', bgDim: 0, bgLum: null };
  return bgFields(b);
}

// ---- Single-board files (for sharing a lesson setup) ----
// `cleaners` maps widget type -> function(state) returning a copy without
// student names, so a shared board never carries a class list.
// Pictures in the Images tool go with the board; uploaded backgrounds and music files don't.
export async function exportBoard(id, cleaners = {}) {
  flush();
  const src = copyOf(id);
  if (!src) return;
  const widgets = copyWidgets(src.widgets).map((w) => {
    const clean = cleaners[w.type];
    const st = clean ? clean({ ...w.state }) : { ...w.state };
    delete st.classId;
    return { ...w, state: st };
  });
  const file = {
    kind: BOARD_FILE_KIND, version: 2, exportedAt: new Date().toISOString(),
    board: { name: src.name, ...shareableBg(src), viewport: src.viewport, widgets, toolData: shareableToolData(src.toolData), ...(src.dockHidden ? { dockHidden: true } : {}) },
  };
  const picIds = toolImageIds(src);
  if (picIds.length) {
    try { file.images = await images.exportFor(picIds); } catch (err) { console.warn('Pictures left out of shared board', err); }
  }
  download(file, `xingtan-board-${slug(src.name)}.json`);
}

export async function importBoardFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (err) { throw new Error(t('This file could not be read.')); }
  if (data?.kind === BACKUP_FILE_KIND || (Array.isArray(data?.classes) && !data?.board)) {
    throw new Error(t('That is a full backup. Use Settings → Restore from backup instead.'));
  }
  if (data?.kind !== BOARD_FILE_KIND || !data.board) throw new Error(t('This file is not a 杏坛 board.'));
  const b = data.board;
  if (Array.isArray(data.images) && data.images.length) {
    try { await images.importItems(data.images.map((it) => ({ ...it, use: 'tool' }))); } catch (err) { console.warn('Pictures not imported', err); }
  }
  return createBoard(b.name || t('Imported board'), {
    ...shareableBg({ background: typeof b.background === 'string' ? b.background : 'navy', bgDim: b.bgDim, bgLum: b.bgLum }),
    viewport: b.viewport, widgets: copyWidgets(b.widgets), toolData: shareableToolData(b.toolData),
    ...(b.dockHidden === true ? { dockHidden: true } : {}),
  });
}

// ---- Full backup: class lists + every board + uploaded pictures and music files in use ----
export async function exportData() {
  update((m) => { m.lastBackup = new Date().toISOString(); m.backupSnoozeUntil = null; }, { notify: false });
  flush();
  let imgs = [];
  try { imgs = await images.exportFor([...uploadsInUse()]); } catch (err) { console.warn('Images left out of backup', err); }
  let songs = [];
  try { songs = await audio.exportFor([...audioInUse()]); } catch (err) { console.warn('Music files left out of backup', err); }
  const file = {
    kind: BACKUP_FILE_KIND,
    version: 2,
    exportedAt: new Date().toISOString(),
    classes: meta.classes,
    activeClassId: meta.activeClassId,
    lastBackup: meta.lastBackup,
    dock: meta.dock || null,
    points: meta.points || {},
    routines: meta.routines || [],
    polls: meta.polls || {},
    wordLists: meta.wordLists || [],
    quoteLists: meta.quoteLists || [],
    dictation: meta.dictation || {},
    // How the boards screen looks: pinned boards, sort order, cards or list.
    pinnedBoards: Array.isArray(meta.pinnedBoards) ? meta.pinnedBoards : [],
    boardSort: meta.boardSort || null,
    boardView: meta.boardView || null,
    textPosts: meta.textPosts || [],
    textPostsDeleted: meta.textPostsDeleted || [],
    google: meta.google || {},
    boards: listBoards(),
    images: imgs,
    audio: songs,
  };
  download(file, `xingtan-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

// Replaces every board and all class lists, here and in other windows.
async function replaceEverything(newMeta, boards) {
  clearTimeout(saveTimer);
  dirtyBoards.clear(); deletedBoards.clear(); metaDirty = false;
  newMeta.savedAt = new Date().toISOString();
  meta = newMeta;
  cache.clear();
  boards.forEach((b) => cache.set(b.id, b));
  board = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
  setStatus('saving');
  try {
    await backend.replaceAll(meta, boards);
    setStatus('saved');
  } catch (err) {
    console.warn('Could not save', err);
    boards.forEach((b) => dirtyBoards.add(b.id)); metaDirty = true;
    setStatus('error');
  }
  // The old localStorage copy is out of date now; drop it so it can't come back.
  if (backend.kind === 'indexeddb') {
    removeLegacy();
    migration = null;
    backend.writeKv('migration', null).catch(() => {});
  }
  channel?.postMessage({ from: windowId, type: 'replaced' });
}

// Reads and checks a backup file without changing anything, so the teacher
// can see what it holds before it replaces what is in this browser.
export async function readBackupFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (err) { throw new Error(t('This file could not be read.')); }
  if (data?.kind === BOARD_FILE_KIND) throw new Error(t('That is a single board. Use “Import board” on the boards screen.'));
  if (!data || typeof data !== 'object' || !Array.isArray(data.classes)) {
    throw new Error(t('This file is not a 杏坛 · ClassroomBoard backup.'));
  }
  let boards;
  if (Array.isArray(data.boards)) boards = data.boards.map(normaliseBoard);
  else if (Array.isArray(data.widgets)) { const b = boardFromV1(data); boards = b ? [b] : []; }
  else throw new Error(t('This file is not a 杏坛 · ClassroomBoard backup.'));
  return { data, boards, classes: data.classes.length, madeAt: data.exportedAt || data.lastBackup || null };
}

// What is in this browser now, for the restore check.
export function localSummary() {
  flush();
  const boards = listBoards();
  const times = [...boards.map((b) => b.updatedAt), meta.changedAt].filter(Boolean).sort();
  return { boards: boards.length, classes: meta.classes.length, lastChange: times[times.length - 1] || null };
}

// Replaces everything in this browser. Accepts v2 backups and older v1 backups,
// as a File or as the result of readBackupFile().
export async function importData(fileOrBackup) {
  const { data, boards } = fileOrBackup instanceof Blob ? await readBackupFile(fileOrBackup) : fileOrBackup;
  const newMeta = { ...metaDefaults(), classes: data.classes, activeClassId: data.activeClassId || null,
    lastBackup: data.lastBackup || null, ...(data.dock ? { dock: data.dock } : {}), lastBoardId: boards[0]?.id || null,
    points: data.points && typeof data.points === 'object' ? data.points : {},
    routines: Array.isArray(data.routines) ? data.routines : [],
    polls: data.polls && typeof data.polls === 'object' ? data.polls : {},
    wordLists: Array.isArray(data.wordLists) ? data.wordLists : [],
    quoteLists: Array.isArray(data.quoteLists) ? data.quoteLists : [],
    // Voices missing on this computer fall back to the first one for the language.
    dictation: data.dictation && typeof data.dictation === 'object' ? data.dictation : {},
    ...(Array.isArray(data.pinnedBoards) ? { pinnedBoards: data.pinnedBoards.filter((id) => boards.some((b) => b.id === id)) } : {}),
    ...(typeof data.boardSort === 'string' ? { boardSort: data.boardSort } : {}),
    ...(typeof data.boardView === 'string' ? { boardView: data.boardView } : {}),
    // Backups from before saved posts: their Text tools are added to the list when it is first read.
    textPosts: Array.isArray(data.textPosts) ? data.textPosts : [],
    textPostsDeleted: Array.isArray(data.textPostsDeleted) ? data.textPostsDeleted : [],
    textPostsMigrated: Array.isArray(data.textPosts),
    google: data.google && typeof data.google === 'object' ? data.google : {} };
  await replaceEverything(newMeta, boards);
  try { await images.restore(Array.isArray(data.images) ? data.images : []); } catch (err) { console.warn('Images not restored', err); }
  try { await audio.restore(Array.isArray(data.audio) ? data.audio : []); } catch (err) { console.warn('Music files not restored', err); }
  listeners.forEach((fn) => fn(meta));
}

export function resetAll() {
  images.clearAll().catch(() => {});
  audio.clearAll().catch(() => {});
  const done = replaceEverything(metaDefaults(), []);
  listeners.forEach((fn) => fn(meta));
  return done;
}

// ---- Changes made in another window of the app ----
// `handlers.board(newBoardOrNull)` fires when the board open here was changed
// or deleted elsewhere; `handlers.list()` fires when any board changed.
export function watchOtherWindows(handlers) {
  const openChanged = (b) => {
    board = b;
    if (b) dirtyBoards.delete(b.id);
    handlers.board?.(b);
  };

  channel?.addEventListener('message', async (e) => {
    const msg = e.data || {};
    if (msg.from === windowId) return;
    try {
      if (msg.type === 'replaced') {
        const all = await backend.loadAll();
        meta = normaliseMeta(all.meta);
        cache.clear();
        all.boards.forEach((b) => cache.set(b.id, normaliseBoard(b)));
        dirtyBoards.clear(); deletedBoards.clear(); metaDirty = false;
        listeners.forEach((fn) => fn(meta));
        handlers.list?.();
        if (board) openChanged(cache.get(board.id) || null);
        return;
      }
      if (msg.type !== 'saved') return;
      if (msg.meta) {
        const incoming = await backend.readMeta();
        if (incoming) {
          meta = { ...normaliseMeta(incoming), ...(metaDirty ? { lastBoardId: meta.lastBoardId } : {}) };
          listeners.forEach((fn) => fn(meta));
        }
      }
      const ids = msg.boards || [];
      const fresh = await Promise.all(ids.map((id) => backend.readBoard(id)));
      ids.forEach((id, i) => { if (fresh[i]) cache.set(id, normaliseBoard(fresh[i])); });
      (msg.deleted || []).forEach((id) => cache.delete(id));
      if (ids.length || (msg.deleted || []).length) handlers.list?.();
      if (board && (ids.includes(board.id) || (msg.deleted || []).includes(board.id))) openChanged(cache.get(board.id) || null);
    } catch (err) { console.warn('Could not read changes from another window', err); }
  });

  // Older copies of the app (in tabs opened before an update) still save to localStorage.
  window.addEventListener('storage', (e) => {
    if (e.storageArea !== localStorage || !e.key) return;
    if (e.key !== META_KEY && !e.key.startsWith(BOARD_PREFIX)) return;
    if (backend.kind === 'localstorage') {
      // This window also uses localStorage: reload that record.
      if (e.key === META_KEY && e.newValue) {
        try { meta = { ...normaliseMeta(JSON.parse(e.newValue)), ...(metaDirty ? { lastBoardId: meta.lastBoardId } : {}) }; listeners.forEach((fn) => fn(meta)); } catch (err) { /* ignore */ }
        return;
      }
      const id = e.key.slice(BOARD_PREFIX.length);
      if (e.newValue) { try { cache.set(id, normaliseBoard(JSON.parse(e.newValue))); } catch (err) { return; } } else cache.delete(id);
      handlers.list?.();
      if (board && board.id === id) openChanged(cache.get(id) || null);
      return;
    }
    const openId = board?.id;
    if (adoptLegacyChanges(e.key)) {
      if (e.key === META_KEY) listeners.forEach((fn) => fn(meta));
      handlers.list?.();
      if (openId && e.key === boardKey(openId)) handlers.board?.(board);
    }
  });
}

// ---- Classes ----
export function getClasses() { return meta.classes; }

export function getClass(id) {
  return meta.classes.find((c) => c.id === id) || null;
}

export function getActiveClass() {
  return getClass(meta.activeClassId) || meta.classes[0] || null;
}

// ---- Helpers ----
// File names stay plain ASCII: some browsers drop a download name with other characters.
function slug(name) {
  const ascii = (name || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return ascii || new Date().toISOString().slice(0, 10);
}

// ---- Backup reminder ----
export const BACKUP_EVERY_DAYS = 7;

// Returns null when no reminder is needed, or { never, days } where `days`
// is how long ago the last backup was (or how long the app has been in use).
export function backupReminder(now = Date.now()) {
  const boards = listBoards();
  if (!boards.length && !meta.classes.length) return null; // nothing to lose yet
  if (meta.backupSnoozeUntil && Date.parse(meta.backupSnoozeUntil) > now) return null;
  const last = meta.lastBackup ? Date.parse(meta.lastBackup) : null;
  const firstUse = Math.min(...boards.map((b) => Date.parse(b.createdAt) || now), meta.changedAt ? Date.parse(meta.changedAt) : now);
  const since = last ?? firstUse;
  if (now - since < BACKUP_EVERY_DAYS * DAY) return null;
  if (last) {
    // Nothing has changed since the last backup, so there is nothing new to save.
    const changed = boards.some((b) => Date.parse(b.updatedAt) > last) || (meta.changedAt && Date.parse(meta.changedAt) > last);
    if (!changed) return null;
  }
  return { never: !last, days: Math.floor((now - since) / DAY) };
}

export function snoozeBackupReminder(days = 3) {
  update((m) => { m.backupSnoozeUntil = new Date(Date.now() + days * DAY).toISOString(); }, { notify: false });
  flush();
}

// ---- Keeping the data ----
// Browsers treat site data as "best effort": under disk pressure they may clear it
// without asking. Asking for persistent storage stops that where the browser agrees.
// Chrome and Edge decide silently (installed apps and bookmarked sites usually qualify);
// Firefox asks the teacher once.
export async function storageProtection() {
  if (!navigator.storage?.persisted) return 'unsupported';
  try { return (await navigator.storage.persisted()) ? 'kept' : 'best-effort'; } catch (err) { return 'unsupported'; }
}

export async function protectStorage() {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'kept';
    return (await navigator.storage.persist()) ? 'kept' : 'best-effort';
  } catch (err) {
    return 'unsupported';
  }
}

// Only ask once there is something worth keeping.
export function hasData() {
  return meta.classes.length > 0 || listBoards().length > 0;
}

// ---- Space used, for the storage meter in Settings ----
const bytes = (v) => new Blob([JSON.stringify(v ?? null)]).size;

export async function storageUsage() {
  flush();
  const boardsBytes = listBoards().reduce((sum, b) => sum + bytes(b), 0);
  const metaBytes = bytes(meta);
  let pictureBytes = 0;
  try { pictureBytes = await images.usage(); } catch (err) { /* no pictures store */ }
  let musicBytes = 0;
  try { musicBytes = await audio.usage(); } catch (err) { /* no music store */ }
  let usage = null; let quota = null;
  try { const est = await navigator.storage?.estimate?.(); usage = est?.usage ?? null; quota = est?.quota ?? null; } catch (err) { /* ignore */ }
  if (backend.kind === 'localstorage') {
    // localStorage has its own limit of about 5 million characters, whatever the disk has free.
    let chars = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); chars += k.length + (localStorage.getItem(k) || '').length; } } catch (err) { /* ignore */ }
    return { kind: 'localstorage', boards: boardsBytes, meta: metaBytes, pictures: pictureBytes, music: musicBytes, used: chars * 2, quota: 10 * 1024 * 1024 };
  }
  return { kind: 'indexeddb', boards: boardsBytes, meta: metaBytes, pictures: pictureBytes, music: musicBytes, used: usage, quota };
}

function download(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
