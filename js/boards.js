// The boards screen: shown when the app opens, and from the Boards button.
import * as store from './store.js';
import { h, toast, confirmButton } from './ui.js';
import { widgets, widgetByType } from './widgets/index.js';
import { boardBackgroundCss, boardIsLight, imageKind } from './backgrounds.js';
import * as images from './images.js';
import { icon } from './icons.js';
import { toolTile } from './dock.js';
import { t, locale } from './i18n.js';

const launcher = () => document.getElementById('launcher');
let onOpen = () => {};
let query = '';

// Widgets can define share(state) to drop student names before a board is exported.
const cleaners = Object.fromEntries(widgets.filter((w) => w.share).map((w) => [w.type, w.share]));

export function initLauncher(opts) {
  onOpen = opts.onOpen;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isLauncherOpen() && store.getBoard() && !document.getElementById('modal').open) {
      if (e.target.closest?.('.board-rename')) return;
      hideLauncher();
    }
  });
}

export function isLauncherOpen() { return !launcher().hidden; }

export function showLauncher() {
  store.flush();
  render();
  launcher().hidden = false;
  document.body.classList.add('launcher-open');
  setTimeout(() => launcher().querySelector('.new-board-name')?.focus(), 30);
}

export function hideLauncher() {
  launcher().hidden = true;
  document.body.classList.remove('launcher-open');
  document.dispatchEvent(new Event('launcher-closed'));
}

export function refreshLauncher() {
  if (isLauncherOpen()) render();
}

function open(id) {
  hideLauncher();
  onOpen(id);
}

function render() {
  const el = launcher();
  const current = store.getBoard();
  const boards = store.listBoards();
  const lastId = store.get().lastBoardId;

  // ---- New board ----
  const nameInput = h('input', {
    type: 'text', class: 'input new-board-name', maxlength: 80,
    placeholder: t('New board name, e.g. 25S01 · H2 Translation · L12'),
    'aria-label': t('New board name'),
  });
  const newForm = h('form', { class: 'new-board' }, nameInput,
    h('button', { class: 'btn primary with-icon', type: 'submit' }, icon('plus'), t('New board')));
  newForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const b = store.createBoard(nameInput.value);
      store.protectStorage(); // now there is something worth keeping
      open(b.id);
    } catch (err) {
      toast(t('Could not create a board. This browser’s storage may be full.'));
    }
  });

  // ---- Import ----
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const b = await store.importBoardFile(file);
      toast(t('Imported “{name}”', { name: b.name }));
      render();
    } catch (err) {
      toast(err.message || t('Could not read that file'), 4000);
    }
  });

  // ---- Find, sort and pinned boards ----
  // Only the results are redrawn while typing, so the search box keeps its
  // place, and Chinese input (pinyin) is not interrupted mid-word.
  const results = h('div', { class: 'launcher-results' });
  const search = h('input', {
    type: 'search', class: 'input board-search', placeholder: t('Find a board…'), value: query,
    'aria-label': t('Find a board by name, by words on it, or by class'), title: t('Find a board by name, by words on it, or by class'),
  });
  const onSearch = (e) => { if (e.isComposing) return; query = search.value; fillResults(results, boards, current, lastId); };
  search.addEventListener('input', onSearch);
  search.addEventListener('compositionend', onSearch);

  const sortSel = h('select', { class: 'board-sort', 'aria-label': t('Sort boards'), title: t('Sort boards') },
    ...SORTS.map(([v, label]) => h('option', { value: v, selected: sortOf() === v }, t(label))));
  sortSel.addEventListener('change', () => {
    store.update((m) => { m.boardSort = sortSel.value; }, { notify: false });
    fillResults(results, boards, current, lastId);
  });

  fillResults(results, boards, current, lastId);

  // Uploaded backgrounds load from IndexedDB; draw again once their thumbnails are ready.
  const uploadIds = boards.map((b) => imageKind(b.background || '')).filter((k) => k?.kind === 'upload').map((k) => k.id);
  images.preloadThumbs(uploadIds).then((changed) => { if (changed && isLauncherOpen()) render(); }).catch(() => {});

  // One big button back into the board in use (or the last one used).
  const last = current || boards.find((b) => b.id === lastId) || null;
  const continueBtn = last ? h('button', {
    class: 'continue-btn', onclick: () => (current ? hideLauncher() : open(last.id)),
  },
  h('span', { class: 'continue-text' },
    h('small', {}, current ? t('Back to your board') : t('Continue where you left off')),
    h('span', { class: 'continue-name' }, last.name)),
  icon('arrow-right')) : null;

  el.replaceChildren(
    h('img', { src: 'icons/blossom-branch.svg', alt: '', class: 'launcher-branch', 'aria-hidden': 'true' }),
    h('div', { class: 'launcher-inner' },
    h('header', { class: 'launcher-head' },
      greeting(),
      h('h1', { class: 'launcher-title' }, h('img', { src: 'icons/icon.svg', alt: '', class: 'launcher-logo' }), h('span', { class: 'brand-zh' }, '杏坛'), h('span', { class: 'brand-dot' }, '·'), h('span', { class: 'brand-en' }, 'ClassroomBoard')),
      h('p', { class: 'launcher-sub' }, t('Choose a board to open, or start a new one.')),
      continueBtn,
    ),
    h('div', { class: 'launcher-tools' },
      newForm,
      h('div', { class: 'row gap' },
        boards.length > 6 ? search : null,
        boards.length > 1 ? h('label', { class: 'board-sort-label' }, h('span', {}, t('Sort')), sortSel) : null,
        boards.length > 0 ? viewSwitch(() => fillResults(results, boards, current, lastId)) : null,
        h('button', { class: 'btn with-icon', onclick: () => fileInput.click(), title: t('Add a board file someone shared with you') }, icon('upload'), t('Import board')),
        fileInput,
      ),
    ),
    backupBanner(),
    results,
    h('p', { class: 'launcher-foot' },
      t('Boards save automatically in this browser on this computer. Class lists are shared by all boards.')),
    h('p', { class: 'launcher-guide' },
      h('a', { href: 'guide.html', target: '_blank', rel: 'noopener', class: 'btn with-icon' }, icon('help'), t('User guide')),
      h('span', {}, t('New here? The user guide shows what each tool can do.'))),
    h('p', { class: 'launcher-copy' }, `© ${new Date().getFullYear()} arkdein · 杏坛 · ClassroomBoard`),
  ));
}

