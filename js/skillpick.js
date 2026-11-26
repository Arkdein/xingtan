// The skill picker: a small menu beside a + or − button, for classes that give
// points for skills (see skills.js). Points (each student, + All / − All) and
// Groups (+ / − on a group) use it.
//
// openSkillPicker(anchor, skills, sign, onPick)
//   skills  the skills to offer (points.skillsToGive), all of one kind
//   sign    1 (praise) or −1 (needs work)
//   onPick(skill)  skill is null for a plain point ("No reason")
import { h } from './ui.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

let open = null;

export function closeSkillPicker() {
  if (!open) return;
  const { el, off } = open;
  open = null;
  off();
  el.remove();
}

export function openSkillPicker(anchor, skills, sign, onPick, { title = '' } = {}) {
  closeSkillPicker();
  const pick = (skill) => { closeSkillPicker(); onPick(skill); };
  const items = skills.map((k) => h('button', {
    class: 'skp-item ' + (k.kind === 'neg' ? 'neg' : 'pos'), role: 'menuitem',
    onclick: () => pick(k),
  }, icon(k.icon), h('span', { class: 'skp-label' }, k.label), h('span', { class: 'skp-val' }, sign > 0 ? `+${k.value}` : `−${k.value}`)));
  const plain = h('button', { class: 'skp-item plain', role: 'menuitem', onclick: () => pick(null) },
    icon(sign > 0 ? 'plus' : 'minus'), h('span', { class: 'skp-label' }, t('No reason')), h('span', { class: 'skp-val' }, sign > 0 ? '+1' : '−1'));
  const el = h('div', { class: 'skill-pop', role: 'menu', 'aria-label': title || (sign > 0 ? t('Praise') : t('Needs work')) },
    title ? h('div', { class: 'skp-title' }, title) : null,
    ...items, plain,
    sign < 0 ? h('p', { class: 'skp-note' }, t('The board shows only −1. The reason goes in the log.')) : null);
  document.body.append(el);

  // Beside the button, kept on screen.
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const ht = el.offsetHeight;
  let left = r.right - w;
  if (left < 8) left = Math.min(r.left, window.innerWidth - w - 8);
  let top = r.bottom + 6;
  if (top + ht > window.innerHeight - 8) top = Math.max(8, r.top - ht - 6);
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${top}px`;

  const onDown = (e) => { if (!el.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closeSkillPicker(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSkillPicker(); anchor.focus?.(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const all = [...el.querySelectorAll('.skp-item')];
      const i = all.indexOf(document.activeElement);
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
    }
  };
  const onScroll = () => closeSkillPicker();
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onScroll);
  open = {
    el,
    off: () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScroll);
    },
  };
  // Clicking the same button again closes the menu (see isOpenFor).
  open.anchor = anchor;
  el.querySelector('.skp-item')?.focus({ preventScroll: true });
}

export const isOpenFor = (anchor) => !!open && open.anchor === anchor;
