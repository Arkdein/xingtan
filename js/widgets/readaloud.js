// Read aloud (朗读): a passage in large type that the computer reads aloud while
// each word lights up, karaoke-style. Four ways to use it:
// - Model reading (范读): reads the passage sentence by sentence;
// - Echo reading (跟读): reads a sentence or phrase, then waits for the class to repeat it;
// - Choral pacing (齐读): no voice; the highlight moves at a steady pace while the class reads together;
// - Tap to hear (点读): tap a word (or its sentence) to hear it, with its pinyin.
// Pinyin shows over every character, only over characters the teacher chooses, or not at all.
//
// Passages are shared by every board (see passages.js). The voice reports where
// it is in the text when it can (speech boundary events); when it can't, the
// highlight follows an estimate that starts again at each sentence.
import { h, put, openModal, closeModal, confirmButton, segmented } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang, locale } from '../i18n.js';
import * as P from '../passages.js';
import * as D from '../dictionary.js';
import * as R from '../reading.js';

const MODES = [
  ['model', 'Model reading', 'volume'],
  ['echo', 'Echo reading', 'repeat'],
  ['choral', 'Choral pacing', 'users'],
  ['tap', 'Tap to hear', 'hand-finger'],
];
const RATES = [[0.6, 'Very slow'], [0.75, 'Slow'], [0.9, 'Normal'], [1.05, 'Fast']];
// Choral pacing: a speed against wordMs() (Chinese ≈ 85, 115 and 155 characters a minute).
const PACES = [['slow', 'Slow', 0.33], ['steady', 'Steady', 0.45], ['brisk', 'Brisk', 0.6]];
const PY_MODES = [['all', 'All'], ['marked', 'Chosen'], ['off', 'Off']];
const DEFAULT_OPTS = { rate: 0.75, echoBy: 'sentence', echoWait: 'next', pace: 'steady', tapReads: 'word', sandhi: false, dim: true };
const SIZES = [20, 24, 28, 32, 36, 40, 46, 52, 60, 68, 78, 90];
const GAP_MS = 350;         // between sentences in Model reading
const LONG = { zh: 48, en: 240 }; // longer sentences are read a phrase at a time (some voices stop mid-way otherwise)
const tOpts = (options) => options.map(([v, text]) => [v, t(text)]);

// Two short passages written for this app, so a teacher can try the tool at once.
const SAMPLES = [
  { name: '小雨（示例）', lang: 'zh', text: '早上，天空飘起了小雨。小明撑着一把蓝色的雨伞，走在上学的路上。路边的小草喝饱了水，变得更绿了。小明想：“原来下雨天也很美！”' },
  { name: 'A Rainy Morning (sample)', lang: 'en', text: 'It was raining softly when Mei Ling left home. She held her red umbrella and walked to school. The trees along the road looked fresh and green. "Rainy days can be beautiful too," she thought.' },
];

