// The boards screen: shown when the app opens, and from the Boards button.
import * as store from './store.js';
import { h, put, toast, confirmButton, openModal, closeModal } from './ui.js';
import * as posts from './textposts.js';
import { widgets, widgetByType } from './widgets/index.js';
import { boardBackgroundCss, boardIsLight, imageKind } from './backgrounds.js';
import * as images from './images.js';
import { icon } from './icons.js';
import { toolTile } from './dock.js';
import { t, locale, getLang } from './i18n.js';
import * as news from './news.js';
import { welcomeDone, markWelcomeDone } from './tour.js';
import { openClassManager } from './classes.js';
import { openBackgroundLibrary } from './boardsettings.js';

const launcher = () => document.getElementById('launcher');
let onOpen = () => {};
let onTour = () => {};
let query = '';

// Widgets can define share(state) to drop student names before a board is exported.
const cleaners = Object.fromEntries(widgets.filter((w) => w.share).map((w) => [w.type, w.share]));
// Saved items on the board (see widgets/saved.js) are cleaned the same way.
const itemCleaners = Object.fromEntries(widgets.filter((w) => w.shareItem).map((w) => [w.type, { clean: w.shareItem, isBlank: w.isBlankItem }]));
// Copy for another class: tools that switch class (forClass) and tools whose
// lesson starts again (freshLesson), see copyDialog below.
const classHooks = Object.fromEntries(widgets.filter((w) => w.forClass).map((w) => [w.type, w.forClass]));
const freshHooks = Object.fromEntries(widgets.filter((w) => w.freshLesson).map((w) => [w.type, w.freshLesson]));

export function initLauncher(opts) {
  onOpen = opts.onOpen;
  // Class lists and My backgrounds open in the shared dialog; their counts change.
  document.getElementById('modal')?.addEventListener('close', () => refreshLauncher());
  news.onChange(() => refreshLauncher());
  onTour = opts.onTour || onTour;
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
      if (store.getFolder(filterOf())) store.setBoardFolder(b.id, filterOf()); // made while a folder is picked: it goes in it
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
      const b = await store.importBoardFile(file, { fallbackFolder: filterOf() });
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
        boards.length > 1 && !store.getFolder(filterOf()) ? h('label', { class: 'board-sort-label' }, h('span', {}, t('Sort')), sortSel) : null,
        boards.length > 0 ? viewSwitch(() => fillResults(results, boards, current, lastId)) : null,
        h('button', { class: 'btn with-icon', onclick: () => fileInput.click(), title: t('Add a board file someone shared with you') }, icon('upload'), t('Import board')),
        fileInput,
      ),
    ),
    welcomeCard(boards) || news.banner(),
    backupBanner(),
    libraryRow(),
    boards.length ? folderBar(boards) : null,
    results,
    h('p', { class: 'launcher-foot' },
      t('Boards save automatically in this browser on this computer. Class lists are shared by all boards.')),
    h('div', { class: 'launcher-guide' },
      h('a', { href: 'guide.html', target: '_blank', rel: 'noopener', class: 'btn with-icon' }, icon('help'), t('User guide')),
      store.getClasses().length ? h('a', { href: 'overview.html', target: '_blank', rel: 'noopener', class: 'btn with-icon', title: t('Every class at a glance: points, 行为表现, groups and students to check in with. Opens in a new tab, away from the projector.') }, icon('users'), t('My classes')) : null,
      guideSearch(),
      h('button', { class: 'btn with-icon', onclick: () => onTour(), title: t('A one-minute look around, on a sample board') }, icon('player-play'), t('Take the tour')),
      h('span', {}, t('New here? The user guide shows what each tool can do.'))),
    h('p', { class: 'launcher-copy' }, `© ${new Date().getFullYear()} arkdein · 杏坛 · ClassroomBoard`),
  ));
}

