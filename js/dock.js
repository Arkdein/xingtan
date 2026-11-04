// The tool dock at the bottom of a board.
// Teachers can reorder tools, hide ones they don't use (they stay one tap
// away under “More”) and switch to a compact, icons-only dock. The layout is
// the same on every board and is saved with the class lists in this browser.
//
// The dock wraps onto up to 1–3 rows (2 by default), with at most 10 tools a
// row. Tools that still don't fit go under “More”. The handle above the dock
// hides it (each board remembers whether its dock is hidden); D does the same.
import * as store from './store.js';
import { h, toast } from './ui.js';
import { icon } from './icons.js';
import { widgets, widgetByType } from './widgets/index.js';
import { t } from './i18n.js';

const MAX_PER_ROW = 10;
const ROW_CHOICES = [1, 2, 3];

const dockEl = () => document.getElementById('dock');
let onAdd = () => {};
let editing = false;
let pop = null;      // the “More” menu, when open
let handle = null;   // the hide / show tab
let overflow = [];   // dock tools that didn't fit on screen; listed first under More

const defaults = () => ({ order: widgets.map((w) => w.type), hidden: [], compact: false, rows: 2 });

function config() {
  const saved = store.get().dock || {};
  const d = { ...defaults(), ...saved };
  const known = new Set(widgets.map((w) => w.type));
  // Drop tools that no longer exist; add new tools at the end.
  d.order = d.order.filter((t) => known.has(t));
  widgets.forEach((w) => { if (!d.order.includes(w.type)) d.order.push(w.type); });
  d.hidden = d.hidden.filter((t) => known.has(t));
  d.rows = ROW_CHOICES.includes(Number(d.rows)) ? Number(d.rows) : 2;
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
  handle = h('button', { id: 'dock-handle', class: 'dock-handle', 'aria-controls': 'dock', onclick: () => toggleHidden() });
  document.body.append(handle);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (pop) closeMore();
      else if (editing) setEditing(false);
      return;
    }
    if ((e.key === 'd' || e.key === 'D') && !e.repeat && shortcutAllowed(e)) {
      e.preventDefault();
      toggleHidden();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (pop && !pop.contains(e.target) && !e.target.closest('.dock-more')) closeMore();
  });
  // The dock can't be measured while the boards screen covers it, so lay it out again on return.
  document.addEventListener('launcher-closed', () => { if (!editing) render(); else setSpace(); });
  let resizing = null;
  window.addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(fit, 150); });
  render();
}

// D toggles the dock only when the teacher isn't typing or working inside a tool.
function shortcutAllowed(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (!store.getBoard() || document.body.classList.contains('launcher-open')) return false;
  if (document.getElementById('modal')?.open) return false;
  const t = e.target;
  if (t === document.body || t === document.documentElement || t?.id === 'stage') return true;
  return !!t?.closest?.('#dock, #dock-handle, .corner-menu, .board-bar');
}

export function setEditing(on) {
  editing = on;
  closeMore();
  render();
}

export function isEditing() { return editing; }

// ---------- Hide / show (remembered per board) ----------
export function isHidden() { return !!store.getBoard()?.dockHidden; }

export function toggleHidden(force) {
  if (!store.getBoard()) return;
  const next = typeof force === 'boolean' ? force : !isHidden();
  if (next) { editing = false; closeMore(); }
  store.updateBoard((b) => { if (next) b.dockHidden = true; else delete b.dockHidden; });
  render();
  if (!next) dockEl().querySelector('.dock-btn')?.focus({ preventScroll: true });
  else handle?.focus({ preventScroll: true });
}

// Height of the board the dock covers at the moment (0 when hidden).
export function dockSpace() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-space'));
  return Number.isFinite(v) ? v : 0;
}

function setSpace() {
  const el = dockEl();
  const shown = !el.classList.contains('is-hidden') && !document.body.classList.contains('launcher-open');
  const hgt = el.offsetHeight;
  const root = document.documentElement.style;
  if (hgt) root.setProperty('--dock-h', hgt + 'px');
  if (hgt || !shown) root.setProperty('--dock-space', shown ? (hgt + 10) + 'px' : '0px');
  updateHandle();
}

