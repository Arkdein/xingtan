import * as store from './store.js';
import { h, toast, openModal, closeModal, confirmButton } from './ui.js';
import { widgetByType } from './widgets/index.js';
import { openClassManager } from './classes.js';
import { BACKGROUNDS, backgroundCss, isLightBackground } from './backgrounds.js';
import { initLauncher, showLauncher, refreshLauncher } from './boards.js';
import { initDock, toolTile, render as renderDock, isEditing as dockEditing } from './dock.js';
import { icon } from './icons.js';

const stage = document.getElementById('stage');
const emptyHint = document.getElementById('empty-hint');
const mounted = new Map(); // widget id -> { el, instance }

// ---------- Backgrounds ----------
function applyBackground() {
  const bg = store.getBoard()?.background || 'navy';
  document.body.style.background = backgroundCss(bg);
  // Pick light or dark corner icons depending on background.
  document.body.classList.toggle('light-bg', isLightBackground(bg));
}

function openBackgroundPicker() {
  openModal('Background', (body) => {
    const grid = h('div', { class: 'bg-grid' });
    const current = store.getBoard()?.background || 'navy';
    BACKGROUNDS.forEach((b) => {
      grid.append(h('button', {
        class: 'bg-swatch' + (current === b.id ? ' selected' : ''),
        style: { background: b.css },
        title: b.label,
        onclick: () => {
          saveBoard((bd) => { bd.background = b.id; });
          applyBackground();
          closeModal();
        },
      }, h('span', {}, b.label)));
    });
    const picker = h('input', { type: 'color', value: current.startsWith('custom:') ? current.slice(7) : '#3a6ea5' });
    picker.addEventListener('input', () => {
      saveBoard((bd) => { bd.background = 'custom:' + picker.value; });
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
        unmountAll();
        await store.importData(file);
        closeModal();
        showLauncher();
        toast('Backup restored');
      } catch (err) {
        toast(err.message || 'Could not read that file');
      }
    });

    body.append(
      h('section', { class: 'panel' },
        h('h3', {}, 'Your data stays on this computer'),
        h('p', {}, 'Boards, class lists, points and settings are saved only in this browser. Nothing is uploaded. ' +
          'If you clear your browser data or switch computers, they won’t come with you, so download a backup now and then.'),
        h('p', { class: 'muted' }, 'The backup holds every board, every class list and their points. Restoring one replaces what is in this browser now.'),
        h('p', { class: 'muted' }, `Last backup: ${last}`),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn primary', onclick: () => { store.exportData(); toast('Backup downloaded'); closeModal(); } }, 'Download backup'),
          h('button', { class: 'btn', onclick: () => fileInput.click() }, 'Restore from backup'),
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
        h('p', {}, 'Removes all boards, class lists and settings from this browser.'),
        confirmButton('Clear everything', 'Click again to clear', () => {
          unmountAll();
          store.resetAll();
          showLauncher();
          closeModal();
          toast('Everything cleared');
        }),
      ),
    );
  });
}

// ---------- Window manager ----------
function boardWidgets() {
  return store.getBoard()?.widgets || [];
}

function stageSize() {
  const r = stage.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
}

// Every change to the open board goes through here, so it autosaves.
function saveBoard(mutator) {
  store.updateBoard(mutator, { viewport: stageSize() });
}

function maxZ() {
  return boardWidgets().reduce((m, w) => Math.max(m, w.z || 0), 0);
}

function addWidget(type) {
  if (!store.getBoard()) return;
  const def = widgetByType[type];
  const rect = stage.getBoundingClientRect();
  const count = boardWidgets().length;
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
  saveBoard((b) => { b.widgets.push(record); });
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
  saveBoard((b) => { b.widgets = b.widgets.filter((w) => w.id !== id); });
  updateEmptyHint();
}

function record(id) {
  return boardWidgets().find((w) => w.id === id);
}

