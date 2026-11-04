// YouTube helpers for the YouTube tool: reading links, video titles,
// keyword search (with the teacher's own key) and loading the player.
//
// Pasting a link needs no key. Keyword search uses the YouTube Data API,
// which needs a key; each teacher adds their own in this browser.
// The key is kept in its own localStorage entry, so it is never part of a
// backup or a shared board file.

import { locale } from './i18n.js';

const KEY_STORE = 'xingtan:youtube'; // { apiKey, day, searches }
const API = 'https://www.googleapis.com/youtube/v3/';
export const UNTITLED = 'YouTube video';

// ---------- Links ----------
const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

// Returns { videoId, start } for a YouTube link, or null if it isn't one.
export function parseVideo(text) {
  let s = (text || '').trim();
  if (!s || /\s/.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) {
    if (!/^(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(s)) return null;
    s = 'https://' + s;
  }
  let url;
  try { url = new URL(s); } catch (err) { return null; }
  if (!HOSTS.test(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let id = null;
  if (/youtu\.be$/i.test(url.hostname)) id = parts[0];
  else if (url.searchParams.get('v')) id = url.searchParams.get('v');
  else if (['shorts', 'embed', 'live', 'v', 'e'].includes(parts[0])) id = parts[1];
  if (!id || !ID_RE.test(id)) return null;
  const t = url.searchParams.get('t') || url.searchParams.get('start') || (url.hash.match(/t=([^&]+)/) || [])[1];
  const start = t ? parseTime(t) : null;
  return { videoId: id, start: Number.isFinite(start) && start > 0 ? start : null };
}

export const watchUrl = (id, start) => `https://www.youtube.com/watch?v=${id}${start ? `&t=${Math.floor(start)}s` : ''}`;
export const thumb = (id, size = 'mqdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

// ---------- Times ----------
// Reads "1:30", "1:02:03", "90", "90s", "1m30s" or "1h2m3s" as seconds.
export function parseTime(text) {
  const s = String(text ?? '').trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(\.\d+)?s?$/.test(s)) return Math.floor(parseFloat(s));
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) return s.split(':').map(Number).reduce((a, n) => a * 60 + n, 0);
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return NaN; // not a time
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const hrs = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return hrs ? `${hrs}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// "PT1H2M3S" (as the API gives durations) -> seconds
function isoDuration(d) {
  const m = (d || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

// The API returns titles with HTML entities (&#39; &amp;).
function decode(text) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${text || ''}`, 'text/html');
  return doc.body.textContent || '';
}

// ---------- Title from a link (no key needed) ----------
// Returns { title, channel }, { problem: 'private' | 'missing' }, or null if YouTube can't be reached.
export async function lookup(videoId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(videoId))}`, { signal: ctrl.signal });
    if (res.status === 401 || res.status === 403) return { problem: 'private' };
    if (res.status === 400 || res.status === 404) return { problem: 'missing' };
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title || UNTITLED, channel: data.author_name || '' };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Search key (this browser only) ----------
function readStore() {
  try { return JSON.parse(localStorage.getItem(KEY_STORE)) || {}; } catch (err) { return {}; }
}
function writeStore(patch) {
  try { localStorage.setItem(KEY_STORE, JSON.stringify({ ...readStore(), ...patch })); } catch (err) { /* ignore */ }
}

export const getKey = () => readStore().apiKey || '';
export function setKey(key) { writeStore({ apiKey: (key || '').trim() }); }
export function clearKey() { writeStore({ apiKey: '' }); }

// Google counts the daily allowance by the day in California.
const quotaDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

export function searchesToday() {
  const s = readStore();
  return s.day === quotaDay() ? s.searches || 0 : 0;
}
function countSearch() { writeStore({ day: quotaDay(), searches: searchesToday() + 1 }); }

// When the allowance comes back, in the teacher's own time (midnight in California).
export function quotaResetTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, +p.value]));
  const left = 86400 - (parts.hour * 3600 + parts.minute * 60 + parts.second);
  return new Date(Date.now() + left * 1000).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}

// ---------- YouTube Data API ----------
export class YtError extends Error {
  constructor(kind, message) { super(message || kind); this.kind = kind; }
}

function errorKind(status, body) {
  const e = body?.error || {};
  const reasons = [
    ...(e.errors || []).map((x) => x.reason),
    ...(e.details || []).map((x) => x.reason),
    e.status, e.message,
  ].filter(Boolean).join(' ');
  if (/quotaExceeded|dailyLimitExceeded|RATE_LIMIT|rateLimitExceeded/i.test(reasons)) return 'quota';
  if (/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(reasons)) return 'notEnabled';
  if (/Referer|REFERRER|ipRefererBlocked|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_SERVICE_BLOCKED|blocked/i.test(reasons)) return 'blocked';
  if (/keyInvalid|API_KEY_INVALID|API key not valid|keyExpired/i.test(reasons) || status === 400) return 'badKey';
  return 'other';
}

async function apiGet(path, params, key = getKey()) {
  if (!key) throw new YtError('noKey');
  const qs = new URLSearchParams({ ...params, key });
  let res;
  try {
    res = await fetch(API + path + '?' + qs);
  } catch (err) {
    throw new YtError('network');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new YtError(errorKind(res.status, body), body?.error?.message);
  return body;
}

// Checks a key with a 1-unit request, so testing doesn't use up searches.
export async function testKey(key) {
  await apiGet('videos', { part: 'id', id: 'jNQXAC9IVRw' }, key);
}

const cache = new Map(); // query -> results, for this visit

// Returns up to 12 videos that are allowed to play on other sites,
// filtered by YouTube's SafeSearch (strict).
export async function search(query) {
  const q = query.trim();
  if (cache.has(q.toLowerCase())) return cache.get(q.toLowerCase());
  const found = await apiGet('search', {
    part: 'snippet', type: 'video', q, maxResults: '12',
    safeSearch: 'strict', videoEmbeddable: 'true',
  });
  countSearch();
  const items = (found.items || []).filter((it) => it.id?.videoId).map((it) => ({
    videoId: it.id.videoId,
    title: decode(it.snippet?.title) || UNTITLED,
    channel: decode(it.snippet?.channelTitle),
    duration: null,
  }));
  // Durations cost 1 unit for all 12, so they're worth having.
  if (items.length) {
    try {
      const details = await apiGet('videos', { part: 'contentDetails', id: items.map((i) => i.videoId).join(',') });
      const byId = new Map((details.items || []).map((d) => [d.id, isoDuration(d.contentDetails?.duration)]));
      items.forEach((i) => { i.duration = byId.get(i.videoId) ?? null; });
    } catch (err) { /* durations are optional */ }
  }
  cache.set(q.toLowerCase(), items);
  return items;
}

// ---------- Player ----------
let apiPromise = null;

// Loads YouTube's IFrame Player API once. Rejects if YouTube can't be reached.
export function loadPlayerApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { try { prev?.(); } catch (err) { /* ignore */ } resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    const fail = () => { apiPromise = null; s.remove(); reject(new Error('YouTube could not be reached')); };
    s.onerror = fail;
    setTimeout(() => { if (!window.YT?.Player) fail(); }, 15000);
    document.head.append(s);
  });
  return apiPromise;
}
