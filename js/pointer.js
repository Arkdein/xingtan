// Pointer 激光笔: a laser pointer drawn on the screen, for panels and TVs where a
// real laser barely shows, and for classrooms where the mouse cursor is too
// small to see from the back. Three modes:
//
//   Laser dot   a large glowing dot, with a short tail, follows the mouse (or a
//               finger while it touches the screen). Clicks still reach the tools.
//   Fading ink  drag to circle or underline something; the marks fade away a
//               moment after the pen lifts. A quick tap still presses what is
//               under it (a button, a gap in Sentence analysis…).
//   Spotlight   dims the board except a circle round the pointer. Clicks still
//               reach the tools.
//
// L (or the pointer button beside the board name) turns it on and off; 1, 2 and
// 3 switch modes; Esc or Done turns it off. The mode, colour and size last chosen
// are kept for this computer (meta.pointer) and in backups. Nothing is saved with
// the board, and nothing drawn here is kept.
import * as store from './store.js';
import { h } from './ui.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

export const MODES = ['dot', 'ink', 'spot'];
const MODE_INFO = {
  dot: { icon: 'focus-2', label: 'Laser dot', key: '1' },
  ink: { icon: 'scribble', label: 'Fading ink', key: '2' },
  spot: { icon: 'sun-low', label: 'Spotlight', key: '3' },
};
export const COLOURS = [
  { id: 'red', hex: '#ff2d2d', label: 'Red' },
  { id: 'green', hex: '#1fe06a', label: 'Green' },
  { id: 'blue', hex: '#2f8cff', label: 'Blue' },
  { id: 'yellow', hex: '#ffd21a', label: 'Yellow' },
  { id: 'pink', hex: '#ff3fd2', label: 'Pink' },
];
export const SIZES = ['s', 'm', 'l'];
const SIZE_INFO = { s: 'Small', m: 'Medium', l: 'Large' };
// Dot radius and ink width in px on an 800 px-high screen (larger screens scale up);
// spotlight radius as a share of the screen's shorter side.
const DOT = { s: 8, m: 12, l: 18 };
const INK = { s: 4, m: 6, l: 10 };
const SPOT = { s: 0.13, m: 0.2, l: 0.28 };

const TAIL_MS = 160;   // how long the laser dot's tail lasts
const HOLD_MS = 1100;  // fading ink stays this long after the pen lifts…
const FADE_MS = 600;   // …then fades out over this long
const TOUCH_FADE_MS = 350; // the dot fades when a finger lifts
const TAP_MOVE = 6;    // px: a press that moves less than this is a tap
const TAP_MS = 450;

let on = false;
let canvas = null;
let ctx = null;
let bar = null;
let raf = 0;
let dirty = false;

// Where the pointer is, and whether the dot shows.
const pos = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
let dotGoneAt = 0;          // a finger lifted: the dot fades from this time
let overBar = false;        // the pointer is over the pointer bar: no dot there
let tail = [];              // recent positions, for the dot's tail: { x, y, at }
// Fading ink: strokes made since the screen was last clear.
let strokes = [];
let inking = null;          // the press in progress: { id, x, y, at, moved, stroke }
let liftedAt = 0;           // when the pen last lifted (all strokes fade together)

const settings = () => {
  const p = store.get().pointer || {};
  return {
    mode: MODES.includes(p.mode) ? p.mode : 'dot',
    colour: COLOURS.some((c) => c.id === p.colour) ? p.colour : 'red',
    size: SIZES.includes(p.size) ? p.size : 'm',
  };
};
function save(patch) {
  store.update((m) => { m.pointer = { ...settings(), ...patch }; }, { notify: false });
}
const hex = () => (COLOURS.find((c) => c.id === settings().colour) || COLOURS[0]).hex;
const scale = () => Math.min(2.2, Math.max(1, Math.min(innerWidth, innerHeight) / 800));

export const isOn = () => on;

