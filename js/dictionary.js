// Words for the Dictation tool: pinyin, dictionary look-ups and speech.
//
// - Pinyin comes from pinyin-pro (MIT, bundled in js/vendor/pinyin-pro), so it
//   works offline. It is loaded only when a Chinese word needs it.
// - English look-ups ask the Free Dictionary API (dictionaryapi.dev, from
//   Wiktionary, CC BY-SA). No key is needed.
// - Chinese look-ups ask 萌典 (moedict.tw), which serves Taiwan's Ministry of
//   Education 《重編國語辭典修訂本》 (CC BY-ND 3.0 TW). Its entries are in
//   traditional characters, so a simplified word is first converted with OpenCC
//   (opencc-js, MIT / Apache 2.0, bundled in js/vendor/opencc and loaded only
//   for this). The licence does not allow changing the text, so the entry is
//   shown as it is, in traditional characters, with its source.
// - Speech uses the voices built into the computer's browser (Web Speech API).
// Only the word itself is sent to the dictionary sites, and only when the teacher
// asks for a look-up.

export const LANGS = [
  ['zh', '中文'],
  ['en', 'English'],
  ['ms', 'Melayu'],
  ['ta', 'தமிழ்'],
];

export const SOURCES = {
  en: { name: 'Free Dictionary API', credit: 'Free Dictionary API (dictionaryapi.dev), from Wiktionary · CC BY-SA 3.0', url: 'https://dictionaryapi.dev/' },
  moedict: { name: '萌典', credit: '萌典 moedict.tw · 教育部《重編國語辭典修訂本》· CC BY-ND 3.0 TW', url: 'https://www.moedict.tw/' },
};

const HAN = /\p{Script=Han}/u;
const TAMIL = /\p{Script=Tamil}/u;
export const hasHan = (s) => HAN.test(s || '');

// The language a word is spoken in: Chinese and Tamil script are clear;
// other words take the list's language (English in a Chinese list).
export function langOf(word, listLang) {
  if (hasHan(word)) return 'zh';
  if (TAMIL.test(word || '')) return 'ta';
  return listLang === 'zh' || listLang === 'ta' ? 'en' : listLang || 'en';
}

// ---------- Pinyin ----------
let pinyinLib = null;
function loadPinyin() {
  if (!pinyinLib) pinyinLib = import('./vendor/pinyin-pro/pinyin-pro.mjs').catch((err) => { pinyinLib = null; throw err; });
  return pinyinLib;
}

// Pinyin with tone marks, in citation tones (一 is yī, 不 is bù), like a dictionary.
export async function pinyinOf(text) {
  if (!hasHan(text)) return '';
  const m = await loadPinyin();
  return m.pinyin(text, { toneSandhi: false, nonZh: 'consecutive' }).replace(/\s+/g, ' ').trim();
}

// One syllable per character, for the Character grid.
export async function pinyinArray(text) {
  const m = await loadPinyin();
  return m.pinyin(text, { toneSandhi: false, type: 'array' });
}

// Every character of a passage with its pinyin and other readings, for the
// Read-aloud tool: [{ i, c, py, alt: [readings] }] for each Chinese character,
// where i is its position in the text. `sandhi` gives 一 and 不 their spoken tones.
export async function pinyinChars(text, { sandhi = false } = {}) {
  if (!hasHan(text)) return [];
  const m = await loadPinyin();
  const out = [];
  let i = 0;
  for (const r of m.pinyin(text, { type: 'all', toneSandhi: sandhi })) {
    const c = r.origin || '';
    if (!c || !text.startsWith(c, i)) break; // out of step: stop rather than misplace pinyin
    if (r.isZh && r.pinyin) out.push({ i, c, py: r.pinyin, alt: r.polyphonic?.length > 1 ? r.polyphonic : [] });
    i += c.length;
  }
  return out;
}

// ---------- Look-ups ----------
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function getJSON(url) {
  let res;
  try { res = await fetch(url, { headers: { Accept: 'application/json' } }); } catch (err) {
    const e = new Error('offline');
    e.code = 'network';
    throw e;
  }
  if (res.status === 404) return null;
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.code = 'server'; throw e; }
  try { return await res.json(); } catch (err) { return null; }
}

// -> { found, meaning, examples, phonetic, audio, source } or { found: false }
export async function lookupEnglish(word) {
  const w = tidy(word).toLowerCase();
  if (!w) return { found: false };
  const data = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
  if (!Array.isArray(data) || !data.length) return { found: false };
  const byPos = new Map();
  const examples = [];
  let phonetic = '', audio = '';
  for (const e of data) {
    phonetic = phonetic || e.phonetic || (e.phonetics || []).find((p) => p.text)?.text || '';
    if (!audio) {
      const ph = e.phonetics || [];
      audio = (ph.find((p) => /-(uk|gb)\.mp3$/.test(p.audio || '')) || ph.find((p) => p.audio))?.audio || '';
    }
    for (const m of e.meanings || []) {
      const list = byPos.get(m.partOfSpeech) || [];
      for (const d of m.definitions || []) {
        if (d.definition) list.push(tidy(d.definition));
        if (d.example) examples.push(tidy(d.example));
      }
      byPos.set(m.partOfSpeech, list);
    }
  }
  // Two senses for each part of speech, up to five in all.
  const meaning = [];
  for (const [pos, defs] of byPos) {
    defs.slice(0, 2).forEach((d) => { if (meaning.length < 5) meaning.push(`(${pos}) ${d}`); });
  }
  if (!meaning.length) return { found: false };
  return { found: true, meaning: meaning.join('\n'), examples: [...new Set(examples)].slice(0, 3).join('\n'), phonetic, audio, source: 'en' };
}

