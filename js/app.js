import * as store from './store.js';
import { h, toast, openModal, closeModal, confirmButton } from './ui.js';
import { widgets, widgetByType } from './widgets/index.js';
import { openClassManager } from './classes.js';

const stage = document.getElementById('stage');
const dock = document.getElementById('dock');
const emptyHint = document.getElementById('empty-hint');
const mounted = new Map(); // widget id -> { el, instance }

// ---------- Backgrounds ----------
export const BACKGROUNDS = [
  { id: 'navy', label: 'Navy', css: 'linear-gradient(135deg, #1f3a5f 0%, #2d5a87 100%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #1e4d3a 0%, #3a7d5c 100%)' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f093a0 0%, #f7c873 100%)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #2e86ab 0%, #7fd1c7 100%)' },
  { id: 'plum', label: 'Plum', css: 'linear-gradient(135deg, #4b2c5e 0%, #8e5a9e 100%)' },
  { id: 'paper', label: 'Paper', css: '#f4efe6' },
  { id: 'slate', label: 'Slate', css: '#2f343b' },
  { id: 'chalk', label: 'Chalkboard', css: 'radial-gradient(ellipse at center, #3d5a47 0%, #24392c 100%)' },
];

function applyBackground() {
  const bg = store.get().background || 'navy';
  let css;
  if (bg.startsWith('custom:')) css = bg.slice(7);
  else css = (BACKGROUNDS.find((b) => b.id === bg) || BACKGROUNDS[0]).css;
  document.body.style.background = css;
  // Pick light or dark corner icons depending on background.
  document.body.classList.toggle('light-bg', ['paper', 'sunset'].includes(bg) || isLightHex(bg));
}

function isLightHex(bg) {
  if (!bg.startsWith('custom:#')) return false;
  const hex = bg.slice(8);
  const n = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

function openBackgroundPicker() {
  openModal('Background', (body) => {
    const grid = h('div', { class: 'bg-grid' });
    const current = store.get().background;
    BACKGROUNDS.forEach((b) => {
      grid.append(h('button', {
        class: 'bg-swatch' + (current === b.id ? ' selected' : ''),
        style: { background: b.css },
        title: b.label,
        onclick: () => {
          store.update((s) => { s.background = b.id; });
          applyBackground();
          closeModal();
        },
      }, h('span', {}, b.label)));
    });
    const picker = h('input', { type: 'color', value: current.startsWith('custom:') ? current.slice(7) : '#3a6ea5' });
    picker.addEventListener('input', () => {
      store.update((s) => { s.background = 'custom:' + picker.value; });
      applyBackground();
    });
    body.append(grid, h('label', { class: 'row gap' }, 'Custom colour ', picker));
  });
}

// ---------- Settings / backup ----------
function openSettings() {
  openModal('Backup & settings', (body) => {
    const s = store.get();
    const last = s.lastBackup ? new Date(s.lastBackup).toLocaleString() : 'never';
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        await store.importData(file);
        rebuildAll();
        closeModal();
        toast('Backup restored');
      } catch (err) {
        toast(err.message || 'Could not read that file');
      }
    });

    body.append(
      h('section', { class: 'panel' },
        h('h3', {}, 'Your data stays on this computer'),
        h('p', {}, 'Class lists, layouts and settings are saved only in this browser. Nothing is uploaded. ' +
          'If you clear your browser data or switch computers, they won’t come with you, so download a backup now and then.'),
        h('p', { class: 'muted' }, `Last backup: ${last}`),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn primary', onclick: () => { store.exportData(); toast('Backup downloaded'); closeModal(); } }, '⬇ Download backup'),
          h('button', { class: 'btn', onclick: () => fileInput.click() }, '⬆ Restore from backup'),
          fileInput,
        ),
      ),
      h('section', { class: 'panel' },
        h('h3', {}, 'Use it offline'),
        h('p', {}, 'After your first visit, this page works without internet. In Chrome or Edge, use the install icon in the address bar ' +
          '(or menu → “Install app”) to open it like a normal app.'),
      ),
      h('section', { class: 'panel' },
        h('h3', {}, 'Start over'),
        h('p', {}, 'Removes all class lists, tools and settings from this browser.'),
        confirmButton('Clear everything', 'Click again to clear', () => {
          store.resetAll();
          rebuildAll();
          closeModal();
          toast('Everything cleared');
        }),
      ),
    );
  });
}

// ---------- Window manager ----------
function maxZ() {
  return store.get().widgets.reduce((m, w) => Math.max(m, w.z || 0), 0);
}

function addWidget(type) {
  const def = widgetByType[type];
  const rect = stage.getBoundingClientRect();
  const count = store.get().widgets.length;
  const w = Math.min(def.size.w, rect.width - 20);
  const hgt = Math.min(def.size.h, rect.height - 100);
  const offset = (count % 6) * 30;
  const record = {
    id: store.uid(),
    type,
    x: Math.max(10, Math.round((rect.width - w) / 2 - 90 + offset)),
    y: Math.max(10, Math.round((rect.height - hgt) / 2 - 80 + offset)),
    w, h: hgt,
    z: maxZ() + 1,
    state: {},
  };
  store.update((s) => { s.widgets.push(record); }, { notify: false });
  mountWidget(record);
  updateEmptyHint();
}

