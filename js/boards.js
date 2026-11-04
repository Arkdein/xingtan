// The boards screen: shown when the app opens, and from the Boards button.
import * as store from './store.js';
import { h, toast, confirmButton } from './ui.js';
import { widgets, widgetByType } from './widgets/index.js';
import { backgroundCss, isLightBackground } from './backgrounds.js';
import { icon } from './icons.js';
import { toolTile } from './dock.js';

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
    placeholder: 'New board name, e.g. 25S01 · H2 Translation · L12',
    'aria-label': 'New board name',
  });
  const newForm = h('form', { class: 'new-board' }, nameInput,
    h('button', { class: 'btn primary with-icon', type: 'submit' }, icon('plus'), 'New board'));
  newForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const b = store.createBoard(nameInput.value);
      open(b.id);
    } catch (err) {
      toast('Could not create a board. This browser’s storage may be full.');
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
      toast(`Imported “${b.name}”`);
      render();
    } catch (err) {
      toast(err.message || 'Could not read that file', 4000);
    }
  });

  const search = h('input', {
    type: 'search', class: 'input board-search', placeholder: 'Find a board…', value: query, 'aria-label': 'Find a board',
  });
  search.addEventListener('input', () => {
    query = search.value;
    const pos = search.selectionStart;
    render();
    const s = launcher().querySelector('.board-search');
    s?.focus();
    s?.setSelectionRange(pos, pos);
  });

  const q = query.trim().toLowerCase();
  const shown = q ? boards.filter((b) => b.name.toLowerCase().includes(q)) : boards;

  const grid = h('div', { class: 'board-grid' });
  shown.forEach((b) => grid.append(card(b, { isCurrent: current?.id === b.id, isLast: !current && b.id === lastId })));

  let emptyMsg = null;
  if (boards.length === 0) {
    emptyMsg = h('div', { class: 'launcher-empty' },
      h('p', {}, 'No boards yet. Give your first board a name above, for example one per class or per lesson.'),
      h('p', { class: 'muted' }, '还没有白板。请在上方为第一个白板命名。'));
  } else if (shown.length === 0) {
    emptyMsg = h('p', { class: 'launcher-empty' }, `No boards match “${query}”.`);
  }

  el.replaceChildren(h('div', { class: 'launcher-inner' },
    h('header', { class: 'launcher-head' },
      h('div', {},
        h('h1', { class: 'launcher-title' }, h('img', { src: 'icons/icon.svg', alt: '', class: 'launcher-logo' }), '杏坛 · ClassroomBoard'),
        h('p', {}, 'Choose a board to open, or start a new one. ', h('span', { class: 'zh' }, '选择白板，或新建一个。')),
      ),
      current ? h('button', { class: 'btn with-icon', onclick: hideLauncher }, icon('arrow-left'), `Back to “${current.name}”`) : null,
    ),
    h('div', { class: 'launcher-tools' },
      newForm,
      h('div', { class: 'row gap' },
        boards.length > 6 ? search : null,
        h('button', { class: 'btn with-icon', onclick: () => fileInput.click(), title: 'Add a board file someone shared with you' }, icon('upload'), 'Import board'),
        fileInput,
      ),
    ),
    emptyMsg,
    grid,
    h('p', { class: 'launcher-foot' },
      'Boards save automatically in this browser on this computer. Class lists are shared by all boards.'),
  ));
}

function card(b, { isCurrent, isLast }) {
  const nameEl = h('button', { class: 'board-card-name', title: 'Open', onclick: () => open(b.id) }, b.name);
  const metaRow = h('div', { class: 'board-meta' },
    nameEl,
    h('span', { class: 'board-sub' },
      `${b.widgets.length} ${b.widgets.length === 1 ? 'tool' : 'tools'} · edited ${relativeTime(b.updatedAt)}`),
  );

  const rename = () => {
    const input = h('input', { type: 'text', class: 'input board-rename', value: b.name, maxlength: 80, 'aria-label': 'Board name' });
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
    h('button', { class: 'chip with-icon', title: 'Rename', onclick: rename }, icon('pencil'), 'Rename'),
    h('button', {
      class: 'chip with-icon', title: 'Make a copy, e.g. to reuse a lesson layout',
      onclick: () => { const c = store.duplicateBoard(b.id); if (c) { toast(`Copied as “${c.name}”`); render(); } },
    }, icon('copy'), 'Copy'),
    h('button', {
      class: 'chip with-icon', title: 'Download this board as a file to share. Student names are not included.',
      onclick: () => { store.exportBoard(b.id, cleaners); toast('Board file downloaded (no student names)'); },
    }, icon('download'), 'Share'),
    isCurrent ? null : confirmButton('Delete', 'Delete?', () => {
      store.deleteBoard(b.id);
      toast(`Deleted “${b.name}”`);
      render();
    }, 'chip danger'),
  );

  return h('article', { class: 'board-card' + (isCurrent ? ' current' : '') },
    h('button', { class: 'board-thumb-btn', 'aria-label': `Open ${b.name}`, onclick: () => open(b.id) }, thumbnail(b)),
    isCurrent ? h('span', { class: 'board-badge' }, 'Open now') : isLast ? h('span', { class: 'board-badge' }, 'Last used') : null,
    metaRow,
    actions,
  );
}

function thumbnail(b) {
  const thumb = h('div', { class: 'board-thumb' + (isLightBackground(b.background) ? ' light' : ''), style: { background: backgroundCss(b.background) } });
  const vw = Math.max(b.viewport?.w || 1280, ...b.widgets.map((w) => w.x + w.w));
  const vh = Math.max(b.viewport?.h || 720, ...b.widgets.map((w) => w.y + w.h));
  [...b.widgets].sort((a, c) => (a.z || 0) - (c.z || 0)).forEach((w) => {
    const def = widgetByType[w.type];
    thumb.append(h('div', {
      class: 'thumb-widget',
      style: {
        left: (w.x / vw * 100) + '%', top: (w.y / vh * 100) + '%',
        width: (w.w / vw * 100) + '%', height: (w.h / vh * 100) + '%',
      },
    }, def ? toolTile(def, 'thumb') : ''));
  });
  if (!b.widgets.length) thumb.append(h('span', { class: 'thumb-empty' }, 'Empty board'));
  return thumb;
}

function relativeTime(iso) {
  const t = Date.parse(iso);
  if (!t) return 'some time ago';
  const diff = (t - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
