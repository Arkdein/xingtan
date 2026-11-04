import * as store from './store.js';
import { h, toast, openModal, closeModal, confirmButton } from './ui.js';
import { widgets, widgetByType } from './widgets/index.js';
import { openClassManager } from './classes.js';
import { boardBackgroundCss, boardIsLight, imageKind } from './backgrounds.js';
import * as images from './images.js';
import { initBoardSettings, openBoardSettings } from './boardsettings.js';
import { initLauncher, showLauncher, refreshLauncher } from './boards.js';

const stage = document.getElementById('stage');
const dock = document.getElementById('dock');
const emptyHint = document.getElementById('empty-hint');
const mounted = new Map(); // widget id -> { el, instance }

// ---------- Backgrounds ----------
function applyBackground() {
  const b = store.getBoard();
  const k = imageKind(b?.background || '');
  // Uploaded images load from IndexedDB; show a plain colour until then.
  if (k?.kind === 'upload' && !images.cachedFullUrl(k.id)) {
    images.fullUrl(k.id).then((u) => { if (u && store.getBoard() === b) applyBackground(); }).catch(() => {});
  }
  document.body.style.background = b ? boardBackgroundCss(b) : '';
  // Pick light or dark corner controls depending on the background.
  document.body.classList.toggle('light-bg', !!b && boardIsLight(b));
  document.body.classList.toggle('img-bg', !!k);
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
        h('p', { class: 'muted' }, 'The backup holds every board, every class list and their points, and any uploaded background images in use. Restoring one replaces what is in this browser now.'),
        h('p', { class: 'muted' }, `Last backup: ${last}`),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn primary', onclick: async (e) => {
            e.currentTarget.disabled = true;
            try { await store.exportData(); toast('Backup downloaded'); } catch (err) { toast('Could not make the backup'); }
            closeModal();
          } }, '⬇ Download backup'),
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
    saved: ['✓ Saved', 'Saved in this browser'],
    saving: ['Saving…', 'Saving in this browser'],
    error: ['⚠ Not saved', 'This browser would not save. Its storage may be full: download a backup from ⚙️.'],
  };
  const [text, title] = labels[s] || labels.saved;
  saveStatus.textContent = text;
  saveStatus.title = title;
  saveStatus.dataset.state = s;
}
store.onStatus(renderSaveStatus);
renderSaveStatus(store.getStatus());

document.getElementById('btn-boards').addEventListener('click', leaveToLauncher);
boardNameBtn.addEventListener('click', () => openBoardSettings('name'));
initBoardSettings({ saveBoard, applyBackground, updateBoardBar });
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
document.getElementById('btn-background').addEventListener('click', () => openBoardSettings('background'));
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

buildDock();

// On a reload, reopen the board this window had open. Otherwise ask which one.
const resumeId = store.sessionBoardId();
if (resumeId) openBoardById(resumeId);
else showLauncher();

// ---------- Offline support ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline mode unavailable', err));
}
