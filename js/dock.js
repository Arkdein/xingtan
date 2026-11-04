// The tool dock at the bottom of a board.
// Teachers can reorder tools, hide ones they don't use (they stay one tap
// away under “More”) and switch to a compact, icons-only dock. The layout is
// the same on every board and is saved with the class lists in this browser.
import * as store from './store.js';
import { h, toast } from './ui.js';
import { icon } from './icons.js';
import { widgets, widgetByType } from './widgets/index.js';

const dockEl = () => document.getElementById('dock');
let onAdd = () => {};
let editing = false;
let pop = null; // the “More” menu, when open

const defaults = () => ({ order: widgets.map((w) => w.type), hidden: [], compact: false });

function config() {
  const saved = store.get().dock || {};
  const d = { ...defaults(), ...saved };
  const known = new Set(widgets.map((w) => w.type));
  // Drop tools that no longer exist; add new tools at the end.
  d.order = d.order.filter((t) => known.has(t));
  widgets.forEach((w) => { if (!d.order.includes(w.type)) d.order.push(w.type); });
  d.hidden = d.hidden.filter((t) => known.has(t));
  return d;
}

function save(patch) {
  const next = { ...config(), ...patch };
  store.update((m) => { m.dock = next; }, { notify: false });
  render();
}

const visibleTypes = (d) => d.order.filter((t) => !d.hidden.includes(t));
const hiddenTypes = (d) => d.order.filter((t) => d.hidden.includes(t));

export function toolTile(def, size = '') {
  return h('span', { class: `tool-tile tone-${def.tone || 'content'} ${size}`.trim() }, icon(def.icon));
}

export function initDock(opts) {
  onAdd = opts.onAdd;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pop) closeMore();
    else if (editing) setEditing(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (pop && !pop.contains(e.target) && !e.target.closest('.dock-more')) closeMore();
  });
  let resizing = null;
  window.addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(fit, 150); });
  render();
}

export function setEditing(on) {
  editing = on;
  closeMore();
  render();
}

export function isEditing() { return editing; }

export function render() {
  const el = dockEl();
  const d = config();
  el.classList.toggle('compact', d.compact && !editing);
  el.classList.toggle('editing', editing);
  el.replaceChildren();

  if (editing) { renderEditor(el, d); return; }

  const items = visibleTypes(d).map((type) => {
    const def = widgetByType[type];
    return h('button', { class: 'dock-btn', title: `Add ${def.title}`, 'aria-label': `Add ${def.title}`, onclick: () => onAdd(type) },
      toolTile(def), h('span', { class: 'dock-label' }, def.title));
  });
  el.append(...items);

  const hidden = hiddenTypes(d);
  el.append(h('span', { class: 'dock-divider', 'aria-hidden': 'true' }));
  if (hidden.length) {
    el.append(h('button', {
      class: 'dock-btn dock-more', title: 'More tools', 'aria-label': `More tools (${hidden.length})`,
      'aria-haspopup': 'true', onclick: toggleMore,
    }, h('span', { class: 'tool-tile plain' }, icon('dots')), h('span', { class: 'dock-label' }, 'More')));
  }
  el.append(h('button', {
    class: 'dock-btn dock-edit', title: 'Edit dock: reorder, hide or add tools', 'aria-label': 'Edit dock',
    onclick: () => setEditing(true),
  }, h('span', { class: 'tool-tile plain' }, icon('pencil')), h('span', { class: 'dock-label' }, 'Edit')));
  fit();
}

// On narrower screens the dock first tightens its labels onto two lines, then
// drops them (icons only), so every tool and Edit stay on screen.
function fit() {
  const el = dockEl();
  el.classList.remove('tight', 'auto-compact');
  if (editing || el.classList.contains('compact')) return;
  const over = () => el.scrollWidth > el.clientWidth + 1;
  if (over()) el.classList.add('tight');
  if (over()) el.classList.add('auto-compact');
}

// ---------- “More” menu ----------
function toggleMore() {
  if (pop) { closeMore(); return; }
  const d = config();
  pop = h('div', { class: 'dock-pop', role: 'menu', 'aria-label': 'More tools' },
    h('p', { class: 'dock-pop-head' }, 'More tools'),
    ...hiddenTypes(d).map((type) => {
      const def = widgetByType[type];
      return h('button', { class: 'dock-pop-item', role: 'menuitem', onclick: () => { closeMore(); onAdd(type); } },
        toolTile(def, 'small'), h('span', {}, def.title));
    }),
    h('button', { class: 'link-btn dock-pop-edit', onclick: () => setEditing(true) }, 'Edit dock'),
  );
  document.body.append(pop);
  const r = dockEl().querySelector('.dock-more').getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + 'px';
  pop.style.bottom = (window.innerHeight - r.top + 14) + 'px';
  pop.querySelector('.dock-pop-item')?.focus();
}

