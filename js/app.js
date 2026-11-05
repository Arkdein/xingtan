import * as store from './store.js';
import { h, toast, openModal, closeModal, confirmButton } from './ui.js';
import { widgetByType } from './widgets/index.js';
import { openClassManager } from './classes.js';
import { boardBackgroundCss, boardIsLight, imageKind, imageUrl } from './backgrounds.js';
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
  updateThemeColour();
}

// The installed app's window controls (and, on Windows, the strip they sit
// on) take the page's theme colour, so match it to what is on screen:
// cream on the boards screen, the board's own background on a board.
const themeMeta = document.querySelector('meta[name="theme-color"]');
function updateThemeColour() {
  const b = store.getBoard();
  let colour = '#f7f1e8';
  if (b && !document.body.classList.contains('launcher-open')) {
    if (imageKind(b.background || '')) {
      // A photo: use the colour along its top edge (worked out below).
      colour = '#1f3a5f';
      photoTopColour(b).then((c) => {
        const now = store.getBoard();
        if (c && now && now.background === b.background && !document.body.classList.contains('launcher-open')) themeMeta?.setAttribute('content', c);
      });
    } else {
      colour = String(boardBackgroundCss(b)).match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i)?.[0] || '#1f3a5f';
    }
  }
  themeMeta?.setAttribute('content', colour);
}

// Average colour of the top strip of a board's background photo, after the
// brightness setting, so the window's title bar blends into the picture.
const topColourCache = new Map();
async function photoTopColour(b) {
  const url = imageUrl(b.background, { thumb: true }) || imageUrl(b.background);
  if (!url) return null;
  const key = `${url}|${b.bgDim || 0}`;
  if (topColourCache.has(key)) return topColourCache.get(key);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = 48;
    const h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth * 0.06));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * 0.06, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    let r = 0, gr = 0, bl = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) { r += px[i]; gr += px[i + 1]; bl += px[i + 2]; n++; }
    const d = Math.max(-60, Math.min(60, Number(b.bgDim) || 0)) / 100;
    const adj = (v) => Math.round(d > 0 ? v * (1 - d) : v + (255 - v) * -d);
    const hex = '#' + [r / n, gr / n, bl / n].map((v) => adj(v).toString(16).padStart(2, '0')).join('');
    topColourCache.set(key, hex);
    return hex;
  } catch (err) {
    return null;
  }
}
new MutationObserver(updateThemeColour).observe(document.body, { attributes: true, attributeFilter: ['class'] });

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
        h('p', { class: 'muted' }, t('The backup holds every board, every class list and their points, Dictation word lists, and any uploaded pictures and music files in use. Restoring one replaces what is in this browser now.')),
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
      ['music', t('Music files'), u.music || 0],
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

// ---------- Shelf for minimised tools ----------
// Minimised tools line up down the left edge of the board, live chips
// (Timer, Clock…) first. Chips that only show a tool's name are icon-only
// there. When the column is full, the rest go under "+N more".
const SHELF_X = 10;
const SHELF_STEP = 56;   // chip height (50) and gap
const SHELF_DROP = 70;   // a chip dropped this close to the left edge goes back on the shelf
const shelfMore = h('button', { class: 'shelf-more', hidden: true });
let shelfPop = null;
stage.append(shelfMore);

const onShelf = (rec) => rec.min && !rec.free;
const isLive = (m) => !!m?.mini?.classList.contains('has-extra');

function shelfTop() {
  const bar = document.querySelector('.board-bar')?.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  return Math.max(10, Math.round((bar?.bottom || 52) - st.top + 12));
}

function shelfList() {
  return boardWidgets().filter(onShelf).map((rec) => ({ rec, m: mounted.get(rec.id) })).filter((x) => x.m)
    .sort((a, b) => (isLive(b.m) - isLive(a.m)) || ((a.rec.minAt || 0) - (b.rec.minAt || 0)));
}

function layoutShelf() {
  closeShelfPop();
  for (const [id, m] of mounted) {
    const rec = record(id);
    if (!rec || !onShelf(rec)) m.el.classList.remove('on-shelf', 'shelf-hidden');
  }
  const list = shelfList();
  const top = shelfTop();
  const room = stage.getBoundingClientRect().height - dockSpace() - top - 8;
  const fit = Math.max(1, Math.floor(room / SHELF_STEP));
  const shown = list.length > fit ? fit - 1 : list.length;
  list.forEach(({ rec, m }, i) => {
    m.el.classList.add('on-shelf');
    m.el.classList.toggle('shelf-hidden', i >= shown);
    if (i < shown) { rec.mx = SHELF_X; rec.my = top + i * SHELF_STEP; placeEl(m.el, rec); }
  });
  const hiddenN = list.length - shown;
  shelfMore.hidden = hiddenN <= 0;
  if (hiddenN > 0) {
    shelfMore.replaceChildren(icon('dots'), t('{n} more', { n: hiddenN }));
    shelfMore.title = t('Show the other minimised tools');
    Object.assign(shelfMore.style, { left: SHELF_X + 'px', top: (top + shown * SHELF_STEP + 4) + 'px' });
  }
  updateMinAllButtons();
}

