// The welcome tour: a few short steps that point at the parts of the screen a
// new teacher needs first. It runs over the sample board (sample.js), shows once
// on a new computer (from the boards screen), and can be taken again from the
// boards screen or from the guide (./?tour).
//
// Each step dims the screen except for one thing (the dock, a tool's title bar,
// a chip on the shelf…) and shows a card beside it. A step whose target isn't on
// screen (the dock hidden, the tool closed) shows its card in the middle instead.
// Esc, or Skip tour, ends it at any point.
import { h } from './ui.js';
import { t, getLang } from './i18n.js';
import { icon } from './icons.js';

const KEY = 'xingtan:welcome'; // 'done' once the tour has been taken or skipped on this computer

export function welcomeDone() {
  try { return localStorage.getItem(KEY) === 'done'; } catch (err) { return true; }
}
export function markWelcomeDone() {
  try { localStorage.setItem(KEY, 'done'); } catch (err) { /* storage blocked */ }
}

// **bold** only; everything else is plain text.
function rich(str) {
  return String(str).split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    .map((p) => (p.startsWith('**') && p.endsWith('**') ? h('strong', {}, p.slice(2, -2)) : p));
}

const visible = (el) => !!el && el.getClientRects().length > 0 && !el.closest('[hidden]');
const first = (sel) => [...document.querySelectorAll(sel)].find(visible) || null;

// The steps, in the interface language at the time the tour starts.
function steps() {
  return [
    {
      title: t('Welcome to 杏坛 · ClassroomBoard'),
      text: t('This is a sample board, set up like a real lesson. Try anything on it: it saves by itself, and you can delete it when you’re done. This tour takes about a minute.'),
    },
    {
      target: () => first('#dock:not(.is-hidden)'),
      title: t('The dock'),
      text: t('Tap a tool to put it on the board. **Edit**, at the end of the dock, reorders the tools or hides the ones you don’t use.'),
    },
    {
      target: () => first('.widget-lessonflow:not(.is-min) .widget-head') || first('.widget:not(.is-min) .widget-head'),
      title: t('Moving and resizing tools'),
      text: t('Drag a tool by its title bar, and resize it from its bottom-right corner. **?** shows what the tool can do, **−** minimises it, and **×** closes it (with **Undo**).'),
    },
    {
      target: () => first('.widget-clock.is-min') || first('.widget.is-min'),
      title: t('The shelf'),
      text: t('Minimised tools wait on the shelf as chips, and keep working: this clock still keeps time. Click a chip to open its tool again.'),
      pad: 6,
    },
    {
      target: () => first('.board-bar'),
      title: t('This board'),
      text: t('**Boards** shows all your boards. Click the board’s name to rename it or change its background. The eye button blanks the screen (or press **B**).'),
    },
    {
      target: () => first('#btn-classes'),
      title: t('Class lists'),
      text: t('Paste your students’ names here once, one per line. Every board can then use them, in Name picker, Groups and Points.'),
    },
    {
      target: () => first('#btn-settings'),
      title: t('Back up your boards'),
      text: t('Boards are saved only in this browser on this computer. Download a backup here now and then, and keep it somewhere safe, such as your school drive.'),
    },
    {
      target: () => first('#btn-guide'),
      title: t('Help is always here'),
      text: t('The user guide has a card for every tool, and a search box. Each tool’s **?** opens its card. You can take this tour again from the boards screen.'),
    },
  ];
}

let current = null; // the tour on screen, if any

export function isTourRunning() { return !!current; }

export function endTour() { current?.end(); }

