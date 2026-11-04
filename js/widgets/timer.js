import { h, chime } from '../ui.js';

const fmt = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default {
  type: 'timer',
  title: 'Timer',
  icon: 'hourglass',
  tone: 'time', // dock tile colour: time | people | signal | content
  size: { w: 340, h: 340 },
  minSize: { w: 220, h: 220 },

  mount(body, ctx) {
    // State: duration (s), remaining (s, when paused), endAt (ms timestamp, when running)
    const st = ctx.state;
    if (st.duration == null) ctx.save({ duration: 300, remaining: 300, endAt: null });
    // A timer that ran out more than a minute ago (for example on a board
    // last opened in an earlier lesson) comes back reset, without a chime.
    if (st.endAt && Date.now() - st.endAt > 60_000) ctx.save({ endAt: null, remaining: st.duration });

    const R = 45;
    const C = 2 * Math.PI * R;
    const ring = h('div', { class: 'timer-ring' });
    ring.innerHTML = `
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="${R}" class="ring-bg"/>
        <circle cx="50" cy="50" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="0"/>
      </svg>`;
    const display = h('button', { class: 'timer-display', title: 'Click to type a time' });
    const editInput = h('input', { class: 'timer-edit', type: 'text', inputmode: 'numeric', hidden: true, 'aria-label': 'Minutes or m:ss' });
    ring.append(display, editInput);
    const fg = ring.querySelector('.ring-fg');

    const startBtn = h('button', { class: 'btn primary' }, 'Start');
    const resetBtn = h('button', { class: 'btn' }, 'Reset');
    const presets = h('div', { class: 'timer-presets' },
      ...[1, 3, 5, 10].map((m) => h('button', { class: 'chip', onclick: () => setDuration(m * 60) }, `${m}m`)),
      h('button', { class: 'chip', onclick: () => adjust(60), title: 'Add a minute' }, '+1m'),
    );
    body.append(h('div', { class: 'timer' }, h('div', { class: 'timer-face' }, ring), h('div', { class: 'row gap center' }, startBtn, resetBtn), presets));

    let raf = null;
    let done = false;

    const remaining = () => (st.endAt ? (st.endAt - Date.now()) / 1000 : st.remaining);

    function render() {
      const rem = Math.max(0, remaining());
      display.textContent = fmt(rem);
      display.classList.toggle('long', display.textContent.length > 4);
      const frac = st.duration > 0 ? rem / st.duration : 0;
      fg.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
      ring.classList.toggle('warn', rem > 0 && rem <= 10);
      startBtn.textContent = st.endAt ? 'Pause' : (rem < st.duration && rem > 0 ? 'Resume' : 'Start');
      ctx.el.classList.toggle('timer-done', done);
    }

    function loop() {
      render();
      if (st.endAt && remaining() <= 0) {
        ctx.save({ endAt: null, remaining: 0 });
        done = true;
        render();
        chime(3);
        return;
      }
      if (st.endAt) raf = requestAnimationFrame(loop);
    }

    function start() {
      if (st.endAt) { // pause
        ctx.save({ remaining: Math.max(0, remaining()), endAt: null });
        cancelAnimationFrame(raf);
        render();
        return;
      }
      let rem = st.remaining;
      if (rem <= 0) rem = st.duration;
      done = false;
      ctx.save({ endAt: Date.now() + rem * 1000 });
      loop();
    }

    function setDuration(sec) {
      cancelAnimationFrame(raf);
      done = false;
      ctx.save({ duration: sec, remaining: sec, endAt: null });
      render();
    }

    function adjust(sec) {
      if (st.endAt) {
        ctx.save({ endAt: st.endAt + sec * 1000, duration: st.duration + sec });
      } else {
        const rem = Math.max(0, st.remaining) + sec;
        ctx.save({ remaining: rem, duration: Math.max(st.duration, rem) });
      }
      done = false;
      render();
    }

    function reset() {
      cancelAnimationFrame(raf);
      done = false;
      ctx.save({ remaining: st.duration, endAt: null });
      render();
    }

    // Type a time: "5" = 5 min, "1:30" = 1 min 30 s
    display.addEventListener('click', () => {
      if (st.endAt) return;
      editInput.value = fmt(st.remaining);
      display.hidden = true;
      editInput.hidden = false;
      editInput.focus();
      editInput.select();
    });
    const commitEdit = () => {
      if (editInput.hidden) return;
      const v = editInput.value.trim();
      let sec = null;
      if (/^\d+(\.\d+)?$/.test(v)) sec = Math.round(parseFloat(v) * 60);
      else if (/^\d+:\d{1,2}$/.test(v)) { const [m, s] = v.split(':').map(Number); sec = m * 60 + s; }
      editInput.hidden = true;
      display.hidden = false;
      if (sec && sec > 0) setDuration(Math.min(sec, 99 * 60 + 59));
    };
    editInput.addEventListener('blur', commitEdit);
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') { editInput.hidden = true; display.hidden = false; }
    });

    startBtn.addEventListener('click', start);
    resetBtn.addEventListener('click', reset);

    // Resume a running timer after reload
    if (st.endAt) loop(); else render();

    return { destroy() { cancelAnimationFrame(raf); } };
  },
};