function updateHandle() {
  if (!handle) return;
  const hidden = isHidden() && !editing;
  handle.hidden = editing || !store.getBoard();
  handle.classList.toggle('is-closed', hidden);
  handle.setAttribute('aria-expanded', String(!hidden));
  handle.title = hidden ? t('Show tools (D)') : t('Hide tools (D)');
  handle.setAttribute('aria-label', hidden ? t('Show tools') : t('Hide tools'));
  handle.replaceChildren(icon(hidden ? 'chevron-up' : 'chevron-down'));
  if (hidden) handle.append(h('span', { class: 'dock-handle-label' }, t('Tools')));
}

// ---------- Dock ----------
export function render() {
  const el = dockEl();
  const d = config();
  const hidden = isHidden() && !editing;
  el.classList.toggle('is-hidden', hidden);
  el.toggleAttribute('inert', hidden);
  el.classList.toggle('compact', d.compact && !editing);
  el.classList.toggle('editing', editing);
  el.classList.remove('multi', 'tight', 'auto-compact');
  el.replaceChildren();

  if (editing) { renderEditor(el, d); setSpace(); return; }

  const tools = h('div', { class: 'dock-tools' }, ...visibleTypes(d).map((type) => {
    const def = widgetByType[type];
    const name = t(def.title);
    const add = t('Add {tool}', { tool: name });
    return h('button', { class: 'dock-btn', 'data-type': type, title: add, 'aria-label': add, onclick: () => onAdd(type) },
      toolTile(def), h('span', { class: 'dock-label' }, name));
  }));
  const more = h('button', {
    class: 'dock-btn dock-more', title: t('More tools'), 'aria-haspopup': 'true', onclick: toggleMore,
  }, h('span', { class: 'tool-tile plain' }, icon('dots')), h('span', { class: 'dock-label' }, t('More')));
  const edit = h('button', {
    class: 'dock-btn dock-edit', title: t('Edit dock: reorder, hide or add tools'), 'aria-label': t('Edit dock'),
    onclick: () => setEditing(true),
  }, h('span', { class: 'tool-tile plain' }, icon('pencil')), h('span', { class: 'dock-label' }, t('Edit')));
  el.append(tools, h('span', { class: 'dock-divider', 'aria-hidden': 'true' }), h('div', { class: 'dock-side' }, more, edit));
  fit();
}

// Lays the tools out in rows of up to 10. If they don't fit in the rows
// allowed, the labels first go onto two lines, then the dock shows icons only,
// and finally the tools that still don't fit move under “More”.
function fit() {
  const el = dockEl();
  const tools = el.querySelector('.dock-tools');
  if (editing || !tools) { setSpace(); return; }
  if (!el.offsetParent && getComputedStyle(el).display === 'none') return; // boards screen is open
  const d = config();
  const btns = [...tools.children];
  const more = el.querySelector('.dock-more');
  const hiddenCount = hiddenTypes(d).length;
  btns.forEach((b) => { b.hidden = false; });

  const steps = d.compact ? [[]] : [[], ['tight'], ['tight', 'auto-compact']];
  const useStep = (classes) => {
    el.classList.remove('tight', 'auto-compact');
    classes.forEach((c) => el.classList.add(c));
  };
  let plan = null;
  for (const classes of steps) {
    useStep(classes);
    plan = planRows(measure(el, tools, btns, more, hiddenCount > 0), d.rows, false);
    if (plan.fits) break;
  }
  if (!plan.fits) {
    // Some tools must go under More. Keep the labels unless a smaller dock
    // actually fits more tools on screen.
    let best = null;
    for (const classes of steps) {
      useStep(classes);
      const p = planRows(measure(el, tools, btns, more, true), d.rows, true);
      if (!best || p.shown > best.plan.shown) best = { classes, plan: p };
    }
    useStep(best.classes);
    plan = best.plan;
  }

  tools.style.gridTemplateColumns = `repeat(${Math.max(1, plan.cols)}, max-content)`;
  btns.forEach((b, i) => { b.hidden = i >= plan.shown; });
  overflow = visibleTypes(d).slice(plan.shown);
  el.classList.toggle('multi', plan.rows > 1);
  const moreCount = hiddenCount + overflow.length;
  more.hidden = moreCount === 0;
  more.setAttribute('aria-label', t('More tools ({n})', { n: moreCount }));
  setSpace();
}

