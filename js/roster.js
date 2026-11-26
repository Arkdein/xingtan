// Changes to a class made after the class list was created: its name, and
// adding, renaming and removing a student (from the Points tool), bringing a
// past student back, and saving an edited class list with its renames.
//
// Points are kept by name (see points.js), so:
//   - removing a student keeps their points; they show under Past students and
//     come back if the name is added again
//   - renaming a student moves their points, log, badges and marker to the new name,
//     and their group settings (level, keep together / apart, past rounds; see grouping.js)
//   - deleting a past student's points is the only way points are lost
//
// Tools that keep names on the board (Groups, Name picker) hear about renames
// through onRename(), before the class list changes, so they can follow them.
import * as store from './store.js';
import * as points from './points.js';
import { renameIn as renameInGroups } from './grouping.js';
import { t } from './i18n.js';
import { renameClassFiles } from './gforms.js';

export const MAX_NAME = 80;
export const cleanName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

const renameListeners = new Set();

// fn(classId, [[from, to], …]) runs just before the class list changes.
export function onRename(fn) {
  renameListeners.add(fn);
  return () => renameListeners.delete(fn);
}

function tellRenames(classId, pairs) {
  if (!pairs.length) return;
  renameListeners.forEach((fn) => {
    try { fn(classId, pairs); } catch (err) { console.error(err); }
  });
}

const findClass = (m, classId) => m.classes.find((c) => c.id === classId);

// ---------- The class's name ----------
// Points, past students, poll results and the class's Google files are all kept
// by the class's id, so a new name changes nothing else. The class's Google
// Sheet and poll form are renamed to match (see gforms.js).

export const MAX_CLASS_NAME = 60;
export const cleanClassName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CLASS_NAME);

// An error message, or null if the name can be used for this class (id null: a new class).
export function classNameProblem(classId, name) {
  if (!name) return t('Give the class a name');
  const clash = store.getClasses().find((c) => c.id !== classId && c.name.toLowerCase() === name.toLowerCase());
  return clash ? t('Another class is already called {name}.', { name: clash.name }) : null;
}

// Returns { error } or { name, changed }.
export function renameClass(classId, raw) {
  const c = store.getClass(classId);
  const name = cleanClassName(raw);
  if (!c) return { error: t('This class is no longer here.') };
  const problem = classNameProblem(classId, name);
  if (problem) return { error: problem };
  if (name === c.name) return { name, changed: false };
  store.update((m) => { const cls = findClass(m, classId); if (cls) cls.name = name; });
  renameClassFiles(classId);
  return { name, changed: true };
}

// Each of these returns { error } with a message for the teacher, or { name }.

export function addStudent(classId, raw) {
  const c = store.getClass(classId);
  const name = cleanName(raw);
  if (!c) return { error: t('This class is no longer here.') };
  if (!name) return { error: t('Type the student’s name.') };
  if (c.students.includes(name)) return { error: t('{name} is already in the class.', { name }) };
  const back = points.hasPoints(classId, name);
  store.update((m) => { findClass(m, classId)?.students.push(name); });
  return { name, back };
}

export function renameStudent(classId, from, raw) {
  const c = store.getClass(classId);
  const name = cleanName(raw);
  if (!c || !c.students.includes(from)) return { error: t('This student is no longer on the class list.') };
  if (!name) return { error: t('Type the student’s name.') };
  if (name === from) return { name };
  if (c.students.includes(name)) return { error: t('{name} is already in the class.', { name }) };
  if (points.hasPoints(classId, name)) {
    return { error: t('A past student called {name} has points kept. Bring them back from Past students, or delete those points first.', { name }) };
  }
  tellRenames(classId, [[from, name]]);
  store.update((m) => {
    const cls = findClass(m, classId);
    if (!cls) return;
    cls.students = cls.students.map((n) => (n === from ? name : n));
    points.moveStudentPoints(m, classId, from, name);
    renameInGroups(cls, from, name);
  });
  return { name };
}

export function removeStudent(classId, name) {
  store.update((m) => {
    const cls = findClass(m, classId);
    if (!cls) return;
    cls.students = cls.students.filter((n) => n !== name);
    points.keepAbsentOnList(m, classId, cls.students);
  });
  return { name };
}

// A past student comes back with their points, at the end of the list.
export function bringBack(classId, name) {
  return addStudent(classId, name);
}

export function forgetStudent(classId, name) {
  store.update((m) => points.forgetStudentPoints(m, classId, name));
}

// Saves an edited class list. renames: [[old name, new name], …] for students
// whose points should move to a name that is new on the list.
export function saveClass(classId, className, students, renames = []) {
  const pairs = renames.filter(([from, to]) => from !== to && students.includes(to) && !students.includes(from));
  tellRenames(classId, pairs);
  const renamed = store.getClass(classId)?.name !== className;
  store.update((m) => {
    const cls = findClass(m, classId);
    if (!cls) return;
    cls.name = className;
    cls.students = students;
    pairs.forEach(([from, to]) => { points.moveStudentPoints(m, classId, from, to); renameInGroups(cls, from, to); });
    points.keepAbsentOnList(m, classId, students);
  });
  if (renamed) renameClassFiles(classId);
}

// ---------- Spotting renames in an edited list ----------

function distance(a, b) {
  const x = Array.from(a);
  const y = Array.from(b);
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length];
}

function ratio(a, b) {
  if (!a || !b) return 0;
  return 1 - distance(a, b) / Math.max(Array.from(a).length, Array.from(b).length);
}

// 0–1: how alike two names are. Ignores case, spaces and punctuation, and the
// order of the words ("Tan Wei Ling" and "Wei Ling Tan" match).
export function similarity(a, b) {
  const norm = (s) => s.normalize('NFKC').toLowerCase();
  const flat = (s) => norm(s).replace(/[\s.,'’\-_()]/g, '');
  const sorted = (s) => norm(s).split(/\s+/).sort().join('');
  return Math.max(ratio(flat(a), flat(b)), ratio(sorted(a), sorted(b)));
}

const ALIKE = 0.6;

// What changed between two versions of a class list:
//   added    names that are new
//   removed  names that are gone, each { name, total, kept } (kept: has points)
//   guesses  { removed name: added name } for likely renames (a typo fixed,
//            a fuller name), only for students with points
export function compare(classId, before, after) {
  const was = new Set(before);
  const now = new Set(after);
  const added = [...now].filter((n) => !was.has(n));
  const removed = [...was].filter((n) => !now.has(n)).map((name) => ({
    name, total: points.totalOf(classId, name), kept: points.hasPoints(classId, name),
  }));
  const pairs = [];
  removed.filter((r) => r.kept).forEach((r) => {
    added.forEach((a) => {
      if (points.hasPoints(classId, a)) return; // already has points of their own
      const s = similarity(r.name, a);
      if (s >= ALIKE) pairs.push([s, r.name, a]);
    });
  });
  pairs.sort((p, q) => q[0] - p[0]);
  const guesses = {};
  const taken = new Set();
  pairs.forEach(([, from, to]) => {
    if (from in guesses || taken.has(to)) return;
    guesses[from] = to;
    taken.add(to);
  });
  return { added, removed, guesses };
}