export function initPointer() {
  canvas = h('canvas', { id: 'pointer-layer', class: 'pointer-layer', hidden: true, 'aria-hidden': 'true' });
  ctx = canvas.getContext('2d');
  document.body.append(canvas);
  buildBar();
  document.addEventListener('keydown', onKey, true);
  // The dot and spotlight follow the pointer wherever it is; the layer itself
  // lets clicks through. Capture, so tools that stop events don't hide the pointer.
  window.addEventListener('pointermove', onMove, { capture: true, passive: true });
  window.addEventListener('pointerdown', onMove, { capture: true, passive: true });
  window.addEventListener('pointerup', onLift, { capture: true, passive: true });
  window.addEventListener('pointercancel', onLift, { capture: true, passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pos.seen = false; tail = []; dirty = true; });
  window.addEventListener('blur', () => { pos.seen = false; tail = []; dirty = true; });
  // Fading ink: the layer takes the presses.
  canvas.addEventListener('pointerdown', inkDown);
  canvas.addEventListener('pointermove', inkMove);
  canvas.addEventListener('pointerup', inkUp);
  canvas.addEventListener('pointercancel', inkUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => { if (on) fit(); });
  // Blanking the board puts the pointer away.
  document.addEventListener('xingtan:blank', (e) => { if (e.detail?.on) setPointer(false); });
}

// Refreshes the bar's words after the language changes.
export function relabel() {
  if (!bar) return;
  const wasHidden = bar.hidden;
  bar.remove();
  buildBar();
  bar.hidden = wasHidden;
}

export function togglePointer() { setPointer(!on); }

export function setPointer(next) {
  next = !!next;
  if (next === on) return;
  if (next && (!store.getBoard() || document.body.classList.contains('launcher-open') || document.body.classList.contains('blanked'))) return;
  on = next;
  canvas.hidden = !on;
  bar.hidden = !on;
  document.getElementById('btn-pointer')?.classList.toggle('active', on);
  document.getElementById('btn-pointer')?.setAttribute('aria-pressed', String(on));
  strokes = []; inking = null; tail = [];
  if (on) {
    fit();
    applyMode();
    dirty = true;
    if (!raf) raf = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(raf);
    raf = 0;
    document.body.classList.remove('pointer-dot', 'pointer-ink', 'pointer-spot');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  document.dispatchEvent(new CustomEvent('xingtan:pointer', { detail: { on } }));
}

export function setMode(mode) {
  if (!MODES.includes(mode)) return;
  save({ mode });
  strokes = []; inking = null;
  applyMode();
}

function applyMode() {
  const { mode, colour, size } = settings();
  document.body.classList.toggle('pointer-dot', on && mode === 'dot');
  document.body.classList.toggle('pointer-ink', on && mode === 'ink');
  document.body.classList.toggle('pointer-spot', on && mode === 'spot');
  // Only fading ink needs the presses; the other modes let them through.
  canvas.classList.toggle('takes-input', mode === 'ink');
  bar.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  bar.querySelectorAll('[data-colour]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colour === colour)));
  bar.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === size)));
  bar.querySelector('.pointer-colours').hidden = mode === 'spot'; // the spotlight has no colour
  dirty = true;
}