export default {
  type: 'readaloud',
  title: 'Read aloud',
  icon: 'subtitles',
  tone: 'language', // dock tile colour: time | people | signal | content | language
  size: { w: 760, h: 500 },
  minSize: { w: 360, h: 280 },
  // A shared board file takes a copy of the passage, so a colleague gets it too.
  share: (st) => {
    const { at, ...rest } = st;
    const p = P.byId(st.passageId);
    return { ...rest, ...(p ? { passageCopy: p } : {}) };
  },

  mount(body, ctx) {
    const st = ctx.state;
    if (!st.mode) ctx.save({ mode: 'model', py: 'all', size: 40, at: 0, opts: { ...DEFAULT_OPTS }, passageId: null });
    if (st.passageCopy) {
      const got = P.adopt(st.passageCopy);
      delete st.passageCopy;
      ctx.save({ passageId: got?.id || st.passageId });
    }
    const opts = () => ({ ...DEFAULT_OPTS, ...(st.opts || {}) });
    const setOpts = (patch) => ctx.save({ opts: { ...opts(), ...patch } });
    const passage = () => P.byId(st.passageId);
    if (!passage() && P.all().length) ctx.save({ passageId: P.all()[0].id, at: 0 });

    const root = h('div', { class: 'ra', tabindex: '-1' });
    body.append(root);
    let alive = true;
    let voices = [];
    D.loadVoices().then((v) => { voices = v; if (alive) render(); });

    // ---------- The passage on screen ----------
    let parsed = null;      // R.parse() of the passage shown
    let pyMap = new Map();  // position -> { py, alt } for each Chinese character
    let builtKey = '';
    let pieceEls = [];
    let textEl = null, scroller = null, banner = null, bubble = null;
    let marking = false;    // choosing the characters that show pinyin
    let quiet = false;      // this tool is saving its own change

    const lang = () => passage()?.lang || 'zh';
    const chunkKey = () => (st.mode === 'echo' && opts().echoBy === 'phrase' ? 'phrase' : 'sent');
    const chunks = () => (!parsed ? [] : chunkKey() === 'phrase' ? parsed.phrases : parsed.sentences);
    const chunkIndex = () => R.chunkAt(chunks(), st.at || 0);
    const setAt = (i) => { const c = chunks()[i]; if (c) ctx.save({ at: c.s }); };

    async function ensureParsed() {
      const p = passage();
      if (!p) { parsed = null; builtKey = ''; return; }
      const key = `${p.id}|${p.updatedAt}|${opts().sandhi}`;
      if (key === builtKey && parsed) return;
      parsed = R.parse(p.text, p.lang);
      pyMap = new Map();
      if (p.lang === 'zh' && D.hasHan(p.text)) {
        try {
          (await D.pinyinChars(p.text, { sandhi: opts().sandhi })).forEach((x) => pyMap.set(x.i, { py: x.py, alt: x.alt }));
        } catch (err) { /* offline before pinyin was cached: no pinyin */ }
        Object.entries(p.pyFix || {}).forEach(([i, py]) => { const x = pyMap.get(Number(i)); if (x && py) pyMap.set(Number(i), { ...x, py, fixed: true }); });
      }
      builtKey = key;
      textEl = null; // the text is drawn again
    }

    function buildText() {
      const p = passage();
      const marks = new Set(p.marks || []);
      pieceEls = [];
      const paras = [];
      let para = h('p', { class: 'ra-para' });
      parsed.pieces.forEach((pc, k) => {
        if (pc.nl) { paras.push(para); para = h('p', { class: 'ra-para' }); pieceEls.push(null); return; }
        let el;
        if (pc.word && pc.han) {
          const kids = [];
          let i = pc.s;
          for (const c of pc.text) {
            const x = pyMap.get(i);
            kids.push(x ? h('ruby', { 'data-c': i, class: marks.has(i) ? 'mk' : null }, c, h('rt', {}, x.py)) : c);
            i += c.length;
          }
          el = h('span', { class: 'ra-p ra-w', 'data-k': k }, ...kids);
        } else {
          el = h('span', { class: 'ra-p' + (pc.word ? ' ra-w' : ''), 'data-k': k }, pc.text);
        }
        pieceEls.push(el);
        para.append(el);
      });
      paras.push(para);
      return paras;
    }

    // ---------- Highlighting ----------
    let curWord = -1;
    let litChunk = -1, litKey = '', litTurn = false;
    function showWord(w) {
      if (curWord >= 0) pieceEls[parsed?.words[curWord]?.piece]?.classList.remove('cur');
      curWord = w;
      if (w < 0 || !parsed) return;
      const el = pieceEls[parsed.words[w]?.piece];
      el?.classList.add('cur');
      keepInView(el);
    }
    function lightChunk(i, { turn = false } = {}) {
      const key = chunkKey();
      if (i === litChunk && key === litKey && turn === litTurn) return;
      litChunk = i; litKey = key; litTurn = turn;
      if (!parsed) return;
      parsed.pieces.forEach((pc, k) => {
        const el = pieceEls[k];
        if (!el) return;
        const on = i >= 0 && pc[key] === i;
        el.classList.toggle('in', on);
        el.classList.toggle('turn', on && turn);
      });
      textEl?.classList.toggle('lit', i >= 0);
      const c = chunks()[i];
      if (c) keepInView(pieceEls[parsed.words[c.w0]?.piece], true);
    }
    // Scrolls the text (never the board) so the element can be seen.
    function keepInView(el, top = false) {
      if (!el || !scroller) return;
      const box = scroller.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const pad = Math.min(80, box.height / 4);
      if (r.top < box.top + 8) scroller.scrollTop += r.top - box.top - pad;
      else if (r.bottom > box.bottom - 8) scroller.scrollTop += r.bottom - box.bottom + (top ? box.height / 3 : pad);
    }
    function clearLights() { showWord(-1); litChunk = -2; lightChunk(-1); }

    // ---------- Speech ----------
    let token = 0;
    let phase = '';         // listen | turn | count | choral | done | ''
    let running = false;    // Model reading or Choral pacing is going
    const timers = new Set();
    const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const sleep = (ms) => new Promise((r) => later(ms, r));
    const voiceFor = (l) => {
      const chosen = ctx.store.get().dictation?.voices?.[l];
      const options = D.voicesFor(l, voices);
      return options.find((v) => v.name === chosen) || options[0] || null;
    };
    const hasVoice = () => !voices.length || D.voicesFor(lang(), voices).length > 0;

    function stopAll({ keepLights = false } = {}) {
      token++;
      timers.forEach(clearTimeout);
      timers.clear();
      D.stopSpeaking();
      running = false;
      phase = '';
      hideBubble();
      if (!keepLights) clearLights();
    }

    // Splits a long part into its phrases for speaking.
    function speakParts(s, e) {
      if (e - s <= (LONG[lang()] || 48)) return [[s, e]];
      const out = parsed.phrases.filter((ph) => ph.s >= s && ph.e <= e).map((ph) => [ph.s, ph.e]);
      return out.length ? out : [[s, e]];
    }

    // Says the text between s and e, lighting each word. Resolves true when it was
    // said to the end, false when it was stopped or failed.
    async function speakRange(s, e, my, { light = true } = {}) {
      for (const [a, b] of speakParts(s, e)) {
        const ok = await speakPart(a, b, my, light);
        if (!ok || my !== token) return false;
      }
      return true;
    }

    let failedOnce = false;
    function speakPart(a, b, my, light) {
      return new Promise((resolve) => {
        if (!D.speechAvailable()) { resolve(false); return; }
        const text = passage()?.text.slice(a, b) || '';
        if (!text.trim()) { resolve(true); return; }
        const rate = opts().rate;
        const u = new SpeechSynthesisUtterance(text);
        const v = voiceFor(lang());
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang() === 'zh' ? 'zh-CN' : 'en-GB';
        u.rate = rate;
        const ws = [];
        parsed.words.forEach((w, i) => { if (w.s >= a && w.e <= b) ws.push(i); });
        let heard = false, started = false, finished = false, est = null;
        const estimate = (k) => {
          if (heard || my !== token || k >= ws.length || finished) return;
          if (light) showWord(ws[k]);
          const w = parsed.words[ws[k]];
          const next = parsed.words[ws[k + 1]];
          const gap = next ? passage().text.slice(w.e, next.s) : '';
          const pause = [...gap].some(R.isSentenceEnd) ? 500 : [...gap].some(R.isPhraseEnd) ? 300 : 0;
          est = later((R.wordMs(passage().text.slice(w.s, w.e), lang()) + pause) / rate, () => estimate(k + 1));
        };
        const start = () => { if (!started) { started = true; if (!heard) estimate(0); } };
        u.onstart = start;
        u.onboundary = (ev) => {
          if (ev.name && ev.name !== 'word') return;
          if (my !== token) return;
          heard = true;
          if (est) { clearTimeout(est); timers.delete(est); est = null; }
          const w = R.wordAt(parsed, a + (ev.charIndex || 0));
          if (light && w >= 0) showWord(w);
        };
        const end = (ok) => {
          if (finished) return;
          finished = true;
          if (est) { clearTimeout(est); timers.delete(est); }
          clearTimeout(guard);
          resolve(ok && my === token);
        };
        u.onend = () => end(true);
        u.onerror = (ev) => {
          const stopped = ev.error === 'interrupted' || ev.error === 'canceled';
          if (!stopped && my === token && !failedOnce) { failedOnce = true; ctx.toast(t('The computer couldn’t read this aloud. Check its voices in Read-aloud settings.'), 4000); }
          end(false);
        };
        // Some browsers never say they have started, or that they have finished.
        later(600, start);
        const guard = setTimeout(() => end(true), 6000 + text.length * 520 / rate);
        speechSynthesis.speak(u);
      });
    }

    // ---------- The four ways of reading ----------
    async function modelFrom(i) {
      stopAll({ keepLights: true });
      const my = token;
      const list = chunks();
      if (!list.length) return;
      running = true;
      phase = 'listen';
      for (let k = Math.max(0, i); k < list.length; k++) {
        setAt(k);
        lightChunk(k);
        paint();
        const ok = await speakRange(list[k].s, list[k].e, my);
        if (my !== token) return;
        if (!ok) { running = false; phase = ''; paint(); return; }
        showWord(-1);
        if (k < list.length - 1) { await sleep(GAP_MS); if (my !== token) return; }
      }
      running = false;
      phase = 'done';
      showWord(-1);
      paint();
    }

    async function echoAt(i) {
      stopAll({ keepLights: true });
      const my = token;
      const list = chunks();
      const c = list[i];
      if (!c) return;
      setAt(i);
      phase = 'listen';
      lightChunk(i);
      paint();
      const ok = await speakRange(c.s, c.e, my);
      if (my !== token) return;
      showWord(-1);
      if (!ok) { phase = ''; paint(); return; }
      phase = 'turn';
      lightChunk(i, { turn: true });
      if (opts().echoWait === 'auto') {
        // Time to repeat it: about as long as it took to say, and a little more.
        const said = parsed.words.slice(c.w0, c.w1).reduce((n, w) => n + R.wordMs(passage().text.slice(w.s, w.e), lang()), 0) / opts().rate;
        const ms = Math.round(said * 1.4 + 1500);
        running = true;
        paint(ms);
        await sleep(ms);
        if (my !== token) return;
        running = false;
        if (i + 1 < list.length) echoAt(i + 1);
        else { phase = 'done'; lightChunk(-1); paint(); }
        return;
      }
      paint();
    }

    async function choralFrom(i, { leadIn = true } = {}) {
      stopAll({ keepLights: true });
      const my = token;
      const list = chunks();
      if (!list.length) return;
      running = true;
      const speed = (PACES.find((x) => x[0] === opts().pace) || PACES[1])[2];
      setAt(Math.max(0, i));
      lightChunk(Math.max(0, i));
      if (leadIn) {
        phase = 'count';
        for (const n of [3, 2, 1]) {
          paint(0, n);
          await sleep(Math.round(320 / speed));
          if (my !== token) return;
        }
      }
      phase = 'choral';
      for (let k = Math.max(0, i); k < list.length; k++) {
        setAt(k);
        lightChunk(k);
        paint();
        const c = list[k];
        for (let w = c.w0; w < c.w1; w++) {
          showWord(w);
          const word = parsed.words[w];
          const next = parsed.words[w + 1];
          const gap = next ? passage().text.slice(word.e, next.s) : '';
          const pause = w === c.w1 - 1 ? 0 : [...gap].some(R.isPhraseEnd) || [...gap].some(R.isSentenceEnd) ? 450 : 0;
          await sleep((R.wordMs(passage().text.slice(word.s, word.e), lang()) + pause * speed) / speed);
          if (my !== token) return;
        }
        showWord(-1);
        if (k < list.length - 1) { await sleep(Math.round(800 * 0.45 / speed)); if (my !== token) return; }
      }
      running = false;
      phase = 'done';
      paint();
    }

    async function tapWord(w) {
      stopAll();
      const my = token;
      const word = parsed.words[w];
      if (!word) return;
      if (opts().tapReads === 'sentence') {
        const i = R.chunkAt(parsed.sentences, word.s);
        const c = parsed.sentences[i];
        phase = 'listen';
        lightChunk(i);
        paint();
        await speakRange(c.s, c.e, my);
        if (my !== token) return;
        phase = '';
        showWord(-1);
        lightChunk(-1);
        paint();
        return;
      }
      showWord(w);
      showBubble(w);
      await speakRange(word.s, word.e, my, { light: false });
      if (my !== token) return;
      later(1800, () => { if (my === token) { hideBubble(); showWord(-1); } });
    }

    // Pinyin for a tapped word, when it isn't already on screen.
    function showBubble(w) {
      hideBubble();
      if (lang() !== 'zh' || !scroller) return;
      const pc = parsed.pieces[parsed.words[w].piece];
      if (!pc.han) return;
      const marks = new Set(passage().marks || []);
      let i = pc.s;
      const syl = [];
      let hidden = false;
      for (const c of pc.text) {
        const x = pyMap.get(i);
        if (x) { syl.push(x.py); if (st.py === 'off' || (st.py === 'marked' && !marks.has(i))) hidden = true; }
        i += c.length;
      }
      if (!hidden || !syl.length) return;
      const el = pieceEls[parsed.words[w].piece];
      const box = scroller.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      bubble = h('div', { class: 'ra-bubble', style: {
        left: `${r.left - box.left + r.width / 2}px`, top: `${r.top - box.top + scroller.scrollTop}px`,
        fontSize: `${Math.max(16, Math.round((st.size || 40) * 0.5))}px`,
      } }, syl.join(' '));
      scroller.append(bubble);
    }
    function hideBubble() { bubble?.remove(); bubble = null; }

    // ---------- Controls ----------
    function main() {
      const list = chunks();
      const i = chunkIndex();
      if (st.mode === 'model') {
        if (running) { stopAll({ keepLights: true }); paint(); return; }
        modelFrom(phase === 'done' ? 0 : i);
      } else if (st.mode === 'echo') {
        if (phase === 'done') { echoAt(0); return; }
        if (phase === 'turn') {
          if (i + 1 < list.length) { echoAt(i + 1); return; }
          stopAll(); phase = 'done'; paint(); return;
        }
        if (phase === 'listen') { stopAll({ keepLights: true }); paint(); return; }
        echoAt(i);
      } else if (st.mode === 'choral') {
        if (running) { stopAll({ keepLights: true }); paint(); return; }
        choralFrom(phase === 'done' ? 0 : i);
      }
    }
    function step(d) {
      const list = chunks();
      if (!list.length) return;
      const i = Math.max(0, Math.min(list.length - 1, chunkIndex() + d));
      const was = running || phase === 'listen' || phase === 'turn';
      if (st.mode === 'model' && was) { modelFrom(i); return; }
      if (st.mode === 'choral' && was) { choralFrom(i, { leadIn: false }); return; }
      if (st.mode === 'echo') { echoAt(i); return; }
      stopAll();
      setAt(i);
      lightChunk(i);
      paint();
    }
    function again() {
      const i = chunkIndex();
      if (st.mode === 'echo') echoAt(i);
      else if (st.mode === 'model') modelFrom(i);
      else if (st.mode === 'choral') choralFrom(i, { leadIn: false });
    }

    // A tap on the text: hear it, choose characters, or start from there.
    function onTextClick(e) {
      if (!parsed) return;
      if (marking) {
        const rb = e.target.closest('ruby[data-c]');
        if (!rb) return;
        const i = Number(rb.dataset.c);
        const p = passage();
        const marks = new Set(p.marks || []);
        if (marks.has(i)) marks.delete(i); else marks.add(i);
        rb.classList.toggle('mk', marks.has(i));
        quiet = true;
        const saved = P.save({ ...p, marks: [...marks] });
        quiet = false;
        builtKey = `${saved.id}|${saved.updatedAt}|${opts().sandhi}`; // no need to draw it again
        lastSeen = seen();
        paintMarkCount();
        return;
      }
      const el = e.target.closest('.ra-p');
      if (!el) return;
      const pc = parsed.pieces[Number(el.dataset.k)];
      if (!pc) return;
      if (st.mode === 'tap') {
        if (pc.w >= 0) tapWord(pc.w);
        return;
      }
      const list = chunks();
      const i = pc[chunkKey()] >= 0 ? pc[chunkKey()] : R.chunkAt(list, pc.s);
      if (st.mode === 'model' && running) modelFrom(i);
      else if (st.mode === 'choral' && running) choralFrom(i, { leadIn: false });
      else if (st.mode === 'echo' && (phase === 'listen' || phase === 'turn' || running)) echoAt(i);
      else { stopAll(); setAt(i); lightChunk(i); paint(); }
    }

    function setMode(m) {
      if (m === st.mode) return;
      stopAll();
      marking = false;
      ctx.save({ mode: m });
      render();
    }

    // ---------- Drawing ----------
    let controlsEl = null, phaseEl = null, counterEl = null, markCountEl = null;
    const miniBtn = h('button', { class: 'mini-btn', onclick: (e) => { e.stopPropagation(); main(); } });
    const miniCount = h('span', { class: 'mini-text' });

    function render() {
      if (!alive) return;
      const p = passage();
      ctx.setMiniLabel?.(p?.name || '');
      if (!p) { stopAll(); emptyView(); paintMini(); return; }
      ensureParsed().then(() => { if (alive) draw(); });
    }

    function emptyView() {
      put(root, h('div', { class: 'empty-state' },
        h('span', { class: 'tool-tile tone-language yt-empty-tile' }, icon('subtitles')),
        h('p', {}, t('Paste a passage for the class to read along with: a 课文, a poem, a story.')),
        h('p', { class: 'muted small' }, t('The computer reads it aloud while each word lights up. Passages are shared by all your boards.')),
        h('div', { class: 'row gap wrap center' },
          h('button', { class: 'btn primary', onclick: () => editPassage(null) }, t('New passage')),
          h('button', { class: 'btn', onclick: addSamples }, t('Try the sample passages')))));
    }

    function addSamples() {
      let first = null;
      SAMPLES.forEach((s) => {
        const have = P.all().find((x) => x.name === s.name);
        const got = have || P.save({ ...P.blank(s.lang), ...s });
        if (!first && (getLang() === 'zh' ? s.lang === 'zh' : true)) first = got;
      });
      ctx.save({ passageId: first.id, at: 0 });
      render();
    }

    function passagePicker() {
      const sel = h('select', { class: 'dc-select ra-select', 'aria-label': t('Passage') },
        ...P.all().map((x) => h('option', { value: x.id }, x.name || t('Untitled passage'))),
        h('option', { value: '__new' }, t('+ New passage…')));
      sel.value = passage()?.id || '__new';
      sel.addEventListener('change', () => {
        if (sel.value === '__new') { sel.value = passage()?.id || '__new'; editPassage(null); return; }
        stopAll();
        marking = false;
        ctx.save({ passageId: sel.value, at: 0 });
        render();
      });
      return sel;
    }

    function draw() {
      const p = passage();
      if (!p || !parsed) { render(); return; }
      const zh = p.lang === 'zh' && pyMap.size > 0;
      if (!zh) marking = false;
      const modeSeg = h('div', { class: 'seg ra-modes', role: 'group', 'aria-label': t('How to read') },
        ...MODES.map(([v, label, ic]) => h('button', {
          class: 'seg-btn with-icon' + (st.mode === v ? ' active' : ''), 'aria-pressed': String(st.mode === v),
          title: t(label), onclick: () => setMode(v),
        }, icon(ic), h('span', { class: 'ra-mode-label' }, t(label)))));

      scroller = h('div', { class: 'ra-scroll' });
      textEl = h('div', {
        class: `ra-text py-${zh ? st.py || 'all' : 'off'}${marking ? ' marking' : ''}${opts().dim ? ' dim' : ''}${st.mode === 'tap' ? ' tapping' : ''}`,
        lang: p.lang === 'zh' ? 'zh-CN' : 'en', style: { fontSize: `${st.size || 40}px` },
      }, ...(p.text.trim() ? buildText() : [h('p', { class: 'muted ra-empty-text' }, t('This passage is empty. Press Edit to type or paste its text.'))]));
      textEl.addEventListener('click', onTextClick);
      phaseEl = h('div', { class: 'ra-phase', 'aria-live': 'polite' });
      counterEl = h('span', { class: 'im-counter ra-counter' });
      scroller.append(textEl);
      litChunk = -2; curWord = -1;

      const noVoice = st.mode !== 'choral' && voices.length && !hasVoice();
      const warn = !D.speechAvailable() && st.mode !== 'choral'
        ? h('p', { class: 'dc-warn' }, icon('alert-triangle'), t('This browser can’t read aloud. Choral pacing still works.'))
        : noVoice ? h('p', { class: 'dc-warn' }, icon('alert-triangle'),
          t('This computer has no {lang} voice, so the passage can’t be read aloud.', { lang: p.lang === 'zh' ? '中文' : 'English' }), ' ',
          h('button', { class: 'link-btn', onclick: voiceHelp }, t('How to add one'))) : null;

      const sizeIdx = SIZES.findIndex((s) => s >= (st.size || 40));
      const setSize = (d) => {
        const j = Math.max(0, Math.min(SIZES.length - 1, (sizeIdx < 0 ? SIZES.length - 1 : sizeIdx) + d));
        ctx.save({ size: SIZES[j] });
        textEl.style.fontSize = `${SIZES[j]}px`;
        hideBubble();
      };
      markCountEl = h('span', { class: 'ra-markcount muted small' });
      const view = h('div', { class: 'ra-view' },
        zh ? h('span', { class: 'ra-view-label' }, t('Pinyin')) : null,
        zh ? segmented(tOpts(PY_MODES), st.py || 'all', (v) => { ctx.save({ py: v }); if (v !== 'marked') marking = false; draw(); }, t('Pinyin')) : null,
        zh && st.py === 'marked' ? h('button', {
          class: 'btn small with-icon ra-mark' + (marking ? ' active' : ''), 'aria-pressed': String(marking),
          title: t('Tap characters in the passage to show or hide their pinyin'),
          onclick: () => { marking = !marking; if (marking) stopAll(); draw(); },
        }, icon(marking ? 'check' : 'highlight'), marking ? t('Done choosing') : t('Choose characters')) : null,
        zh && st.py === 'marked' ? markCountEl : null,
        h('span', { class: 'ra-size' },
          h('button', { class: 'icon-btn small', title: t('Smaller text'), 'aria-label': t('Smaller text'), disabled: sizeIdx === 0, onclick: () => { setSize(-1); draw(); } }, icon('text-decrease')),
          h('button', { class: 'icon-btn small', title: t('Larger text'), 'aria-label': t('Larger text'), disabled: sizeIdx === SIZES.length - 1, onclick: () => { setSize(1); draw(); } }, icon('text-increase'))));

      controlsEl = h('div', { class: 'ra-controls' });
      put(root,
        h('div', { class: 'dc-bar ra-bar' }, passagePicker(), modeSeg,
          h('div', { class: 'row gap ra-bar-tools' },
            h('button', { class: 'icon-btn small', title: t('Edit this passage'), 'aria-label': t('Edit this passage'), onclick: () => editPassage(p) }, icon('pencil')),
            h('button', { class: 'icon-btn small', title: t('Read-aloud settings: voice, speed, pace'), 'aria-label': t('Read-aloud settings'), onclick: settings }, icon('settings')))),
        st.mode !== 'tap' ? h('div', { class: 'ra-strip' }, phaseEl, counterEl) : null,
        h('div', { class: 'ra-stage' }, scroller),
        warn,
        marking ? h('p', { class: 'ra-hint' }, icon('hand-finger'), t('Tap the characters that should show pinyin, such as new or difficult ones. Tap again to hide it.')) : null,
        h('div', { class: 'ra-foot' }, view, controlsEl));
      paintMarkCount();
      // Show where the class is, if it has started.
      if (phase || st.at) lightChunk(chunkIndex(), { turn: phase === 'turn' });
      paint();
      if (!root.contains(document.activeElement) && !document.querySelector('#modal[open]')) root.focus({ preventScroll: true });
    }

    function paintMarkCount() {
      if (!markCountEl) return;
      const n = (passage()?.marks || []).length;
      markCountEl.textContent = n ? t('{n} chosen', { n }) : marking ? '' : t('None chosen yet');
    }

    // The phase label and the buttons, which change as the reading goes on.
    function paint(waitMs = 0, count = 0) {
      if (!alive || !controlsEl) { paintMini(); return; }
      const list = chunks();
      const i = chunkIndex();
      const n = list.length;
      const unit = chunkKey() === 'phrase' ? t('Phrase') : t('Sentence');
      if (counterEl) counterEl.textContent = n ? `${unit} ${Math.min(i + 1, n)} / ${n}` : '';
      const can = D.speechAvailable() && hasVoice() && n > 0;
      const lit = litChunk >= 0; // paused part-way, or a starting place was chosen
      const btn = (label, ic, fn, attrs = {}) => h('button', { class: 'btn with-icon', onclick: fn, ...attrs }, icon(ic), label);
      const back = btn(t('Back'), 'player-skip-back', () => step(-1), { disabled: !n || i === 0, title: t('Previous (←)') });
      const next = h('button', { class: 'btn with-icon', onclick: () => step(1), disabled: !n || i >= n - 1, title: t('Next (→)') }, t('Next'), icon('player-skip-forward'));

      // Projected for students, so the phase labels are bilingual.
      let label = null;
      if (phase === 'listen' && st.mode !== 'tap') label = [icon('ear'), ' Listen · 听'];
      else if (phase === 'turn') label = [icon('repeat'), ' Your turn · 跟我读'];
      else if (phase === 'count') label = [h('span', { class: 'ra-count' }, String(count)), ' Ready · 预备'];
      else if (phase === 'choral') label = [icon('users'), ' Read together · 齐读'];
      else if (phase === 'done' && st.mode !== 'tap') label = [icon('flag'), ' Well done · 读完了'];
      const idle = {
        model: t('The computer reads; the class follows the highlight.'),
        echo: t('The computer reads a part, then the class repeats it.'),
        choral: t('The class reads together as the highlight moves.'),
      }[st.mode];
      put(phaseEl, label ? h('span', { class: `ra-phase-pill ${phase}` }, ...label,
        waitMs ? h('span', { class: 'ra-wait', style: { animationDuration: `${waitMs}ms` } }) : null)
        : idle ? h('span', { class: 'muted small ra-idle' }, idle) : null);
      textEl?.classList.toggle('active', !!phase && phase !== 'done');

      let kids;
      if (st.mode === 'model') {
        kids = [back, h('button', { class: 'btn primary with-icon', disabled: !can, onclick: main, title: t('Play or pause (space)') },
          icon(running ? 'player-pause' : 'player-play'), running ? t('Pause') : phase === 'done' ? t('Read again') : lit ? t('Go on') : t('Read aloud')), next];
      } else if (st.mode === 'echo') {
        kids = [back,
          btn(t('Again'), 'repeat', again, { disabled: !can, title: t('Say it again (R)') }),
          h('button', { class: 'btn primary with-icon', disabled: !can, onclick: main, title: t('Space') },
            phase === 'listen' ? [icon('player-pause'), t('Pause')]
              : phase === 'turn' ? [i + 1 >= n ? t('Finish') : t('Next'), icon('player-skip-forward')]
                : phase === 'done' ? [icon('rotate'), t('Start again')] : [icon('player-play'), lit ? t('Go on') : t('Start')])];
      } else if (st.mode === 'choral') {
        kids = [back, h('button', { class: 'btn primary with-icon', disabled: !n, onclick: main, title: t('Start or pause (space)') },
          icon(running ? 'player-pause' : 'player-play'), running ? t('Pause') : phase === 'done' ? t('Again') : lit ? t('Go on') : t('Start')), next];
      } else {
        kids = [h('span', { class: 'muted small ra-taphint' }, icon('hand-finger'), t('Tap a word to hear it')),
          segmented([['word', t('Word')], ['sentence', t('Sentence')]], opts().tapReads, (v) => { setOpts({ tapReads: v }); paint(); }, t('Tap reads'))];
      }
      put(controlsEl, ...kids);
      paintMini();
      // Keep the keys working after the buttons are drawn again.
      if (document.activeElement === document.body && !document.querySelector('#modal[open]')) root.focus({ preventScroll: true });
    }

    function paintMini() {
      const going = running || phase === 'listen' || phase === 'turn' || phase === 'count' || phase === 'choral';
      if (!passage() || st.mode === 'tap' || !(going || litChunk >= 0)) { ctx.setMiniControls?.(); return; }
      put(miniBtn, icon(running || phase === 'listen' ? 'player-pause' : phase === 'turn' ? 'player-skip-forward' : 'player-play'));
      miniBtn.title = running || phase === 'listen' ? t('Pause') : t('Read aloud');
      const n = chunks().length;
      miniCount.textContent = n ? `${Math.min(chunkIndex() + 1, n)}/${n}` : '';
      ctx.setMiniControls?.(miniBtn, miniCount);
    }

    // ---------- Passage editor ----------
    function editPassage(existing) {
      stopAll();
      const p = existing ? JSON.parse(JSON.stringify(existing)) : P.blank('zh');
      let saved = !!existing;
      let langChosen = !!existing;
      let lastText = p.text;
      let timer = null;
      const persist = () => {
        clearTimeout(timer);
        timer = null;
        if (!p.name.trim() && !p.text.trim()) return;
        if (!p.name.trim()) p.name = autoName(p.text) || t('Passage {date}', { date: new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) });
        if (p.text !== lastText) {
          p.marks = P.remap(lastText, p.text, p.marks || []);
          p.pyFix = P.remap(lastText, p.text, p.pyFix || {});
          lastText = p.text;
        }
        P.save(p);
        if (!saved) { saved = true; ctx.save({ passageId: p.id, at: 0 }); }
      };
      const soon = () => { clearTimeout(timer); timer = setTimeout(persist, 500); };

      openModal(existing ? t('Edit passage') : t('New passage'), (mb) => {
        const name = h('input', { class: 'input', type: 'text', value: p.name, maxlength: 80, placeholder: t('e.g. 第六课《小雨》 or Unit 4 reading') });
        name.addEventListener('input', () => { p.name = name.value; soon(); });
        const langSeg = h('div');
        const drawLang = () => put(langSeg, segmented([['zh', '中文'], ['en', 'English']], p.lang, (v) => { p.lang = v; langChosen = true; soon(); drawLang(); drawCheck(); }, t('Language')));
        drawLang();
        const text = h('textarea', { class: 'input ra-edit-text', rows: 9, lang: p.lang === 'zh' ? 'zh-CN' : 'en',
          placeholder: t('Type or paste the passage. Keep line breaks between paragraphs.') });
        text.value = p.text;
        text.addEventListener('input', () => {
          p.text = text.value;
          // A new passage takes its language from what is pasted in.
          if (!langChosen && p.text.trim()) {
            const l = D.hasHan(p.text) ? 'zh' : 'en';
            if (l !== p.lang) { p.lang = l; drawLang(); }
          }
          soon();
          checkStale();
        });
        const check = h('div', { class: 'ra-check' });
        let checkedText = null;
        function checkStale() { if (checkedText != null && checkedText !== p.text) drawCheck(); }

        // Pinyin the app worked out, with the characters that have more than one reading marked.
        async function drawCheck() {
          if (p.lang !== 'zh' || !D.hasHan(p.text)) { put(check); checkedText = null; return; }
          checkedText = p.text;
          const fixes = P.remap(lastText, p.text, p.pyFix || {});
          let chars = [];
          try { chars = await D.pinyinChars(p.text, { sandhi: opts().sandhi }); } catch (err) { put(check, h('p', { class: 'muted small' }, t('Pinyin needs the app’s files; open it once with the internet.'))); return; }
          if (checkedText !== p.text) return;
          const byPos = new Map(chars.map((x) => [x.i, x]));
          const multi = chars.filter((x) => x.alt.length);
          const out = h('div', { class: 'ra-check-text', lang: 'zh-CN' });
          let i = 0;
          for (const c of p.text) {
            const x = byPos.get(i);
            if (c === '\n') out.append(h('br'));
            else if (!x) out.append(c);
            else {
              const pos = i;
              const fixed = fixes[pos];
              const rb = h('ruby', { class: (x.alt.length ? 'multi' : '') + (fixed ? ' fixed' : ''), tabindex: x.alt.length ? '0' : null }, c, h('rt', {}, fixed || x.py));
              if (x.alt.length) {
                const pick = () => choose(rb, pos, x, fixed);
                rb.addEventListener('click', pick);
                rb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
              }
              out.append(rb);
            }
            i += c.length;
          }
          put(check,
            h('div', { class: 'row gap wrap space-between' }, h('strong', {}, t('Check the pinyin')),
              h('span', { class: 'muted small' }, multi.length ? t('Underlined characters have more than one reading. Click one to change it.') : t('No character here has more than one reading.'))),
            out,
            h('div', { class: 'ra-choose', hidden: true }));
        }
        function choose(rb, pos, x, fixed) {
          const box = check.querySelector('.ra-choose');
          check.querySelectorAll('ruby.picking').forEach((r) => r.classList.remove('picking'));
          rb.classList.add('picking');
          const current = (p.pyFix || {})[pos] || x.py;
          const set = (py) => {
            persist(); // so positions are up to date
            const fixes = { ...(p.pyFix || {}) };
            if (!py || py === x.py) delete fixes[pos]; else fixes[pos] = py;
            p.pyFix = fixes;
            P.save(p);
            box.hidden = true;
            drawCheck();
          };
          const own = h('input', { class: 'input ra-own-py', type: 'text', placeholder: t('or type it'), 'aria-label': t('Pinyin') });
          own.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (own.value.trim()) set(own.value.trim()); } });
          put(box,
            h('span', { class: 'ra-choose-char', lang: 'zh-CN' }, x.c),
            ...[...new Set([x.py, ...x.alt])].map((py) => h('button', { class: 'btn small' + (py === current ? ' primary' : ''), onclick: () => set(py) }, py)),
            own,
            (p.pyFix || {})[pos] ? h('button', { class: 'link-btn', onclick: () => set(null) }, t('Back to {py}', { py: x.py })) : null);
          box.hidden = false;
        }
        drawCheck();

        mb.append(
          h('div', { class: 'dc-edit-top' },
            h('label', { class: 'field grow' }, h('span', {}, t('Passage name')), name),
            h('div', { class: 'field' }, h('span', {}, t('Language')), langSeg)),
          h('label', { class: 'field' }, h('span', {}, t('Passage')), text),
          h('div', { class: 'row gap' }, h('button', { class: 'btn small', onclick: () => { persist(); drawCheck(); } }, t('Update the pinyin below')),
            h('span', { class: 'muted small' }, t('Chinese passages get their pinyin straight away, even offline.'))),
          check,
          h('p', { class: 'muted small' }, t('Passages are kept in this browser and shared by all your boards. They go into backups, and a shared board file takes a copy of the passage its Read-aloud tool shows.')),
          h('div', { class: 'row gap wrap space-between' },
            existing ? confirmButton(t('Delete this passage'), t('Click again to delete'), () => {
              clearTimeout(timer);
              P.remove(p.id);
              ctx.save({ passageId: P.all()[0]?.id || null, at: 0 });
              closeModal();
              render();
            }) : h('span'),
            h('button', { class: 'btn primary', onclick: () => { persist(); closeModal(); render(); } }, t('Done'))),
        );
        // Closing the dialog any other way still keeps what was typed.
        const dlg = document.getElementById('modal');
        dlg.addEventListener('close', () => { if (timer) persist(); if (alive) render(); }, { once: true });
        if (!existing) text.focus(); else name.blur();
      }, { wide: true });
    }
    const autoName = (text) => {
      const first = (text || '').trim().split('\n')[0].trim();
      return first.length > 24 ? first.slice(0, 22) + '…' : first;
    };

    // ---------- Settings ----------
    function settings() {
      openModal(t('Read-aloud settings'), (mb) => {
        const draw = () => {
          const o = opts();
          const l = lang();
          const label = l === 'zh' ? '中文' : 'English';
          const options = D.voicesFor(l, voices);
          let voiceRow;
          if (!options.length) {
            voiceRow = h('div', { class: 'field' }, h('span', {}, t('{lang} voice', { lang: label })),
              h('p', { class: 'dc-warn' }, icon('alert-triangle'), t('None on this computer.'), ' ', h('button', { class: 'link-btn', onclick: voiceHelp }, t('How to add one'))));
          } else {
            const sel = h('select', { class: 'input' }, ...options.map((v) => h('option', { value: v.name }, `${v.name} (${v.lang})`)));
            sel.value = voiceFor(l)?.name || options[0].name;
            sel.addEventListener('change', () => {
              ctx.store.update((m) => { m.dictation = { ...(m.dictation || {}), voices: { ...(m.dictation?.voices || {}), [l]: sel.value } }; }, { notify: false });
            });
            const sample = l === 'zh' ? '早上，天空飘起了小雨。' : 'It was raining softly when Mei Ling left home.';
            voiceRow = h('div', { class: 'field' }, h('span', {}, t('{lang} voice', { lang: label })),
              h('div', { class: 'row gap' }, sel, h('button', { class: 'btn small with-icon ra-voice-test', onclick: () => D.speak(sample, { lang: l, voice: voiceFor(l), rate: o.rate }) }, icon('volume'), t('Test'))),
              h('span', { class: 'muted small' }, t('The same voice is used by Dictation on this computer. Voices that say where they are in the text light up each word exactly; with others, the highlight follows an estimate.')));
          }
          const check = (key, text) => {
            const c = h('input', { type: 'checkbox', checked: !!o[key] });
            c.addEventListener('change', () => { setOpts({ [key]: c.checked }); builtKey = key === 'sandhi' ? '' : builtKey; render(); });
            return h('label', { class: 'row gap dc-check' }, c, text);
          };
          put(mb,
            voiceRow,
            h('div', { class: 'field' }, h('span', {}, t('Reading speed')), segmented(tOpts(RATES), o.rate, (v) => { setOpts({ rate: v }); draw(); }, t('Reading speed'))),
            h('h3', { class: 'ra-set-head' }, t('Echo reading')),
            h('div', { class: 'field' }, h('span', {}, t('Read and repeat')), segmented([['sentence', t('A sentence at a time')], ['phrase', t('A phrase at a time')]], o.echoBy, (v) => { stopAll(); setOpts({ echoBy: v }); draw(); render(); }, t('Read and repeat')),
              h('span', { class: 'muted small' }, t('Phrases break at commas, so weaker readers repeat shorter pieces.'))),
            h('div', { class: 'field' }, h('span', {}, t('Then')), segmented([['next', t('I click Next')], ['auto', t('Go on by itself')]], o.echoWait, (v) => { setOpts({ echoWait: v }); draw(); }, t('Then')),
              h('span', { class: 'muted small' }, o.echoWait === 'auto' ? t('After each part, the class gets about as long as it took to say, and a little more, before the next one.') : t('You move on with Next (or the space bar or → key).'))),
            h('h3', { class: 'ra-set-head' }, t('Choral pacing')),
            h('div', { class: 'field' }, h('span', {}, t('Pace')), segmented(tOpts(PACES.map(([v, l]) => [v, l])), o.pace, (v) => { setOpts({ pace: v }); draw(); }, t('Pace')),
              h('span', { class: 'muted small' }, t('For Chinese, about 85, 115 or 155 characters a minute.'))),
            h('h3', { class: 'ra-set-head' }, t('Display')),
            check('dim', t('Fade the rest of the passage while a part is read')),
            lang() === 'zh' ? check('sandhi', t('Show 一 and 不 in their spoken tones (yí gè, bú duì)')) : null,
            h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: closeModal }, t('Done'))));
        };
        draw();
      });
    }

    function voiceHelp() {
      openModal(t('Adding a voice'), (mb) => {
        const colon = getLang() === 'zh' ? '：' : ': ';
        mb.append(
          h('p', {}, t('Read aloud uses the voices that come with the computer. Most computers have English; a Chinese voice can be added for free.')),
          h('ul', { class: 'yt-steps' },
            h('li', {}, h('strong', {}, 'Windows' + colon), t('Settings → Time & language → Speech → Manage voices → Add voices. Choose “Chinese (Simplified, China)”, “Malay” or “Tamil”, then restart the browser.')),
            h('li', {}, h('strong', {}, 'Mac / iPad' + colon), t('System Settings → Accessibility → Spoken Content → System Voice → Manage Voices. Add a Chinese (China mainland), Malay or Tamil voice.')),
            h('li', {}, h('strong', {}, 'Chromebook' + colon), t('Settings → Accessibility → Text-to-Speech → Speech engine settings. In Chrome, Google’s online voices also work when connected to the internet.'))),
          h('p', { class: 'muted small' }, t('Microsoft Edge also has natural-sounding online voices for Chinese, Malay, Tamil and Singapore English. They need the internet.')),
          h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: closeModal }, t('OK'))));
      });
    }

    // ---------- Keys and updates ----------
    function onKey(e) {
      if (e.target.closest('input, textarea, select') || !parsed) return;
      if (e.key === ' ' && st.mode !== 'tap') { if (e.target.closest('button')) return; e.preventDefault(); main(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
      else if ((e.key === 'r' || e.key === 'R') && st.mode !== 'tap') { e.preventDefault(); again(); }
    }
    root.addEventListener('keydown', onKey);

    // Passages live with the class lists, so draw again when one changes.
    let lastSeen = '';
    const seen = () => { const p = passage(); return p ? `${p.id}|${p.updatedAt}|${P.all().length}` : `none|${P.all().length}`; };
    lastSeen = seen();
    const unsub = ctx.onClassesChange(() => {
      if (quiet) return;
      const now = seen();
      if (now === lastSeen) return;
      lastSeen = now;
      // This tool's own change (choosing characters) is already on screen.
      const p = passage();
      if (p && textEl && builtKey === `${p.id}|${p.updatedAt}|${opts().sandhi}`) return;
      if (!passage()) { stopAll(); if (P.all().length) ctx.save({ passageId: P.all()[0].id, at: 0 }); }
      // While a dialog is open (the passage editor), draw again once it closes.
      const dlg = document.querySelector('#modal[open]');
      if (dlg) {
        if (!drawAfterDialog) { drawAfterDialog = true; dlg.addEventListener('close', () => { drawAfterDialog = false; if (alive) render(); }, { once: true }); }
        return;
      }
      if (!running && phase !== 'listen') render();
    });
    let drawAfterDialog = false;

    render();
    return {
      destroy() {
        alive = false;
        stopAll();
        root.removeEventListener('keydown', onKey);
        unsub?.();
      },
    };
  },
};
