// Behaviour points, kept with each class (not with a board), so every board
// that shows a class shows the same running totals.
//
// Stored in the shared meta entry as meta.points[classId]:
//   totals  { name: number }               running total per student
//   log     { 'YYYY-MM-DD': { name: n } }  net change per student per day
//   absent  { date, names: [name] }        marks for today only
//   undo    [{ date, deltas: { name: n } }] today's last changes, newest last
//   goal    number | null                  (older versions) class-total target; moved into bar
//   bar     goal bar settings and progress, or null (see below)
//
// The goal bar counts points earned since the goal was set, either for the
// whole class (one shared track) or for each student (a track in every row):
//   mode        'class' | 'student'
//   target      points to reach (for the class, or for each student)
//   marker      marker id for the class (see markers.js); markers { name: id } for students' own
//   chime       chime id (see sounds.js); milestones: true for cues at ¼, ½ and ¾; muted
//   debt        what happens when points go below zero (the teacher picks one):
//                 'carry' lost points must be earned back before the marker moves on, and anyone
//                         below zero when the goal is set starts that far behind (default)
//                 'earn'  as 'carry', but everyone starts from zero when the goal is set
//                 'zero'  the marker never goes behind the start, and waits at the finish until
//                         the total (term points) is 0 or more
//   reward      optional words shown at the finish, such as "Movie afternoon"
//   run         changes whenever progress restarts, so Undo never brings back an older run
//   cls         { e, round, heard }  class mode: points so far (below 0 = points owed), round number,
//               last round whose chime played
//   stu         { name: { e, b, heard } }  student mode: points towards the next goal (below 0 = owed),
//               goals reached (badges), and the badge count whose chime already played
// Reaching the goal in student mode starts the student's next round straight away
// with one more badge. The chime plays once
// for each goal: an Undo and redo won't set it off again.
//
// Points are matched to students by name. A name that leaves the class list
// keeps its points, so they come back if the name is added again.
import * as store from './store.js';
import { t } from './i18n.js';
import { MARKERS, DEFAULT_MARKER } from './markers.js';
import { CHIMES, DEFAULT_CHIME } from './sounds.js';

const UNDO_LIMIT = 20;

export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const empty = () => ({ totals: {}, log: {}, absent: { date: null, names: [] }, undo: [], goal: null, bar: null });

const MAX_TARGET = 100000;
const runId = () => Math.random().toString(36).slice(2, 10);
const markerId = (id) => (MARKERS.some((m) => m.id === id) ? id : DEFAULT_MARKER);
const chimeId = (id) => (CHIMES.some((c) => c.id === id) ? id : DEFAULT_CHIME);
const count = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const int = (n) => (Number.isFinite(n) ? Math.trunc(n) : 0);
export const DEBT_RULES = ['earn', 'carry', 'zero'];

function normaliseBar(b) {
  if (!b || typeof b !== 'object') return null;
  const target = Math.round(Number(b.target));
  if (!Number.isFinite(target) || target < 1) return null;
  const debt = DEBT_RULES.includes(b.debt) ? b.debt : 'carry';
  const markers = {};
  if (b.markers && typeof b.markers === 'object') {
    for (const [name, id] of Object.entries(b.markers)) if (MARKERS.some((m) => m.id === id)) markers[name] = id;
  }
  const stu = {};
  if (b.stu && typeof b.stu === 'object') {
    for (const [name, v] of Object.entries(b.stu)) {
      if (v && typeof v === 'object') stu[name] = { e: debt === 'zero' ? count(v.e) : int(v.e), b: count(v.b), heard: count(v.heard) };
    }
  }
  const c = b.cls && typeof b.cls === 'object' ? b.cls : {};
  return {
    mode: b.mode === 'student' ? 'student' : 'class',
    target: Math.min(target, MAX_TARGET),
    marker: markerId(b.marker),
    chime: chimeId(b.chime),
    reward: typeof b.reward === 'string' ? b.reward.slice(0, 80) : '',
    milestones: b.milestones !== false,
    muted: !!b.muted,
    debt,
    markers,
    run: typeof b.run === 'string' ? b.run : runId(),
    cls: { e: debt === 'zero' ? count(c.e) : int(c.e), round: Math.max(1, count(c.round)), heard: count(c.heard) },
    stu,
  };
}