// Widths of each tool, and how much room the rows have beside More / Edit.
function measure(el, tools, btns, more, showMore) {
  more.hidden = !showMore;
  tools.style.gridTemplateColumns = `repeat(${Math.max(1, btns.length)}, max-content)`;
  const widths = btns.map((b) => b.offsetWidth);
  const cs = getComputedStyle(el);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const gap = parseFloat(cs.columnGap) || 0;
  const divider = el.querySelector('.dock-divider');
  const dcs = getComputedStyle(divider);
  const dividerW = divider.offsetWidth + parseFloat(dcs.marginLeft) + parseFloat(dcs.marginRight);
  const side = el.querySelector('.dock-side');
  const wasMulti = el.classList.contains('multi');
  el.classList.remove('multi');
  const side1 = side.offsetWidth;
  el.classList.add('multi');
  const sideN = side.offsetWidth;
  el.classList.toggle('multi', wasMulti);
  const room = document.documentElement.clientWidth - 20 - pad - gap * 2 - dividerW;
  return { widths, gap: parseFloat(getComputedStyle(tools).columnGap) || 0, room1: room - side1, roomN: room - sideN };
}

function planRows({ widths, gap, room1, roomN }, maxRows, allowOverflow) {
  const n = widths.length;
  if (!n) return { fits: true, cols: 1, rows: 1, shown: 0 };
  // Total width of `count` tools laid out `cols` to a row (columns line up).
  const span = (cols, count) => {
    const cw = new Array(cols).fill(0);
    for (let i = 0; i < count; i++) cw[i % cols] = Math.max(cw[i % cols], widths[i]);
    return cw.reduce((a, b) => a + b, 0) + gap * (cols - 1);
  };
  for (let c = Math.min(MAX_PER_ROW, n); c >= 1; c--) {
    const rows = Math.ceil(n / c);
    if (rows > maxRows) break;
    const cols = Math.ceil(n / rows); // share the tools evenly between the rows
    if (span(cols, n) <= (rows > 1 ? roomN : room1)) return { fits: true, cols, rows, shown: n };
  }
  if (!allowOverflow) return { fits: false };
  // Fill every row as far as it goes; the rest go under More.
  const room = maxRows > 1 ? roomN : room1;
  let c = Math.min(MAX_PER_ROW, n);
  while (c > 1 && span(c, Math.min(n, c * maxRows)) > room) c--;
  const shown = Math.min(n, c * maxRows);
  return { fits: shown === n, cols: c, rows: Math.ceil(shown / c), shown };
}

// ---------- “More” menu ----------
function toggleMore() {
  if (pop) { closeMore(); return; }
  const d = config();
  const item = (type) => {
    const def = widgetByType[type];
    return h('button', { class: 'dock-pop-item', 'data-type': type, role: 'menuitem', onclick: () => { closeMore(); onAdd(type); } },
      toolTile(def, 'small'), h('span', {}, t(def.title)));
  };
  const hidden = hiddenTypes(d);
  pop = h('div', { class: 'dock-pop', role: 'menu', 'aria-label': t('More tools') },
    overflow.length ? h('p', { class: 'dock-pop-head' }, t('No room in the dock')) : null,
    ...overflow.map(item),
    hidden.length ? h('p', { class: 'dock-pop-head' }, overflow.length ? t('Hidden tools') : t('More tools')) : null,
    ...hidden.map(item),
    h('button', { class: 'link-btn dock-pop-edit', onclick: () => setEditing(true) }, t('Edit dock')),
  );
  document.body.append(pop);
  const r = dockEl().querySelector('.dock-more').getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + 'px';
  pop.style.bottom = (window.innerHeight - r.top + 14) + 'px';
  pop.style.maxHeight = Math.max(160, r.top - 34) + 'px';
  pop.querySelector('.dock-pop-item')?.focus();
}

function closeMore() {
  pop?.remove();
  pop = null;
}

