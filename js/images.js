// Background images the teacher uploads. Photos are too big for localStorage,
// so they live in this browser's IndexedDB (database "xingtan", store "images").
// Like everything else in the app, they never leave this computer, except
// inside a full backup the teacher downloads.
//
// Record: { id, blob, thumb, lum, name, createdAt, use, w, h }
//   blob   JPEG (or PNG for screenshots and diagrams in the Images tool), at most 1920 px on the long side
//   use    'tool' for pictures in the Images tool; missing for backgrounds
//   w, h   size of blob in pixels
//   thumb  small JPEG for the pickers and the boards screen
//   lum    average brightness 0–255, to pick light or dark corner controls

import { openDB, reqP } from './db.js';

const STORE = 'images';
const MAX_SIDE = 1920;
const THUMB_W = 384;

const urls = new Map();      // id -> object URL of the full image
const thumbUrls = new Map(); // id -> object URL of the thumbnail
const meta = new Map();      // id -> { lum, name, createdAt }

const db = openDB; // shared with store.js, see db.js

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage refused'));
  }));
}


function remember(rec) {
  if (!rec) return;
  meta.set(rec.id, { lum: rec.lum, name: rec.name, createdAt: rec.createdAt });
  if (!thumbUrls.has(rec.id) && rec.thumb) thumbUrls.set(rec.id, URL.createObjectURL(rec.thumb));
}

function forget(id) {
  if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
  if (thumbUrls.has(id)) URL.revokeObjectURL(thumbUrls.get(id));
  urls.delete(id); thumbUrls.delete(id); meta.delete(id);
}

// ---- Reading ----
// Uploaded backgrounds (pictures in the Images tool are kept apart).
export async function list() {
  const all = (await tx('readonly', (s) => reqP(s.getAll()))).filter((r) => r.use !== 'tool');
  all.forEach(remember);
  return all.map(({ id, lum, name, createdAt }) => ({ id, lum, name, createdAt }))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function fullUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const rec = await tx('readonly', (s) => reqP(s.get(id)));
  if (!rec) return null;
  remember(rec);
  const u = URL.createObjectURL(rec.blob);
  urls.set(id, u);
  return u;
}

// Synchronous lookups for rendering; null until loaded.
export const cachedFullUrl = (id) => urls.get(id) || null;
export const cachedThumbUrl = (id) => thumbUrls.get(id) || null;
export const cachedLum = (id) => meta.get(id)?.lum ?? null;

// Loads thumbnails for these ids. Resolves true if anything new was loaded.
export async function preloadThumbs(ids) {
  const missing = [...new Set(ids)].filter((id) => !thumbUrls.has(id));
  if (!missing.length) return false;
  try {
    const recs = await tx('readonly', (s) => Promise.all(missing.map((id) => reqP(s.get(id)))));
    recs.forEach(remember);
    return recs.some(Boolean);
  } catch (err) { return false; }
}

// ---- Adding ----
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(u); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('unreadable')); };
    img.src = u;
  });
}

function draw(img, w, h, fill = null) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  if (fill) { g.fillStyle = fill; g.fillRect(0, 0, w, h); } // JPEG has no transparency
  g.drawImage(img, 0, 0, w, h);
  return c;
}

const toBlob = (canvas, q, type = 'image/jpeg') => new Promise((resolve, reject) =>
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, q));

const PNG_LIMIT = 1.5 * 1024 * 1024; // larger PNGs are stored as JPEG

export function averageLum(img) {
  const c = draw(img, 24, 24);
  const d = c.getContext('2d').getImageData(0, 0, 24, 24).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return Math.round(sum / (d.length / 4));
}

// Resizes and stores an image file (or Blob). Returns { id, lum, w, h, name }.
// With use: 'tool', PNG, GIF and WebP pictures (screenshots, diagrams) stay
// sharp as PNG unless they are very large.
export async function add(file, { use = null, maxSide = MAX_SIDE } = {}) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('Choose an image file (JPG, PNG or WebP).');
  let img;
  try { img = await loadImage(file); } catch (err) {
    throw new Error('This browser can’t open that image. Try a JPG or PNG (iPhone HEIC photos need converting first).');
  }
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
  let blob = null;
  if (use === 'tool' && /png|gif|webp/i.test(file.type || '')) {
    blob = await toBlob(draw(img, w, hgt), undefined, 'image/png').catch(() => null);
    if (blob && blob.size > PNG_LIMIT) blob = null;
  }
  if (!blob) blob = await toBlob(draw(img, w, hgt, '#ffffff'), use === 'tool' ? 0.9 : 0.85);
  const tw = Math.min(THUMB_W, w);
  const thumb = await toBlob(draw(img, tw, Math.max(1, Math.round(hgt * tw / w)), '#ffffff'), 0.8);
  const rec = {
    id: 'u' + Math.random().toString(36).slice(2, 10),
    blob, thumb, lum: averageLum(img),
    name: (file.name || 'Image').replace(/\.[^.]+$/, '').slice(0, 60),
    createdAt: new Date().toISOString(),
    ...(use ? { use } : {}), w, h: hgt,
  };
  try {
    await tx('readwrite', (s) => reqP(s.put(rec)));
  } catch (err) {
    throw new Error('The image could not be saved. This browser’s storage may be full.');
  }
  remember(rec);
  return { id: rec.id, lum: rec.lum, w, h: hgt, name: rec.name };
}

export async function remove(id) {
  await tx('readwrite', (s) => reqP(s.delete(id)));
  forget(id);
}

export async function clearAll() {
  await tx('readwrite', (s) => reqP(s.clear()));
  [...meta.keys(), ...urls.keys(), ...thumbUrls.keys()].forEach(forget);
}

// ---- Space used, for the storage meter in Settings ----
export async function usage() {
  const all = await tx('readonly', (s) => reqP(s.getAll()));
  return all.reduce((sum, r) => sum + (r.blob?.size || 0) + (r.thumb?.size || 0), 0);
}

// ---- Backups ----
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

export async function exportFor(ids) {
  const want = new Set(ids);
  if (!want.size) return [];
  const all = await tx('readonly', (s) => reqP(s.getAll()));
  return Promise.all(all.filter((r) => want.has(r.id)).map(async (r) => ({
    id: r.id, lum: r.lum, name: r.name, createdAt: r.createdAt, ...(r.use ? { use: r.use, w: r.w, h: r.h } : {}),
    image: await blobToDataUrl(r.blob), thumb: await blobToDataUrl(r.thumb),
  })));
}

const fromExport = async (it) => ({
  id: it.id, lum: it.lum ?? 128, name: it.name || 'Image', createdAt: it.createdAt || new Date().toISOString(),
  ...(it.use ? { use: it.use, w: it.w, h: it.h } : {}),
  blob: await dataUrlToBlob(it.image),
  thumb: await dataUrlToBlob(typeof it.thumb === 'string' ? it.thumb : it.image),
});
const validExport = (it) => it && it.id && typeof it.image === 'string' && it.image.startsWith('data:image/');

// Adds images from a shared board file, keeping any already here.
export async function importItems(items) {
  const recs = await Promise.all((items || []).filter(validExport).map(fromExport));
  if (!recs.length) return;
  await tx('readwrite', (s) => Promise.all(recs.map((r) => reqP(s.put(r)))));
  recs.forEach(remember);
}

// Replaces every stored image with the ones from a backup.
export async function restore(items) {
  const recs = await Promise.all((items || []).filter(validExport).map(fromExport));
  await clearAll();
  await tx('readwrite', (s) => Promise.all(recs.map((r) => reqP(s.put(r)))));
  recs.forEach(remember);
}