const SORTS = [['recent', 'Last used'], ['name', 'Name A–Z'], ['newest', 'Newest']];
const viewOf = () => (store.get().boardView === 'list' ? 'list' : 'cards');
const sortOf = () => (SORTS.some(([v]) => v === store.get().boardSort) ? store.get().boardSort : 'recent');
const pinnedIds = () => new Set(Array.isArray(store.get().pinnedBoards) ? store.get().pinnedBoards : []);

// Cards (with a large preview) or a compact list. Remembered in this browser.
function viewSwitch(refresh) {
  const box = h('div', { class: 'view-switch', role: 'group', 'aria-label': t('Show boards as') });
  const draw = () => {
    const cur = viewOf();
    box.replaceChildren(...[['cards', 'layout-grid', 'Cards'], ['list', 'list', 'List']].map(([v, ic, label]) =>
      h('button', {
        class: 'view-btn' + (cur === v ? ' on' : ''), 'aria-pressed': String(cur === v), title: t(label), 'aria-label': t(label),
        onclick: () => { store.update((m) => { m.boardView = v; }, { notify: false }); draw(); refresh(); },
      }, icon(ic))));
  };
  draw();
  return box;
}

function togglePin(id) {
  store.update((m) => {
    const set = new Set(Array.isArray(m.pinnedBoards) ? m.pinnedBoards : []);
    if (set.has(id)) set.delete(id); else set.add(id);
    m.pinnedBoards = [...set];
  }, { notify: false });
  render();
}

