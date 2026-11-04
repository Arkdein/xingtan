// Local-only storage. Everything lives in this browser's localStorage.
// Nothing is sent anywhere.
//
// Layout (v2):
//   xingtan:v2:meta         { version, classes, activeClassId, lastBoardId, lastBackup, points }
//   xingtan:v2:board:<id>   { id, name, createdAt, updatedAt, background, viewport, widgets }
//
// Each board has its own key, so two windows showing different boards
// never overwrite each other. Class lists are shared by all boards.
// The old single-key v1 data ('xingtan:v1') is migrated once and left in
// place as a fallback.

const V1_KEY = 'xingtan:v1';
const META_KEY = 'xingtan:v2:meta';
const BOARD_PREFIX = 'xingtan:v2:board:';
const SESSION_KEY = 'xingtan:openBoard'; // sessionStorage: board open in this window

export const BOARD_FILE_KIND = 'xingtan-board';
export const BACKUP_FILE_KIND = 'xingtan-backup';

const listeners = new Set();       // class / meta changes
const statusListeners = new Set(); // save status: 'saved' | 'saving' | 'error'

const metaDefaults = () => ({
  version: 2,
  classes: [],          // [{ id, name, students: [string] }]
  activeClassId: null,
  lastBoardId: null,
  lastBackup: null,
  points: {},           // { [classId]: behaviour points, see points.js }
});

const boardDefaults = () => ({
  id: uid(),
  name: 'Untitled board',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  background: 'navy',
  viewport: null,       // { w, h } of the stage when last saved, for thumbnails
  widgets: [],          // [{ id, type, x, y, w, h, z, state }]
});

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const boardKey = (id) => BOARD_PREFIX + id;

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

function normaliseBoard(b) {
  const board = { ...boardDefaults(), ...b };
  if (!Array.isArray(board.widgets)) board.widgets = [];
  board.widgets = board.widgets.filter((w) => w && typeof w === 'object' && w.type);
  board.widgets.forEach((w) => { if (!w.state || typeof w.state !== 'object') w.state = {}; if (!w.id) w.id = uid(); });
  if (!board.name || typeof board.name !== 'string') board.name = 'Untitled board';
  return board;
}

// v1 had one layout. It becomes the first board.
function boardFromV1(v1) {
  const hasLayout = (Array.isArray(v1.widgets) && v1.widgets.length > 0) || (v1.background && v1.background !== 'navy');
  if (!hasLayout) return null;
  return normaliseBoard({ name: 'My board', background: v1.background || 'navy', widgets: v1.widgets || [] });
}

function load() {
  const existing = readJSON(META_KEY);
  if (existing) return { ...metaDefaults(), ...existing, version: 2 };

  // First run of v2: migrate v1 data if there is any.
  const meta = metaDefaults();
  const v1 = readJSON(V1_KEY);
  if (v1 && typeof v1 === 'object') {
    meta.classes = Array.isArray(v1.classes) ? v1.classes : [];
    meta.activeClassId = v1.activeClassId || null;
    meta.lastBackup = v1.lastBackup || null;
    const board = boardFromV1(v1);
    if (board) {
      try { writeJSON(boardKey(board.id), board); meta.lastBoardId = board.id; } catch (err) { console.warn(err); }
    }
  }
  try { writeJSON(META_KEY, meta); } catch (err) { console.warn(err); }
  return meta;
}

let meta = load();
let board = null;          // the board open in this window
let metaDirty = false;
let boardDirty = false;
let saveTimer = null;
let status = 'saved';

function setStatus(s) {
  if (s === status) return;
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getStatus() { return status; }
export function onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }

// Writes anything pending right now. Returns false if the browser refused
// (for example, storage is full).
export function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    if (metaDirty) { writeJSON(META_KEY, meta); metaDirty = false; }
    if (boardDirty && board) { writeJSON(boardKey(board.id), board); boardDirty = false; }
    setStatus('saved');
    return true;
  } catch (err) {
    console.warn('Could not save', err);
    setStatus('error');
    return false;
  }
}

