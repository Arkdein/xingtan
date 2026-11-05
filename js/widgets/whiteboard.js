// Whiteboard (白板): pages to write on with a pen, highlighter or typed text,
// on blank paper or a writing grid: 田字格, 米字格, 拼音田字格, four lines
// (四线三格, for pinyin or English handwriting), lines, squares or dots.
// The pages are kept in the tool, and each board keeps its whiteboards (see saved.js).
import { h, put, confirmButton, segmented } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { withSavedItems } from './saved.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 625; // page size in drawing units (16:10)
const PEN_COLOURS = ['#1d2733', '#e0413a', '#2563eb', '#16a34a'];
const HL_COLOURS = ['#fde047', '#86efac', '#f9a8d4'];
const WIDTHS = { thin: 4, thick: 10 };
const MAX_PAGES = 30;

// Paper names: the English ones go through t() where they are shown; the
// Chinese grid names (田字格, 米字格, 拼音田字格) are the same in both languages.
export const PAPERS = [
  ['blank', 'Blank'],
  ['tian', '田字格'],
  ['mi', '米字格'],
  ['pytian', '拼音田字格'],
  ['lines4', 'Four lines'],
  ['lined', 'Lined'],
  ['squares', 'Squares'],
  ['dots', 'Dots'],
];
const SAME_IN_BOTH = new Set(['田字格', '米字格', '拼音田字格']);
const paperName = (label) => (SAME_IN_BOTH.has(label) ? label : t(label));
const SIZES = [['s', 'S'], ['m', 'M'], ['l', 'L']];

// ---------- Paper ----------
const GRID = '#e3a09c', GRID_SOFT = '#efc4c1', RULE = '#b9c6d6', BASE = '#e3a09c';
const line = (x1, y1, x2, y2, stroke, extra = '') => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" ${extra}/>`;
const dash = 'stroke-dasharray="6 6"';

function cells(x0, y0, cell, cols, rows, diag) {
  let s = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * cell, y = y0 + r * cell, m = cell / 2;
      s += line(x + m, y, x + m, y + cell, GRID_SOFT, dash) + line(x, y + m, x + cell, y + m, GRID_SOFT, dash);
      if (diag) s += line(x, y, x + cell, y + cell, GRID_SOFT, dash) + line(x + cell, y, x, y + cell, GRID_SOFT, dash);
    }
  }
  for (let r = 0; r <= rows; r++) s += line(x0, y0 + r * cell, x0 + cols * cell, y0 + r * cell, GRID, 'stroke-width="2"');
  for (let c = 0; c <= cols; c++) s += line(x0 + c * cell, y0, x0 + c * cell, y0 + rows * cell, GRID, 'stroke-width="2"');
  return s;
}

function fourLines(x0, x1, y, band) {
  const g = band / 3;
  return line(x0, y, x1, y, RULE) + line(x0, y + g, x1, y + g, RULE, dash) + line(x0, y + 2 * g, x1, y + 2 * g, BASE, 'stroke-width="1.6"') + line(x0, y + band, x1, y + band, RULE);
}