// ---- First visit on this computer: offer the welcome tour ----
// Shown until the tour is taken or skipped, and only while there are no boards
// (someone who already has boards here doesn't need it; Take the tour is below).
function welcomeCard(boards) {
  if (boards.length || welcomeDone()) return null;
  return h('section', { class: 'welcome-card', 'aria-label': t('Welcome') },
    h('img', { src: 'icons/icon.svg', alt: '', class: 'welcome-logo' }),
    h('div', { class: 'welcome-text' },
      h('h2', {}, t('New to 杏坛?')),
      h('p', {}, t('Take a one-minute tour on a sample board, set up like a real lesson. You can change anything on it, and delete it when you’re done.'))),
    h('div', { class: 'row gap wrap' },
      h('button', { class: 'btn primary with-icon', onclick: () => onTour() }, icon('player-play'), t('Take the tour')),
      h('button', { class: 'btn', onclick: () => { markWelcomeDone(); news.dismissWelcome(); render(); } }, t('I’ll start on my own'))));
}

// ---- Search the user guide, from the boards screen ----
// The guide's content loads the first time the box is used. A tool opens its
// card here (as its ? does on a board); other parts open the guide at that place.
function guideSearch() {
  const ph = getLang() === 'zh' ? '搜索使用指南' : 'Search the guide';
  const stub = h('input', { type: 'search', class: 'gs-input', placeholder: ph, 'aria-label': ph, autocomplete: 'off' });
  const wrap = h('div', { class: 'gs launcher-gs' }, h('span', { class: 'gs-icon', 'aria-hidden': 'true' }, icon('search')), stub);
  let loading = null;
  const load = () => {
    loading ||= import('./guide/search.js').then(({ guideSearchBox }) => {
      const box = guideSearchBox({
        value: stub.value, className: 'launcher-gs',
        onPick: (r) => {
          const def = r.type ? widgetByType[r.type] : null;
          if (def) import('./guide/panel.js').then((m) => m.openToolHelp(def)).catch(() => toast(t('The guide could not be opened')));
          else window.open(`guide.html#${r.id}`, '_blank', 'noopener');
        },
      });
      const had = document.activeElement === stub;
      wrap.replaceWith(box.el);
      if (had) { box.input.focus(); box.setQuery(stub.value); }
    }).catch(() => toast(t('The guide could not be opened')));
  };
  stub.addEventListener('focus', load);
  stub.addEventListener('pointerdown', load);
  return wrap;
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
  // Searching looks in every folder; otherwise only the folder picked above.
  const filter = filterOf();
  // One folder showing: its boards in the order they are presented (◀ 2/5 ▶ on
  // a board), numbered, and dragged to rearrange. Pinned boards keep their star.
  const folderView = !q && !!store.getFolder(filter);
  const inView = q ? boards : boards.filter((b) => inFolder(b.id, filter));
  for (const b of folderView ? store.boardsInFolder(filter) : sortBoards(inView)) {
    const m = q ? matchBoard(b, q) : {};
    if (m) { matches.set(b.id, m); shown.push(b); }
  }
  const list = viewOf() === 'list';
  const make = (b, i) => {
    const el = card(b, { isCurrent: current?.id === b.id, isLast: !current && b.id === lastId, pinned: pins.has(b.id), match: matches.get(b.id), list, order: folderView ? i + 1 : null });
    return folderView ? reorderable(el, b, filter, shown) : el;
  };
  const group = (items) => h('div', { class: list ? 'board-list' : 'board-grid' }, ...items.map(make));
  const pinned = folderView ? [] : shown.filter((b) => pins.has(b.id));
  const rest = folderView ? shown : shown.filter((b) => !pins.has(b.id));
  if (folderView && shown.length > 1) {
    box.replaceChildren(h('p', { class: 'folder-order-hint' }, icon('presentation'),
      t('In presenting order: on each board, ◀ ▶ beside its name (or [ and ]) go to the one before or after. Drag boards to change the order.')), group(rest));
    return;
  }

  const parts = [];
  if (boards.length === 0) {
    parts.push(h('div', { class: 'launcher-empty' },
      h('p', {}, t('No boards yet. Give your first board a name above, for example one per class or per lesson.'))));
  } else if (shown.length === 0 && q) {
    parts.push(h('p', { class: 'launcher-empty' }, t('No boards match “{q}”.', { q })));
  } else if (shown.length === 0) {
    parts.push(h('p', { class: 'launcher-empty' }, filter === 'none'
      ? t('Every board is in a folder.')
      : t('No boards in this folder yet. A new board made here goes in it, or use Move (📁) on a board, or drag a board onto the folder.')));
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

function card(b, { isCurrent, isLast, pinned = false, match = null, list = false, order = null }) {
  const nameEl = h('button', { class: 'board-card-name', title: t('Open'), onclick: () => open(b.id) }, b.name);
  const metaRow = h('div', { class: 'board-meta' },
    nameEl,
    h('span', { class: 'board-sub' },
      t('{tools} · edited {when}', {
        tools: b.widgets.length === 1 ? t('{n} tool', { n: 1 }) : t('{n} tools', { n: b.widgets.length }),
        when: relativeTime(b.updatedAt),
      })),
    folderTag(b),
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
      onclick: () => copyBoard(b),
    }, icon('copy'), list ? null : t('Copy')),
    h('button', {
      class: 'chip with-icon', title: t('Move to a folder'), 'aria-label': t('Move {name} to a folder', { name: b.name }),
      onclick: () => moveDialog(b),
    }, icon('folder'), list ? null : t('Move')),
    h('button', {
      class: 'chip with-icon', title: t('Download this board as a file to share. Student names are not included.'), 'aria-label': t('Share'),
      onclick: async () => { await store.exportBoard(b.id, cleaners, itemCleaners); toast(t('Board file downloaded (no student names)')); },
    }, icon('download'), list ? null : t('Share')),
    isCurrent ? null : confirmButton(icon('trash'), t('Delete?'), () => {
      // Tools that need to finish (a poll still taking answers) do so before the board goes.
      (b.widgets || []).forEach((w) => { try { widgetByType[w.type]?.closed?.(w.state || {}); } catch (err) { console.warn(err); } });
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
  if (order) thumbBtn.querySelector('.board-thumb')?.append(h('span', { class: 'board-order', title: t('Board {i} in this folder', { i: order }) }, String(order)));

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
    return draggable(h('article', { class: 'board-row' + (isCurrent ? ' current' : '') }, thumbBtn, metaRow, tools, classEl, pin, actions), b);
  }

  return draggable(h('article', { class: 'board-card' + (isCurrent ? ' current' : '') }, thumbBtn, badge, pin, metaRow, actions), b);
}

// ---- Folders ----
// Folder chips above the boards pick which boards show. Boards are moved with
// Move (📁) on a board, or by dragging a board onto a chip. A board is in one
// folder at most. See store.js for where folders are kept.
export const FOLDER_COLOURS = [
  ['blue', '#2f7bf2', 'Blue'], ['apricot', '#e8875b', 'Apricot'], ['green', '#22a55b', 'Green'], ['plum', '#9b5bb8', 'Plum'],
  ['teal', '#0f9d9a', 'Teal'], ['gold', '#d49b0b', 'Gold'], ['rose', '#e0567a', 'Rose'], ['slate', '#64748b', 'Slate'],
];
const colourOf = (c) => (FOLDER_COLOURS.find(([k]) => k === c) || FOLDER_COLOURS[0])[1];
const DRAG_TYPE = 'application/x-xingtan-board';
let draggingId = null; // the board being dragged (dataTransfer can't be read until the drop)

function filterOf() {
  const f = store.get().folderFilter || 'all';
  return f === 'all' || (f === 'none' && store.getFolders().length) || store.getFolder(f) ? f : 'all';
}
function setFilter(f) {
  store.update((m) => { m.folderFilter = f; }, { notify: false });
  render();
}
function inFolder(boardId, filter) {
  if (filter === 'all') return true;
  const f = store.folderOf(boardId);
  return filter === 'none' ? !f : f === filter;
}

const dot = (colour) => h('span', { class: 'folder-dot', style: { background: colourOf(colour) }, 'aria-hidden': 'true' });

// On a board, which folder it is in (when all folders are showing, or searching).
function folderTag(b) {
  const f = store.getFolder(store.folderOf(b.id));
  if (!f || (filterOf() !== 'all' && !query.trim())) return null;
  return h('span', { class: 'board-folder-tag', title: t('In folder {name}', { name: f.name }) }, dot(f.colour), f.name);
}

function moveTo(boardId, folderId) {
  store.setBoardFolder(boardId, folderId);
  const f = store.getFolder(folderId);
  toast(f ? t('Moved to {name}', { name: f.name }) : t('Taken out of its folder'));
  render();
}

function draggable(el, b) {
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    if (e.target.closest?.('input')) { e.preventDefault(); return; }
    e.dataTransfer.setData(DRAG_TYPE, b.id);
    e.dataTransfer.effectAllowed = 'move';
    draggingId = b.id;
    document.body.classList.add('board-dragging');
  });
  el.addEventListener('dragend', () => {
    draggingId = null;
    document.body.classList.remove('board-dragging');
    document.querySelectorAll('.drop-before, .drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
  });
  return el;
}

// In a folder: drop a board before or after another to change the presenting order.
function reorderable(el, b, folderId, ordered) {
  const side = (e) => {
    const r = el.getBoundingClientRect();
    const list = el.classList.contains('board-row');
    return (list ? e.clientY - r.top < r.height / 2 : e.clientX - r.left < r.width / 2) ? 'before' : 'after';
  };
  el.addEventListener('dragover', (e) => {
    if (!draggingId || draggingId === b.id || !ordered.some((x) => x.id === draggingId)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const s = side(e);
    el.classList.toggle('drop-before', s === 'before');
    el.classList.toggle('drop-after', s === 'after');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
  el.addEventListener('drop', (e) => {
    if (!draggingId || draggingId === b.id) return;
    e.preventDefault();
    const s = side(e);
    el.classList.remove('drop-before', 'drop-after');
    const ids = ordered.map((x) => x.id).filter((id) => id !== draggingId);
    const at = ids.indexOf(b.id) + (s === 'after' ? 1 : 0);
    ids.splice(at, 0, draggingId);
    store.setFolderOrder(folderId, ids);
    draggingId = null;
    render();
  });
  return el;
}

// A chip boards can be dropped on (a folder, or 'none' for No folder).
function dropTarget(el, folderId) {
  el.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drop');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop'));
  el.addEventListener('drop', (e) => {
    const id = e.dataTransfer.getData(DRAG_TYPE);
    el.classList.remove('drop');
    if (!id) return;
    e.preventDefault();
    document.body.classList.remove('board-dragging');
    moveTo(id, folderId);
  });
  return el;
}

function folderBar(boards) {
  const folders = store.getFolders();
  const filter = filterOf();
  const count = (f) => boards.filter((b) => inFolder(b.id, f)).length;
  const chip = (f, label, colour) => h('button', {
    class: 'folder-chip' + (filter === f ? ' on' : ''), 'aria-pressed': String(filter === f),
    onclick: () => setFilter(f),
  }, colour ? dot(colour) : null, h('span', { class: 'folder-chip-name' }, label), h('span', { class: 'folder-count' }, String(count(f))));
  return h('nav', { class: 'folder-bar', 'aria-label': t('Folders') },
    folders.length ? chip('all', t('All boards')) : null,
    ...folders.map((f) => dropTarget(chip(f.id, f.name, f.colour), f.id)),
    folders.length ? dropTarget(chip('none', t('No folder')), null) : null,
    h('button', { class: 'folder-chip add with-icon', onclick: () => folderDialog(), title: t('Group boards by class, subject or term') },
      icon('folder-plus'), folders.length ? t('New folder') : t('New folder: group boards by class, subject or term')),
    folders.length ? h('button', { class: 'folder-chip edit with-icon', onclick: () => manageFolders(), title: t('Rename, recolour, reorder or delete folders') }, icon('pencil'), t('Edit folders')) : null,
  );
}

function colourPicker(current, onPick) {
  const box = h('div', { class: 'folder-colours', role: 'radiogroup', 'aria-label': t('Colour') });
  const draw = (cur) => box.replaceChildren(...FOLDER_COLOURS.map(([k, hex, label]) => h('button', {
    type: 'button', class: 'folder-colour' + (cur === k ? ' on' : ''), role: 'radio', 'aria-checked': String(cur === k),
    title: t(label), 'aria-label': t(label), style: { background: hex },
    onclick: () => { draw(k); onPick(k); },
  }, cur === k ? icon('check') : null)));
  draw(current);
  return box;
}

// New folder. afterCreate(folder) lets Move put the board straight in it.
function folderDialog({ afterCreate = null } = {}) {
  let colour = FOLDER_COLOURS[store.getFolders().length % FOLDER_COLOURS.length][0];
  openModal(t('New folder'), (body) => {
    const input = h('input', { type: 'text', class: 'input', maxlength: 40, placeholder: t('e.g. 25S01, H2 Translation, Term 1'), 'aria-label': t('Folder name') });
    const form = h('form', { class: 'folder-form' },
      h('label', { class: 'field' }, h('span', {}, t('Folder name')), input),
      h('div', { class: 'field' }, h('span', {}, t('Colour')), colourPicker(colour, (c) => { colour = c; })),
      h('div', { class: 'row gap space-between' }, h('span'), h('button', { class: 'btn primary', type: 'submit' }, t('Create folder'))));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      const f = store.addFolder(input.value, colour);
      closeModal();
      if (afterCreate) afterCreate(f);
      else { toast(t('Folder “{name}” made. Move boards into it with Move (📁), or drag them onto it.', { name: f.name }), 4200); setFilter(f.id); }
    });
    body.append(form);
    setTimeout(() => input.focus(), 30);
  });
}