// ---------- The bar (right edge, half-way down) ----------
function buildBar() {
  const modeBtn = (m) => h('button', {
    class: 'pointer-opt pointer-mode', 'data-mode': m, 'aria-pressed': 'false',
    title: t('{label} ({key})', { label: t(MODE_INFO[m].label), key: MODE_INFO[m].key }),
    onclick: () => setMode(m),
  }, icon(MODE_INFO[m].icon), h('span', { class: 'pointer-opt-label' }, t(MODE_INFO[m].label)));
  const swatch = (c) => h('button', {
    class: 'pointer-swatch', 'data-colour': c.id, 'aria-pressed': 'false',
    title: t(c.label), 'aria-label': t(c.label), style: `--sw: ${c.hex}`,
    onclick: () => { save({ colour: c.id }); applyMode(); },
  });
  const sizeBtn = (s) => h('button', {
    class: 'pointer-size', 'data-size': s, 'aria-pressed': 'false',
    title: t(SIZE_INFO[s]), 'aria-label': t(SIZE_INFO[s]),
    onclick: () => { save({ size: s }); applyMode(); },
  }, h('span', { class: `pointer-size-dot size-${s}` }));
  bar = h('div', { class: 'pointer-bar', role: 'toolbar', 'aria-label': t('Pointer'), hidden: true },
    h('div', { class: 'pointer-group' }, MODES.map(modeBtn)),
    h('div', { class: 'pointer-group pointer-colours' }, COLOURS.map(swatch)),
    h('div', { class: 'pointer-group', role: 'group', 'aria-label': t('Size') }, SIZES.map(sizeBtn)),
    h('button', { class: 'pointer-opt pointer-done', title: t('Put the pointer away (L or Esc)'), onclick: () => setPointer(false) },
      icon('x'), h('span', { class: 'pointer-opt-label' }, t('Done'))));
  bar.addEventListener('pointerenter', () => { overBar = true; dirty = true; });
  bar.addEventListener('pointerleave', () => { overBar = false; dirty = true; });
  document.body.append(bar);
  if (on) applyMode();
}

// ---------- Keys ----------
// L toggles when the teacher isn't typing. While it's on, 1–3 switch modes and Esc puts it away.
function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const key = e.key;
  if (on && key === 'Escape') {
    if (document.getElementById('modal')?.open) return;
    setPointer(false);
    return;
  }
  if (!allowed(e.target)) return;
  if (key === 'l' || key === 'L') {
    e.preventDefault();
    e.stopPropagation();
    togglePointer();
  } else if (on) {
    const m = MODES.find((x) => MODE_INFO[x].key === key);
    if (m) { e.preventDefault(); e.stopPropagation(); setMode(m); }
  }
}

function allowed(target) {
  if (!store.getBoard() || document.body.classList.contains('launcher-open')) return false;
  if (document.body.classList.contains('blanked')) return false;
  if (document.getElementById('modal')?.open || document.querySelector('.tour')) return false;
  const el = target instanceof Element ? target : null;
  if (!el) return true;
  return !el.closest('input, textarea, select') && !el.isContentEditable;
}

// ---------- Following the pointer ----------
function onMove(e) {
  if (!on) return;
  pos.x = e.clientX; pos.y = e.clientY; pos.seen = true;
  dotGoneAt = 0;
  const now = performance.now();
  const pts = e.getCoalescedEvents?.() || [];
  (pts.length ? pts : [e]).forEach((p) => tail.push({ x: p.clientX, y: p.clientY, at: now }));
  dirty = true;
}

function onLift(e) {
  if (!on) return;
  // A finger has no hover: the dot fades once it lifts. (The spotlight stays put.)
  if (e.pointerType !== 'mouse') dotGoneAt = performance.now();
  dirty = true;
}

// ---------- Fading ink ----------
function inkDown(e) {
  if (!on || settings().mode !== 'ink' || inking) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  inking = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), moved: false, stroke: null };
}

function inkMove(e) {
  if (!inking || e.pointerId !== inking.id) return;
  const pts = e.getCoalescedEvents?.() || [];
  if (!inking.moved) {
    if (Math.hypot(e.clientX - inking.x, e.clientY - inking.y) < TAP_MOVE) return;
    inking.moved = true;
    inking.stroke = [{ x: inking.x, y: inking.y }];
    // Marks still on screen belong with this one: they wait and fade together.
    if (!strokes.length || fadeAlpha(performance.now()) <= 0) strokes = [];
    strokes.push(inking.stroke);
  }
  (pts.length ? pts : [e]).forEach((p) => inking.stroke.push({ x: p.clientX, y: p.clientY }));
  dirty = true;
}