function bringToFront(id, el) {
  const rec = record(id);
  const top = maxZ();
  if (rec.z === top) return;
  rec.z = top + 1;
  el.style.zIndex = rec.z;
  saveBoard();
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

  const titleText = h('span', {}, def.title);
  const titleEl = h('span', { class: 'widget-title' }, toolTile(def, 'mini'), titleText);
  const closeBtn = h('button', { class: 'widget-close', title: 'Close', 'aria-label': `Close ${def.title}` }, icon('x'));
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
      saveBoard();
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
      saveBoard();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  // Context passed to each widget
  const classListeners = new Set();
  let alive = true; // false once this board is closed, so late saves are ignored
  const ctx = {
    el,
    store,
    get state() { return rec.state; },
    save(patch) {
      if (!alive) return;
      Object.assign(rec.state, patch);
      saveBoard();
    },
    setTitle(text) { titleText.textContent = text || def.title; },
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
  mounted.set(rec.id, { el, instance, classListeners, setAlive: (v) => { alive = v; } });
}

// Removes every tool from the screen. With save: false, tools cannot write
// on the way out (used when another window has just changed this board).
function unmountAll({ save = true } = {}) {
  for (const [, m] of mounted) {
    m.setAlive(save);
    try { m.instance?.destroy?.(); } catch (err) { /* ignore */ }
    m.setAlive(false);
    m.el.remove();
  }
  mounted.clear();
}

function mountAll() {
  boardWidgets().forEach(mountWidget);
  applyBackground();
  updateEmptyHint();
  updateBoardBar();
}

function updateEmptyHint() {
  emptyHint.hidden = !store.getBoard() || boardWidgets().length > 0;
}

// ---------- Boards ----------
const boardNameBtn = document.getElementById('board-name');
const saveStatus = document.getElementById('save-status');

function openBoardById(id) {
  unmountAll();
  store.flush();
  const b = store.openBoard(id);
  if (!b) {
    toast('That board could not be found');
    showLauncher();
    return;
  }
  mountAll();
}

function leaveToLauncher() {
  // The board stays open underneath, so “Back” returns to it instantly.
  showLauncher();
}

function updateBoardBar() {
  const b = store.getBoard();
  boardNameBtn.textContent = b ? b.name : '';
  document.title = b ? `${b.name} · 杏坛` : '杏坛 · ClassroomBoard';
}

function renderSaveStatus(s) {
  const labels = {
    saved: ['check', 'Saved', 'Saved in this browser'],
    saving: ['refresh', 'Saving…', 'Saving in this browser'],
    error: ['alert-triangle', 'Not saved', 'This browser would not save. Its storage may be full: download a backup from Settings.'],
  };
  const [ic, text, title] = labels[s] || labels.saved;
  saveStatus.replaceChildren(icon(ic), text);
  saveStatus.title = title;
  saveStatus.dataset.state = s;
}
store.onStatus(renderSaveStatus);
renderSaveStatus(store.getStatus());

function renameCurrentBoard() {
  const b = store.getBoard();
  if (!b) return;
  openModal('Rename board', (body) => {
    const input = h('input', { type: 'text', class: 'input', value: b.name, maxlength: 80, 'aria-label': 'Board name' });
    const form = h('form', { class: 'row gap' }, input, h('button', { class: 'btn primary', type: 'submit' }, 'Save'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) store.renameBoard(b.id, input.value);
      updateBoardBar();
      closeModal();
    });
    body.append(form);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

document.getElementById('btn-boards').addEventListener('click', leaveToLauncher);
boardNameBtn.addEventListener('click', renameCurrentBoard);
document.addEventListener('board-renamed', updateBoardBar);

initLauncher({ onOpen: (id) => { if (store.getBoard()?.id !== id) openBoardById(id); } });

// Another window of the app changed something.
store.watchOtherWindows({
  list: refreshLauncher,
  board: (b) => {
    unmountAll({ save: false });
    if (!b) {
      toast('This board was deleted in another window');
      store.closeBoard();
      updateBoardBar();
      showLauncher();
      return;
    }
    mountAll();
  },
});

// Tell widgets when class lists change
store.subscribe(() => {
  for (const [, m] of mounted) m.classListeners.forEach((fn) => fn());
});

// ---------- Dock & top-right menu ----------
function buildChrome() {
  const put = (id, name) => document.getElementById(id).prepend(icon(name));
  put('btn-boards', 'layout-grid');
  put('btn-classes', 'users');
  put('btn-background', 'palette');
  put('btn-settings', 'settings');
  put('btn-fullscreen', 'maximize');
  put('modal-close', 'x');
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
// Autosave means there is normally nothing to lose. The browser's own
// "Leave site?" warning appears only if the last save failed.
window.addEventListener('beforeunload', (e) => {
  if (!store.flush()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });

buildChrome();
initDock({ onAdd: addWidget });
store.subscribe(() => { if (!dockEditing()) renderDock(); });

// On a reload, reopen the board this window had open. Otherwise ask which one.
const resumeId = store.sessionBoardId();
if (resumeId) openBoardById(resumeId);
else showLauncher();

// ---------- Offline support ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline mode unavailable', err));
}
