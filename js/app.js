import * as store from './store.js';
import { h, toast, openModal, closeModal, confirmButton } from './ui.js';
import { widgetByType } from './widgets/index.js';
import { openClassManager } from './classes.js';
import { boardBackgroundCss, boardIsLight, imageKind } from './backgrounds.js';
import * as images from './images.js';
import { initBoardSettings, openBoardSettings } from './boardsettings.js';
import { initLauncher, showLauncher, refreshLauncher } from './boards.js';
import { initDock, toolTile, render as renderDock, isEditing as dockEditing, dockSpace } from './dock.js';
import { icon } from './icons.js';
import * as google from './google.js';
import { t, locale, getLang, setLang, onLangChange } from './i18n.js';

const stage = document.getElementById('stage');
const emptyHint = document.getElementById('empty-hint');
const mounted = new Map(); // widget id -> { el, instance }
const boardDataListeners = new Map(); // tool type -> Set of fns, for tools of one type on the same board

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
const fmtDate = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const nBoards = (n) => (n === 1 ? t('{n} board', { n }) : t('{n} boards', { n }));
const nClasses = (n) => (n === 1 ? t('{n} class', { n }) : t('{n} classes', { n }));

async function downloadBackup() {
  try {
    await store.exportData();
    toast(t('Backup downloaded'));
    store.protectStorage(); // a good moment to ask again: the teacher clearly cares about this data
    return true;
  } catch (err) {
    toast(t('Could not make the backup'));
    return false;
  }
}

let settingsShowing = false;
// The close event arrives a moment later, so ignore it if Settings has just reopened.
document.getElementById('modal').addEventListener('close', (e) => { if (!e.target.open) settingsShowing = false; });

function openSettings() {
  settingsShowing = true;
  openModal(t('Backup and settings'), (body) => {
    const s = store.get();
    const last = s.lastBackup ? fmtDate(s.lastBackup) : t('never');
    const due = store.backupReminder();
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      let backup;
      try { backup = await store.readBackupFile(file); } catch (err) { toast(err.message || t('Could not read that file'), 4000); return; }
      confirmRestore(backup);
    });

    const keepNote = h('p', { class: 'muted keep-note' });
    store.storageProtection().then((state) => {
      if (state === 'kept') {
        keepNote.replaceChildren(icon('check'), t('This browser has agreed to keep the app’s data, even if the computer runs low on space.'));
        keepNote.dataset.state = 'kept';
      } else if (state === 'best-effort') {
        keepNote.replaceChildren(icon('alert-triangle'), t('This browser may clear the app’s data by itself if the computer runs very low on space. Installing the app (see “Use it offline” below) or bookmarking this page usually stops that.'));
        keepNote.dataset.state = 'best-effort';
      } else keepNote.remove();
    });

    body.append(
      languagePanel(),
      h('section', { class: 'panel' },
        h('h3', {}, t('Your data stays on this computer')),
        h('p', {}, t('Boards, class lists, points and settings are saved only in this browser. Nothing is uploaded. If you clear your browser data or switch computers, they won’t come with you, so download a backup now and then.')),
        h('p', { class: 'muted' }, t('In Chrome, “Clear browsing data” deletes everything here if “Cookies and other site data” is ticked (it is by default). Clearing only “Cached images and files” is safe. Private (Incognito) and Guest windows forget everything when they close.')),
        h('p', { class: 'muted' }, t('The backup holds every board, every class list and their points, Dictation word lists, and any uploaded pictures in use. Restoring one replaces what is in this browser now.')),
        h('p', { class: due ? 'backup-last due' : 'muted backup-last' }, due ? icon('alert-triangle') : null, t('Last backup: {when}', { when: last })),
        keepNote,
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn primary', onclick: async (e) => {
            e.currentTarget.disabled = true;
            await downloadBackup();
            closeModal();
            refreshLauncher();
          } }, t('Download backup')),
          h('button', { class: 'btn', onclick: () => fileInput.click() }, t('Restore from backup')),
          fileInput,
        ),
      ),
      storagePanel(),
      googlePanel(),
      h('section', { class: 'panel' },
        h('h3', {}, t('Use it offline')),
        h('p', {}, t('After your first visit, this page works without internet. In Chrome or Edge, use the install icon in the address bar (or menu → “Install app”) to open it like a normal app.')),
      ),
      h('section', { class: 'panel' },
        h('h3', {}, t('Start over')),
        h('p', {}, t('Removes all boards, class lists and settings from this browser.')),
        confirmButton(t('Clear everything'), t('Click again to clear'), () => {
          unmountAll();
          store.resetAll();
          showLauncher();
          closeModal();
          toast(t('Everything cleared'));
        }),
      ),
    );
  });
}

