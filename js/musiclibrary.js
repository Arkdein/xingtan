// Background music bundled with the app, for the Music tool. Files live in
// music/<id>.mp3. Every piece was composed for 杏坛 and is released under CC0;
// the instrument sounds come from the FluidR3_GM soundfont (CC BY 3.0).
// Credits are shown in the Music tool's library and listed in the README.
//
// Tracks are fetched whole (not streamed), so the offline copy of the app
// (sw.js) keeps each one from the first time it plays.

import { getLang } from './i18n.js';

export const SETS = [
  { id: 'calm', en: 'Calm', zh: '安静' },
  { id: 'focus', en: 'Focus', zh: '专注' },
  { id: 'festive', en: 'Festive', zh: '节庆' },
];

// { id, set, title, zh, duration (s), about }
export const TRACKS = [
  { id: 'calm-morning-garden', set: 'calm', title: 'Morning Garden', zh: '晨园', duration: 136, about: 'Soft piano' },
  { id: 'calm-bamboo-breeze', set: 'calm', title: 'Bamboo Breeze', zh: '竹风', duration: 142, about: 'Koto and flute over a warm pad' },
  { id: 'focus-soft-rain', set: 'focus', title: 'Soft Rain', zh: '细雨', duration: 138, about: 'Gentle rain' },
  { id: 'focus-quiet-study', set: 'focus', title: 'Quiet Study', zh: '静读', duration: 142, about: 'Celesta and piano over a soft pad' },
  { id: 'festive-spring-lanterns', set: 'festive', title: 'Spring Lanterns', zh: '春灯', duration: 127, about: 'Koto, flute and drums' },
  { id: 'festive-celebration', set: 'festive', title: 'Celebration', zh: '欢庆', duration: 127, about: 'Marimba, glockenspiel and strings' },
];

export const trackById = (id) => TRACKS.find((tr) => tr.id === id) || null;

// The track's name in the interface language.
export const trackTitle = (tr) => (getLang() === 'zh' ? tr.zh : tr.title);
export const setTitle = (s) => (getLang() === 'zh' ? s.zh : s.en);

export const trackFile = (id) => `music/${id}.mp3`;

const urls = new Map(); // id -> object URL

// Object URL for a bundled track. Rejects with err.offline = true when the
// track has never been played on this computer and there is no internet.
export async function trackUrl(id) {
  if (urls.has(id)) return urls.get(id);
  let res;
  try { res = await fetch(trackFile(id)); } catch (err) { const e = new Error('offline'); e.offline = true; throw e; }
  // Offline, the app's offline copy answers a file it doesn't have with the app's own page.
  const wrongType = /text\/html/i.test(res.headers.get('content-type') || '');
  if (!res.ok || wrongType) { const e = new Error(`HTTP ${res.status}`); e.offline = wrongType || res.status === 504 || res.status === 0; throw e; }
  const u = URL.createObjectURL(await res.blob());
  urls.set(id, u);
  return u;
}