function sortBoards(list) {
  const how = sortOf();
  const by = how === 'name'
    ? (a, b) => a.name.localeCompare(b.name, locale(), { numeric: true, sensitivity: 'base' })
    : how === 'newest'
      ? (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      : (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '');
  return [...list].sort(by);
}

// Words on a board, for search: everything typed into its tools (notes,
// lesson steps, link labels, routine topics…) and the class lists its tools use.
const indexCache = new Map(); // board id -> { at, text, classes }
const SKIP_KEYS = /^(id|.*Id|type|icon|tone|src|url|href|thumb|image|img|mode|view|lang|kind|layout|background|color|colour|bg|fg|font|align|sort|tpl|paper)$/i;
function boardIndex(b) {
  const hit = indexCache.get(b.id);
  if (hit && hit.at === b.updatedAt) return hit;
  const parts = new Set();
  const classIds = new Set();
  const walk = (v, key, depth) => {
    if (v == null || depth > 8) return;
    if (typeof v === 'string') {
      if (key === 'classId') { classIds.add(v); return; }
      if (SKIP_KEYS.test(key || '') || v.length > 5000 || /^(data|blob|https?):/.test(v)) return;
      const plain = (v.includes('<') ? v.replace(/<[^>]*>/g, ' ') : v).replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) parts.add(plain); // a tool may keep the same words twice (e.g. formatted and plain)
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, key, depth + 1));
    } else if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, k, depth + 1);
    }
  };
  b.widgets.forEach((w) => walk(w.state, '', 0));
  walk(b.toolData, '', 0);
  const entry = {
    at: b.updatedAt,
    text: [...parts].join(' · '),
    classes: [...classIds].map((id) => store.getClass(id)?.name).filter(Boolean),
  };
  indexCache.set(b.id, entry);
  return entry;
}

// Does the board match every word typed? Returns why, or null.
function matchBoard(b, q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return {};
  const idx = boardIndex(b);
  const name = b.name.toLowerCase();
  const classes = idx.classes.join(' ').toLowerCase();
  const text = idx.text.toLowerCase();
  if (!terms.every((w) => name.includes(w) || classes.includes(w) || text.includes(w))) return null;
  if (terms.every((w) => name.includes(w))) return {};
  const inClass = idx.classes.find((c) => terms.some((w) => c.toLowerCase().includes(w)));
  if (inClass) return { cls: inClass };
  const w = terms.find((x) => text.includes(x)) || terms[0];
  const at = text.indexOf(w);
  if (at < 0) return {};
  const from = Math.max(0, at - 24);
  const to = Math.min(idx.text.length, at + w.length + 36);
  return {
    snippet: [from > 0 ? '…' : '', idx.text.slice(from, at), idx.text.slice(at, at + w.length), idx.text.slice(at + w.length, to), to < idx.text.length ? '…' : ''],
  };
}

function fillResults(box, boards, current, lastId) {
  const q = query.trim();
  const pins = pinnedIds();
  const matches = new Map();
  const shown = [];
  for (const b of sortBoards(boards)) {
    const m = q ? matchBoard(b, q) : {};
    if (m) { matches.set(b.id, m); shown.push(b); }
  }
  const list = viewOf() === 'list';
  const make = (b) => card(b, { isCurrent: current?.id === b.id, isLast: !current && b.id === lastId, pinned: pins.has(b.id), match: matches.get(b.id), list });
  const group = (items) => h('div', { class: list ? 'board-list' : 'board-grid' }, ...items.map(make));
  const pinned = shown.filter((b) => pins.has(b.id));
  const rest = shown.filter((b) => !pins.has(b.id));

  const parts = [];
  if (boards.length === 0) {
    parts.push(h('div', { class: 'launcher-empty' },
      h('p', {}, t('No boards yet. Give your first board a name above, for example one per class or per lesson.'))));
  } else if (shown.length === 0) {
    parts.push(h('p', { class: 'launcher-empty' }, t('No boards match “{q}”.', { q })));
  }
  if (pinned.length) {
    parts.push(h('h2', { class: 'board-section' }, icon('star'), t('Pinned')), group(pinned));
    if (rest.length) parts.push(h('h2', { class: 'board-section' }, t('Other boards')));
  }
  if (rest.length) parts.push(group(rest));
  box.replaceChildren(...parts);
}