// Shows what a backup holds and what it will replace, before anything changes.
function confirmRestore(backup) {
  const here = store.localSummary();
  const doRestore = async () => {
    try {
      unmountAll();
      await store.importData(backup);
      closeModal();
      showLauncher();
      toast(t('Backup restored'));
    } catch (err) {
      toast(err.message || t('Could not restore that backup'), 4000);
    }
  };
  // Nothing here to lose: restore straight away.
  if (!here.boards && !here.classes) { doRestore(); return; }

  const newerHere = here.lastChange && backup.madeAt && Date.parse(here.lastChange) > Date.parse(backup.madeAt);
  openModal(t('Restore this backup?'), (body) => {
    body.append(
      h('section', { class: 'panel restore-check' },
        h('p', {}, h('strong', {}, t('The backup:')), ' ',
          t('{boards}, {classes}', { boards: nBoards(backup.boards.length), classes: nClasses(backup.classes) }),
          backup.madeAt ? t(', made {when}', { when: fmtDate(backup.madeAt) }) : ''),
        h('p', {}, h('strong', {}, t('This browser now:')), ' ',
          t('{boards}, {classes}', { boards: nBoards(here.boards), classes: nClasses(here.classes) }),
          here.lastChange ? t(', last changed {when}', { when: fmtDate(here.lastChange) }) : ''),
        h('p', { class: 'restore-warn' }, icon('alert-triangle'),
          t('Restoring deletes everything in this browser now and puts the backup in its place. This cannot be undone.')),
        newerHere ? h('p', { class: 'restore-warn' }, icon('alert-triangle'),
          t('Some work here is newer than this backup. It will be lost unless you download a backup of it first.')) : null,
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn with-icon', onclick: async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            if (await downloadBackup()) btn.replaceChildren(icon('check'), t('Saved a copy of what’s here'));
            else btn.disabled = false;
          } }, icon('download'), t('First, back up what’s here')),
          confirmButton(t('Replace everything'), t('Click again to replace'), doRestore),
          h('button', { class: 'btn', onclick: closeModal }, t('Cancel')),
        ),
      ),
    );
  });
}

