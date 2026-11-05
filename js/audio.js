// Music files the teacher adds to the Music tool. Like pictures, they are kept
// in this browser's IndexedDB (database "xingtan", store "audio") and never
// leave this computer, except inside a full backup the teacher downloads.
// Shared board files leave them out.
//
// Record: { id, blob, name, type, size, duration, createdAt }
//   duration  seconds, read when the file was added (null if the browser couldn't tell)

import { openDB, reqP } from './db.js';
import { t } from './i18n.js';

const STORE = 'audio';
export const MAX_BYTES = 40 * 1024 * 1024; // a long piece at a high bitrate; keeps backups manageable

const urls = new Map(); // id -> object URL

function tx(mode, fn) {
  return openDB().then((d) => new Promise((resolve, reject) => {
    if (!d.objectStoreNames.contains(STORE)) { reject(new Error('No audio store')); return; }
    const tr = d.transaction(STORE, mode);
    const store = tr.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    tr.oncomplete = () => resolve(result);
    tr.onerror = () => reject(tr.error);
    tr.onabort = () => reject(tr.error || new Error('Storage refused'));
  }));
}

function forget(id) {
  if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
  urls.delete(id);
}

// Object URL for playing a stored file, or null if it isn't on this computer.
export async function url(id) {
  if (urls.has(id)) return urls.get(id);
  const rec = await tx('readonly', (s) => reqP(s.get(id)));
  if (!rec) return null;
  const u = URL.createObjectURL(rec.blob);
  urls.set(id, u);
  return u;
}

// Every stored music file, newest first (without the audio itself).
export async function list() {
  const all = await tx('readonly', (s) => reqP(s.getAll()));
  return all.map(({ id, name, size, duration, createdAt }) => ({ id, name, size, duration, createdAt }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function has(id) {
  try { return !!(await tx('readonly', (s) => reqP(s.getKey(id)))); } catch (err) { return false; }
}

// Reads how long a file plays for; rejects if this browser can't play it.
function probe(blob) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('audio');
    const u = URL.createObjectURL(blob);
    const finish = (fn) => { clearTimeout(timer); el.removeAttribute('src'); el.load(); URL.revokeObjectURL(u); fn(); };
    const timer = setTimeout(() => finish(() => resolve(null)), 8000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => { const d = el.duration; finish(() => resolve(Number.isFinite(d) ? d : null)); };
    el.onerror = () => finish(() => reject(new Error('unplayable')));
    el.src = u;
  });
}

const looksLikeAudio = (file) => /^audio\//.test(file.type || '') || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|webm)$/i.test(file.name || '');

// Stores a music file. Returns { id, name, duration, size }.
export async function add(file) {
  if (!file || !looksLikeAudio(file)) throw new Error(t('“{name}” isn’t a music file. Choose MP3, M4A, WAV or OGG files.', { name: file?.name || '' }));
  if (file.size > MAX_BYTES) throw new Error(t('“{name}” is too big ({size} MB). Files up to {max} MB can be added.', { name: file.name, size: Math.round(file.size / 1048576), max: MAX_BYTES / 1048576 }));
  let duration;
  try { duration = await probe(file); } catch (err) {
    throw new Error(t('This browser can’t play “{name}”. MP3 and M4A files work everywhere.', { name: file.name }));
  }
  const rec = {
    id: 'a' + Math.random().toString(36).slice(2, 10),
    blob: file, name: (file.name || 'Music').replace(/\.[^.]+$/, '').slice(0, 80),
    type: file.type || '', size: file.size, duration, createdAt: new Date().toISOString(),
  };
  try {
    await tx('readwrite', (s) => reqP(s.put(rec)));
  } catch (err) {
    throw new Error(t('The music file could not be saved. This browser’s storage may be full.'));
  }
  return { id: rec.id, name: rec.name, duration, size: rec.size };
}

export async function remove(id) {
  await tx('readwrite', (s) => reqP(s.delete(id)));
  forget(id);
}

export async function clearAll() {
  await tx('readwrite', (s) => reqP(s.clear()));
  [...urls.keys()].forEach(forget);
}

// ---- Space used, for the storage meter in Settings ----
export async function usage() {
  const all = await tx('readonly', (s) => reqP(s.getAll()));
  return all.reduce((sum, r) => sum + (r.blob?.size || 0), 0);
}

// ---- Backups ----
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export async function exportFor(ids) {
  const want = new Set(ids);
  if (!want.size) return [];
  const all = await tx('readonly', (s) => reqP(s.getAll()));
  return Promise.all(all.filter((r) => want.has(r.id)).map(async (r) => ({
    id: r.id, name: r.name, type: r.type, size: r.size, duration: r.duration, createdAt: r.createdAt,
    audio: await blobToDataUrl(r.blob),
  })));
}

const validExport = (it) => it && it.id && typeof it.audio === 'string' && it.audio.startsWith('data:');

// Replaces every stored music file with the ones from a backup.
export async function restore(items) {
  const recs = await Promise.all((items || []).filter(validExport).map(async (it) => {
    const blob = await (await fetch(it.audio)).blob();
    return { id: it.id, blob, name: it.name || 'Music', type: it.type || blob.type, size: blob.size, duration: it.duration ?? null, createdAt: it.createdAt || new Date().toISOString() };
  }));
  await clearAll();
  if (recs.length) await tx('readwrite', (s) => Promise.all(recs.map((r) => reqP(s.put(r)))));
}