function normalise(p) {
  const out = { ...empty(), ...(p && typeof p === 'object' ? p : {}) };
  if (!out.totals || typeof out.totals !== 'object') out.totals = {};
  if (!out.log || typeof out.log !== 'object') out.log = {};
  if (!out.absent || !Array.isArray(out.absent.names)) out.absent = { date: null, names: [] };
  if (!Array.isArray(out.undo)) out.undo = [];
  out.bar = normaliseBar(out.bar);
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
  return sumOf(read(cls.id).totals, cls.students);
}

const sumOf = (totals, names) => names.reduce((sum, n) => sum + (totals[n] || 0), 0);

export function absentNames(classId) {
  const a = read(classId).absent;
  return a.date === today() ? a.names : [];
}

// ---------- Goal bar ----------

// Settings and progress, or null when the class has no goal.
export function bar(classId) {
  return read(classId).bar;
}

// Older versions kept only a class-total goal. It becomes a class-mode bar
// that starts where the old bar was, so nothing jumps back for the class.
export function migrateGoal(cls) {
  const p = read(cls.id);
  const g = p.goal;
  if (p.bar || !(Number.isFinite(g) && g > 0)) return;
  const e = Math.max(0, classTotal(cls));
  store.update((m) => {
    const q = entry(m, cls.id);
    if (!q.bar) q.bar = normaliseBar({ mode: 'class', target: g, cls: { e, round: 1, heard: e >= g ? 1 : 0 } });
    q.goal = null;
  });
}

// Progress at the start of a run. Everyone starts at zero, except with the
// 'carry' rule, where anyone below zero starts that far behind.
function startProgress(p, b, students) {
  const carry = b.debt === 'carry';
  const stu = {};
  if (carry) {
    for (const n of students) {
      const v = p.totals[n] || 0;
      if (v < 0) stu[n] = { e: v, b: 0, heard: 0 };
    }
  }
  const e = carry ? Math.min(0, sumOf(p.totals, students)) : 0;
  return { run: runId(), cls: { e, round: 1, heard: 0 }, stu };
}

// settings: { mode, target, marker, chime, reward, milestones, debt, markers }.
// A new goal, or a change of mode, number or below-zero rule, starts the bar
// again. Changing only the look or the sound keeps everyone's progress.
// students: the class list (for the 'carry' rule).
export function setBar(classId, settings, students = []) {
  let restarted = false;
  store.update((m) => {
    const p = entry(m, classId);
    const old = p.bar;
    const next = normaliseBar({ ...(old || {}), ...settings, muted: old?.muted });
    if (!next) return;
    if (!old || old.mode !== next.mode || old.target !== next.target || old.debt !== next.debt) {
      Object.assign(next, startProgress(p, next, students));
      restarted = true;
    }
    p.bar = next;
    p.goal = null;
  });
  return restarted;
}

export function clearBar(classId) {
  store.update((m) => { const p = entry(m, classId); p.bar = null; p.goal = null; });
}

export function setMuted(classId, muted) {
  store.update((m) => { const p = entry(m, classId); if (p.bar) p.bar.muted = !!muted; });
}

// Class mode: start the next round from zero once the goal is reached.
export function nextRound(classId) {
  store.update((m) => {
    const b = entry(m, classId).bar;
    if (!b) return;
    b.cls = { e: 0, round: b.cls.round + 1, heard: b.cls.heard };
    b.run = runId();
  });
}

// Everyone back to the start (and badges cleared). Settings are kept.
export function restartBar(classId, students = []) {
  store.update((m) => {
    const p = entry(m, classId);
    if (p.bar) Object.assign(p.bar, startProgress(p, p.bar, students));
  });
}

export function studentProgress(classId, name) {
  const s = read(classId).bar?.stu[name];
  return { e: s?.e || 0, b: s?.b || 0 };
}

// Which quarter mark (1, 2 or 3) a move from `from` to `to` points passes, or 0.
function quarterPassed(from, to, target) {
  if (to <= from || to >= target) return 0;
  const q = Math.floor((to * 4) / target);
  return q > Math.floor((from * 4) / target) ? Math.min(3, q) : 0;
}

// Whether a goal counts as reached: enough points, and with the 'zero' rule,
// a total of 0 or more as well.
export function goalMet(b, e, total) {
  return e >= b.target && (b.debt !== 'zero' || total >= 0);
}

