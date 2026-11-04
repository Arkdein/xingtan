// Behaviour points, kept with each class (not with a board), so every board
// that shows a class shows the same running totals.
//
// Stored in the shared meta entry as meta.points[classId]:
//   totals  { name: number }               running total per student
//   log     { 'YYYY-MM-DD': { name: n } }  net change per student per day
//   absent  { date, names: [name] }        marks for today only
//   undo    [{ date, deltas: { name: n } }] today's last changes, newest last
//   goal    number | null                  class-total target for the goal bar
//
// Points are matched to students by name. A name that leaves the class list
// keeps its points, so they come back if the name is added again.
import * as store from './store.js';

const UNDO_LIMIT = 20;

export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const empty = () => ({ totals: {}, log: {}, absent: { date: null, names: [] }, undo: [], goal: null });

function normalise(p) {
  const out = { ...empty(), ...(p && typeof p === 'object' ? p : {}) };
  if (!out.totals || typeof out.totals !== 'object') out.totals = {};
  if (!out.log || typeof out.log !== 'object') out.log = {};
  if (!out.absent || !Array.isArray(out.absent.names)) out.absent = { date: null, names: [] };
  if (!Array.isArray(out.undo)) out.undo = [];
  return out;
}

// For writing: creates the class's entry if needed.
function entry(m, classId) {
  if (!m.points || typeof m.points !== 'object') m.points = {};
  m.points[classId] = normalise(m.points[classId]);
  return m.points[classId];
}

// For reading: never writes.
function read(classId) {
  return normalise(store.get().points?.[classId]);
}

export function totalOf(classId, name) {
  return read(classId).totals[name] || 0;
}

export function classTotal(cls) {
  const t = read(cls.id).totals;
  return cls.students.reduce((sum, n) => sum + (t[n] || 0), 0);
}

export function absentNames(classId) {
  const a = read(classId).absent;
  return a.date === today() ? a.names : [];
}

export function goal(classId) {
  const g = read(classId).goal;
  return Number.isFinite(g) && g > 0 ? g : null;
}

export function canUndo(classId) {
  const t = today();
  return read(classId).undo.some((u) => u.date === t);
}

function apply(p, date, deltas, sign) {
  const day = (p.log[date] = p.log[date] || {});
  for (const [name, d] of Object.entries(deltas)) {
    p.totals[name] = (p.totals[name] || 0) + sign * d;
    day[name] = (day[name] || 0) + sign * d;
    if (day[name] === 0) delete day[name];
  }
  if (Object.keys(day).length === 0) delete p.log[date];
}

// deltas: { name: +1 | -1 } (one student, or every student present)
export function change(classId, deltas) {
  if (!Object.keys(deltas).length) return;
  store.update((m) => {
    const p = entry(m, classId);
    const t = today();
    apply(p, t, deltas, 1);
    p.undo = p.undo.filter((u) => u.date === t);
    p.undo.push({ date: t, deltas });
    if (p.undo.length > UNDO_LIMIT) p.undo.splice(0, p.undo.length - UNDO_LIMIT);
  });
}

// Reverses the latest change made today. Returns the deltas undone, or null.
export function undo(classId) {
  let undone = null;
  const t = today();
  if (!canUndo(classId)) return null;
  store.update((m) => {
    const p = entry(m, classId);
    p.undo = p.undo.filter((u) => u.date === t);
    const last = p.undo.pop();
    if (!last) return;
    apply(p, last.date, last.deltas, -1);
    undone = last.deltas;
  });
  return undone;
}

export function toggleAbsent(classId, name) {
  store.update((m) => {
    const p = entry(m, classId);
    const t = today();
    if (p.absent.date !== t) p.absent = { date: t, names: [] };
    const i = p.absent.names.indexOf(name);
    if (i >= 0) p.absent.names.splice(i, 1);
    else p.absent.names.push(name);
  });
}

export function setGoal(classId, value) {
  const g = Math.round(Number(value));
  store.update((m) => { entry(m, classId).goal = Number.isFinite(g) && g > 0 ? g : null; });
}

// Totals go back to 0 (for a new term). The log is kept.
export function resetTotals(classId) {
  store.update((m) => {
    const p = entry(m, classId);
    p.totals = {};
    p.undo = [];
  });
}

export function removeClassPoints(m, classId) {
  if (m.points) delete m.points[classId];
}

// One row per student, one column per day with changes, then the running total.
export function exportCsv(cls) {
  const p = read(cls.id);
  const dates = Object.keys(p.log).sort();
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [['Name', ...dates, 'Total now']];
  cls.students.forEach((name) => {
    rows.push([name, ...dates.map((d) => p.log[d][name] ?? ''), p.totals[name] || 0]);
  });
  rows.push(['Class', ...dates.map((d) => cls.students.reduce((s, n) => s + (p.log[d][n] || 0), 0)), classTotal(cls)]);
  // The BOM lets Excel read Chinese names correctly.
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const ascii = cls.name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'class';
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `xingtan-points-${ascii}-${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
