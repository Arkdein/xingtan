// Character grid (汉字田字格): stroke order for Chinese characters on a 田字格
// or 米字格. Teachers can play the whole character, step through it stroke by
// stroke, or let students trace it (on a touch screen, with a pen or a mouse).
//
// Animation and tracing use Hanzi Writer (MIT, js/vendor/hanzi-writer). Its
// stroke data (Make Me a Hanzi, Arphic Public License, data/hanzi) is part of
// the app: each character's file (2–4 KB) downloads the first time it is shown
// and is then kept for offline use.
import { h, put, segmented } from '../ui.js';
import { icon } from '../icons.js';
import { pinyinArray } from '../dictionary.js';

const NS = 'http://www.w3.org/2000/svg';
const MAX_CHARS = 12;
const HAN = /\p{Script=Han}/u;
const GRIDS = [['tian', '田字格'], ['mi', '米字格'], ['none', 'Plain']];
const SPEEDS = [[0.5, 'Slow'], [1, 'Normal'], [2, 'Fast']];

// ---------- Character data (shared by every Character grid) ----------
const cache = new Map();
export function charData(ch) {
  if (!cache.has(ch)) {
    const url = new URL(`../../data/hanzi/${encodeURIComponent(ch)}.json`, import.meta.url);
    cache.set(ch, fetch(url).then((r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('network');
      return r.json();
    }).catch((err) => { cache.delete(ch); throw err; }));
  }
  return cache.get(ch);
}

let writerLib = null;
const loadWriter = () => {
  if (!writerLib) writerLib = import('../vendor/hanzi-writer/hanzi-writer.mjs').then((m) => m.default).catch((err) => { writerLib = null; throw err; });
  return writerLib;
};

function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// The grid lines behind a character, in a 100 × 100 box.
export function gridSvg(kind, cls = 'hz-grid') {
  const svg = svgEl('svg', { viewBox: '0 0 100 100', class: cls, 'aria-hidden': 'true' });
  svg.append(svgEl('rect', { x: 0.75, y: 0.75, width: 98.5, height: 98.5, class: 'hz-frame' }));
  if (kind === 'tian' || kind === 'mi') {
    svg.append(svgEl('line', { x1: 50, y1: 0, x2: 50, y2: 100, class: 'hz-dash' }), svgEl('line', { x1: 0, y1: 50, x2: 100, y2: 50, class: 'hz-dash' }));
  }
  if (kind === 'mi') {
    svg.append(svgEl('line', { x1: 0, y1: 0, x2: 100, y2: 100, class: 'hz-dash' }), svgEl('line', { x1: 100, y1: 0, x2: 0, y2: 100, class: 'hz-dash' }));
  }
  return svg;
}

// A character drawn from its stroke data: strokes before `upTo` in ink, stroke
// `upTo` highlighted, the rest as a pale outline.
function strokesSvg(data, upTo, { outline = true, cls = '' } = {}) {
  const svg = svgEl('svg', { viewBox: '0 0 1024 1024', class: cls, 'aria-hidden': 'true' });
  const g = svgEl('g', { transform: 'translate(0, 900) scale(1, -1)' });
  data.strokes.forEach((d, i) => {
    if (i > upTo && !outline) return;
    g.append(svgEl('path', { d, class: i < upTo ? 'hz-ink' : i === upTo ? 'hz-now' : 'hz-ghost' }));
  });
  svg.append(g);
  return svg;
}