function moveDialog(b) {
  openModal(t('Move “{name}”', { name: b.name }), (body) => {
    const cur = store.folderOf(b.id);
    const option = (id, label, colour) => h('button', {
      class: 'folder-option' + (cur === id ? ' on' : ''), 'aria-pressed': String(cur === id),
      onclick: () => { closeModal(); if (cur !== id) moveTo(b.id, id); },
    }, colour ? dot(colour) : h('span', { class: 'folder-dot none', 'aria-hidden': 'true' }), h('span', {}, label), cur === id ? icon('check') : null);
    put(body,
      store.getFolders().length ? h('div', { class: 'folder-options' },
        ...store.getFolders().map((f) => option(f.id, f.name, f.colour)),
        option(null, t('No folder'))) : h('p', { class: 'muted' }, t('No folders yet.')),
      h('div', { class: 'row gap folder-move-new' },
        h('button', { class: 'btn with-icon', onclick: () => folderDialog({ afterCreate: (f) => moveTo(b.id, f.id) }) }, icon('folder-plus'), t('New folder…'))),
    );
  });
}

function manageFolders() {
  openModal(t('Edit folders'), (body) => {
    const draw = () => {
      const folders = store.getFolders();
      const rows = folders.map((f, i) => {
        const name = h('input', { type: 'text', class: 'input', value: f.name, maxlength: 40, 'aria-label': t('Folder name') });
        const save = () => { if (name.value.trim() && name.value.trim() !== f.name) store.editFolder(f.id, { name: name.value }); };
        name.addEventListener('change', save);
        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { save(); name.blur(); } });
        const n = store.listBoards().filter((b) => store.folderOf(b.id) === f.id).length;
        return h('li', { class: 'folder-row' },
          h('div', { class: 'folder-row-top' },
            name,
            h('span', { class: 'muted small folder-row-count' }, n === 1 ? t('{n} board', { n }) : t('{n} boards', { n })),
            h('button', { class: 'icon-btn small', disabled: i === 0, title: t('Move up'), 'aria-label': t('Move {name} up', { name: f.name }), onclick: () => { store.moveFolder(f.id, -1); draw(); } }, icon('arrow-up')),
            h('button', { class: 'icon-btn small', disabled: i === folders.length - 1, title: t('Move down'), 'aria-label': t('Move {name} down', { name: f.name }), onclick: () => { store.moveFolder(f.id, 1); draw(); } }, icon('arrow-down')),
            confirmButton(icon('trash'), n ? t('Delete? Its boards stay') : t('Delete?'), () => { store.deleteFolder(f.id); draw(); },
              'chip danger', { title: t('Delete folder (tap twice). Its boards are kept, outside any folder.'), 'aria-label': t('Delete {name}', { name: f.name }) })),
          colourPicker(f.colour, (c) => store.editFolder(f.id, { colour: c })));
      });
      put(body,
        folders.length ? h('ul', { class: 'folder-rows' }, ...rows) : h('p', { class: 'muted' }, t('No folders yet.')),
        h('div', { class: 'row gap' }, h('button', { class: 'btn with-icon', onclick: () => folderDialog({ afterCreate: () => manageFolders() }) }, icon('folder-plus'), t('New folder…'))),
      );
    };
    draw();
  });
}