function schedule() {
  setStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

export function hasUnsaved() { return metaDirty || boardDirty || status === 'error'; }

// ---- Meta (class lists, shared settings) ----
export function get() { return meta; }

export function update(mutator, { notify = true } = {}) {
  mutator(meta);
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
  boardDirty = true;
  schedule();
}

export function openBoard(id) {
  flush();
  const b = readJSON(boardKey(id));
  if (!b) return null;
  board = normaliseBoard(b);
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
  return id && localStorage.getItem(boardKey(id)) ? id : null;
}

// ---- All boards ----
export function listBoards() {
  const boards = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BOARD_PREFIX)) continue;
    if (board && key === boardKey(board.id)) continue;
    const b = readJSON(key);
    if (b) boards.push(normaliseBoard(b));
  }
  if (board) boards.push(board);
  return boards.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function createBoard(name, fields = {}) {
  const b = normaliseBoard({ ...fields, id: uid(), name: (name || '').trim() || 'Untitled board',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  writeJSON(boardKey(b.id), b);
  return b;
}

export function renameBoard(id, name) {
  name = (name || '').trim();
  if (!name) return;
  if (board && board.id === id) { updateBoard((b) => { b.name = name; }); flush(); return; }
  const b = readJSON(boardKey(id));
  if (!b) return;
  b.name = name;
  b.updatedAt = new Date().toISOString();
  writeJSON(boardKey(id), b);
}

// Fresh copy: new ids, and running timers are stopped.
function copyWidgets(widgets) {
  return JSON.parse(JSON.stringify(widgets || [])).map((w) => {
    w.id = uid();
    if (w.type === 'timer' && w.state) {
      w.state.endAt = null;
      if (w.state.duration != null) w.state.remaining = w.state.duration;
    }
    return w;
  });
}

export function duplicateBoard(id) {
  if (board && board.id === id) flush();
  const src = readJSON(boardKey(id));
  if (!src) return null;
  return createBoard(`${src.name} (copy)`, {
    background: src.background, viewport: src.viewport, widgets: copyWidgets(src.widgets),
  });
}

export function deleteBoard(id) {
  localStorage.removeItem(boardKey(id));
  if (meta.lastBoardId === id) update((m) => { m.lastBoardId = null; }, { notify: false });
}

// ---- Single-board files (for sharing a lesson setup) ----
// `cleaners` maps widget type -> function(state) returning a copy without
// student names, so a shared board never carries a class list.
export function exportBoard(id, cleaners = {}) {
  if (board && board.id === id) flush();
  const src = readJSON(boardKey(id));
  if (!src) return;
  const widgets = copyWidgets(src.widgets).map((w) => {
    const clean = cleaners[w.type];
    const st = clean ? clean({ ...w.state }) : { ...w.state };
    delete st.classId;
    return { ...w, state: st };
  });
  const file = {
    kind: BOARD_FILE_KIND, version: 2, exportedAt: new Date().toISOString(),
    board: { name: src.name, background: src.background, viewport: src.viewport, widgets },
  };
  download(file, `xingtan-board-${slug(src.name)}.json`);
}

export async function importBoardFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (err) { throw new Error('This file could not be read.'); }
  if (data?.kind === BACKUP_FILE_KIND || (Array.isArray(data?.classes) && !data?.board)) {
    throw new Error('That is a full backup. Use ⚙️ Backup & settings → Restore instead.');
  }
  if (data?.kind !== BOARD_FILE_KIND || !data.board) throw new Error('This file is not a 杏坛 board.');
  const b = data.board;
  return createBoard(b.name || 'Imported board', {
    background: b.background, viewport: b.viewport, widgets: copyWidgets(b.widgets),
  });
}

// ---- Full backup: class lists + every board ----
export function exportData() {
  update((m) => { m.lastBackup = new Date().toISOString(); }, { notify: false });
  flush();
  const file = {
    kind: BACKUP_FILE_KIND,
    version: 2,
    exportedAt: new Date().toISOString(),
    classes: meta.classes,
    activeClassId: meta.activeClassId,
    lastBackup: meta.lastBackup,
    points: meta.points || {},
    boards: listBoards(),
  };
  download(file, `xingtan-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

function removeAllBoards() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BOARD_PREFIX)) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

// Replaces everything in this browser. Accepts v2 backups and older v1 backups.
export async function importData(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (err) { throw new Error('This file could not be read.'); }
  if (data?.kind === BOARD_FILE_KIND) throw new Error('That is a single board. Use “Import board” on the boards screen.');
  if (!data || typeof data !== 'object' || !Array.isArray(data.classes)) {
    throw new Error('This file is not a 杏坛 · ClassroomBoard backup.');
  }
  let boards;
  if (Array.isArray(data.boards)) boards = data.boards.map(normaliseBoard);
  else if (Array.isArray(data.widgets)) { const b = boardFromV1(data); boards = b ? [b] : []; }
  else throw new Error('This file is not a 杏坛 · ClassroomBoard backup.');

  clearTimeout(saveTimer);
  removeAllBoards();
  boards.forEach((b) => writeJSON(boardKey(b.id), b));
  meta = { ...metaDefaults(), classes: data.classes, activeClassId: data.activeClassId || null,
    lastBackup: data.lastBackup || null, lastBoardId: boards[0]?.id || null,
    points: data.points && typeof data.points === 'object' ? data.points : {} };
  board = null;
  metaDirty = true; boardDirty = false;
  flush();
  try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
  listeners.forEach((fn) => fn(meta));
}

export function resetAll() {
  clearTimeout(saveTimer);
  removeAllBoards();
  localStorage.removeItem(V1_KEY);
  meta = metaDefaults();
  board = null;
  metaDirty = true; boardDirty = false;
  flush();
  try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
  listeners.forEach((fn) => fn(meta));
}

// ---- Changes made in another window of the app ----
// `handlers.board(newBoardOrNull)` fires when the board open here was changed
// or deleted elsewhere; `handlers.list()` fires when any board changed.
export function watchOtherWindows(handlers) {
  window.addEventListener('storage', (e) => {
    if (e.storageArea !== localStorage) return;
    if (e.key === null) { handlers.list?.(); return; } // storage cleared
    if (e.key === META_KEY && e.newValue) {
      try {
        const incoming = JSON.parse(e.newValue);
        meta = { ...metaDefaults(), ...incoming, ...(metaDirty ? { lastBoardId: meta.lastBoardId } : {}) };
        listeners.forEach((fn) => fn(meta));
      } catch (err) { /* ignore */ }
      return;
    }
    if (!e.key.startsWith(BOARD_PREFIX)) return;
    handlers.list?.();
    if (board && e.key === boardKey(board.id)) {
      if (!e.newValue) { board = null; boardDirty = false; handlers.board?.(null); return; }
      try {
        board = normaliseBoard(JSON.parse(e.newValue));
        boardDirty = false;
        handlers.board?.(board);
      } catch (err) { /* ignore */ }
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