function removeWidget(id) {
  const m = mounted.get(id);
  if (m) {
    try { m.instance?.destroy?.(); } catch (err) { console.warn(err); }
    m.el.remove();
    mounted.delete(id);
  }
  store.update((s) => { s.widgets = s.widgets.filter((w) => w.id !== id); }, { notify: false });
  updateEmptyHint();
}

function record(id) {
  return store.get().widgets.find((w) => w.id === id);
}

function bringToFront(id, el) {
  const rec = record(id);
  const top = maxZ();
  if (rec.z === top) return;
  rec.z = top + 1;
  el.style.zIndex = rec.z;
  store.update(() => {}, { notify: false });
}

function clampRect(rec) {
  const rect = stage.getBoundingClientRect();
  rec.w = Math.max(160, Math.min(rec.w, rect.width));
  rec.h = Math.max(120, Math.min(rec.h, rect.height));
  rec.x = Math.max(0, Math.min(rec.x, rect.width - 80));
  rec.y = Math.max(0, Math.min(rec.y, rect.height - 44));
}

function placeEl(el, rec) {
  Object.assign(el.style, {
    left: rec.x + 'px', top: rec.y + 'px',
    width: rec.w + 'px', height: rec.h + 'px',
    zIndex: rec.z,
  });
}

function mountWidget(rec) {
  const def = widgetByType[rec.type];
  if (!def) return;
  clampRect(rec);

  const titleEl = h('span', { class: 'widget-title' }, def.icon + ' ' + def.title);
  const closeBtn = h('button', { class: 'widget-close', title: 'Close', 'aria-label': `Close ${def.title}` }, '✕');
  const header = h('header', { class: 'widget-head' }, titleEl, closeBtn);
  const body = h('div', { class: 'widget-body' });
  const grip = h('div', { class: 'widget-resize', title: 'Resize', 'aria-hidden': 'true' });
  const el = h('section', { class: `widget widget-${rec.type}`, 'data-id': rec.id, 'aria-label': def.title }, header, body, grip);
  placeEl(el, rec);
  stage.append(el);

  closeBtn.addEventListener('click', () => removeWidget(rec.id));
  el.addEventListener('pointerdown', () => bringToFront(rec.id, el), true);

  // Drag by header
  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    header.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const ox = rec.x, oy = rec.y;
    el.classList.add('dragging');
    const move = (ev) => {
      rec.x = ox + ev.clientX - startX;
      rec.y = oy + ev.clientY - startY;
      clampRect(rec);
      placeEl(el, rec);
    };
    const up = () => {
      header.removeEventListener('pointermove', move);
      header.removeEventListener('pointerup', up);
      header.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      store.update(() => {}, { notify: false });
    };
    header.addEventListener('pointermove', move);
    header.addEventListener('pointerup', up);
    header.addEventListener('pointercancel', up);
  });

  // Resize from corner
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    grip.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const ow = rec.w, oh = rec.h;
    const min = def.minSize || { w: 200, h: 150 };
    el.classList.add('dragging');
    const move = (ev) => {
      rec.w = Math.max(min.w, ow + ev.clientX - startX);
      rec.h = Math.max(min.h, oh + ev.clientY - startY);
      placeEl(el, rec);
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      store.update(() => {}, { notify: false });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  // Context passed to each widget
  const classListeners = new Set();
  const ctx = {
    el,
    store,
    get state() { return rec.state; },
    save(patch) {
      Object.assign(rec.state, patch);
      store.update(() => {}, { notify: false });
    },
    setTitle(text) { titleEl.textContent = def.icon + ' ' + (text || def.title); },
    toast,
    openClasses: () => openClassManager(),
    onClassesChange(fn) { classListeners.add(fn); return () => classListeners.delete(fn); },
  };

  let instance = null;
  try {
    instance = def.mount(body, ctx) || null;
  } catch (err) {
    console.error(err);
    body.append(h('p', { class: 'error' }, 'This tool failed to load.'));
  }
  mounted.set(rec.id, { el, instance, classListeners });
}

function rebuildAll() {
  for (const [, m] of mounted) {
    try { m.instance?.destroy?.(); } catch (err) { /* ignore */ }
    m.el.remove();
  }
  mounted.clear();
  store.get().widgets.forEach(mountWidget);
  applyBackground();
  updateEmptyHint();
}

function updateEmptyHint() {
  emptyHint.hidden = store.get().widgets.length > 0;
}

// Tell widgets when class lists change
store.subscribe(() => {
  for (const [, m] of mounted) m.classListeners.forEach((fn) => fn());
});

// ---------- Dock & top-right menu ----------
function buildDock() {
  widgets.forEach((def) => {
    dock.append(h('button', {
      class: 'dock-btn',
      title: `Add ${def.title}`,
      onclick: () => addWidget(def.type),
    }, h('span', { class: 'dock-icon', 'aria-hidden': 'true' }, def.icon), h('span', { class: 'dock-label' }, def.title)));
  });
}

document.getElementById('btn-classes').addEventListener('click', () => openClassManager());
document.getElementById('btn-background').addEventListener('click', openBackgroundPicker);
document.getElementById('btn-settings').addEventListener('click', openSettings);
document.getElementById('btn-fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => toast('Full screen not available here'));
});
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal(); // click on backdrop
});

window.addEventListener('resize', () => {
  for (const [id, m] of mounted) {
    const rec = record(id);
    if (!rec) continue;
    clampRect(rec);
    placeEl(m.el, rec);
  }
});
window.addEventListener('beforeunload', store.flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });

buildDock();
rebuildAll();

// ---------- Offline support ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline mode unavailable', err));
}