function closeShelfPop() { shelfPop?.remove(); shelfPop = null; }

shelfMore.addEventListener('click', () => {
  if (shelfPop) { closeShelfPop(); return; }
  const list = shelfList().filter(({ m }) => m.el.classList.contains('shelf-hidden'));
  shelfPop = h('div', { class: 'shelf-pop', role: 'menu' },
    ...list.map(({ m }) => {
      const live = isLive(m) ? m.mini.querySelector('.widget-mini-extra')?.innerText.replace(/\s+/g, ' ').trim() : '';
      return h('button', { class: 'shelf-pop-item', role: 'menuitem', onclick: () => { closeShelfPop(); m.setMinimized(false); } },
        toolTile(m.def, 'small'), h('span', { class: 'shelf-pop-name' }, m.title), live ? h('span', { class: 'shelf-pop-live' }, live) : null);
    }));
  const r = shelfMore.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  Object.assign(shelfPop.style, { left: (r.right - st.left + 8) + 'px', bottom: Math.max(8, st.bottom - r.bottom) + 'px' });
  stage.append(shelfPop);
  shelfPop.querySelector('button')?.focus();
});
document.addEventListener('pointerdown', (e) => {
  if (shelfPop && !shelfPop.contains(e.target) && !shelfMore.contains(e.target)) closeShelfPop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shelfPop) { closeShelfPop(); shelfMore.focus(); } });

// A strip down the left edge lights up while a chip is dragged near it.
const shelfHint = h('div', { class: 'shelf-drop', hidden: true });
stage.append(shelfHint);
function shelfDropHint(on) { shelfHint.hidden = !on; }