let ccLib = null;
let toTrad = null;
async function traditional(text) {
  if (!toTrad) {
    if (!ccLib) ccLib = import('./vendor/opencc/opencc-cn2t.mjs').catch((err) => { ccLib = null; throw err; });
    const m = await ccLib;
    toTrad = m.Converter({ from: 'cn', to: 'tw' });
  }
  return toTrad(text);
}

// -> { found, trad, meaning, examples, source } or { found: false, trad }
export async function lookupChinese(word) {
  const w = tidy(word);
  if (!w) return { found: false };
  let trad;
  try { trad = await traditional(w); } catch (err) { const e = new Error('converter'); e.code = 'network'; throw e; }
  let data = await getJSON(`https://www.moedict.tw/uni/${encodeURIComponent(trad)}`);
  if (!data && trad !== w) data = await getJSON(`https://www.moedict.tw/uni/${encodeURIComponent(w)}`);
  const hets = Array.isArray(data?.heteronyms) ? data.heteronyms : [];
  if (!hets.length) return { found: false, trad };
  const meaning = [];
  const examples = [];
  hets.forEach((het) => {
    const defs = (het.definitions || []).filter((d) => d.def);
    if (!defs.length) return;
    if (hets.length > 1 && het.pinyin) meaning.push(`【${het.pinyin}】`);
    defs.forEach((d, i) => {
      if (meaning.length >= 10) return;
      meaning.push(`${defs.length > 1 ? `${i + 1}. ` : ''}${d.type ? `［${d.type}］` : ''}${tidy(d.def)}`);
      (d.example || []).forEach((x) => examples.push(tidy(x)));
    });
  });
  if (!meaning.length) return { found: false, trad };
  return { found: true, trad: data.title || trad, meaning: meaning.join('\n'), examples: examples.slice(0, 4).join('\n'), source: 'moedict' };
}

// Looks a word up in the dictionary for its language. Malay and Tamil have none yet.
export function canLookUp(word, listLang) {
  const l = langOf(word, listLang);
  return l === 'zh' || l === 'en';
}
export function lookup(word, listLang) {
  return langOf(word, listLang) === 'zh' ? lookupChinese(word) : lookupEnglish(word);
}

// ---------- Speech ----------
const PREFER = {
  zh: ['zh-CN', 'zh-SG', 'cmn-Hans', 'cmn', 'zh-TW', 'zh'],
  en: ['en-SG', 'en-GB', 'en-AU', 'en-IE', 'en-NZ', 'en-US', 'en'],
  ms: ['ms-MY', 'ms-SG', 'ms', 'id-ID', 'id'],
  ta: ['ta-SG', 'ta-IN', 'ta-MY', 'ta-LK', 'ta'],
};
export const speechAvailable = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voicesReady = null;
export function loadVoices() {
  if (!speechAvailable()) return Promise.resolve([]);
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const got = () => speechSynthesis.getVoices();
      if (got().length) { resolve(got()); return; }
      const done = () => { speechSynthesis.removeEventListener('voiceschanged', done); resolve(got()); };
      speechSynthesis.addEventListener('voiceschanged', done);
      setTimeout(done, 2500); // some browsers never fire the event
    });
  }
  return voicesReady;
}

// Apple's novelty and Eloquence voices (Eddy, Flo, Grandma…) come in every language
// on recent Macs and iPads and sound robotic, especially in Chinese. Macs list them
// before the good voices, so they are put last.
const POOR_VOICE = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|fred)\b/i;
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
// How good a voice usually is in class: Edge's natural voices, then Google's (Chrome),
// then other online voices, then the computer's own. Apple's premium and enhanced
// voices are often listed before they are downloaded, and then make no sound, so
// they don't count as recommended. Online voices need the internet.
export function voiceQuality(v) {
  const n = v?.name || '';
  if (POOR_VOICE.test(n)) return -10;
  if (v?.localService === false && offline()) return -20;
  if (/natural|neural/i.test(n)) return 5;
  if (/google/i.test(n)) return 4;
  if (/online/i.test(n)) return 3;
  if (/premium|enhanced|高音质|優化/i.test(n)) return 1;
  return 0;
}
export const isPoorVoice = (v) => voiceQuality(v) === -10;