export function paperSvg(bg, size = 'm') {
  let s = '';
  if (bg === 'tian' || bg === 'mi') {
    const rows = { s: 6, m: 5, l: 4 }[size] || 5;
    const cell = H / rows;
    const cols = Math.floor(W / cell);
    s = cells((W - cols * cell) / 2, 0, cell, cols, rows, bg === 'mi');
  } else if (bg === 'pytian') {
    const cell = { s: 80, m: 100, l: 125 }[size] || 100;
    const band = cell * 0.45;
    const rowH = band + cell + 12;
    const rows = Math.floor((H + 12) / rowH);
    const cols = Math.floor(W / cell);
    const x0 = (W - cols * cell) / 2;
    const y0 = (H - (rows * rowH - 12)) / 2;
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * rowH;
      s += fourLines(x0, x0 + cols * cell, y, band);
      s += cells(x0, y + band, cell, cols, 1, false);
    }
  } else if (bg === 'lines4') {
    const band = { s: 48, m: 66, l: 90 }[size] || 66;
    const step = band * 1.6;
    const rows = Math.floor((H - 20) / step);
    const y0 = (H - (rows - 1) * step - band) / 2;
    for (let r = 0; r < rows; r++) s += fourLines(30, W - 30, y0 + r * step, band);
  } else if (bg === 'lined') {
    const gap = { s: 40, m: 55, l: 75 }[size] || 55;
    for (let y = gap; y < H; y += gap) s += line(0, y, W, y, RULE);
    s += line(70, 0, 70, H, '#f0b4b0');
  } else if (bg === 'squares') {
    const gap = { s: 25, m: 40, l: 62.5 }[size] || 40;
    for (let x = gap; x < W; x += gap) s += line(x, 0, x, H, '#d3dce7');
    for (let y = gap; y < H; y += gap) s += line(0, y, W, y, '#d3dce7');
  } else if (bg === 'dots') {
    const gap = { s: 25, m: 40, l: 62.5 }[size] || 40;
    for (let x = gap; x < W; x += gap) for (let y = gap; y < H; y += gap) s += `<circle cx="${x}" cy="${y}" r="2" fill="#a9b6c6"/>`;
  }
  return s;
}