// ---------- Storage meter ----------
function fmtBytes(n) {
  if (!Number.isFinite(n)) return '?';
  if (n < 1024) return t('{n} bytes', { n });
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function storagePanel() {
  const box = h('section', { class: 'panel storage-panel' },
    h('h3', {}, t('Storage on this computer')),
    h('p', { class: 'muted' }, t('Working it out…')));
  store.storageUsage().then((u) => {
    const parts = [
      ['boards', t('Boards and drawings'), u.boards],
      ['pictures', t('Pictures and PDF pages'), u.pictures],
      ['classes', t('Class lists, points and settings'), u.meta],
    ];
    const ours = parts.reduce((s, p) => s + p[2], 0);
    const used = Math.max(u.used ?? ours, ours);
    const quota = u.quota || null;
    const other = Math.max(used - ours, 0);
    // The allowance is usually huge, so the bar shows what the space in use is made of.
    const share = (n) => (used ? Math.max(n / used * 100, n > 0 ? 1.5 : 0) : 0);
    const pct = quota ? used / quota * 100 : 0;
    const level = pct >= 90 ? 'full' : pct >= 70 ? 'high' : 'ok';
    const summary = quota
      ? (pct >= 1
        ? t('Using {used} of about {quota} this browser allows ({pct}%).', { used: fmtBytes(used), quota: fmtBytes(quota), pct: Math.round(pct) })
        : t('Using {used} of about {quota} this browser allows.', { used: fmtBytes(used), quota: fmtBytes(quota) }))
      : t('Using about {used}.', { used: fmtBytes(used) });
    box.replaceChildren(
      h('h3', {}, t('Storage on this computer')),
      h('p', {}, summary),
      used ? h('div', { class: 'storage-bar', 'data-level': level, role: 'img', 'aria-label': summary },
        ...parts.map(([key, , n]) => h('span', { class: `seg seg-${key}`, style: { width: `${share(n)}%` } })),
        other > 0 ? h('span', { class: 'seg seg-other', style: { flex: '1' } }) : null) : null,
      h('ul', { class: 'storage-legend' },
        ...parts.map(([key, label, n]) => h('li', {}, h('span', { class: `dot seg-${key}` }), t('{label}: ', { label }), h('strong', {}, fmtBytes(n)))),
        other > 0
          ? h('li', {}, h('span', { class: 'dot seg-other' }), t('Offline copy of the app and browser overhead: '), h('strong', {}, t('about {size}', { size: fmtBytes(other) })))
          : null),
      u.kind === 'localstorage'
        ? h('p', { class: 'restore-warn' }, icon('alert-triangle'), t('This browser wouldn’t open its larger store (IndexedDB), so boards are kept in the older store, which holds only about 5 MB. Try updating the browser, or using Chrome or Edge.'))
        : level !== 'ok'
          ? h('p', { class: 'restore-warn' }, icon('alert-triangle'), t('Space is running low. Download a backup, then delete boards or pictures you no longer need, or free up space on the computer.'))
          : h('p', { class: 'muted' }, t('The browser sets the limit from the computer’s free disk space, so it changes as the disk fills up. The figures are estimates.')),
    );
  }).catch(() => box.remove());
  return box;
}

// The optional Google connection used by Thinking routine and Poll (see google.js).
function googlePanel() {
  const box = h('section', { class: 'panel' });
  const draw = () => {
    const st = google.status();
    box.replaceChildren(
      h('h3', {}, t('Google connection')),
      h('p', {}, st.connected
        ? t('Connected as {who} for about {min} more minutes. Thinking routine and Poll use it to make Google Forms for students and save their answers to Sheets in your Drive.', { who: st.email || t('your Google account'), min: st.minutesLeft })
        : t('Not connected. Thinking routine and Poll can connect to your Google account so students answer on their own devices. The app can only see the files it makes itself.')),
      h('p', { class: 'muted' }, t('The sign-in lasts about an hour and is kept in this tab only.'), ' ', h('a', { href: 'privacy.html', target: '_blank', rel: 'noopener' }, t('Privacy'))),
      h('div', { class: 'row gap wrap' },
        st.connected
          ? h('button', { class: 'btn', onclick: () => { google.disconnect(); draw(); toast(t('Disconnected from Google')); } }, t('Disconnect'))
          : h('button', { class: 'btn', onclick: async () => { try { await google.connect(); } catch (e) { toast(e.message, 4000); } draw(); } }, t('Connect Google')),
      ),
    );
  };
  draw();
  return box;
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
  // The dock floats over the bottom of the board: place new tools above it.
  const usableH = rect.height - dockSpace();
  const count = boardWidgets().length;
  const w = Math.min(def.size.w, rect.width - 20);
  const hgt = Math.max(120, Math.min(def.size.h, usableH - 20));
  const offset = (count % 6) * 30;
  const record = {
    id: store.uid(),
    type,
    x: Math.max(10, Math.round((rect.width - w) / 2 - 90 + offset)),
    y: Math.max(10, Math.round((usableH - hgt) / 2 - 80 + offset)),
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

  const title = t(def.title);
  const titleText = h('span', {}, title);
  const titleEl = h('span', { class: 'widget-title' }, toolTile(def, 'mini'), titleText);
  const closeBtn = h('button', { class: 'widget-close', title: t('Close'), 'aria-label': t('Close {tool}', { tool: title }) }, icon('x'));
  const header = h('header', { class: 'widget-head' }, titleEl, closeBtn);
  const body = h('div', { class: 'widget-body' });
  const grip = h('div', { class: 'widget-resize', title: t('Resize'), 'aria-hidden': 'true' });
  const el = h('section', { class: `widget widget-${rec.type}`, 'data-id': rec.id, 'aria-label': title }, header, body, grip);
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
  let ownBoardListener = null;
  const ctx = {
    el,
    store,
    get state() { return rec.state; },
    save(patch) {
      if (!alive) return;
      Object.assign(rec.state, patch);
      saveBoard();
    },
    // Data kept on the board itself, shared by every tool of this type on it,
    // so it stays when the tool is closed and comes back when it is added again.
    get boardData() { return store.getBoard()?.toolData?.[rec.type] || {}; },
    saveBoardData(patch) {
      if (!alive) return;
      saveBoard((b) => { b.toolData[rec.type] = { ...(b.toolData[rec.type] || {}), ...patch }; });
      boardDataListeners.get(rec.type)?.forEach((fn) => { if (fn !== ownBoardListener) fn(); });
    },
    onBoardDataChange(fn) {
      ownBoardListener = fn;
      if (!boardDataListeners.has(rec.type)) boardDataListeners.set(rec.type, new Set());
      boardDataListeners.get(rec.type).add(fn);
      return () => boardDataListeners.get(rec.type)?.delete(fn);
    },
    setTitle(text) { titleText.textContent = text || title; },
    toast,
    openClasses: () => openClassManager(),
    onClassesChange(fn) { classListeners.add(fn); return () => classListeners.delete(fn); },
  };

  let instance = null;
  try {
    instance = def.mount(body, ctx) || null;
  } catch (err) {
    console.error(err);
    body.append(h('p', { class: 'error' }, t('This tool failed to load.')));
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
  renderDock(); // each board remembers whether its dock is hidden
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
    toast(t('That board could not be found'));
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
  saveStatus.replaceChildren(icon(ic), t(text));
  saveStatus.title = t(title);
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
      toast(t('This board was deleted in another window'));
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

// ---------- Interface language ----------
// Two buttons, English and 中文, each named in its own language so it can be
// found whichever language is showing.
function languageSwitch() {
  const cur = getLang();
  // Same buttons as the rest of Settings: the language in use is the filled one.
  return h('div', { class: 'row gap wrap lang-switch', role: 'group', 'aria-label': 'Language · 语言' },
    h('button', { class: 'btn' + (cur === 'en' ? ' primary' : ''), 'aria-pressed': String(cur === 'en'), lang: 'en', onclick: () => setLang('en') }, 'English'),
    h('button', { class: 'btn' + (cur === 'zh' ? ' primary' : ''), 'aria-pressed': String(cur === 'zh'), lang: 'zh', onclick: () => setLang('zh') }, '中文'));
}

function languagePanel() {
  return h('section', { class: 'panel' },
    h('h3', {}, 'Language · 语言'),
    h('p', { class: 'muted' }, t('Buttons, menus and messages in the app. Work mode signs and student-facing text in some tools have their own language setting.')),
    languageSwitch());
}

// Text written in index.html: data-i18n (text), data-i18n-title, data-i18n-aria.
function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// The corner button switches straight to the other language.
const langBtn = document.getElementById('btn-lang');
function updateLangButton() {
  const zh = getLang() === 'zh';
  langBtn.textContent = zh ? 'EN' : '中文';
  langBtn.lang = zh ? 'en' : 'zh';
  langBtn.title = zh ? 'Switch to English' : '切换到中文';
  langBtn.setAttribute('aria-label', langBtn.title);
}
langBtn.addEventListener('click', () => setLang(getLang() === 'zh' ? 'en' : 'zh'));

// Rebuild everything on screen in the new language. Tools are re-opened from
// their saved state, so nothing on the board changes (a running timer keeps
// running; a noise meter that was listening needs Start again).
onLangChange(() => {
  const settingsOpen = settingsShowing && document.getElementById('modal').open;
  closeModal();
  applyStaticText();
  updateLangButton();
  renderSaveStatus(store.getStatus());
  if (store.getBoard()) { unmountAll(); mountAll(); }
  renderDock();
  refreshLauncher();
  if (settingsOpen) openSettings(); // switched from Settings: stay there
  toast(getLang() === 'zh' ? '已切换到中文' : 'Switched to English');
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
document.getElementById('btn-background').addEventListener('click', () => openBoardSettings('background'));
document.getElementById('btn-settings').addEventListener('click', openSettings);
document.getElementById('btn-fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => toast(t('Full screen not available here')));
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
// Saves finish a moment after a change; flushOnExit also keeps an emergency
// copy so a window closed straight after an edit loses nothing.
window.addEventListener('beforeunload', (e) => {
  if (!store.flushOnExit()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
window.addEventListener('pagehide', () => store.flushOnExit());
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flushOnExit(); });

applyStaticText();
updateLangButton();
buildChrome();
initDock({ onAdd: addWidget });
store.subscribe(() => { if (!dockEditing()) renderDock(); });

// Ask the browser not to clear the app's data under disk pressure (see store.protectStorage).
if (store.hasData()) store.protectStorage();

// On a reload, reopen the board this window had open. Otherwise ask which one.
const resumeId = store.sessionBoardId();
if (resumeId) openBoardById(resumeId);
else showLauncher();

// ---------- Offline support ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline mode unavailable', err));
}