// A gentle reminder when the last backup is a week old (or there has never been one).
function backupBanner() {
  const due = store.backupReminder();
  if (!due) return null;
  const when = due.never
    ? t('You haven’t downloaded a backup yet.')
    : t('Your last backup was {days} days ago.', { days: due.days });
  const dl = h('button', { class: 'btn primary with-icon', onclick: async () => {
    dl.disabled = true;
    try {
      await store.exportData();
      toast(t('Backup downloaded. Keep the file somewhere safe, such as your school drive.'), 4000);
      store.protectStorage();
    } catch (err) {
      toast(t('Could not make the backup'));
    }
    render();
  } }, icon('download'), t('Download backup'));
  return h('div', { class: 'backup-banner', role: 'status' },
    icon('alert-triangle'),
    h('div', { class: 'backup-banner-text' },
      h('strong', {}, t('Back up your boards')),
      h('span', {}, when, ' ', t('Boards are saved only in this browser, so clearing browser data or a computer reset would delete them.'))),
    h('div', { class: 'row gap' },
      dl,
      h('button', { class: 'btn', onclick: () => { store.snoozeBackupReminder(3); render(); } }, t('Later')),
    ),
  );
}

function greeting() {
  const hr = new Date().getHours();
  const hello = hr < 12 ? t('Good morning') : hr < 18 ? t('Good afternoon') : t('Good evening');
  const date = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return h('p', { class: 'launcher-greet' }, hello, h('span', { class: 'launcher-date' }, date));
}