function inkUp(e) {
  if (!inking || e.pointerId !== inking.id) return;
  const press = inking;
  inking = null;
  canvas.releasePointerCapture?.(e.pointerId);
  liftedAt = performance.now();
  dirty = true;
  // A tap presses what is under the pointer, as if the pen weren't there.
  if (!press.moved && e.type === 'pointerup' && liftedAt - press.at < TAP_MS) passThrough(e.clientX, e.clientY);
}

function passThrough(x, y) {
  canvas.classList.remove('takes-input');
  const el = document.elementFromPoint(x, y);
  canvas.classList.add('takes-input');
  if (!el || el === canvas || el.closest('.pointer-bar')) return;
  const field = el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
  if (field) field.focus({ preventScroll: true });
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 }));
}

// 1 while drawing and for a moment after, then down to 0.
function fadeAlpha(now) {
  if (inking?.moved) return 1;
  const since = now - liftedAt - HOLD_MS;
  return since <= 0 ? 1 : Math.max(0, 1 - since / FADE_MS);
}

// ---------- Drawing ----------
function fit() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!pos.seen) { pos.x = innerWidth / 2; pos.y = innerHeight / 2; }
  dirty = true;
}

function rgba(hx, a) {
  const n = parseInt(hx.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  tail = tail.filter((p) => now - p.at < TAIL_MS);
  const fadingDot = dotGoneAt && now - dotGoneAt < TOUCH_FADE_MS;
  const inkShowing = strokes.length && fadeAlpha(now) > 0;
  if (!dirty && !tail.length && !fadingDot && !inkShowing) return;
  dirty = false;
  draw(now);
}

function draw(now) {
  const { mode, size } = settings();
  const W = innerWidth; const H = innerHeight;
  ctx.clearRect(0, 0, W, H);
  const col = hex();
  const k = scale();
  let dotAlpha = pos.seen && !overBar ? 1 : 0;
  if (dotGoneAt) dotAlpha *= Math.max(0, 1 - (now - dotGoneAt) / TOUCH_FADE_MS);

  if (mode === 'spot') {
    const r = SPOT[size] * Math.min(W, H);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.74)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(pos.x, pos.y, r * 0.86, pos.x, pos.y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (mode === 'ink') {
    const a = fadeAlpha(now);
    if (a <= 0) strokes = [];
    const w = INK[size] * k;
    strokes.forEach((s) => drawStroke(s, w, col, a));
    // The pen tip, smaller than the laser dot, so the teacher sees where the ink will go.
    if (dotAlpha > 0) drawDot(pos.x, pos.y, Math.max(4, w * 0.9), col, dotAlpha);
    return;
  }

  // Laser dot, with a short tail that fades.
  const r = DOT[size] * k;
  if (dotAlpha > 0 && tail.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < tail.length; i++) {
      const f = 1 - (now - tail[i].at) / TAIL_MS;
      if (f <= 0) continue;
      ctx.strokeStyle = rgba(col, 0.55 * f * dotAlpha);
      ctx.lineWidth = r * 1.3 * f;
      ctx.beginPath();
      ctx.moveTo(tail[i - 1].x, tail[i - 1].y);
      ctx.lineTo(tail[i].x, tail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (dotAlpha > 0) drawDot(pos.x, pos.y, r, col, dotAlpha);
}

// A glowing dot: white-hot centre, the colour, then a soft halo.
function drawDot(x, y, r, col, alpha) {
  const R = r * 2.6;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.16, rgba(col, alpha));
  g.addColorStop(0.38, rgba(col, 0.6 * alpha));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
}

// A smooth glowing line: a wide soft glow, the colour, and a light core.
function drawStroke(pts, w, col, alpha) {
  if (pts.length < 2) return;
  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    path.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  path.lineTo(last.x, last.y);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(col, 0.28 * alpha);
  ctx.lineWidth = w * 3;
  ctx.stroke(path);
  ctx.strokeStyle = rgba(col, alpha);
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`;
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.stroke(path);
  ctx.restore();
}