// Voices that made no sound or failed in this window, so they are skipped until a reload.
const failedVoices = new Set();
export const voiceFailed = (v) => { if (v?.name) failedVoices.add(v.name); };
export const hasFailed = (v) => !!v && failedVoices.has(v.name);

// Voices for a language, best first: the best-sounding ones (Edge natural, Google),
// each in the closest locale first, then the computer's own; robotic ones last.
export function voicesFor(lang, voices) {
  const prefs = PREFER[lang] || [lang];
  const rank = (v) => {
    const tag = (v.lang || '').replace('_', '-');
    let i = prefs.findIndex((p) => tag.toLowerCase() === p.toLowerCase());
    if (i < 0) i = prefs.findIndex((p) => tag.toLowerCase().startsWith(p.toLowerCase().split('-')[0] + (p.includes('-') ? '-' : '')));
    if (i < 0 && tag.toLowerCase().startsWith(lang)) i = prefs.length;
    return i;
  };
  // Recommended voices (online ones) beat a closer locale: Google 國語（臺灣） sounds
  // better than a robotic zh-CN voice, but zh-CN still comes first within each group.
  const tier = (v) => { const q = voiceQuality(v); return q >= 3 ? 0 : q >= 0 ? 1 : q === -10 ? 2 : 3; };
  // Cantonese voices (zh-HK, yue) would read 华文 in Cantonese.
  const cantonese = (v) => /^(zh[-_]hk|yue)/i.test(v.lang || '') || /粤|粵|cantonese/i.test(v.name || '');
  return voices.filter((v) => rank(v) >= 0 && !(lang === 'zh' && cantonese(v)))
    .sort((a, b) => tier(a) - tier(b) || rank(a) - rank(b) || voiceQuality(b) - voiceQuality(a));
}

// The voices settings shows first: the online ones, or else the computer's best one.
export function recommendedVoices(lang, voices) {
  const all = voicesFor(lang, voices);
  const good = all.filter((v) => voiceQuality(v) >= 3);
  return good.length ? good : all.filter((v) => voiceQuality(v) >= 0).slice(0, 1);
}

// The voice to use: the one chosen on this computer, unless it has failed;
// otherwise the best one that hasn't.
export function pickVoice(lang, voices, chosenName = null) {
  let options = voicesFor(lang, voices).filter((v) => !hasFailed(v));
  // Offline, online voices can't speak: use the computer's own if it has one.
  if (offline() && options.some((v) => v.localService !== false)) options = options.filter((v) => v.localService !== false);
  return options.find((v) => v.name === chosenName) || options[0] || null;
}

// The shortest a real voice could take to say this (ms), to tell a voice that
// "finished" without a sound.
export function minSpeakMs(text) {
  const han = (String(text).match(/\p{Script=Han}/gu) || []).length;
  const words = (String(text).match(/[\p{L}\p{N}]+/gu) || []).filter((w) => !/\p{Script=Han}/u.test(w)).length;
  return (han + words) * 50;
}
export const SILENT_AFTER_MS = 4000; // no sound by then: the voice isn't working

export function stopSpeaking() {
  if (speechAvailable()) speechSynthesis.cancel();
}

// Speaks text. Resolves true when it was said, false when it was stopped, or
// 'failed' when the voice made no sound or gave an error (the caller can try another).
export function speak(text, { lang = 'zh', voice = null, rate = 0.9 } = {}) {
  return new Promise((resolve) => {
    if (!speechAvailable() || !text) { resolve(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = (PREFER[lang] || [lang])[0];
    u.rate = rate;
    let finished = false, started = false;
    const t0 = performance.now();
    const end = (r) => { if (!finished) { finished = true; clearTimeout(guard); clearTimeout(silent); resolve(r); } };
    u.onstart = () => { started = true; };
    u.onboundary = () => { started = true; };
    u.onend = () => end(performance.now() - t0 < minSpeakMs(text) / Math.max(rate, 0.5) && minSpeakMs(text) >= 150 ? 'failed' : true);
    u.onerror = (ev) => end(ev.error === 'interrupted' || ev.error === 'canceled' ? false : 'failed');
    const silent = setTimeout(() => { if (!started && !finished) { end('failed'); speechSynthesis.cancel(); } }, SILENT_AFTER_MS);
    // A safety net in case the browser never reports the end.
    const guard = setTimeout(() => end(true), 4000 + text.length * 450 / rate);
    speechSynthesis.speak(u);
  });
}

// Speaks with the chosen voice and, if it makes no sound, with the next good one.
// onSwitch(from, to) is told when it moves to another voice.
export async function speakWithFallback(text, { lang = 'zh', voices = [], chosen = null, rate = 0.9, onSwitch = null } = {}) {
  for (let tries = 0; tries < 4; tries++) {
    const voice = pickVoice(lang, voices, chosen);
    const r = await speak(text, { lang, voice, rate });
    if (r !== 'failed' || !voice) return r === true;
    voiceFailed(voice);
    const next = pickVoice(lang, voices, chosen);
    if (!next) return false;
    onSwitch?.(voice, next);
  }
  return false;
}
