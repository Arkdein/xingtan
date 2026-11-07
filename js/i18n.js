// Interface language: English ('en') or Chinese ('zh', Singapore usage).
//
// Source strings are written in English in the code and wrapped in t():
//   t('Add a class list')                       -> '添加班级名单' in Chinese
//   t('{left} of {total} left', { left, total }) -> placeholders in braces
// The Chinese for each English string lives in js/i18n/zh-*.js, keyed by the
// exact English text. A string with no Chinese yet falls back to English.
//
// Always call t() when building the screen, never once at module load, so a
// language switch (which rebuilds the screen) picks up the new language.
//
// Student-facing content that has its own EN / 中文 / both setting (Work mode
// signs, poll questions, organiser labels, thinking routines) keeps that
// setting; only the teacher-facing interface follows this language.
import core from './i18n/zh-core.js';
import app from './i18n/zh-app.js';
import common from './i18n/zh-common.js';
import media from './i18n/zh-widgets-media.js';
import pollDictation from './i18n/zh-widgets-poll-dictation.js';
import thinking from './i18n/zh-widgets-thinking.js';
import classroom from './i18n/zh-widgets-classroom.js';
import quotes from './i18n/zh-widgets-quotes.js';
import readaloud from './i18n/zh-widgets-readaloud.js';
import analysis from './i18n/zh-widgets-analysis.js';

const ZH = Object.assign({}, common, media, pollDictation, thinking, classroom, quotes, readaloud, analysis, app, core);
const KEY = 'xingtan:lang';
const listeners = new Set();

function detect() {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  return langs.some((l) => /^zh\b/i.test(l)) ? 'zh' : 'en';
}

let lang = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (err) { /* ignore */ }
  return detect();
})();
document.documentElement.lang = lang === 'zh' ? 'zh-Hans-SG' : 'en';

// English strings that have no Chinese yet (for checking translations).
const missing = new Set();
window.__xingtanMissingZh = missing;

export function t(en, vars) {
  let s = en;
  if (lang === 'zh' && en) {
    const zh = ZH[en];
    if (zh != null) s = zh;
    else missing.add(en);
  }
  if (vars) s = String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function getLang() { return lang; }

// Locale for dates and numbers.
export function locale() { return lang === 'zh' ? 'zh-SG' : 'en-SG'; }

export function setLang(next) {
  if (next !== 'en' && next !== 'zh') return;
  try { localStorage.setItem(KEY, next); } catch (err) { /* ignore */ }
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans-SG' : 'en';
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Another window of the app switched language.
window.addEventListener('storage', (e) => {
  if (e.key === KEY && (e.newValue === 'en' || e.newValue === 'zh') && e.newValue !== lang) {
    lang = e.newValue;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans-SG' : 'en';
    listeners.forEach((fn) => fn(lang));
  }
});