export function runTour({ onEnd } = {}) {
  endTour();
  const list = steps();
  let i = 0;

  const spot = h('div', { class: 'tour-spot', 'aria-hidden': 'true' });
  const count = h('p', { class: 'tour-count' });
  const title = h('h2', { class: 'tour-title', id: 'tour-title' });
  const text = h('p', { class: 'tour-text', id: 'tour-text' });
  const skipBtn = h('button', { class: 'btn tour-skip' }, t('Skip tour'));
  // 'Back' is 返回 elsewhere in the app; in the tour it pairs with 下一步 as 上一步.
  const backBtn = h('button', { class: 'btn with-icon' }, icon('arrow-left'), getLang() === 'zh' ? '上一步' : t('Back'));
  const nextBtn = h('button', { class: 'btn primary with-icon tour-next' });
  const card = h('div', { class: 'tour-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tour-title', 'aria-describedby': 'tour-text' },
    count, title, text,
    h('div', { class: 'tour-btns' }, skipBtn, h('span', { class: 'tour-grow' }), backBtn, nextBtn));
  const root = h('div', { class: 'tour' }, spot, card);
  document.body.append(root);
  document.body.classList.add('touring');

  function place() {
    const step = list[i];
    const el = step.target?.();
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const margin = 12, gap = 14;
    if (!visible(el)) {
      // Nothing to point at: the card in the middle, the whole screen dimmed.
      Object.assign(spot.style, { left: `${vw / 2}px`, top: `${vh / 2}px`, width: '0px', height: '0px' });
      spot.classList.add('none');
      Object.assign(card.style, { left: `${Math.max(margin, (vw - cw) / 2)}px`, top: `${Math.max(margin, (vh - ch) / 2)}px` });
      return;
    }
    spot.classList.remove('none');
    const pad = step.pad ?? 8;
    const r = el.getBoundingClientRect();
    const s = {
      left: Math.max(4, r.left - pad), top: Math.max(4, r.top - pad),
      right: Math.min(vw - 4, r.right + pad), bottom: Math.min(vh - 4, r.bottom + pad),
    };
    Object.assign(spot.style, { left: `${s.left}px`, top: `${s.top}px`, width: `${s.right - s.left}px`, height: `${s.bottom - s.top}px` });
    // Below, above, to the right, to the left; otherwise in the middle.
    const clampX = (x) => Math.max(margin, Math.min(x, vw - cw - margin));
    const clampY = (y) => Math.max(margin, Math.min(y, vh - ch - margin));
    const midX = clampX((s.left + s.right) / 2 - cw / 2);
    const midY = clampY((s.top + s.bottom) / 2 - ch / 2);
    let x, y;
    if (s.bottom + gap + ch <= vh - margin) { x = midX; y = s.bottom + gap; }
    else if (s.top - gap - ch >= margin) { x = midX; y = s.top - gap - ch; }
    else if (s.right + gap + cw <= vw - margin) { x = s.right + gap; y = midY; }
    else if (s.left - gap - cw >= margin) { x = s.left - gap - cw; y = midY; }
    else { x = clampX((vw - cw) / 2); y = clampY(vh - ch - margin); }
    Object.assign(card.style, { left: `${x}px`, top: `${y}px` });
  }

  function show(n) {
    i = Math.max(0, Math.min(n, list.length - 1));
    const step = list[i];
    count.textContent = t('{n} of {total}', { n: i + 1, total: list.length });
    title.textContent = step.title;
    text.replaceChildren(...rich(step.text));
    backBtn.hidden = i === 0;
    const last = i === list.length - 1;
    // The app's 'Next' is 下一个 (next item); a tour moves on a step: 下一步.
    nextBtn.replaceChildren(...(last ? [t('Start using 杏坛')] : [getLang() === 'zh' ? '下一步' : t('Next'), icon('arrow-right')]));
    skipBtn.hidden = last;
    place();
    nextBtn.focus({ preventScroll: true });
  }

  function end() {
    if (current !== api) return;
    current = null;
    root.remove();
    document.body.classList.remove('touring');
    window.removeEventListener('resize', place);
    window.removeEventListener('keydown', onKey, true);
    onEnd?.();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); if (i < list.length - 1) show(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); show(i - 1); }
    else if (e.key === 'Tab') {
      // Keep the keyboard in the card.
      const btns = [...card.querySelectorAll('button')].filter(visible);
      const at = btns.indexOf(document.activeElement);
      if (at < 0 || (e.shiftKey && at === 0) || (!e.shiftKey && at === btns.length - 1)) {
        e.preventDefault();
        btns[e.shiftKey ? btns.length - 1 : 0]?.focus();
      }
      e.stopPropagation();
    } else if (!(e.key === 'Enter' || e.key === ' ') || !e.target.closest?.('.tour-card')) {
      e.stopPropagation(); // no board shortcuts (B, D…) during the tour
    }
  }

  nextBtn.addEventListener('click', () => (i === list.length - 1 ? end() : show(i + 1)));
  backBtn.addEventListener('click', () => show(i - 1));
  skipBtn.addEventListener('click', end);
  window.addEventListener('resize', place);
  window.addEventListener('keydown', onKey, true);

  const api = { end };
  current = api;
  show(0);
  return api;
}