// The dock's height changes when it is hidden or wraps onto another row.
new MutationObserver(() => { if (store.getBoard()) layoutShelf(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

// ---------- Minimise all / open all ----------
const minAllBtn = document.getElementById('btn-min-all');
const openAllBtn = document.getElementById('btn-open-all');
function updateMinAllButtons() {
  const ws = store.getBoard() ? boardWidgets() : [];
  minAllBtn.hidden = !ws.some((w) => !w.min);
  openAllBtn.hidden = !ws.some((w) => w.min);
}
minAllBtn.addEventListener('click', () => {
  const base = Date.now();
  boardWidgets().filter((w) => !w.min).forEach((w, i) => mounted.get(w.id)?.setMinimized(true, { focus: false, save: false, order: base + i }));
  saveBoard();
  layoutShelf();
});
openAllBtn.addEventListener('click', () => {
  boardWidgets().filter((w) => w.min).forEach((w) => mounted.get(w.id)?.setMinimized(false, { focus: false, save: false }));
  saveBoard();
  layoutShelf();
});

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
  updateMinAllButtons();
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
  layoutShelf();
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

// A minimised tool (rec.min) shows as a small chip at rec.mx, rec.my; its
// full size and place (x, y, w, h) are kept for when it is opened again.
const MINI_W = 120, MINI_H = 56;

function clampRect(rec) {
  const rect = stage.getBoundingClientRect();
  if (rec.min) {
    rec.mx = Math.max(0, Math.min(rec.mx ?? rec.x, rect.width - 60));
    rec.my = Math.max(0, Math.min(rec.my ?? rec.y, rect.height - 44));
  }
  rec.w = Math.max(160, Math.min(rec.w, rect.width));
  rec.h = Math.max(120, Math.min(rec.h, rect.height));
  rec.x = Math.max(0, Math.min(rec.x, rect.width - 80));
  rec.y = Math.max(0, Math.min(rec.y, rect.height - 44));
}

function placeEl(el, rec) {
  el.classList.toggle('is-min', !!rec.min);
  if (rec.min) {
    Object.assign(el.style, { left: rec.mx + 'px', top: rec.my + 'px', width: '', height: '', zIndex: rec.z });
    return;
  }
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
  // Every tool can shrink to a small chip on the board and keep working
  // (a tool can opt out with `minimize: false`).
  const canMin = def.minimize !== false;
  const minBtn = canMin
    ? h('button', { class: 'widget-close widget-min', title: t('Minimise'), 'aria-label': t('Minimise {tool}', { tool: title }) }, icon('minus'))
    : null;
  const header = h('header', { class: 'widget-head' }, titleEl, h('span', { class: 'widget-head-btns' }, minBtn, closeBtn));
  const body = h('div', { class: 'widget-body' });
  const grip = h('div', { class: 'widget-resize', title: t('Resize'), 'aria-hidden': 'true' });
  // The chip's name is shown only for tools that put nothing else on their chip.
  const miniLabel = h('span', { class: 'widget-mini-label' }, title);
  const miniOpen = canMin
    ? h('button', { class: 'widget-mini-open', title: t('Open {tool} (drag to move)', { tool: title }), 'aria-label': t('Open {tool}', { tool: title }) }, toolTile(def, 'small'), miniLabel)
    : null;
  const miniExtra = h('span', { class: 'widget-mini-extra' });
  const mini = canMin ? h('div', { class: 'widget-mini' }, miniOpen, miniExtra) : null;
  const minListeners = new Set();
  let miniLabelSet = false;
  const el = h('section', { class: `widget widget-${rec.type}`, 'data-id': rec.id, 'aria-label': title }, header, body, grip, mini);
  placeEl(el, rec);
  stage.append(el);

  closeBtn.addEventListener('click', () => removeWidget(rec.id));
  el.addEventListener('pointerdown', () => bringToFront(rec.id, el), true);

  // Minimised tools go on the shelf (rec.free = false); a chip dragged off it stays where it is put.
  function setMinimized(on, { focus = true, order = Date.now(), save = true } = {}) {
    if (!!rec.min === on) return;
    if (on) {
      rec.min = true;
      rec.minAt = order;
      delete rec.free;
      if (rec.mx == null) { rec.mx = rec.x; rec.my = rec.y; }
    } else { delete rec.min; delete rec.free; }
    el.classList.remove('on-shelf', 'shelf-hidden');
    clampRect(rec);
    placeEl(el, rec);
    if (on) bringToFront(rec.id, el);
    minListeners.forEach((fn) => { try { fn(on); } catch (err) { console.warn(err); } });
    if (save) { saveBoard(); layoutShelf(); }
    if (focus) (on ? miniOpen : minBtn)?.focus({ preventScroll: true });
  }
  minBtn?.addEventListener('click', () => setMinimized(true));

  // The chip: drag it to move it, click it to open the tool again.
  miniOpen?.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    miniOpen.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const ox = rec.mx, oy = rec.my;
    const wasFree = !!rec.free;
    let moved = false;
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
      moved = true;
      el.classList.add('dragging');
      el.classList.remove('on-shelf');
      rec.mx = ox + ev.clientX - startX;
      rec.my = oy + ev.clientY - startY;
      clampRect(rec);
      placeEl(el, rec);
      shelfDropHint(rec.mx < SHELF_DROP);
    };
    const up = (ev) => {
      miniOpen.removeEventListener('pointermove', move);
      miniOpen.removeEventListener('pointerup', up);
      miniOpen.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      shelfDropHint(false);
      if (moved) {
        // Dropped near the left edge: back on the shelf (at the end if it came from the board).
        if (rec.mx < SHELF_DROP) { if (wasFree) rec.minAt = Date.now(); delete rec.free; } else rec.free = true;
        saveBoard();
        layoutShelf();
      } else if (ev.type === 'pointerup') setMinimized(false);
    };
    miniOpen.addEventListener('pointermove', move);
    miniOpen.addEventListener('pointerup', up);
    miniOpen.addEventListener('pointercancel', up);
  });
  miniOpen?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMinimized(false); }
  });

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
    setTitle(text) { titleText.textContent = text || title; if (!miniLabelSet) miniLabel.textContent = text || title; },
    // Name-only chips: show this instead of the tool's name (such as a Text tool's first line).
    // It stays readable on the shelf, where name-only chips are otherwise icon-only.
    setMiniLabel(text) {
      miniLabelSet = !!text;
      miniLabel.textContent = text || titleText.textContent;
      miniLabel.title = text || '';
      mini?.classList.toggle('has-label', miniLabelSet);
    },
    // Minimisable tools: controls shown next to the chip (such as play / pause).
    setMiniControls(...nodes) {
      miniExtra.replaceChildren(...nodes.filter(Boolean));
      mini?.classList.toggle('has-extra', miniExtra.childNodes.length > 0);
    },
    get minimized() { return !!rec.min; },
    // fn(true) when the tool is minimised, fn(false) when it is opened again.
    onMinimize(fn) { minListeners.add(fn); return () => minListeners.delete(fn); },
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
  mounted.set(rec.id, { el, instance, classListeners, setAlive: (v) => { alive = v; }, setMinimized, title, def, mini });
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
  closeShelfPop();
  shelfMore.hidden = true;
}

function mountAll() {
  boardWidgets().forEach(mountWidget);
  requestAnimationFrame(layoutShelf); // after the tools have drawn their chips
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
  put('btn-min-all', 'arrows-minimize');
  put('btn-open-all', 'arrows-maximize');
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
  layoutShelf();
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
