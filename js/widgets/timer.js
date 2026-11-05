import { h, chime, segmented } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';

const fmt = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Stopwatch time: 0:07.3, 12:45.0, 1:02:03 (tenths are dropped after an hour).
export const fmtElapsed = (ms) => {
  ms = Math.max(0, ms);
  const tenths = Math.floor(ms / 100) % 10;
  const s = Math.floor(ms / 1000);
  const hr = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  if (hr) return `${hr}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}.${tenths}`;
};

export default {
  type: 'timer',
  title: 'Timer',
  icon: 'hourglass',
  tone: 'time', // dock tile colour: time | people | signal | content | language
  size: { w: 340, h: 360 },
  minSize: { w: 220, h: 240 },

  mount(body, ctx) {
    // Countdown: duration (s), remaining (s, when paused), endAt (ms timestamp, when running)
    // Stopwatch: swStart (ms timestamp, when running), swElapsed (ms before the last start), laps ([ms])
    const st = ctx.state;
    if (st.duration == null) ctx.save({ duration: 300, remaining: 300, endAt: null });
    if (st.mode == null) ctx.save({ mode: 'countdown', swStart: null, swElapsed: 0, laps: [] });
    // A timer that ran out more than a minute ago (for example on a board
    // last opened in an earlier lesson) comes back reset, without a chime.
    if (st.endAt && Date.now() - st.endAt > 60_000) ctx.save({ endAt: null, remaining: st.duration });
    // Likewise a stopwatch left running for more than 12 hours starts again from zero.
    if (st.swStart && Date.now() - st.swStart > 12 * 3600_000) ctx.save({ swStart: null, swElapsed: 0, laps: [] });

    const R = 45;
    const C = 2 * Math.PI * R;
    const ring = h('div', { class: 'timer-ring' });
    ring.innerHTML = `
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="${R}" class="ring-bg"/>
        <circle cx="50" cy="50" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="0"/>
      </svg>`;
    const display = h('button', { class: 'timer-display' });
    const editInput = h('input', { class: 'timer-edit', type: 'text', inputmode: 'numeric', hidden: true, 'aria-label': t('Minutes or m:ss') });
    ring.append(display, editInput);
    const fg = ring.querySelector('.ring-fg');

    const modeSlot = h('div', { class: 'timer-mode' });
    const startBtn = h('button', { class: 'btn primary' }, t('Start'));
    const resetBtn = h('button', { class: 'btn' }, t('Reset'));
    const lapBtn = h('button', { class: 'btn', title: t('Note the time now') }, t('Lap'));
    const presets = h('div', { class: 'timer-presets' },
      ...[1, 3, 5, 10].map((m) => h('button', { class: 'chip', onclick: () => setDuration(m * 60) }, t('{m}m', { m }))),
      h('button', { class: 'chip', onclick: () => adjust(60), title: t('Add a minute') }, t('+1m')),
    );
    const laps = h('ol', { class: 'timer-laps', 'aria-label': t('Laps') });
    body.append(h('div', { class: 'timer' }, modeSlot, h('div', { class: 'timer-face' }, ring),
      h('div', { class: 'row gap center' }, startBtn, lapBtn, resetBtn), presets, laps));

    // Chip when minimised: the time, and start / pause.
    const miniTime = h('span', { class: 'mini-text big' });
    const miniBtn = h('button', { class: 'mini-btn', onclick: () => start() });
    ctx.setMiniControls?.(miniTime, miniBtn);
    let miniRunning = null;
    function renderMini() {
      miniTime.textContent = display.textContent;
      miniTime.classList.toggle('warn', ring.classList.contains('warn') || done);
      const on = running();
      if (on === miniRunning) return;
      miniRunning = on;
      const label = on ? t('Pause') : t('Start');
      miniBtn.replaceChildren(icon(on ? 'player-pause' : 'player-play'));
      miniBtn.classList.toggle('play', !on);
      miniBtn.title = label;
      miniBtn.setAttribute('aria-label', label);
    }

    let raf = null;
    let done = false;
    const isSw = () => st.mode === 'stopwatch';
    // Tells other tools on the board (the Music tool's “Play with the Timer”)
    // when the teacher starts, pauses or resets it, and when time is up.
    const signal = (action) => document.dispatchEvent(new CustomEvent('xingtan:timer', { detail: { action, mode: st.mode } }));

    function drawMode() {
      modeSlot.replaceChildren(segmented([['countdown', t('Timer')], ['stopwatch', t('Stopwatch')]], st.mode, setMode, t('Timer or stopwatch')));
      ctx.setTitle(isSw() ? t('Stopwatch') : t('Timer'));
      presets.hidden = isSw();
      lapBtn.hidden = !isSw();
      laps.hidden = !isSw() || !(st.laps || []).length;
      display.title = isSw() ? '' : t('Click to type a time');
      ctx.el.classList.toggle('timer-done', false);
    }
    function setMode(m) {
      if (m === st.mode) return;
      cancelAnimationFrame(raf);
      done = false;
      ctx.save({ mode: m });
      drawMode();
      render();
      if (running()) loop();
    }
    const running = () => (isSw() ? !!st.swStart : !!st.endAt);

    // ---------- Countdown ----------
    const remaining = () => (st.endAt ? (st.endAt - Date.now()) / 1000 : st.remaining);

    // ---------- Stopwatch ----------
    const elapsed = () => (st.swElapsed || 0) + (st.swStart ? Date.now() - st.swStart : 0);
    function drawLaps() {
      const list = st.laps || [];
      laps.hidden = !isSw() || !list.length;
      // Newest first, with the time since the lap before.
      laps.replaceChildren(...list.map((ms, i) => h('li', {}, h('span', { class: 'muted' }, t('Lap {n}', { n: i + 1 })),
        h('strong', {}, fmtElapsed(ms)), h('span', { class: 'muted' }, `+${fmtElapsed(ms - (list[i - 1] || 0))}`))).reverse());
    }

    function render() {
      if (isSw()) {
        const ms = elapsed();
        display.textContent = fmtElapsed(ms);
        display.classList.add('sw');
        display.classList.remove('long');
        display.classList.toggle('xlong', display.textContent.length > 6);
        // The ring goes round once a minute, like a stopwatch hand.
        fg.setAttribute('stroke-dashoffset', String(C * (1 - (ms % 60000) / 60000)));
        ring.classList.remove('warn');
        startBtn.textContent = st.swStart ? t('Pause') : ms > 0 ? t('Resume') : t('Start');
        lapBtn.disabled = !st.swStart;
        resetBtn.disabled = !ms && !(st.laps || []).length;
        renderMini();
        return;
      }
      resetBtn.disabled = false;
      const rem = Math.max(0, remaining());
      display.textContent = fmt(rem);
      display.classList.remove('xlong', 'sw');
      display.classList.toggle('long', display.textContent.length > 4);
      const frac = st.duration > 0 ? rem / st.duration : 0;
      fg.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
      ring.classList.toggle('warn', rem > 0 && rem <= 10);
      startBtn.textContent = st.endAt ? t('Pause') : (rem < st.duration && rem > 0 ? t('Resume') : t('Start'));
      ctx.el.classList.toggle('timer-done', done);
      renderMini();
    }

    function loop() {
      render();
      if (isSw()) { if (st.swStart) raf = requestAnimationFrame(loop); return; }
      if (st.endAt && remaining() <= 0) {
        ctx.save({ endAt: null, remaining: 0 });
        done = true;
        render();
        chime(3);
        signal('done');
        return;
      }
      if (st.endAt) raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (isSw()) {
        if (st.swStart) { ctx.save({ swElapsed: elapsed(), swStart: null }); signal('pause'); }
        else { ctx.save({ swStart: Date.now() }); loop(); signal('start'); return; }
        render();
        return;
      }
      if (st.endAt) { // pause
        ctx.save({ remaining: Math.max(0, remaining()), endAt: null });
        render();
        signal('pause');
        return;
      }
      let rem = st.remaining;
      if (rem <= 0) rem = st.duration;
      done = false;
      ctx.save({ endAt: Date.now() + rem * 1000 });
      loop();
      signal('start');
    }

    function lap() {
      if (!st.swStart) return;
      ctx.save({ laps: [...(st.laps || []), elapsed()] });
      drawLaps();
    }

    function setDuration(sec) {
      cancelAnimationFrame(raf);
      const wasRunning = !!st.endAt;
      done = false;
      ctx.save({ duration: sec, remaining: sec, endAt: null });
      render();
      if (wasRunning) signal('reset');
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
      if (isSw()) {
        ctx.save({ swStart: null, swElapsed: 0, laps: [] });
        drawLaps();
        render();
        signal('reset');
        return;
      }
      done = false;
      ctx.save({ remaining: st.duration, endAt: null });
      render();
      signal('reset');
    }

    // Type a time: "5" = 5 min, "1:30" = 1 min 30 s
    display.addEventListener('click', () => {
      if (isSw()) { start(); return; } // a big target: click the time to start or pause
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
      else if (/^\d+:\d{1,2}$/.test(v)) { const [m, s] = v.split(':').map(Number); if (s < 60) sec = m * 60 + s; }
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
    lapBtn.addEventListener('click', lap);

    drawMode();
    drawLaps();
    // Resume a running timer or stopwatch after a reload
    if (running()) loop(); else render();

    return { destroy() { cancelAnimationFrame(raf); } };
  },
};
