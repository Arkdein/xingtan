// Past poll results, kept with each class (not with a board) so a teacher can
// look back over a unit, e.g. whether confidence rose from week to week.
//
// Stored in the shared meta entry as meta.polls[classKey], newest last:
//   { id, at, mode, lang, question, low, high, source, n,
//     counts,  Likert: [n1..n5] | Mood: { red, yellow, blue, green } | Words: null
//     words }  Words (and Mood feeling words): [[word, count], …] most first, hidden words left out
//
// Only totals and words are kept here, never students' names.
import * as store from './store.js';

const LIMIT = 200; // per class; the oldest go first

export function list(classKey) {
  const all = store.get().polls?.[classKey];
  return Array.isArray(all) ? all : [];
}

export function add(classKey, entry) {
  store.update((m) => {
    if (!m.polls || typeof m.polls !== 'object') m.polls = {};
    const arr = Array.isArray(m.polls[classKey]) ? m.polls[classKey] : [];
    const i = arr.findIndex((e) => e.id === entry.id);
    if (i >= 0) arr[i] = entry; else arr.push(entry);
    m.polls[classKey] = arr.slice(-LIMIT);
  });
}

export function remove(classKey, id) {
  store.update((m) => {
    if (Array.isArray(m.polls?.[classKey])) m.polls[classKey] = m.polls[classKey].filter((e) => e.id !== id);
  });
}

export function clear(classKey) {
  store.update((m) => { if (m.polls) delete m.polls[classKey]; });
}

// Called when a class is deleted.
export function forget(m, classKey) {
  if (m.polls) delete m.polls[classKey];
}

// ---------- CSV ----------
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(rows, name) {
  // The BOM lets Excel read Chinese correctly.
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const asciiName = (s) => (s || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'class';