// Moves the goal bar on by `deltas` (already added to `totals`). Returns what
// happened, for sounds and celebrations, and a copy of the progress before, for Undo.
// students: the class list, for the class total.
function advance(b, deltas, totals, students) {
  const ev = { classReached: false, reached: [], milestone: 0 };
  if (!b) return { ev, snap: null };
  const snap = { run: b.run };
  const floor = b.debt === 'zero' ? 0 : -Infinity; // otherwise points owed are kept
  if (b.mode === 'class') {
    snap.cls = { e: b.cls.e };
    const before = b.cls.e;
    const sum = Object.values(deltas).reduce((a, d) => a + d, 0);
    const total = sumOf(totals, students?.length ? students : Object.keys(totals));
    b.cls.e = Math.max(floor, before + sum);
    const metBefore = goalMet(b, before, total - sum);
    if (!metBefore && goalMet(b, b.cls.e, total)) {
      if (b.cls.heard < b.cls.round) { b.cls.heard = b.cls.round; ev.classReached = true; }
    } else {
      ev.milestone = quarterPassed(Math.max(0, before), Math.max(0, b.cls.e), b.target);
    }
  } else {
    snap.stu = {};
    for (const [name, d] of Object.entries(deltas)) {
      const s = b.stu[name] || { e: 0, b: 0, heard: 0 };
      snap.stu[name] = { e: s.e, b: s.b };
      const before = s.e;
      s.e = Math.max(floor, s.e + d);
      if (s.e >= b.target) {
        if (b.debt === 'zero') {
          // Waits at the finish until the total is 0 or more; then one goal.
          s.e = Math.min(s.e, b.target);
          if ((totals[name] || 0) >= 0) { s.e = 0; s.b += 1; }
        } else {
          s.b += Math.floor(s.e / b.target);
          s.e %= b.target;
        }
        if (s.b > s.heard) { s.heard = s.b; ev.reached.push(name); }
      } else {
        ev.milestone = Math.max(ev.milestone, quarterPassed(Math.max(0, before), Math.max(0, s.e), b.target));
      }
      b.stu[name] = s;
    }
  }
  return { ev, snap };
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
// students: the class list (for the class total). Returns
// { classReached, reached: [names], milestone } for the goal bar.
export function change(classId, deltas, students) {
  let ev = { classReached: false, reached: [], milestone: 0 };
  if (!Object.keys(deltas).length) return ev;
  store.update((m) => {
    const p = entry(m, classId);
    const t = today();
    apply(p, t, deltas, 1);
    const moved = advance(p.bar, deltas, p.totals, students);
    ev = moved.ev;
    p.undo = p.undo.filter((u) => u.date === t);
    p.undo.push(moved.snap ? { date: t, deltas, bar: moved.snap } : { date: t, deltas });
    if (p.undo.length > UNDO_LIMIT) p.undo.splice(0, p.undo.length - UNDO_LIMIT);
  });
  return ev;
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
    // Put the goal bar back too, unless it has been restarted since.
    const b = p.bar;
    if (b && last.bar && last.bar.run === b.run) {
      if (last.bar.cls && b.mode === 'class') b.cls.e = int(last.bar.cls.e);
      if (last.bar.stu && b.mode === 'student') {
        for (const [name, v] of Object.entries(last.bar.stu)) {
          const s = b.stu[name] || { e: 0, b: 0, heard: 0 };
          b.stu[name] = { e: int(v.e), b: count(v.b), heard: s.heard };
        }
      }
    }
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

// Totals go back to 0 (for a new term), and the goal bar to the start. The log is kept.
export function resetTotals(classId) {
  store.update((m) => {
    const p = entry(m, classId);
    p.totals = {};
    p.undo = [];
    if (p.bar) Object.assign(p.bar, { run: runId(), cls: { e: 0, round: 1, heard: 0 }, stu: {} });
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
  const rows = [[t('Name'), ...dates, t('Total now')]];
  cls.students.forEach((name) => {
    rows.push([name, ...dates.map((d) => p.log[d][name] ?? ''), p.totals[name] || 0]);
  });
  rows.push([t('Class'), ...dates.map((d) => cls.students.reduce((s, n) => s + (p.log[d][n] || 0), 0)), classTotal(cls)]);
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