// ---- Library: things every board uses ----
function libraryRow() {
  const n = store.getClasses().length;
  return h('div', { class: 'launcher-library' },
    h('span', { class: 'launcher-library-label' }, t('Shared by all boards')),
    h('button', { class: 'chip with-icon', onclick: () => openClassManager(), title: t('Class lists used by Points, Name picker, Groups, Poll and Thinking routine') },
      icon('users'), t('Class lists ({n})', { n })),
    h('button', { class: 'chip with-icon', onclick: () => openBackgroundLibrary(), title: t('Pictures you uploaded as board backgrounds') },
      icon('photo'), t('My backgrounds')),
  );
}

// ---- Copy, as it is or for other classes ----
// With no class lists there is only one kind of copy, so it is made straight away.
function copyBoard(b) {
  if (!store.getClasses().length) { plainCopy(b); return; }
  copyDialog(b);
}

function plainCopy(b) {
  const c = store.duplicateBoard(b.id);
  if (c) { toast(t('Copied as “{name}”', { name: c.name })); render(); }
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The copy's name: the old class's name in the board name becomes the new
// one's (“25S01 · H2 Translation · L12” → “25S03 · H2 Translation · L12”).
// Without it, the new class's name goes in front.
export function nameForClass(boardName, fromNames, toName) {
  const hit = fromNames.filter(Boolean).sort((a, c) => c.length - a.length)
    .find((n) => new RegExp(escRe(n), 'i').test(boardName));
  if (hit) return boardName.replace(new RegExp(escRe(hit), 'gi'), toName);
  if (boardName.toLowerCase().includes(toName.toLowerCase())) return t('{name} (copy)', { name: boardName });
  return `${toName} · ${boardName}`;
}

function copyDialog(b) {
  const classes = store.getClasses();
  const used = store.classesOnBoard(b.id, Object.keys(classHooks)); // most used first
  // For naming when the tools don't say: a class whose name is in the board name.
  const inName = classes.filter((c) => b.name.toLowerCase().includes(c.name.toLowerCase())).map((c) => c.id);
  let from = used[0] || inName[0] || null; // the class the copies move away from
  // The tools on this board that will switch class, by name, in dock order.
  const onBoard = new Set((b.widgets || []).map((w) => w.type));
  const switching = widgets.filter((w) => classHooks[w.type] && onBoard.has(w.type)).map((w) => t(w.title)).join(t(', '));
  const picked = new Set();

  openModal(t('Copy “{name}”', { name: b.name }), (body) => {
    const draw = () => {
      const fromCls = store.getClass(from);
      const targets = classes.filter((c) => c.id !== from);
      const nameOf = (c) => nameForClass(b.name, fromCls ? [fromCls.name] : [], c.name);

      const fromPart = used.length > 1 ? h('fieldset', { class: 'copy-from' },
        h('legend', {}, t('This board uses more than one class. Switch which one?')),
        ...used.map((id) => h('label', { class: 'copy-choice' },
          h('input', { type: 'radio', name: 'copy-from', checked: id === from, onchange: () => { from = id; picked.delete(id); draw(); } }),
          h('span', {}, store.getClass(id)?.name || '')))) : null;

      const list = h('div', { class: 'copy-classes', role: 'group', 'aria-label': t('Copy for these classes') },
        ...targets.map((c) => h('label', { class: 'copy-class' + (picked.has(c.id) ? ' on' : '') },
          h('input', {
            type: 'checkbox', checked: picked.has(c.id),
            onchange: (e) => { if (e.target.checked) picked.add(c.id); else picked.delete(c.id); draw(); },
          }),
          h('span', { class: 'copy-class-name' }, c.name),
          h('span', { class: 'copy-class-new muted' }, '→ ', nameOf(c)))));

      const n = [...picked].filter((id) => targets.some((c) => c.id === id)).length;
      const go = h('button', { class: 'btn primary', disabled: !n, onclick: () => {
        const chosen = targets.filter((c) => picked.has(c.id));
        const made = chosen.map((c) => store.duplicateBoard(b.id, {
          name: nameOf(c),
          forClass: { from: from ? [from] : [], to: c.id, tools: classHooks, fresh: freshHooks },
        }));
        untickTextPosts(made.filter(Boolean));
        closeModal();
        const ok = made.filter(Boolean);
        if (!ok.length) toast(t('Could not create a board. This browser’s storage may be full.'), 4000);
        else if (ok.length === 1) toast(t('Copied for {cls} as “{name}”', { cls: chosen[made.indexOf(ok[0])].name, name: ok[0].name }), 3200);
        else toast(t('Made {n} copies, one for each class', { n: ok.length }), 3200);
        render();
      } }, n > 1 ? t('Copy for {n} classes', { n }) : t('Copy for this class'));

      put(body,
        h('p', { class: 'muted' }, !switching
          ? t('No tool on this board uses a class list, so each copy just gets the class in its name.')
          : fromCls
            ? t('Each copy switches {tools} from {from} to its class.', { tools: switching, from: fromCls.name })
            : t('Each copy switches {tools} to its class.', { tools: switching })),
        fromPart,
        h('h3', { class: 'copy-head' }, t('Copy for')),
        targets.length ? list : h('p', { class: 'muted' }, t('There is no other class yet. Add one in Class lists.')),
        h('p', { class: 'muted small copy-note' },
          t('The lesson starts afresh: Lesson flow and Text steps unticked, Organiser notes, groups and poll or routine answers left behind. Everything you prepared stays: posts, pictures, videos, whiteboard pages.')),
        h('div', { class: 'row gap space-between copy-foot' },
          h('button', { class: 'btn', onclick: () => { closeModal(); plainCopy(b); }, title: t('Make a copy, e.g. to reuse a lesson layout') }, t('Just copy (same class)')),
          go),
      );
    };
    draw();
  });
}

// Text steps are ticked on the post, which every board shares; a copy for
// another class starts them again.
function untickTextPosts(boards) {
  const ids = new Set();
  boards.forEach((nb) => (nb.widgets || []).forEach((w) => { if (w.type === 'text') { const id = posts.postIdOf(nb.id, w); if (id) ids.add(id); } }));
  ids.forEach((id) => {
    const p = posts.byId(id);
    if (p?.steps && (p.done || []).length) posts.save({ ...p, done: [] }, { touch: false });
  });
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