// ---------- Edit mode ----------
function renderEditor(el, d) {
  const list = h('div', { class: 'dock-items', role: 'list', 'aria-label': t('Tools in the dock') });
  visibleTypes(d).forEach((type) => list.append(editItem(type, list)));
  if (!list.children.length) list.append(h('p', { class: 'dock-note' }, t('No tools in the dock. Add some from below.')));

  const hidden = hiddenTypes(d);
  const tray = h('div', { class: 'dock-tray' },
    h('span', { class: 'dock-tray-label' }, hidden.length ? t('Hidden:') : t('All tools are in the dock.')),
    ...hidden.map((type) => {
      const def = widgetByType[type];
      const back = t('Add {tool} back to the dock', { tool: t(def.title) });
      return h('button', {
        class: 'dock-hidden-btn', title: back, 'aria-label': back,
        onclick: () => save({ hidden: config().hidden.filter((t) => t !== type), order: [...config().order.filter((t) => t !== type), type] }),
      }, toolTile(def, 'small'), h('span', {}, t(def.title)), h('span', { class: 'dock-badge add' }, icon('plus')));
    }),
  );

  const compact = h('input', { type: 'checkbox', checked: d.compact });
  compact.addEventListener('change', () => save({ compact: compact.checked }));

  const rows = h('select', { class: 'dock-rows', title: t('How many rows the dock may use. Tools that don’t fit go under More.') },
    ...ROW_CHOICES.map((n) => h('option', { value: String(n), selected: d.rows === n }, String(n))));
  rows.addEventListener('change', () => save({ rows: Number(rows.value) }));

  const controls = h('div', { class: 'dock-controls' },
    h('label', { class: 'row gap dock-compact' }, t('Rows'), rows),
    h('label', { class: 'row gap dock-compact' }, compact, t('Icons only (compact)')),
    h('button', {
      class: 'btn small', title: t('Put every tool back in the original order'),
      onclick: () => { save(defaults()); toast(t('Dock reset')); },
    }, t('Reset')),
    h('button', { class: 'btn primary small', onclick: () => setEditing(false) }, t('Done')),
  );

  const hint = h('p', { class: 'dock-hint' }, t('Drag tools to reorder. Tap − to hide a tool, or + to add it back.'));
  el.append(hint, list, h('div', { class: 'dock-edit-foot' }, tray, controls));
  // Same rows of up to 10 as the dock itself; on a narrow screen they just wrap.
  const count = list.querySelectorAll('.dock-edit-item').length;
  if (count) {
    list.classList.add('as-grid');
    list.style.gridTemplateColumns = `repeat(${Math.min(MAX_PER_ROW, count)}, max-content)`;
    if (list.scrollWidth > list.clientWidth + 1) { list.classList.remove('as-grid'); list.style.gridTemplateColumns = ''; }
  }
}

function editItem(type, list) {
  const def = widgetByType[type];
  const name = t(def.title);
  const hideLabel = t('Hide {tool}', { tool: name });
  const hide = h('button', {
    class: 'dock-badge remove', title: hideLabel, 'aria-label': hideLabel,
    onclick: (e) => { e.stopPropagation(); save({ hidden: [...config().hidden, type] }); },
  }, icon('minus'));
  const item = h('div', {
    class: 'dock-btn dock-edit-item', role: 'listitem', tabindex: '0', 'data-type': type,
    title: t('Drag to move. Arrow keys also move it.'), 'aria-label': t('{tool}. Use left and right arrow keys to move.', { tool: name }),
  }, toolTile(def), h('span', { class: 'dock-label' }, name), hide);

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
    const box = item.getBoundingClientRect();
    const grabX = e.clientX - box.left, grabY = e.clientY - box.top;
    const startX = e.clientX, startY = e.clientY;
    let dragging = false;
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
      dragging = true;
      item.classList.add('dragging');
      // The tools can wrap onto several rows: a row above the pointer comes
      // before it, and in the pointer's own row, tools left of it do.
      const others = [...list.querySelectorAll('.dock-edit-item')].filter((o) => o !== item);
      const idx = others.findIndex((o) => {
        const r = o.getBoundingClientRect();
        if (ev.clientY < r.top) return true;
        return ev.clientY <= r.bottom && ev.clientX < r.left + r.width / 2;
      });
      const ref = idx === -1 ? null : others[idx];
      if (item.nextElementSibling !== ref) list.insertBefore(item, ref);
      item.style.transform = '';
      const r = item.getBoundingClientRect();
      item.style.transform = `translate(${ev.clientX - grabX - r.left}px, ${ev.clientY - grabY - r.top}px)`;
    };
    // Listen on the window: moving the tool in the page drops pointer capture.
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      item.classList.remove('dragging');
      item.style.transform = '';
      if (dragging) saveVisibleOrder([...list.querySelectorAll('.dock-edit-item')].map((o) => o.dataset.type));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  return item;
}

// Visible tools in their new order, followed by the hidden ones.
function saveVisibleOrder(visible) {
  const d = config();
  save({ order: [...visible, ...hiddenTypes(d)] });
}
