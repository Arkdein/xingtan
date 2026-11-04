import { h } from '../ui.js';
import { icon } from '../icons.js';

// Face shown beside the meter: calm, getting loud, too loud.
const FACES = { ok: 'mood-smile', near: 'mood-empty', over: 'mood-sad' };

// Measures loudness from the microphone. Audio is analysed live in the browser
// and never recorded or sent anywhere.
export default {
  type: 'noise',
  title: 'Noise meter',
  icon: 'volume',
  tone: 'signal', // dock tile colour: time | people | signal | content
  size: { w: 360, h: 340 },
  minSize: { w: 240, h: 240 },

  mount(body, ctx) {
    if (ctx.state.limit == null) ctx.save({ limit: 60, sensitivity: 5 });

    const face = h('div', { class: 'noise-face' });
    const setFace = (k) => { if (face.dataset.mood !== k) { face.dataset.mood = k; face.replaceChildren(icon(FACES[k])); } };
    setFace('ok');
    const fill = h('div', { class: 'noise-fill' });
    const limitLine = h('div', { class: 'noise-limit' });
    const meter = h('div', { class: 'noise-meter' }, fill, limitLine);
    const startBtn = h('button', { class: 'btn primary' }, 'Start listening');
    const limit = h('input', { type: 'range', min: 10, max: 95, value: ctx.state.limit, 'aria-label': 'Volume limit' });
    const sens = h('input', { type: 'range', min: 1, max: 10, value: ctx.state.sensitivity, 'aria-label': 'Sensitivity' });
    const status = h('div', { class: 'muted small center-text' }, 'Uses your microphone. Nothing is recorded.');

    body.append(h('div', { class: 'noise' },
      h('div', { class: 'noise-top' }, face, meter),
      h('div', { class: 'row center' }, startBtn),
      h('label', { class: 'slider-row' }, h('span', {}, 'Limit'), limit),
      h('label', { class: 'slider-row' }, h('span', {}, 'Sensitivity'), sens),
      status,
    ));

    let audioCtx = null, stream = null, analyser = null, data = null, raf = null;
    let level = 0;
    let overSince = 0;

    const setLimitLine = () => { limitLine.style.bottom = limit.value + '%'; };
    setLimitLine();

    function frame() {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      // Map to 0-100 with adjustable gain, then smooth
      const gain = 1 + (Number(sens.value) - 1) * 0.6;
      const db = 20 * Math.log10(rms + 1e-8); // about -100 (silent) to 0 (max)
      const target = Math.max(0, Math.min(100, (db + 60) * (100 / 60) * gain * 0.55));
      level += (target - level) * (target > level ? 0.35 : 0.08);
      fill.style.height = level.toFixed(1) + '%';

      const over = level > Number(limit.value);
      const now = performance.now();
      if (over && !overSince) overSince = now;
      if (!over) overSince = 0;
      const alarm = overSince && now - overSince > 800;
      ctx.el.classList.toggle('noise-alarm', !!alarm);
      const ratio = level / Number(limit.value);
      setFace(alarm ? 'over' : ratio > 0.8 ? 'near' : 'ok');
      fill.className = 'noise-fill ' + (alarm ? 'red' : ratio > 0.8 ? 'amber' : 'green');
      raf = requestAnimationFrame(frame);
    }

    async function start() {
      if (stream) return stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        status.textContent = 'This browser can’t use the microphone here.';
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        data = new Float32Array(analyser.fftSize);
        src.connect(analyser);
        startBtn.textContent = 'Stop';
        status.textContent = 'Listening… nothing is recorded.';
        frame();
      } catch (err) {
        console.warn(err);
        stream = null;
        status.textContent = 'Microphone blocked. Allow it in the address bar, then try again.';
      }
    }

    function stop() {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      stream = audioCtx = analyser = null;
      level = 0;
      fill.style.height = '0%';
      setFace('ok');
      ctx.el.classList.remove('noise-alarm');
      startBtn.textContent = 'Start listening';
      status.textContent = 'Uses your microphone. Nothing is recorded.';
    }

    startBtn.addEventListener('click', start);
    limit.addEventListener('input', () => { setLimitLine(); ctx.save({ limit: Number(limit.value) }); });
    sens.addEventListener('input', () => ctx.save({ sensitivity: Number(sens.value) }));

    return { destroy: stop };
  },
};
