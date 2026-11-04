// Local-only storage. Everything lives in this browser's localStorage.
// Nothing is sent anywhere.

const KEY = 'xingtan:v1';
const listeners = new Set();

const defaults = () => ({
  version: 1,
  background: 'navy',
  classes: [],          // [{ id, name, students: [string] }]
  activeClassId: null,
  widgets: [],          // [{ id, type, x, y, w, h, z, state }]
  lastBackup: null,
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Could not read saved data', err);
    return defaults();
  }
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save', err);
    }
  }, 150);
}

export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
}

export function get() { return state; }

export function update(mutator, { notify = true } = {}) {
  mutator(state);
  persist();
  if (notify) listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Classes ----
export function getClasses() { return state.classes; }

export function getClass(id) {
  return state.classes.find((c) => c.id === id) || null;
}

export function getActiveClass() {
  return getClass(state.activeClassId) || state.classes[0] || null;
}

// ---- Backup ----
export function exportData() {
  update((s) => { s.lastBackup = new Date().toISOString(); }, { notify: false });
  flush();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `xingtan-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importData(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.classes) || !Array.isArray(data.widgets)) {
    throw new Error('This file is not a 杏坛 · ClassroomBoard backup.');
  }
  state = { ...defaults(), ...data };
  flush();
}

export function resetAll() {
  state = defaults();
  flush();
}
