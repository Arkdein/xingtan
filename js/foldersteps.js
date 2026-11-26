// Presenting a folder in order (文件夹顺序): on a board that is in a folder with
// other boards, ◀ 2/5 ▶ beside the board name goes to the board before or after
// it, in the folder's presenting order (see store.boardsInFolder; teachers
// arrange it by dragging boards on the boards screen). [ and ] do the same from
// the keyboard. The middle button lists the folder's boards to jump to one.
//
// Going to another board is the same as opening it from the boards screen:
// running timers carry on, a blank screen or the pointer is put away.
import * as store from './store.js';
import { h } from './ui.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { FOLDER_COLOURS } from './boards.js';

let openBoard = () => {};
let box = null;   // the ◀ 2/5 ▶ group in the board bar
let pop = null;   // the list of the folder's boards, while open

const colourOf = (c) => (FOLDER_COLOURS.find(([k]) => k === c) || FOLDER_COLOURS[0])[1];

// The folder of the open board, its boards in order, and where this one is.
function place() {
  const b = store.getBoard();
  const folder = b ? store.getFolder(store.folderOf(b.id)) : null;
  if (!folder) return null;
  const boards = store.boardsInFolder(folder.id);
  const i = boards.findIndex((x) => x.id === b.id);
  if (i < 0 || boards.length < 2) return null;
  return { folder, boards, i };
}

export function go(by) {
  const p = place();
  if (!p) return false;
  const next = p.boards[p.i + by];
  if (!next) return false;
  closePop();
  openBoard(next.id);
  return true;
}

function closePop() {
  pop?.remove();
  pop = null;
  box?.querySelector('.fs-count')?.setAttribute('aria-expanded', 'false');
}

function openPop(anchor) {
  const p = place();
  if (!p) return;
  closePop();
  pop = h('div', { class: 'fs-pop', role: 'menu', 'aria-label': p.folder.name },
    h('div', { class: 'fs-pop-head' }, h('span', { class: 'folder-dot', style: { background: colourOf(p.folder.colour) } }), p.folder.name),
    ...p.boards.map((b, i) => h('button', {
      class: 'fs-pop-item' + (i === p.i ? ' on' : ''), role: 'menuitem', 'aria-current': i === p.i ? 'true' : null,
      onclick: () => { closePop(); if (i !== p.i) openBoard(b.id); },
    }, h('span', { class: 'fs-pop-n' }, String(i + 1)), h('span', { class: 'fs-pop-name' }, b.name))));
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = `${Math.max(8, r.left)}px`;
  pop.style.top = `${r.bottom + 6}px`;
  anchor.setAttribute('aria-expanded', 'true');
  pop.querySelector('.fs-pop-item.on')?.focus();
}

// Draws (or hides) the buttons for the board that is open now.
export function update() {
  if (!box) return;
  closePop();
  const p = place();
  box.hidden = !p;
  if (!p) { box.replaceChildren(); return; }
  box.setAttribute('aria-label', t('Boards in this folder'));
  const { folder, boards, i } = p;
  const prev = boards[i - 1];
  const next = boards[i + 1];
  const count = h('button', {
    class: 'pill-btn fs-count', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
    title: t('{folder}: board {i} of {n}. Click to see them all.', { folder: folder.name, i: i + 1, n: boards.length }),
    onclick: (e) => (pop ? closePop() : openPop(e.currentTarget)),
  }, h('span', { class: 'folder-dot', style: { background: colourOf(folder.colour) } }), `${i + 1}/${boards.length}`);
  box.replaceChildren(
    h('button', {
      class: 'pill-btn icon-only fs-btn', disabled: !prev,
      title: prev ? t('Previous board: {name} ([)', { name: prev.name }) : t('This is the first board in {folder}', { folder: folder.name }),
      'aria-label': t('Previous board'), onclick: () => go(-1),
    }, icon('chevron-left')),
    count,
    h('button', {
      class: 'pill-btn icon-only fs-btn', disabled: !next,
      title: next ? t('Next board: {name} (])', { name: next.name }) : t('This is the last board in {folder}', { folder: folder.name }),
      'aria-label': t('Next board'), onclick: () => go(1),
    }, icon('chevron-right')),
  );
}

// Same rule as the other board shortcuts (B, D, L): not while typing in a tool or a dialog is open.
function shortcutAllowed(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (!store.getBoard() || document.body.classList.contains('launcher-open')) return false;
  if (document.getElementById('modal')?.open) return false;
  const tg = e.target;
  if (tg === document.body || tg === document.documentElement || tg?.id === 'stage') return true;
  return !!tg?.closest?.('#dock, #dock-handle, .corner-menu, .board-bar, .fs-pop');
}

export function initFolderSteps(opts) {
  openBoard = opts.openBoard;
  box = h('span', { class: 'folder-steps', id: 'folder-steps', role: 'group', 'aria-label': t('Boards in this folder'), hidden: true });
  document.getElementById('board-name')?.after(box);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pop) { const c = box.querySelector('.fs-count'); closePop(); c?.focus(); return; }
    if ((e.key === '[' || e.key === ']') && !e.repeat && shortcutAllowed(e)) {
      if (go(e.key === ']' ? 1 : -1)) e.preventDefault();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (pop && !pop.contains(e.target) && !e.target.closest('.fs-count')) closePop();
  });
  // Folders and their order change on the boards screen.
  document.addEventListener('launcher-closed', update);
}
