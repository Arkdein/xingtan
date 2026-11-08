// Blank screen 空白屏: for a moment when the class should look at the teacher.
// Every tool, the dock, the shelf and the corner buttons fade out, so only the
// board's background (picture or colour) shows. Nothing on the board changes:
// the tools are only hidden, so turning it off brings back the board exactly as
// it was, with every tool where it was and holding what it held.
//
// While the board is blank, tools that make sound or show moving pictures
// (Music, YouTube, Read aloud, Dictation) pause, and carry on afterwards.
// Timers keep counting unless “Pause timers too” is ticked in Settings
// (meta.blank.pauseTimers, kept for this computer and in backups).
//
// B (or “.”, which presentation clickers send) blanks the board and brings it
// back; Esc and the small button in the corner bring it back too. Blank screen
// isn't saved with the board: a reload or another board opens as normal.
import * as store from './store.js';
import { h } from './ui.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

let on = false;
let notify = () => {};
let returnFocus = null;
let restoreBtn = null;

// The parts of the screen hidden while the board is blank.
const HIDE = ['#stage', '#dock', '#dock-handle', '.board-bar', '.corner-menu'];

export const isBlank = () => on;
export const pauseTimers = () => !!store.get().blank?.pauseTimers;
export function setPauseTimers(v) {
  store.update((m) => { m.blank = { ...(m.blank || {}), pauseTimers: !!v }; }, { notify: false });
}

// notify(on, { pauseTimers }) tells the tools on the board.
export function initBlank(opts) {
  notify = opts.notify || notify;
  restoreBtn = h('button', {
    id: 'blank-restore', class: 'blank-restore', hidden: true,
    title: t('Show the board again (B)'), 'aria-label': t('Show the board again'),
    onclick: () => setBlank(false),
  }, icon('eye'), h('span', { class: 'blank-restore-label' }, t('Show board')));
  document.body.append(restoreBtn);
  document.addEventListener('keydown', onKey, true);
}

// Refreshes the corner button's words after the language changes.
export function relabel() {
  if (!restoreBtn) return;
  restoreBtn.title = t('Show the board again (B)');
  restoreBtn.setAttribute('aria-label', t('Show the board again'));
  restoreBtn.querySelector('.blank-restore-label').textContent = t('Show board');
}

export function toggleBlank() { setBlank(!on); }

export function setBlank(next) {
  next = !!next;
  if (next === on) return;
  if (next && (!store.getBoard() || document.body.classList.contains('launcher-open'))) return;
  on = next;
  const opts = { pauseTimers: pauseTimers() };
  if (on) {
    returnFocus = document.activeElement;
    // Menus that would otherwise stay on top of the blank board.
    document.querySelectorAll('.dock-pop, .shelf-pop').forEach((el) => el.remove());
  }
  document.body.classList.toggle('blanked', on);
  HIDE.forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.toggleAttribute('inert', on)));
  const dock = document.getElementById('dock');
  if (!on && dock) dock.toggleAttribute('inert', dock.classList.contains('is-hidden')); // a hidden dock stays inert
  restoreBtn.hidden = !on;
  try { notify(on, opts); } catch (err) { console.warn(err); }
  // The corner button stays faint (it isn't focused), but Tab reaches it: everything else is inert.
  if (on) document.activeElement?.blur?.();
  else {
    const back = returnFocus && document.contains(returnFocus) && !returnFocus.closest('[inert]') ? returnFocus : document.getElementById('btn-blank');
    returnFocus = null;
    back?.focus?.({ preventScroll: true });
  }
  document.dispatchEvent(new CustomEvent('xingtan:blank', { detail: { on } }));
}

// B or “.” toggles, when the teacher isn't typing. While the board is blank,
// Esc also brings it back, and other keys don't reach the hidden tools.
function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  const toggleKey = key === 'b' || key === 'B' || key === '.';
  if (on) {
    if (toggleKey || key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) setBlank(false);
    } else if (key !== 'Tab' && key !== 'Enter' && key !== ' ' && !key.startsWith('F')) {
      // The tools are hidden: their own shortcuts (→, R, space…) wait until the board is back.
      e.stopPropagation();
    }
    return;
  }
  if (!toggleKey || e.repeat || !allowed(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  setBlank(true);
}

function allowed(target) {
  if (!store.getBoard() || document.body.classList.contains('launcher-open')) return false;
  if (document.getElementById('modal')?.open) return false;
  const el = target instanceof Element ? target : null;
  if (!el) return true;
  return !el.closest('input, textarea, select') && !el.isContentEditable;
}