export default {
  type: 'hanzi',
  title: 'Character grid',
  icon: 'writing',
  tone: 'language', // dock tile colour: time | people | signal | content | language
  size: { w: 600, h: 520 },
  minSize: { w: 320, h: 320 },

  mount(body, ctx) {
    const st = ctx.state;
    if (st.text == null) ctx.save({ text: '学习', i: 0, grid: 'tian', mode: 'watch', step: 0, outline: true, radical: false, speed: 1, pinyin: true });

    const chars = () => [...(st.text || '')].filter((c) => HAN.test(c)).slice(0, MAX_CHARS);
    const cur = () => chars()[Math.min(st.i || 0, Math.max(0, chars().length - 1))] || '';

    const input = h('input', { class: 'input hz-input', type: 'text', value: st.text, maxlength: 40, lang: 'zh-CN', placeholder: 'Type characters 输入汉字', 'aria-label': 'Characters' });
    const tabs = h('div', { class: 'hz-tabs', role: 'tablist' });
    const box = h('div', { class: 'hz-box' });
    const target = h('div', { class: 'hz-target' });
    const stepLayer = h('div', { class: 'hz-steplayer' });
    const pyEl = h('div', { class: 'hz-py' });
    const info = h('p', { class: 'hz-info' });
    const message = h('p', { class: 'hz-message', role: 'status' });
    const strip = h('div', { class: 'hz-strip' });
    const modeSeg = h('div');
    const controls = h('div', { class: 'hz-controls' });
    const optsRow = h('div', { class: 'hz-opts' });
    const main = h('div', { class: 'hz-main' }, h('div', { class: 'hz-face' }, pyEl, box), h('div', { class: 'hz-side' }, info, controls, message));
    box.append(target, stepLayer);
    body.append(h('div', { class: 'hz' },
      h('div', { class: 'hz-top' }, input, tabs),
      main,
      strip,
      h('div', { class: 'hz-bottom' }, modeSeg, optsRow)));

    let alive = true;
    let writer = null;
    let data = null;           // stroke data for the current character
    let built = '';            // what the writer was built for
    let mistakes = 0;
    let pys = [];

    // ---------- Building ----------
    async function refreshPinyin() {
      const list = chars();
      try { pys = list.length ? await pinyinArray(list.join('')) : []; } catch (err) { pys = []; }
      if (alive) drawTop();
    }

    function drawTop() {
      const list = chars();
      put(tabs, ...(list.length > 1 ? list.map((c, k) => h('button', {
        class: 'hz-tab' + (k === (st.i || 0) ? ' active' : ''), role: 'tab', 'aria-selected': String(k === (st.i || 0)), lang: 'zh-CN',
        onclick: () => { ctx.save({ i: k, step: 0 }); build(); },
      }, c)) : []));
      const k = Math.min(st.i || 0, list.length - 1);
      pyEl.textContent = st.pinyin && pys[k] ? pys[k] : '';
      pyEl.hidden = !st.pinyin;
    }

    function drawControls() {
      const m = st.mode;
      const n = data?.strokes.length || 0;
      put(modeSeg, segmented([['watch', 'Watch 演示'], ['step', 'Step 分步'], ['trace', 'Trace 描写']], m, (v) => { ctx.save({ mode: v, step: 0 }); build(); }, 'Mode'));
      if (m === 'watch') {
        put(controls, 
          h('button', { class: 'btn primary with-icon', disabled: !writer, onclick: () => { message.textContent = ''; writer?.animateCharacter(); } }, icon('player-play'), 'Play 播放'),
          h('button', { class: 'btn with-icon', disabled: !writer, onclick: () => { message.textContent = 'Playing again and again. Press Stop to end.'; writer?.loopCharacterAnimation(); } }, icon('repeat'), 'Loop'),
          h('button', { class: 'btn with-icon', disabled: !writer, onclick: () => { message.textContent = ''; writer?.pauseAnimation?.(); writer?.showCharacter(); } }, icon('player-stop'), 'Stop'));
      } else if (m === 'step') {
        const s = Math.min(st.step || 0, n);
        put(controls, 
          h('button', { class: 'btn primary with-icon', disabled: s >= n, onclick: () => setStep(s + 1) }, 'Next stroke 下一笔', icon('chevron-right')),
          h('button', { class: 'btn with-icon', disabled: s <= 0, onclick: () => setStep(s - 1) }, icon('chevron-left'), 'Back'),
          h('p', { class: 'hz-stepno' }, s === 0 ? 'Press Next for the first stroke' : s >= n ? `All ${n} strokes · 写完了` : `Stroke ${s} of ${n} · 第 ${s} 笔`));
      } else {
        put(controls, 
          h('button', { class: 'btn primary with-icon', disabled: !writer, onclick: startQuiz }, icon('rotate'), 'Start again 重写'),
          h('p', { class: 'muted small' }, 'Write each stroke in order with a finger, pen or mouse. A hint appears after two misses.'));
      }
      put(optsRow, 
        segmented(GRIDS, st.grid, (v) => { ctx.save({ grid: v }); drawGrid(); drawControls(); }, 'Grid'),
        m !== 'trace' ? segmented(SPEEDS, st.speed, (v) => { ctx.save({ speed: v }); build(true); }, 'Speed') : null,
        toggle('Outline', 'outline', () => build(true)),
        toggle('Radical 部首', 'radical', () => build(true)),
        toggle('Pinyin', 'pinyin', drawTop));
    }

    function toggle(label, key, after) {
      const c = h('input', { type: 'checkbox', checked: !!st[key] });
      c.addEventListener('change', () => { ctx.save({ [key]: c.checked }); after(); drawControls(); });
      return h('label', { class: 'hz-toggle' }, c, label);
    }

    function drawGrid() {
      box.querySelector('.hz-grid')?.remove();
      box.prepend(gridSvg(st.grid));
      strip.querySelectorAll('.hz-mini').forEach((m) => { m.querySelector('.hz-grid')?.remove(); m.prepend(gridSvg(st.grid)); });
    }

    function drawInfo() {
      const ch = cur();
      if (!data) { put(info, ); return; }
      put(info, h('span', { class: 'hz-info-char', lang: 'zh-CN' }, ch), ` ${data.strokes.length} strokes · ${data.strokes.length} 画`);
    }

    // The stroke-order strip: one small box per stroke, filled in up to that stroke.
    function drawStrip() {
      if (!data) { put(strip, ); return; }
      put(strip, ...data.strokes.map((_, k) => {
        const mini = h('button', { class: 'hz-mini' + (st.mode === 'step' && k === (st.step || 0) - 1 ? ' active' : ''), title: `Stroke ${k + 1}`, 'aria-label': `Stroke ${k + 1}`,
          onclick: () => { if (st.mode === 'step' && writer) setStep(k + 1); else { ctx.save({ mode: 'step', step: k + 1 }); build(); } } },
        gridSvg(st.grid), strokesSvg(data, k, { outline: false, cls: 'hz-mini-strokes' }), h('span', { class: 'hz-mini-n' }, String(k + 1)));
        return mini;
      }));
    }

    function setStep(s) {
      ctx.save({ step: s });
      drawStep();
      drawControls();
      strip.querySelectorAll('.hz-mini').forEach((m, k) => m.classList.toggle('active', k === s - 1));
      strip.querySelector('.hz-mini.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function drawStep() {
      if (st.mode !== 'step' || !data) { put(stepLayer, ); stepLayer.hidden = true; return; }
      stepLayer.hidden = false;
      const s = Math.min(st.step || 0, data.strokes.length);
      put(stepLayer, strokesSvg(data, s - 1, { outline: st.outline !== false, cls: 'hz-step-svg' }));
    }

    function startQuiz() {
      if (!writer) return;
      mistakes = 0;
      message.textContent = '';
      writer.hideCharacter();
      writer.quiz({
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        onMistake: () => { mistakes++; },
        onComplete: (r) => {
          const m = r?.totalMistakes ?? mistakes;
          put(message, icon('check'), m === 0 ? ' Well done! No mistakes. 写得好！' : ` Done, with ${m} slip${m === 1 ? '' : 's'}. 完成！`);
        },
      });
    }

    // (Re)builds the drawing for the current character at the current size.
    async function build(force = false) {
      const ch = cur();
      drawTop();
      message.textContent = '';
      const size = Math.floor(Math.min(box.clientWidth, box.clientHeight));
      const key = `${ch}|${size}|${st.mode}|${st.outline}|${st.radical}|${st.speed}`;
      if (!force && key === built && writer) { drawControls(); drawStep(); drawStrip(); drawInfo(); return; }
      built = key;
      writer = null;
      put(target, );
      data = null;
      if (!ch) {
        put(info, );
        put(strip, );
        put(stepLayer, );
        message.textContent = 'Type one or more Chinese characters above. 请在上面输入汉字。';
        drawControls();
        return;
      }
      if (size < 40) { drawControls(); return; }
      let HW;
      try {
        [data, HW] = await Promise.all([charData(ch), loadWriter()]);
      } catch (err) {
        if (built !== key || !alive) return;
        put(message, icon('alert-triangle'), ' This character isn’t on this computer yet, and the app couldn’t download it. Check the internet connection.');
        drawControls();
        return;
      }
      if (built !== key || !alive) return;
      if (!data) {
        put(message, icon('alert-triangle'), ` There’s no stroke order for ${ch} yet. It covers about 9,500 common characters.`);
        drawControls(); drawStrip(); drawInfo();
        return;
      }
      writer = HW.create(target, ch, {
        width: size, height: size, padding: Math.round(size * 0.06),
        charDataLoader: (c, done) => { charData(c).then(done); },
        showOutline: st.outline !== false,
        showCharacter: st.mode === 'watch',
        strokeAnimationSpeed: st.speed || 1,
        delayBetweenStrokes: Math.round(320 / (st.speed || 1)),
        strokeColor: '#1d2733',
        radicalColor: st.radical ? '#c2410c' : null,
        outlineColor: '#d6dbe2',
        highlightColor: '#2563eb',
        drawingColor: '#1d2733',
        drawingWidth: Math.max(14, Math.round(size / 18)),
        renderer: 'svg',
      });
      target.style.width = target.style.height = size + 'px';
      if (st.mode === 'step') writer.hideCharacter();
      if (st.mode === 'trace') startQuiz();
      drawControls(); drawStep(); drawStrip(); drawInfo(); drawGrid();
    }

    // ---------- Typing and resizing ----------
    let typing = null;
    input.addEventListener('input', () => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        ctx.save({ text: input.value, i: 0, step: 0 });
        refreshPinyin();
        build();
      }, 350);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    let sizing = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(sizing);
      sizing = setTimeout(() => { if (alive) build(); }, 120);
    });
    ro.observe(box);

    function onKey(e) {
      if (e.target.closest('input, textarea, select')) return;
      if (st.mode === 'step' && data) {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setStep(Math.min((st.step || 0) + 1, data.strokes.length)); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(Math.max((st.step || 0) - 1, 0)); }
      }
    }
    body.addEventListener('keydown', onKey);

    drawGrid();
    refreshPinyin();
    build();
    return {
      destroy() {
        alive = false;
        ro.disconnect();
        clearTimeout(typing);
        body.removeEventListener('keydown', onKey);
        try { writer?.cancelQuiz?.(); } catch (err) { /* ignore */ }
      },
    };
  },
};