function closeMore() {
  pop?.remove();
  pop = null;
}

// ---------- Edit mode ----------
function renderEditor(el, d) {
  const list = h('div', { class: 'dock-items', role: 'list', 'aria-label': 'Tools in the dock' });
  visibleTypes(d).forEach((type) => list.append(editItem(type, list)));
  if (!list.children.length) list.append(h('p', { class: 'dock-note' }, 'No tools in the dock. Add some from below.'));

  const hidden = hiddenTypes(d);
  const tray = h('div', { class: 'dock-tray' },
    h('span', { class: 'dock-tray-label' }, hidden.length ? 'Hidden:' : 'All tools are in the dock.'),
    ...hidden.map((type) => {
      const def = widgetByType[type];
      return h('button', {
        class: 'dock-hidden-btn', title: `Add ${def.title} back to the dock`, 'aria-label': `Add ${def.title} back to the dock`,
        onclick: () => save({ hidden: config().hidden.filter((t) => t !== type), order: [...config().order.filter((t) => t !== type), type] }),
      }, toolTile(def, 'small'), h('span', {}, def.title), h('span', { class: 'dock-badge add' }, icon('plus')));
    }),
  );

  const compact = h('input', { type: 'checkbox', checked: d.compact });
  compact.addEventListener('change', () => save({ compact: compact.checked }));

  const controls = h('div', { class: 'dock-controls' },
    h('label', { class: 'row gap dock-compact' }, compact, 'Icons only (compact)'),
    h('button', {
      class: 'btn small', title: 'Put every tool back in the original order',
      onclick: () => { save(defaults()); toast('Dock reset'); },
    }, 'Reset'),
    h('button', { class: 'btn primary small', onclick: () => setEditing(false) }, 'Done'),
  );

  const hint = h('p', { class: 'dock-hint' }, 'Drag tools to reorder. Tap − to hide a tool, or + to add it back. 拖动可调整顺序。');
  el.append(hint, list, h('div', { class: 'dock-edit-foot' }, tray, controls));
}

function editItem(type, list) {
  const def = widgetByType[type];
  const hide = h('button', {
    class: 'dock-badge remove', title: `Hide ${def.title}`, 'aria-label': `Hide ${def.title}`,
    onclick: (e) => { e.stopPropagation(); save({ hidden: [...config().hidden, type] }); },
  }, icon('minus'));
  const item = h('div', {
    class: 'dock-btn dock-edit-item', role: 'listitem', tabindex: '0', 'data-type': type,
    title: 'Drag to move. Arrow keys also move it.', 'aria-label': `${def.title}. Use left and right arrow keys to move.`,
  }, toolTile(def), h('span', { class: 'dock-label' }, def.title), hide);

  // Keyboard: left/right arrows move the focused tool.
  item.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const order = visibleTypes(config());
    const i = order.indexOf(type);
    const j = e.key === 'ArrowLeft' ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    saveVisibleOrder(order);
    dockEl().querySelector(`.dock-edit-item[data-type="${type}"]`)?.focus();
  });

  // Pointer (mouse, pen, touch): drag sideways to reorder.
  item.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('.dock-badge')) return;
    e.preventDefault();
    item.setPointerCapture(e.pointerId);
    const grab = e.clientX - item.getBoundingClientRect().left;
    const startX = e.clientX;
    let dragging = false;
    const move = (ev) => {
      if (!dragging && Math.abs(ev.clientX - startX) < 5) return;
      dragging = true;
      item.classList.add('dragging');
      const others = [...list.querySelectorAll('.dock-edit-item')].filter((o) => o !== item);
      let idx = others.findIndex((o) => { const r = o.getBoundingClientRect(); return ev.clientX < r.left + r.width / 2; });
      const ref = idx === -1 ? null : others[idx];
      if (item.nextElementSibling !== ref) list.insertBefore(item, ref);
      item.style.transform = '';
      const r = item.getBoundingClientRect();
      item.style.transform = `translateX(${ev.clientX - grab - r.left}px)`;
    };
    const up = () => {
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerup', up);
      item.removeEventListener('pointercancel', up);
      item.classList.remove('dragging');
      item.style.transform = '';
      if (dragging) saveVisibleOrder([...list.querySelectorAll('.dock-edit-item')].map((o) => o.dataset.type));
    };
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
    item.addEventListener('pointercancel', up);
  });
  return item;
}

// Visible tools in their new order, followed by the hidden ones.
function saveVisibleOrder(visible) {
  const d = config();
  save({ order: [...visible, ...hiddenTypes(d)] });
}