const tool = {
  type: 'whiteboard',
  title: 'Whiteboard',
  icon: 'chalkboard',
  tone: 'content', // dock tile colour: time | people | signal | content | language
  size: { w: 760, h: 560 },
  minSize: { w: 360, h: 300 },

  mount(body, ctx) {
    const st = ctx.state;
    const newPage = (bg = 'blank', size = 'm') => ({ id: ctx.store.uid(), bg, size, ink: [], texts: [] });
    if (!Array.isArray(st.pages) || !st.pages.length) ctx.save({ pages: [newPage()], cur: 0 });

    let mode = 'pen';
    const colour = { pen: PEN_COLOURS[0], hl: HL_COLOURS[0], text: PEN_COLOURS[0] };
    let width = 'thin';
    let textSize = 40;
    let activeText = null;
    let alive = true;

    const idx = () => Math.max(0, Math.min(st.cur || 0, st.pages.length - 1));
    const page = () => st.pages[idx()];
    function updatePage(patch) {
      const i = idx();
      ctx.save({ pages: st.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
    }

    // ---------- Elements ----------
    const paper = document.createElementNS(NS, 'svg');
    paper.setAttribute('class', 'wb-paper');
    paper.setAttribute('viewBox', `0 0 ${W} ${H}`);
    paper.setAttribute('preserveAspectRatio', 'none');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'im-ink');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const textLayer = h('div', { class: 'im-texts' });
    const layer = h('div', { class: 'im-layer wb-layer' }, paper, svg, textLayer);
    const viewport = h('div', { class: 'im-viewport wb-viewport' }, layer);

    const paperSel = h('select', { class: 'wb-paper-select', 'aria-label': t('Paper') }, ...PAPERS.map(([v, label]) => h('option', { value: v }, paperName(label))));
    paperSel.addEventListener('change', () => { updatePage({ bg: paperSel.value }); drawPaper(); drawBar(); });
    const sizeWrap = h('span');
    const counter = h('span', { class: 'im-counter' });
    const prevBtn = h('button', { class: 'icon-btn small', title: t('Previous page'), 'aria-label': t('Previous page'), onclick: () => goPage(idx() - 1) }, icon('chevron-left'));
    const nextBtn = h('button', { class: 'icon-btn small', title: t('Next page'), 'aria-label': t('Next page'), onclick: () => goPage(idx() + 1) }, icon('chevron-right'));
    const addBtn = h('button', { class: 'icon-btn small', title: t('New page after this one (same paper)'), 'aria-label': t('New page'), onclick: addPage }, icon('file-plus'));
    const delSlot = h('span');
    const fsBtn = h('button', { class: 'icon-btn small', title: t('Full screen'), 'aria-label': t('Full screen') }, icon('maximize'));

    const modeBtn = (m, ic, label) => h('button', { class: 'im-tool', 'data-mode': m, title: t(label), 'aria-label': t(label), onclick: () => setMode(m) }, icon(ic));
    const modes = [modeBtn('pen', 'pencil', 'Pen'), modeBtn('hl', 'highlight', 'Highlighter'), modeBtn('text', 'typography', 'Type text: click where it should go'), modeBtn('erase', 'eraser', 'Rub out a line or text')];
    const swatches = h('div', { class: 'im-swatches' });
    const undoBtn = h('button', { class: 'im-tool', title: t('Undo the last line'), 'aria-label': t('Undo the last line'), onclick: undoInk }, icon('arrow-back-up'));
    const clearBtn = confirmButton(icon('trash'), icon('check'), clearPage, 'im-tool im-clear', { title: t('Clear this page (click twice)'), 'aria-label': t('Clear this page') });

    const view = h('div', { class: 'wb', tabindex: '-1' },
      h('div', { class: 'wb-bar' },
        h('div', { class: 'row gap' }, paperSel, sizeWrap),
        h('div', { class: 'row gap' }, prevBtn, counter, nextBtn, addBtn, delSlot, fsBtn)),
      h('div', { class: 'im-stage wb-stage' }, viewport),
      h('div', { class: 'im-toolbar' },
        h('div', { class: 'im-group' }, ...modes),
        swatches,
        h('div', { class: 'im-group' }, undoBtn, clearBtn)));
    body.append(view);
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else view.requestFullscreen?.().catch(() => ctx.toast(t('Full screen isn’t available here')));
    });

    // ---------- Pages ----------
    function drawBar() {
      const p = page();
      paperSel.value = p.bg;
      put(sizeWrap, p.bg === 'blank' ? '' : segmented(SIZES.map(([v, label]) => [v, t(label)]), p.size || 'm', (v) => { updatePage({ size: v }); drawPaper(); drawBar(); }, t('Grid size')));
      counter.textContent = `${idx() + 1} / ${st.pages.length}`;
      prevBtn.disabled = idx() === 0;
      nextBtn.disabled = idx() >= st.pages.length - 1;
      addBtn.disabled = st.pages.length >= MAX_PAGES;
      put(delSlot, st.pages.length > 1
        ? confirmButton(icon('trash'), icon('check'), deletePage, 'icon-btn small wb-del', { title: t('Delete this page (click twice)'), 'aria-label': t('Delete this page') })
        : '');
    }
    function goPage(i) {
      if (i < 0 || i >= st.pages.length) return;
      commitTexts();
      ctx.save({ cur: i });
      drawAll();
    }
    function addPage() {
      if (st.pages.length >= MAX_PAGES) return;
      commitTexts();
      const p = page();
      const pages = [...st.pages];
      pages.splice(idx() + 1, 0, newPage(p.bg, p.size));
      ctx.save({ pages, cur: idx() + 1 });
      drawAll();
    }
    function deletePage() {
      const pages = st.pages.filter((_, k) => k !== idx());
      ctx.save({ pages, cur: Math.min(idx(), pages.length - 1) });
      drawAll();
    }
    function drawPaper() {
      const p = page();
      paper.innerHTML = paperSvg(p.bg, p.size);
    }
    function drawAll() {
      drawBar();
      drawPaper();
      drawInk();
      drawTexts();
    }

    // ---------- Layout ----------
    function layout() {
      const vw = viewport.clientWidth, vh = viewport.clientHeight;
      if (!vw || !vh) return;
      const a = W / H;
      const size = vw / vh > a ? { w: vh * a, h: vh } : { w: vw, h: vw / a };
      Object.assign(layer.style, { width: size.w + 'px', height: size.h + 'px', left: (vw - size.w) / 2 + 'px', top: (vh - size.h) / 2 + 'px' });
      sizeTexts();
    }
    const ro = new ResizeObserver(layout);
    ro.observe(viewport);

    // ---------- Tools ----------
    function setMode(m) {
      if (mode === 'text' && m !== 'text') commitTexts();
      mode = m;
      modes.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
      viewport.dataset.mode = m;
      textLayer.querySelectorAll('.im-text-edit').forEach((ed) => { ed.contentEditable = m === 'text' ? 'true' : 'false'; });
      const palette = m === 'pen' || m === 'text' ? PEN_COLOURS : m === 'hl' ? HL_COLOURS : [];
      put(swatches, 
        ...palette.map((c) => h('button', {
          class: 'im-swatch' + (colour[m] === c ? ' active' : ''), style: { background: c }, 'aria-label': t('Colour {c}', { c }),
          onclick: () => { colour[m] = c; if (m === 'text') styleActiveText({ c }); setMode(m); },
        })),
        ...(m === 'pen' ? [h('button', { class: 'im-tool' + (width === 'thick' ? ' active' : ''), title: width === 'thick' ? t('Thinner pen') : t('Thicker pen'), 'aria-label': t('Pen thickness'),
          onclick: () => { width = width === 'thick' ? 'thin' : 'thick'; setMode('pen'); } }, width === 'thick' ? t('Thick') : t('Thin'))] : []),
        ...(m === 'text' ? [
          h('button', { class: 'im-tool', title: t('Smaller text'), 'aria-label': t('Smaller text'), onclick: () => resizeText(-1) }, 'A−'),
          h('button', { class: 'im-tool', title: t('Bigger text'), 'aria-label': t('Bigger text'), onclick: () => resizeText(1) }, 'A+'),
        ] : []),
      );
      swatches.hidden = !palette.length;
    }

    const toInk = (e) => {
      const r = layer.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)];
    };
    let stroke = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const onText = e.target.closest('.im-text');
      if (onText) {
        if (mode === 'erase') { e.preventDefault(); removeText(onText.dataset.id); }
        if (mode === 'erase' || mode === 'text') return;
      }
      if (mode === 'text') {
        e.preventDefault();
        if (activeText && textLayer.contains(document.activeElement)) { document.activeElement.blur(); return; }
        const [x, y] = toInk(e);
        if (x < 0 || y < 0 || x > W || y > H) return;
        addText(x, Math.max(0, y - Math.round(textSize * 0.7)));
        return;
      }
      if (mode === 'erase') { e.preventDefault(); viewport.setPointerCapture(e.pointerId); eraseAt(e); stroke = { erase: true }; return; }
      if (stroke) return; // a second finger while drawing
      e.preventDefault();
      viewport.setPointerCapture(e.pointerId);
      const el = document.createElementNS(NS, 'polyline');
      el.setAttribute('class', mode === 'hl' ? 'hl' : 'pen');
      el.setAttribute('stroke', colour[mode]);
      const w = mode === 'pen' ? WIDTHS[width] : null;
      if (w) el.style.strokeWidth = w;
      svg.append(el);
      stroke = { id: e.pointerId, t: mode, c: colour[mode], w, p: toInk(e), el };
      el.setAttribute('points', stroke.p.join(' '));
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!stroke) return;
      if (stroke.erase) { eraseAt(e); return; }
      if (e.pointerId !== stroke.id) return;
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const [x, y] = toInk(ev);
        const n = stroke.p.length;
        if (Math.hypot(x - stroke.p[n - 2], y - stroke.p[n - 1]) >= 2) stroke.p.push(x, y);
      }
      stroke.el.setAttribute('points', stroke.p.join(' '));
    });
    const endStroke = (e) => {
      if (!stroke) return;
      if (stroke.erase) { stroke = null; return; }
      if (e.pointerId !== stroke.id) return;
      const s = stroke;
      stroke = null;
      if (s.p.length === 2) s.p.push(s.p[0] + 1, s.p[1]); // a dot
      updatePage({ ink: [...(page().ink || []), { t: s.t, c: s.c, ...(s.w ? { w: s.w } : {}), p: s.p }] });
      drawInk();
    };
    viewport.addEventListener('pointerup', endStroke);
    viewport.addEventListener('pointercancel', endStroke);

    function drawInk() {
      const ink = page().ink || [];
      put(svg, ...ink.map((s, i) => {
        const el = document.createElementNS(NS, 'polyline');
        el.setAttribute('class', s.t === 'hl' ? 'hl' : 'pen');
        el.setAttribute('stroke', s.c);
        if (s.w) el.style.strokeWidth = s.w;
        el.setAttribute('points', s.p.join(' '));
        el.dataset.i = i;
        return el;
      }));
      undoBtn.disabled = !ink.length;
      clearBtn.disabled = !ink.length && !(page().texts || []).length;
    }
    function eraseAt(e) {
      let el = null;
      for (const [dx, dy] of [[0, 0], [-6, 0], [6, 0], [0, -6], [0, 6]]) {
        el = document.elementsFromPoint(e.clientX + dx, e.clientY + dy).find((x) => x.tagName === 'polyline' && svg.contains(x));
        if (el) break;
      }
      if (!el) return;
      const i = +el.dataset.i;
      if (Number.isNaN(i)) return;
      updatePage({ ink: (page().ink || []).filter((_, k) => k !== i) });
      drawInk();
    }
    function undoInk() {
      const ink = page().ink || [];
      if (!ink.length) return;
      updatePage({ ink: ink.slice(0, -1) });
      drawInk();
    }
    function clearPage() {
      updatePage({ ink: [], texts: [] });
      drawInk();
      drawTexts();
    }

    // ---------- Typed text ({ id, x, y, s, c, v } in page units) ----------
    function drawTexts() {
      put(textLayer, ...(page().texts || []).map(textEl));
      sizeTexts();
    }
    function sizeTexts() {
      const lw = layer.offsetWidth;
      textLayer.querySelectorAll('.im-text').forEach((box) => { box.style.fontSize = (+box.dataset.s * lw / W) + 'px'; });
    }
    function placeText(box) {
      box.style.left = (+box.dataset.x / W * 100) + '%';
      box.style.top = (+box.dataset.y / H * 100) + '%';
      box.style.color = box.dataset.c;
    }
    function textEl(item) {
      const ed = h('div', { class: 'im-text-edit', contenteditable: mode === 'text' ? 'true' : 'false', spellcheck: 'false', role: 'textbox', 'aria-label': t('Text on the whiteboard') });
      ed.innerText = item.v || '';
      const grip = h('button', { class: 'im-text-grip', title: t('Drag to move'), 'aria-label': t('Move this text'), tabindex: '-1' }, icon('grip-vertical'));
      const del = h('button', { class: 'im-text-del', title: t('Delete this text'), 'aria-label': t('Delete this text'), tabindex: '-1' }, icon('x'));
      const box = h('div', { class: 'im-text', 'data-id': item.id }, grip, ed, del);
      Object.assign(box.dataset, { x: item.x, y: item.y, s: item.s, c: item.c });
      placeText(box);
      ed.addEventListener('focus', () => { activeText = item.id; box.classList.add('editing'); });
      ed.addEventListener('blur', () => { box.classList.remove('editing'); commitTexts(); });
      ed.addEventListener('keydown', (e) => { if (e.key === 'Escape') ed.blur(); e.stopPropagation(); });
      ed.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') || '');
      });
      del.addEventListener('pointerdown', (e) => e.preventDefault());
      del.addEventListener('click', () => removeText(item.id));
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        grip.setPointerCapture(e.pointerId);
        const r = layer.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, ox = +box.dataset.x, oy = +box.dataset.y;
        const move = (ev) => {
          box.dataset.x = Math.round(Math.max(0, Math.min(W - 20, ox + (ev.clientX - sx) / r.width * W)));
          box.dataset.y = Math.round(Math.max(0, Math.min(H - 10, oy + (ev.clientY - sy) / r.height * H)));
          placeText(box);
        };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
          grip.removeEventListener('pointercancel', up);
          commitTexts();
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
        grip.addEventListener('pointercancel', up);
      });
      return box;
    }
    function addText(x, y) {
      const item = { id: ctx.store.uid(), x, y, s: textSize, c: colour.text, v: '' };
      const box = textEl(item);
      textLayer.append(box);
      sizeTexts();
      box.querySelector('.im-text-edit').focus({ preventScroll: true });
    }
    function commitTexts() {
      if (!alive) return;
      const texts = [...textLayer.querySelectorAll('.im-text')].map((box) => ({
        id: box.dataset.id, x: +box.dataset.x, y: +box.dataset.y, s: +box.dataset.s, c: box.dataset.c,
        v: box.querySelector('.im-text-edit').innerText.replace(/\n+$/, ''),
      }));
      textLayer.querySelectorAll('.im-text').forEach((box) => {
        if (!box.querySelector('.im-text-edit').innerText.trim() && !box.classList.contains('editing')) box.remove();
      });
      const saved = texts.filter((x) => x.v.trim());
      if (JSON.stringify(saved) !== JSON.stringify(page().texts || [])) updatePage({ texts: saved });
      clearBtn.disabled = !(page().ink || []).length && !saved.length;
    }
    function removeText(id) {
      textLayer.querySelector(`.im-text[data-id="${id}"]`)?.remove();
      if (activeText === id) activeText = null;
      commitTexts();
    }
    const activeBox = () => (activeText ? textLayer.querySelector(`.im-text[data-id="${activeText}"]`) : null);
    function styleActiveText(patch) {
      const box = activeBox();
      if (!box) return;
      Object.assign(box.dataset, patch);
      placeText(box);
      sizeTexts();
      commitTexts();
    }
    function resizeText(d) {
      const steps = [20, 28, 40, 56, 72, 96, 128];
      const box = activeBox();
      const from = box ? +box.dataset.s : textSize;
      const i = steps.findIndex((s) => s >= from);
      textSize = steps[Math.max(0, Math.min(steps.length - 1, (i < 0 ? steps.length - 1 : i) + d))];
      styleActiveText({ s: textSize });
      box?.querySelector('.im-text-edit').focus();
    }

    // Keys: ← → for pages (or a presentation clicker), Ctrl+Z to undo.
    function onKey(e) {
      if (e.target.closest('input, textarea, select') || e.target.isContentEditable) return;
      if (e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); goPage(idx() + 1); }
      else if (e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); goPage(idx() - 1); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoInk(); }
    }
    view.addEventListener('keydown', onKey);
    view.addEventListener('pointerdown', () => { if (!view.contains(document.activeElement)) view.focus({ preventScroll: true }); });

    setMode('pen');
    drawAll();
    layout();
    return {
      destroy() {
        commitTexts();
        alive = false;
        ro.disconnect();
        view.removeEventListener('keydown', onKey);
        if (document.fullscreenElement === view) document.exitFullscreen?.();
      },
    };
  },
};

// Each board keeps its whiteboards (see saved.js), so closing the tool keeps them.
const count = (n, one, many) => (n === 1 ? t(one) : t(many, { n }));
const typed = (st) => (st.pages || []).flatMap((p) => p.texts || []).map((x) => String(x.v || '').trim()).filter(Boolean);
export default withSavedItems(tool, {
  isBlank: (st) => (st.pages || []).length <= 1 && !(st.pages || []).some((p) => (p.ink || []).length) && !typed(st).length,
  describe: (st) => ({
    title: (typed(st)[0] || '').split('\n')[0],
    sub: count(Math.max(1, (st.pages || []).length), '1 page', '{n} pages'),
  }),
});