function card(b, { isCurrent, isLast, pinned = false, match = null, list = false }) {
  const nameEl = h('button', { class: 'board-card-name', title: t('Open'), onclick: () => open(b.id) }, b.name);
  const metaRow = h('div', { class: 'board-meta' },
    nameEl,
    h('span', { class: 'board-sub' },
      t('{tools} · edited {when}', {
        tools: b.widgets.length === 1 ? t('{n} tool', { n: 1 }) : t('{n} tools', { n: b.widgets.length }),
        when: relativeTime(b.updatedAt),
      })),
    // Why a search found this board, when it wasn't the name.
    match?.cls ? h('span', { class: 'board-match' }, icon('users'), t('Uses class {name}', { name: match.cls })) : null,
    match?.snippet ? h('span', { class: 'board-match' }, icon('search'),
      h('span', { class: 'board-match-text' }, match.snippet[0], match.snippet[1], h('mark', {}, match.snippet[2]), match.snippet[3], match.snippet[4])) : null,
  );

  const rename = () => {
    const input = h('input', { type: 'text', class: 'input board-rename', value: b.name, maxlength: 80, 'aria-label': t('Board name') });
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save && input.value.trim() && input.value.trim() !== b.name) {
        store.renameBoard(b.id, input.value);
        if (isCurrent) document.dispatchEvent(new CustomEvent('board-renamed'));
      }
      render();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
    nameEl.replaceWith(input);
    input.focus();
    input.select();
  };

  const actions = h('div', { class: 'board-actions' },
    h('button', { class: 'chip with-icon', title: t('Rename'), 'aria-label': t('Rename'), onclick: rename }, icon('pencil'), list ? null : t('Rename')),
    h('button', {
      class: 'chip with-icon', title: t('Make a copy, e.g. to reuse a lesson layout'), 'aria-label': t('Copy'),
      onclick: () => { const c = store.duplicateBoard(b.id); if (c) { toast(t('Copied as “{name}”', { name: c.name })); render(); } },
    }, icon('copy'), list ? null : t('Copy')),
    h('button', {
      class: 'chip with-icon', title: t('Download this board as a file to share. Student names are not included.'), 'aria-label': t('Share'),
      onclick: async () => { await store.exportBoard(b.id, cleaners); toast(t('Board file downloaded (no student names)')); },
    }, icon('download'), list ? null : t('Share')),
    isCurrent ? null : confirmButton(icon('trash'), t('Delete?'), () => {
      store.deleteBoard(b.id);
      toast(t('Deleted “{name}”', { name: b.name }));
      render();
    }, 'chip danger board-delete', { title: t('Delete board (tap twice)'), 'aria-label': t('Delete {name}', { name: b.name }) }),
  );

  const badge = isCurrent ? h('span', { class: 'board-badge' }, t('Open now')) : isLast ? h('span', { class: 'board-badge' }, t('Last used')) : null;
  const pin = h('button', {
    class: 'board-pin' + (pinned ? ' on' : ''), 'aria-pressed': String(pinned),
    title: pinned ? t('Unpin') : t('Pin to the top'), 'aria-label': pinned ? t('Unpin {name}', { name: b.name }) : t('Pin {name} to the top', { name: b.name }),
    onclick: () => togglePin(b.id),
  }, icon('star'));
  const thumbBtn = h('button', { class: 'board-thumb-btn', 'aria-label': t('Open {name}', { name: b.name }), onclick: () => open(b.id) }, thumbnail(b));

  if (list) {
    // One row: small preview, name and details, the tools on it, its classes, pin, buttons.
    const types = [...new Set(b.widgets.map((w) => w.type))].filter((tp) => widgetByType[tp]);
    const tools = h('div', { class: 'board-row-tools', 'aria-label': t('Tools on this board') },
      ...types.slice(0, 6).map((tp) => h('span', { title: t(widgetByType[tp].title) }, toolTile(widgetByType[tp], 'mini'))),
      types.length > 6 ? h('span', { class: 'board-row-more' }, `+${types.length - 6}`) : null);
    const classes = boardIndex(b).classes;
    const classEl = h('div', { class: 'board-row-classes' },
      ...classes.slice(0, 2).map((c) => h('span', { class: 'board-row-class', title: t('Uses class {name}', { name: c }) }, icon('users'), c)),
      classes.length > 2 ? h('span', { class: 'board-row-more' }, `+${classes.length - 2}`) : null);
    if (badge) { const line = h('div', { class: 'board-row-name' }); nameEl.replaceWith(line); line.append(nameEl, badge); }
    return h('article', { class: 'board-row' + (isCurrent ? ' current' : '') }, thumbBtn, metaRow, tools, classEl, pin, actions);
  }

  return h('article', { class: 'board-card' + (isCurrent ? ' current' : '') }, thumbBtn, badge, pin, metaRow, actions);
}

function thumbnail(b) {
  const thumb = h('div', { class: 'board-thumb' + (boardIsLight(b) ? ' is-light' : ''), style: { background: boardBackgroundCss(b, { thumb: true }) } });
  // A minimised tool shows as its small chip.
  const box = (w) => (w.min ? { x: w.mx ?? w.x, y: w.my ?? w.y, w: 120, h: 56 } : w);
  const vw = Math.max(b.viewport?.w || 1280, ...b.widgets.map((w) => box(w).x + box(w).w));
  const vh = Math.max(b.viewport?.h || 720, ...b.widgets.map((w) => box(w).y + box(w).h));
  [...b.widgets].sort((a, c) => (a.z || 0) - (c.z || 0)).map((w) => ({ ...w, ...box(w) })).forEach((w) => {
    const def = widgetByType[w.type];
    thumb.append(h('div', {
      class: 'thumb-widget',
      style: {
        left: (w.x / vw * 100) + '%', top: (w.y / vh * 100) + '%',
        width: (w.w / vw * 100) + '%', height: (w.h / vh * 100) + '%',
      },
    }, def ? toolTile(def, 'thumb') : ''));
  });
  if (!b.widgets.length) thumb.append(h('span', { class: 'thumb-empty' }, t('Empty board')));
  return thumb;
}

function relativeTime(iso) {
  const ts = Date.parse(iso);
  if (!ts) return t('some time ago');
  const diff = (ts - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 45) return t('just now');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return new Date(ts).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
}
