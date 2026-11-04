// Name picker: picks at random from the class list or from the teacher's own
// list (topics, questions, roles, numbers…), shown as a name card or a spinning
// wheel (转盘). With “No repeats”, each name or item comes up once before any
// comes up again; on the wheel, the ones already picked are greyed out.
import { h, put, classSelect, segmented, openModal, closeModal, chime } from '../ui.js';
import { icon } from '../icons.js';

const COLOURS = ['#2563eb', '#e0413a', '#f2a516', '#16a34a', '#7c3aed', '#0891b2', '#db2777', '#ea580c', '#4d7c0f', '#0f766e'];
const SPIN_MS = 4200;
const MAX_ITEMS = 100;
const NS = 'http://www.w3.org/2000/svg';

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default {
  type: 'picker',
  title: 'Name picker',
  icon: 'arrows-shuffle',
  tone: 'people', // dock tile colour: time | people | signal | content | language
  size: { w: 420, h: 440 },
  minSize: { w: 240, h: 220 },
  // Shared board files never include student names. The teacher's own list
  // (topics, questions…) goes with the board.
  share: (st) => ({ noRepeat: st.noRepeat, source: st.source, items: st.items, view: st.view }),

  mount(body, ctx) {
    const st = ctx.state;
    if (st.noRepeat == null) ctx.save({ noRepeat: true, pool: null, last: '' });
    if (st.source == null) ctx.save({ source: 'class', view: 'card', items: [], rot: 0 });

    const cls = () => ctx.store.getClass(st.classId) || ctx.store.getActiveClass();
    const all = () => (st.source === 'list' ? (st.items || []) : (cls()?.students || []));

    const sel = classSelect(ctx, () => st.classId, (id) => {
      ctx.save({ classId: id, pool: null, last: '' });
      render();
    });
    const top = h('div', { class: 'picker-top' });
    const stage = h('div', { class: 'picker-stage' });
    const pickBtn = h('button', { class: 'btn primary big' }, 'Pick');
    const noRepeat = h('input', { type: 'checkbox', checked: st.noRepeat });
    const info = h('span', { class: 'muted small' });
    const resetBtn = h('button', { class: 'link-btn' }, 'Reset');
    const foot = h('div', { class: 'row gap space-between small' },
      h('label', { class: 'row gap' }, noRepeat, 'No repeats'),
      h('span', { class: 'row gap' }, info, resetBtn));
    const main = h('div', { class: 'picker' }, top, stage, h('div', { class: 'row center' }, pickBtn), foot);
    body.append(main);

    let spinTimer = null;
    let spinning = false;
    let wheelG = null;      // the rotating part of the wheel
    let resultEl = null;

    // Names (or items) not yet picked; with no-repeats off, everyone.
    function pool() {
      const list = all();
      if (!st.noRepeat) return list.slice();
      let p = (st.pool || list).filter((n) => list.includes(n));
      if (p.length === 0) p = list.slice();
      return p;
    }
    const left = () => (st.pool || all()).filter((n) => all().includes(n));

    // ---------- Top bar ----------
    function drawTop() {
      put(top,
        segmented([['class', 'Class 班级'], ['list', 'My list 另起名单']], st.source, (v) => {
          if (spinning) return;
          ctx.save({ source: v, pool: null, last: '' });
          if (v === 'list' && !(st.items || []).length) editList();
          render();
        }, 'Pick from'),
        st.source === 'class' ? sel.el : h('button', { class: 'btn small with-icon', onclick: editList }, icon('pencil'), 'Edit list'),
        h('span', { class: 'grow' }),
        segmented([['card', 'Card'], ['wheel', 'Wheel 转盘']], st.view, (v) => { if (spinning) return; ctx.save({ view: v }); render(); }, 'Show as'));
      sel.el.hidden = st.source !== 'class' || ctx.store.getClasses().length === 0;
    }

    // ---------- Card ----------
    function drawCard() {
      const nameEl = h('div', { class: 'picker-name' + (st.last ? '' : ' placeholder') }, st.last || '?');
      put(stage, nameEl);
      return nameEl;
    }

    function pickCard() {
      const p = pool();
      if (!p.length || spinTimer) return;
      const chosen = p[Math.floor(Math.random() * p.length)];
      const list = all();
      const nameEl = stage.querySelector('.picker-name') || drawCard();
      let i = 0;
      const steps = Math.min(18, 6 + list.length);
      pickBtn.disabled = true;
      nameEl.classList.remove('placeholder', 'landed');
      const step = () => {
        if (i >= steps) {
          spinTimer = null;
          nameEl.textContent = chosen;
          nameEl.classList.add('landed');
          land(chosen, p);
          return;
        }
        nameEl.textContent = list[Math.floor(Math.random() * list.length)];
        i++;
        spinTimer = setTimeout(step, 40 + i * i * 1.2);
      };
      step();
    }

    // ---------- Wheel ----------
    function drawWheel() {
      const list = all();
      const remaining = new Set(st.noRepeat ? left() : list);
      const n = list.length;
      const seg = 360 / n;
      const svg = svgEl('svg', { viewBox: '-105 -112 210 217', class: 'wheel-svg', role: 'img', 'aria-label': 'Spinning wheel' });
      wheelG = svgEl('g', { class: 'wheel-rot' });
      wheelG.style.transform = `rotate(${st.rot || 0}deg)`;
      const fontSize = Math.max(3.6, Math.min(11, (2 * Math.PI * 62 / n) * 0.62));
      const maxChars = Math.max(6, Math.round(78 / (fontSize * 0.62)));
      list.forEach((name, i) => {
        const a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180;
        const big = seg > 180 ? 1 : 0;
        const used = !remaining.has(name);
        const d = n === 1
          ? 'M 0 -100 A 100 100 0 1 1 -0.01 -100 Z'
          : `M 0 0 L ${100 * Math.cos(a0)} ${100 * Math.sin(a0)} A 100 100 0 ${big} 1 ${100 * Math.cos(a1)} ${100 * Math.sin(a1)} Z`;
        wheelG.append(svgEl('path', { d, fill: used ? '#d9dee5' : COLOURS[i % COLOURS.length], class: 'wheel-seg' }));
        const mid = (i + 0.5) * seg;
        // Labels on the left half are turned round so they aren't upside down when the wheel stops.
        const flip = mid > 180;
        const t = svgEl('text', {
          x: flip ? -92 : 92, y: 0, transform: `rotate(${flip ? mid + 90 : mid - 90})`, 'text-anchor': flip ? 'start' : 'end', 'dominant-baseline': 'central',
          'font-size': fontSize.toFixed(2), class: 'wheel-label' + (used ? ' used' : ''),
        });
        t.textContent = clip(name, maxChars);
        wheelG.append(t);
      });
      wheelG.append(svgEl('circle', { r: 9, class: 'wheel-hub' }));
      svg.append(svgEl('circle', { r: 101, class: 'wheel-rim' }), wheelG,
        svgEl('path', { d: 'M -8 -111 L 8 -111 L 0 -95 Z', class: 'wheel-pointer' }));
      resultEl = h('div', { class: 'wheel-result' + (st.last ? '' : ' placeholder') }, st.last || '');
      const wrap = h('div', { class: 'wheel-wrap' }, svg);
      wrap.addEventListener('click', () => pickWheel());
      put(stage, wrap, resultEl);
    }

    function pickWheel() {
      const p = pool();
      if (!p.length || spinning) return;
      const list = all();
      const chosen = p[Math.floor(Math.random() * p.length)];
      const i = list.indexOf(chosen);
      const seg = 360 / list.length;
      // Land somewhere inside the chosen slice (not on its edge), after five or six turns.
      const inSlice = (i + 0.15 + Math.random() * 0.7) * seg;
      const rot = st.rot || 0;
      const target = ((360 - inSlice) % 360 + 360) % 360;
      let next = rot - (((rot % 360) + 360) % 360) + target + 360 * 5;
      if (next - rot < 360 * 4.5) next += 360;
      spinning = true;
      pickBtn.disabled = true;
      resultEl.textContent = '';
      resultEl.classList.add('placeholder');
      wheelG.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.62,.1,1)`;
      requestAnimationFrame(() => { wheelG.style.transform = `rotate(${next}deg)`; });
      spinTimer = setTimeout(() => {
        spinTimer = null;
        spinning = false;
        ctx.save({ rot: next % 360 });
        chime(1);
        land(chosen, p);
      }, SPIN_MS + 50);
    }

    function land(chosen, p) {
      ctx.save({ last: chosen, pool: st.noRepeat ? p.filter((n) => n !== chosen) : null });
      pickBtn.disabled = false;
      render();
      if (st.view === 'card') stage.querySelector('.picker-name')?.classList.add('landed');
      else resultEl?.classList.add('landed');
    }

    // ---------- Own list ----------
    function editList() {
      openModal('My list · 另起名单', (mb) => {
        const ta = h('textarea', { class: 'input picker-items', rows: 10, placeholder: 'One item per line, e.g.\n朗读第一段\n说出一个形容词\nGroup 3\nTopic: 环保' });
        ta.value = (st.items || []).join('\n');
        const fill = (items) => { ta.value = items.join('\n'); };
        const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => String(a + k));
        mb.append(
          h('p', { class: 'muted small' }, 'Topics, questions, roles, groups or index numbers: anything to pick at random. Up to 100 items. This list stays with this board.'),
          ta,
          h('div', { class: 'row gap wrap' }, h('span', { class: 'muted small' }, 'Quick fill:'),
            h('button', { class: 'chip', onclick: () => fill(range(1, 10)) }, '1–10'),
            h('button', { class: 'chip', onclick: () => fill(range(1, 40)) }, '1–40'),
            h('button', { class: 'chip', onclick: () => fill(range(1, 6).map((x) => `Group ${x}`)) }, 'Groups 1–6'),
            h('button', { class: 'chip', onclick: () => fill(['Yes 是', 'No 否']) }, 'Yes / No')),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn primary', onclick: () => {
              const items = [...new Set(ta.value.split('\n').map((x) => x.trim()).filter(Boolean))].slice(0, MAX_ITEMS);
              ctx.save({ items, pool: null, last: '' });
              closeModal();
              render();
            } }, 'Save'),
            h('button', { class: 'btn', onclick: closeModal }, 'Cancel')));
        ta.focus();
      });
    }

    // ---------- Drawing ----------
    function render() {
      if (spinning) return;
      drawTop();
      const list = all();
      if (!list.length) {
        const c = cls();
        put(stage, h('div', { class: 'empty-state' },
          st.source === 'list'
            ? [h('p', {}, 'Type the items to pick from.'), h('button', { class: 'btn primary', onclick: editList }, 'Make a list')]
            : [h('p', {}, c ? `“${c.name}” has no names yet.` : 'Add a class list to start picking names.'),
              h('button', { class: 'btn primary', onclick: () => ctx.openClasses() }, 'Add class list')]));
        pickBtn.hidden = true;
        foot.hidden = true;
        return;
      }
      pickBtn.hidden = false;
      foot.hidden = false;
      pickBtn.textContent = st.view === 'wheel' ? 'Spin 转' : st.source === 'list' ? 'Pick' : 'Pick a name';
      if (st.view === 'wheel') drawWheel(); else drawCard();
      if (st.noRepeat) {
        info.textContent = `${left().length} of ${list.length} left`;
        resetBtn.hidden = false;
      } else {
        info.textContent = '';
        resetBtn.hidden = true;
      }
    }

    pickBtn.addEventListener('click', () => (st.view === 'wheel' ? pickWheel() : pickCard()));
    noRepeat.addEventListener('change', () => { ctx.save({ noRepeat: noRepeat.checked, pool: null }); render(); });
    resetBtn.addEventListener('click', () => { if (spinning) return; ctx.save({ pool: null, last: '' }); render(); });

    const unsub = ctx.onClassesChange(() => { sel.refresh(); if (st.source === 'class') render(); else drawTop(); });
    render();
    return { destroy() { clearTimeout(spinTimer); unsub(); } };
  },
};
