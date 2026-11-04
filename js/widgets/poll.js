// Poll (投票): quick checks of the whole class in three modes:
//   Scale 1–5 (量表)      a Likert scale with the teacher's own end labels
//   Mood meter (情绪象限)  four zones by energy and pleasantness
//   Word cloud (词云)      one word or short phrase each
// Answers come either from students' devices (a Google Form behind a QR code,
// one reusable form per class) or from the teacher counting hands (fist-to-five,
// pointing at a zone) and tapping the totals in. Word clouds without devices
// take answers typed in by the teacher.
// Results stay hidden until the teacher reveals them, and names (if asked for
// at all) only ever go to the Sheet. Each finished poll is kept in the class's
// history (totals and words only) with a CSV download.
import { h, classSelect, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import { tr } from '../routines.js';
import * as google from '../google.js';
import * as gf from '../gforms.js';
import * as polls from '../polls.js';
import * as wc from '../wordcloud.js';

const POLL_MS = 5000;
const LANGS = [['en', 'English'], ['zh', '中文'], ['both', 'Both 双语']];
const NAMES = [['none', 'Anonymous 匿名'], ['sheet', 'Ask names (Sheet only)']];

const MODES = {
  likert: {
    icon: 'chart-bar', name: { en: 'Scale 1–5', zh: '量表 1–5' },
    about: { en: 'Rate from 1 to 5', zh: '从 1 到 5 打分' },
    question: { en: 'How confident do you feel about today’s lesson?', zh: '你对今天的内容有多大把握？' },
  },
  mood: {
    icon: 'mood-happy', name: { en: 'Mood meter', zh: '情绪象限' },
    about: { en: 'Four zones: energy × pleasantness', zh: '四个区：精力 × 愉快程度' },
    question: { en: 'How are you feeling right now?', zh: '你现在感觉怎么样？' },
  },
  words: {
    icon: 'cloud', name: { en: 'Word cloud', zh: '词云' },
    about: { en: 'One word or short phrase each', zh: '每人一个词或短语' },
    question: { en: 'Describe today’s lesson in one word.', zh: '用一个词形容今天的课。' },
  },
};
const LOW = { en: 'Not at all', zh: '完全没有' };
const HIGH = { en: 'Very much', zh: '非常有' };

// Mood meter zones, in grid order: top row high energy, left column unpleasant.
export const ZONES = [
  { key: 'red', dot: '🔴', name: { en: 'Red', zh: '红' }, desc: { en: 'High energy · unpleasant', zh: '精力充沛 · 不愉快' }, eg: { en: 'angry, worried, stressed', zh: '生气、担心、紧张' } },
  { key: 'yellow', dot: '🟡', name: { en: 'Yellow', zh: '黄' }, desc: { en: 'High energy · pleasant', zh: '精力充沛 · 愉快' }, eg: { en: 'excited, happy, proud', zh: '兴奋、开心、自豪' } },
  { key: 'blue', dot: '🔵', name: { en: 'Blue', zh: '蓝' }, desc: { en: 'Low energy · unpleasant', zh: '精力不足 · 不愉快' }, eg: { en: 'sad, tired, bored', zh: '难过、疲倦、无聊' } },
  { key: 'green', dot: '🟢', name: { en: 'Green', zh: '绿' }, desc: { en: 'Low energy · pleasant', zh: '精力不足 · 愉快' }, eg: { en: 'calm, relaxed, content', zh: '平静、放松、满足' } },
];
const FEEL = { en: 'One word for how you feel (optional)', zh: '用一个词形容你的感受（可不填）' };
const NAME_Q = { en: 'Your name', zh: '姓名' };

const emptyTally = (mode) => (mode === 'likert' ? [0, 0, 0, 0, 0] : mode === 'mood' ? { red: 0, yellow: 0, blue: 0, green: 0 } : null);
const fmt = (iso) => new Date(iso).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const zoneText = (z, L) => `${z.dot} ${tr(z.name, L)} — ${tr(z.desc, L, ' / ')} (${tr(z.eg, L, ' / ')})`;
const cloudFont = () => getComputedStyle(document.body).fontFamily || 'sans-serif';

function qrSvg(url) {
  if (!window.qrcode) return h('p', { class: 'muted small' }, url);
  const qr = window.qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return h('div', { class: 'rt-qr-img', html: qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }) });
}

function seg(options, value, onPick, label) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label },
    ...options.map(([v, text]) => h('button', {
      class: 'seg-btn' + (v === value ? ' active' : ''), 'aria-pressed': String(v === value), onclick: () => onPick(v),
    }, text)));
}

// ---------- Results, as plain data (live polls and history share these) ----------
// result: { mode, lang, low, high, counts, words: [[key, n]], feel: { zone: [[key, n]] }, n }
export function average(counts) {
  const n = counts.reduce((a, b) => a + b, 0);
  return n ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / n : null;
}

function summary(e) {
  if (e.mode === 'likert') { const a = average(e.counts); return a == null ? '–' : `Average ${a.toFixed(1)}`; }
  if (e.mode === 'mood') return ZONES.map((z) => `${z.dot}${e.counts[z.key] || 0}`).join(' ');
  return (e.words || []).slice(0, 5).map(([w]) => w).join(', ') || '–';
}

// ---------- Charts ----------
// opts: { tally: bool (show + / − for counting hands), onTally(i|key, delta) }
function likertChart(r, opts = {}) {
  const counts = r.counts;
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const avg = average(counts);
  const low = r.low || tr(LOW, r.lang);
  const high = r.high || tr(HIGH, r.lang);
  return h('div', { class: 'pl-likert' + (opts.tally ? ' tally' : '') },
    h('div', { class: 'pl-cols' }, ...counts.map((c, i) => {
      const col = h(opts.tally ? 'button' : 'div', {
        class: 'pl-col', title: opts.tally ? `Add one to ${i + 1}` : null,
        'aria-label': opts.tally ? `${i + 1}: ${c}. Add one` : null,
        onclick: opts.tally ? () => opts.onTally(i, 1) : null,
      },
      h('span', { class: 'pl-col-val' }, String(c), total ? h('small', {}, ` ${pct(c, total)}%`) : null),
      h('span', { class: 'pl-col-track' }, h('span', { class: `pl-col-bar s${i + 1}`, style: { height: `${(c / max) * 100}%` } })),
      h('span', { class: 'pl-col-num' }, String(i + 1)));
      return h('div', { class: 'pl-col-wrap' }, col,
        opts.tally ? h('button', { class: 'pl-minus', 'aria-label': `Take one from ${i + 1}`, title: 'Take one away', disabled: !c, onclick: () => opts.onTally(i, -1) }, icon('minus')) : null);
    })),
    h('div', { class: 'pl-ends' }, h('span', {}, `1 = ${low}`), h('span', {}, `5 = ${high}`)),
    h('div', { class: 'pl-sum' },
      h('strong', {}, avg == null ? '–' : avg.toFixed(1)), h('span', { class: 'muted' }, ` average 平均 · ${total} answer${total === 1 ? '' : 's'}`)));
}

function moodChart(r, opts = {}) {
  const total = ZONES.reduce((s, z) => s + (r.counts[z.key] || 0), 0);
  const max = Math.max(1, ...ZONES.map((z) => r.counts[z.key] || 0));
  const L = r.lang;
  return h('div', { class: 'pl-mood' + (opts.tally ? ' tally' : '') },
    h('div', { class: 'pl-axis-y' }, '↑ ', tr({ en: 'More energy', zh: '精力越高' }, L)),
    h('div', { class: 'pl-zones' }, ...ZONES.map((z) => {
      const c = r.counts[z.key] || 0;
      const words = (r.feel?.[z.key] || []).slice(0, 6);
      const zone = h(opts.tally ? 'button' : 'div', {
        class: `pl-zone z-${z.key}`, style: { '--fill': String(0.16 + 0.84 * (c / max)) },
        title: opts.tally ? 'Add one' : null, onclick: opts.tally ? () => opts.onTally(z.key, 1) : null,
      },
      h('span', { class: 'pl-zone-name' }, tr(z.name, L)),
      h('span', { class: 'pl-zone-desc' }, tr(z.desc, L, '\n')),
      h('span', { class: 'pl-zone-count' }, String(c), total ? h('small', {}, ` ${pct(c, total)}%`) : null),
      words.length ? h('span', { class: 'pl-zone-words' }, words.map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(' · ')) : null);
      return h('div', { class: 'pl-zone-wrap' }, zone,
        opts.tally ? h('button', { class: 'pl-minus', 'aria-label': `Take one from ${z.name.en}`, title: 'Take one away', disabled: !c, onclick: () => opts.onTally(z.key, -1) }, icon('minus')) : null);
    })),
    h('div', { class: 'pl-axis-x' }, tr({ en: 'More pleasant', zh: '越愉快' }, L), ' →'));
}

// A word cloud that lays itself out again whenever its box changes size.
// onWord(key) makes the words clickable (to hide them).
function cloudChart(words, onWord, observers) {
  const box = h('div', { class: 'pl-cloud' });
  if (!words.length) {
    box.append(h('p', { class: 'pl-empty muted' }, 'No words yet · 还没有回答'));
    return box;
  }
  const draw = () => {
    const W = box.clientWidth, H = box.clientHeight;
    const placed = wc.layout(words, W, H, cloudFont());
    box.replaceChildren(...placed.map((p) => h(onWord ? 'button' : 'span', {
      class: `pl-word c${p.rank % 6}` + (p.rank < 3 ? ' top' : ''),
      style: { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px`, fontSize: `${p.size}px` },
      title: onWord ? `${p.count} × · click to hide` : `${p.count} ×`,
      onclick: onWord ? () => onWord(p.key) : null,
    }, p.key)));
    if (placed.length < words.length) box.append(h('span', { class: 'pl-more muted' }, `+${words.length - placed.length} more`));
  };
  let last = '';
  const ro = new ResizeObserver(() => {
    const k = `${box.clientWidth}x${box.clientHeight}`;
    if (k !== last && box.clientWidth) { last = k; draw(); }
  });
  ro.observe(box);
  observers.push(ro);
  return box;
}

export default {
  type: 'poll',
  title: 'Poll',
  icon: 'chart-bar',
  tone: 'people', // dock tile colour: time | people | signal | content
  size: { w: 760, h: 520 },
  minSize: { w: 400, h: 320 },
  // Shared board files keep the set-up but never answers, names or results.
  share: (st) => ({ mode: st.mode, lang: st.lang, names: st.names, question: st.question, low: st.low, high: st.high, split: st.split }),

  mount(body, ctx) {
    const st = ctx.state;
    if (!st.mode) ctx.save({ mode: 'likert', lang: 'both', names: 'none', question: '', low: '', high: '', split: false, run: null, answers: [], tally: null });
    if (!Array.isArray(st.answers)) ctx.save({ answers: [] });

    const root = h('div', { class: 'pl' });
    body.append(root);
    let pollTimer = null;
    let busy = '';
    let error = '';
    let alive = true;
    let observers = [];
    let showHiddenList = false;

    const cls = () => ctx.store.getClass(st.classId) || ctx.store.getActiveClass();
    const classKey = () => cls()?.id || 'general';
    const run = () => st.run;

    // ---------- Google ----------
    function googleChip() {
      const s = google.status();
      if (s.connected) {
        return h('span', { class: 'rt-google ok', title: `Signed in as ${s.email || 'Google account'} for about ${s.minutesLeft} more minutes` },
          icon('check'), s.email ? s.email.replace(/@.*/, '') : 'Google');
      }
      return h('button', { class: 'btn small with-icon', onclick: connect }, icon('link'), run()?.formId ? 'Reconnect Google' : 'Connect Google');
    }

    async function connect() {
      error = '';
      busy = 'Waiting for Google…';
      render();
      try { await google.connect(); } catch (e) { error = e.message; }
      busy = '';
      render();
      syncPolling();
    }

    // ---------- Starting ----------
    function formItems(r) {
      const L = r.lang;
      const items = [];
      const text = (key, title, required, description) => items.push({ key, item: { title, ...(description ? { description } : {}),
        questionItem: { question: { required, textQuestion: { paragraph: false } } } } });
      if (r.names === 'sheet') text('name', tr(NAME_Q, L, ' '), true);
      if (r.mode === 'likert') {
        items.push({ key: 'value', item: { title: r.question, questionItem: { question: { required: true,
          scaleQuestion: { low: 1, high: 5, lowLabel: r.low, highLabel: r.high } } } } });
      } else if (r.mode === 'mood') {
        items.push({ key: 'value', item: { title: r.question, questionItem: { question: { required: true,
          choiceQuestion: { type: 'RADIO', options: ZONES.map((z) => ({ value: zoneText(z, L) })) } } } } });
        text('feel', tr(FEEL, L, ' '), false);
      } else {
        text('value', r.question, true, tr({ en: 'One word or a short phrase', zh: '一个词或短语' }, L, ' · '));
      }
      return items;
    }

    async function start(withDevices) {
      error = '';
      const L = st.lang;
      const c = cls();
      const r = {
        id: ctx.store.uid(), mode: st.mode, lang: L, names: st.names,
        question: (st.question || '').trim() || tr(MODES[st.mode].question, L, ' '),
        low: st.mode === 'likert' ? (st.low || '').trim() || tr(LOW, L, ' / ') : '',
        high: st.mode === 'likert' ? (st.high || '').trim() || tr(HIGH, L, ' / ') : '',
        split: !!st.split, classId: c?.id || null, classKey: classKey(), className: c?.name || 'All classes',
        source: withDevices ? 'devices' : 'hands', startedAt: new Date().toISOString(),
        formId: null, url: null, qmap: null, status: 'live', revealed: !withDevices,
        hidden: [], shown: [], saved: false, sheetUrl: null, logged: false,
      };
      if (withDevices) {
        if (!google.isConnected()) { await connect(); if (!google.isConnected()) return; }
        busy = 'Getting the class poll form ready…';
        render();
        try {
          const desc = [tr({ en: 'Your answer appears on your teacher’s board.', zh: '你的回答会显示在老师的白板上。' }, L, ' '),
            r.names === 'sheet' ? '' : tr({ en: 'Your name is not asked.', zh: '不需要填写姓名。' }, L, ' '),
            tr({ en: 'Seeing an old question? Reload this page.', zh: '看到的是旧问题？请刷新页面。' }, L, ' ')].filter(Boolean).join('\n');
          Object.assign(r, await gf.preparePollForm(r.classKey, r.className, {
            title: `${tr({ en: 'Class poll', zh: '课堂投票' }, L)} · ${r.className}`, description: desc, items: formItems(r),
          }));
        } catch (e) {
          busy = ''; error = `The form could not be got ready. ${e.message}`; render(); return;
        }
        busy = '';
      }
      ctx.save({ run: r, answers: [], tally: withDevices ? null : emptyTally(r.mode) });
      showHiddenList = false;
      render();
      syncPolling();
    }

    // ---------- Live answers ----------
    function syncPolling() {
      const should = alive && st.run?.status === 'live' && st.run.formId && google.isConnected();
      if (should && !pollTimer) { poll(); pollTimer = setInterval(poll, POLL_MS); }
      if (!should && pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    let polling = false;
    async function poll() {
      const r = st.run;
      if (!r?.formId || polling) return;
      polling = true;
      try {
        // Allow for a computer clock that runs a little fast; answers to
        // earlier polls are left out anyway, because their questions are gone.
        const since = new Date(new Date(r.startedAt).getTime() - 10 * 60_000).toISOString();
        const list = await gf.responses(r.formId, r.qmap, since);
        if (st.run !== r) return;
        const seen = new Set(st.answers.filter((a) => a.rid).map((a) => a.rid));
        const options = Object.fromEntries(ZONES.map((z) => [zoneText(z, r.lang), z.key]));
        const fresh = [];
        list.forEach((resp) => {
          if (seen.has(resp.id)) return;
          const a = resp.answers;
          let v = a.value;
          if (!v) return;
          if (r.mode === 'likert') { v = Number(v); if (!(v >= 1 && v <= 5)) return; }
          if (r.mode === 'mood') { v = options[v] || ZONES.find((z) => a.value.startsWith(z.dot))?.key; if (!v) return; }
          fresh.push({ rid: resp.id, time: resp.time, v, feel: a.feel || '', who: a.name || '', src: 'form' });
        });
        if (fresh.length) ctx.save({ answers: [...st.answers, ...fresh] });
        if (error && /Google|internet/.test(error)) error = '';
        render();
      } catch (e) {
        error = e.message;
        if (e.status === 401) syncPolling();
        render();
      } finally { polling = false; }
    }

    // ---------- Results ----------
    function counts() {
      const r = run();
      if (r.source === 'hands' && r.mode !== 'words') return st.tally || emptyTally(r.mode);
      const out = emptyTally(r.mode);
      st.answers.forEach((a) => {
        if (r.mode === 'likert') out[a.v - 1] += 1;
        else if (r.mode === 'mood' && a.v in out) out[a.v] += 1;
      });
      return out;
    }

    const isHidden = (k) => run().hidden.includes(k) || (wc.isRude(k) && !run().shown.includes(k));

    // Words (or mood feeling words) as [[key, n]], most first, hidden ones apart.
    function wordList(texts, split) {
      const all = [...wc.count(texts, split).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      return { shown: all.filter(([k]) => !isHidden(k)), hidden: all.filter(([k]) => isHidden(k)) };
    }

    function feelWords() {
      const out = {};
      ZONES.forEach((z) => { out[z.key] = wordList(st.answers.filter((a) => a.v === z.key && a.feel).map((a) => a.feel), false).shown; });
      return out;
    }

    function total() {
      const r = run();
      if (r.mode === 'words') return st.answers.length;
      const c = counts();
      return Array.isArray(c) ? c.reduce((a, b) => a + b, 0) : Object.values(c).reduce((a, b) => a + b, 0);
    }

    function result() {
      const r = run();
      const base = { mode: r.mode, lang: r.lang, low: r.low, high: r.high, n: total() };
      if (r.mode === 'words') return { ...base, counts: null, words: wordList(st.answers.map((a) => a.v), r.split).shown };
      return { ...base, counts: counts(), feel: r.mode === 'mood' ? feelWords() : null };
    }

    function tally(which, delta) {
      const t = structuredClone(st.tally || emptyTally(run().mode));
      t[which] = Math.max(0, (t[which] || 0) + delta);
      ctx.save({ tally: t });
      render();
    }

    function setWordHidden(key, hide) {
      const r = run();
      const hidden = r.hidden.filter((k) => k !== key);
      const shown = r.shown.filter((k) => k !== key);
      if (hide) hidden.push(key); else if (wc.isRude(key)) shown.push(key);
      ctx.save({ run: { ...r, hidden, shown } });
      render();
    }

    function addTyped(text) {
      if (!wc.tidy(text)) return;
      ctx.save({ answers: [...st.answers, { time: new Date().toISOString(), v: text.trim().slice(0, 80), feel: '', who: '', src: 'typed' }] });
      render();
    }

    // ---------- Ending, saving, history ----------
    async function end() {
      const r = run();
      if (!r) return;
      error = '';
      if (r.formId && google.isConnected()) {
        busy = 'Closing the form…';
        render();
        try { await gf.setAccepting(r.formId, false); } catch (e) { /* still finish */ }
        await poll();
      }
      ctx.save({ run: { ...st.run, status: 'ended', endedAt: new Date().toISOString() } });
      syncPolling();
      logResult();
      busy = '';
      render();
      if (google.isConnected()) await save();
    }

    function logResult() {
      const r = run();
      const res = result();
      if (!res.n) return;
      polls.add(r.classKey, {
        id: r.id, at: r.startedAt, mode: r.mode, lang: r.lang, question: r.question, low: r.low, high: r.high,
        source: r.source, n: res.n, counts: res.counts,
        words: r.mode === 'words' ? res.words.slice(0, 40) : null,
        feel: r.mode === 'mood' ? Object.fromEntries(Object.entries(res.feel).map(([k, v]) => [k, v.slice(0, 10)])) : null,
      });
      ctx.save({ run: { ...st.run, logged: true } });
    }

    function rows() {
      const r = run();
      const res = result();
      const head = [
        ['Poll 投票', tr(MODES[r.mode].name, 'both')], ['Question 问题', r.question], ['Class 班级', r.className],
        ['Started', fmt(r.startedAt)], ['Collected', r.source === 'devices' ? 'Student devices (Google Form)' : r.mode === 'words' ? 'Typed in by the teacher' : 'Counted by the teacher (hands)'],
        ['Answers', res.n],
      ];
      let table = [];
      if (r.mode === 'likert') {
        const avg = average(res.counts);
        head.push(['Average 平均', avg == null ? '' : Number(avg.toFixed(2))]);
        table = [['Rating', 'Label', 'Count', '%'], ...res.counts.map((c, i) => [i + 1, i === 0 ? r.low : i === 4 ? r.high : '', c, pct(c, res.n)])];
      } else if (r.mode === 'mood') {
        table = [['Zone', 'Description', 'Count', '%'], ...ZONES.map((z) => [tr(z.name, 'both'), tr(z.desc, 'both'), res.counts[z.key], pct(res.counts[z.key], res.n)])];
      } else {
        const w = wordList(st.answers.map((a) => a.v), r.split);
        table = [[r.split ? 'Word' : 'Word or phrase', 'Count', 'Hidden on board'], ...w.shown.map(([k, n]) => [k, n, '']), ...w.hidden.map(([k, n]) => [k, n, 'yes'])];
      }
      const answers = st.answers.length ? [
        [],
        ['Time', ...(r.names === 'sheet' ? ['Name'] : []), 'Answer', ...(r.mode === 'mood' ? ['Feeling word'] : []), 'Source'],
        ...st.answers.map((a) => [a.time ? fmt(a.time) : '', ...(r.names === 'sheet' ? [a.who] : []),
          r.mode === 'mood' ? tr(ZONES.find((z) => z.key === a.v)?.name, 'both') : a.v,
          ...(r.mode === 'mood' ? [a.feel] : []), a.src === 'form' ? 'Google Form' : 'Typed on board']),
      ] : [];
      return [...head, [], ...table, ...answers];
    }

    async function save() {
      const r = run();
      if (!r) return;
      if (!google.isConnected()) { render(); return; }
      busy = 'Saving to Google Sheets…';
      render();
      try {
        const d = new Date(r.startedAt);
        const tab = `${d.toLocaleDateString('en-CA')} ${d.toTimeString().slice(0, 5).replace(':', '.')} Poll ${MODES[r.mode].name.en}`;
        const url = await gf.saveToClassSheet(r.classKey, r.className, tab, rows());
        ctx.save({ run: { ...st.run, saved: true, sheetUrl: url } });
        ctx.toast('Poll saved to Google Sheets');
      } catch (e) {
        error = `Not saved to Sheets yet. ${e.message}`;
      }
      busy = '';
      render();
    }

    function downloadCsv() {
      const r = run();
      const d = new Date(r.startedAt);
      polls.downloadCsv(rows(), `xingtan-poll-${polls.asciiName(r.className)}-${d.toLocaleDateString('en-CA')}-${d.toTimeString().slice(0, 5).replace(':', '')}.csv`);
    }

    // ---------- Views ----------
    function modeCard(key) {
      const m = MODES[key];
      const on = st.mode === key;
      return h('button', { class: 'pl-mode' + (on ? ' active' : ''), 'aria-pressed': String(on), onclick: () => { ctx.save({ mode: key }); render(); } },
        icon(m.icon), h('strong', {}, tr(m.name, 'both', ' ')), h('span', { class: 'muted' }, tr(m.about, st.lang, '\n')));
    }

    function renderSetup() {
      const L = st.lang;
      const m = MODES[st.mode];
      const question = h('input', { type: 'text', class: 'input', value: st.question || '', maxlength: 200, placeholder: tr(m.question, L, ' ') });
      question.addEventListener('input', () => ctx.save({ question: question.value }));
      const extra = [];
      if (st.mode === 'likert') {
        const lab = (key, ph) => {
          const inp = h('input', { type: 'text', class: 'input', value: st[key] || '', maxlength: 60, placeholder: ph });
          inp.addEventListener('input', () => ctx.save({ [key]: inp.value }));
          return inp;
        };
        extra.push(h('div', { class: 'field' }, h('span', {}, 'End labels 两端说明'),
          h('div', { class: 'pl-ends-edit' }, h('span', { class: 'muted' }, '1 ='), lab('low', tr(LOW, L, ' / ')), h('span', { class: 'muted' }, '5 ='), lab('high', tr(HIGH, L, ' / ')))));
      }
      if (st.mode === 'mood') {
        extra.push(h('div', { class: 'pl-zone-preview' }, ...ZONES.map((z) => h('span', { class: `pl-zone-chip z-${z.key}` }, tr(z.name, L), h('small', {}, tr(z.eg, L, ' / '))))));
      }
      if (st.mode === 'words') {
        extra.push(h('div', { class: 'field' }, h('span', {}, 'Count 统计方式'),
          seg([[false, 'Whole answers 整个回答'], [true, 'Split into words 拆成词语']], !!st.split, (v) => { ctx.save({ split: v }); render(); }, 'Count')));
      }
      const sel = classSelect(ctx, () => st.classId, (id) => ctx.save({ classId: id }));
      const connected = google.isConnected();
      root.replaceChildren(h('div', { class: 'pl-setup' },
        h('div', { class: 'row space-between gap wrap' },
          h('strong', { class: 'pl-setup-title' }, 'New poll 新投票'),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn small with-icon', onclick: openHistory }, icon('history'), 'Past results'),
            googleChip())),
        h('div', { class: 'pl-modes' }, ...Object.keys(MODES).map(modeCard)),
        h('label', { class: 'field' }, h('span', {}, 'Question 问题'), question),
        ...extra,
        h('div', { class: 'rt-opts' },
          h('div', { class: 'field' }, h('span', {}, 'Language 语言'), seg(LANGS, L, (v) => { ctx.save({ lang: v }); render(); }, 'Language')),
          h('div', { class: 'field' }, h('span', {}, 'Names 姓名'), seg(NAMES, st.names, (v) => { ctx.save({ names: v }); render(); }, 'Names')),
          ctx.store.getClasses().length ? h('div', { class: 'field' }, h('span', {}, 'Class 班级'), sel.el) : null,
        ),
        error ? h('p', { class: 'error' }, error) : null,
        busy ? h('p', { class: 'muted' }, busy) : null,
        h('div', { class: 'row gap wrap rt-start' },
          h('button', { class: 'btn primary with-icon', disabled: !!busy, onclick: () => start(true) }, icon('qrcode'),
            connected ? 'Collect on devices' : 'Connect Google and collect on devices'),
          h('button', { class: 'btn with-icon', disabled: !!busy, onclick: () => start(false) }, icon(st.mode === 'words' ? 'pencil' : 'hand-click'),
            st.mode === 'words' ? 'Type answers in' : 'Count hands'),
        ),
        h('p', { class: 'muted small' },
          st.mode === 'likert' ? 'Count hands: students show 1–5 fingers (fist-to-five) and you tap each number to count them. '
            : st.mode === 'mood' ? 'Count hands: students point to a zone on the board and you tap each zone to count them. '
              : 'Type answers in: you or a scribe type what students call out. ',
          'Collect on devices: students scan a QR code and answer a Google Form. Each class keeps the same form and link, so a printed QR code works every time. ',
          'Results stay hidden until you show them.'),
      ));
    }

    function runBar() {
      const r = run();
      const live = r.status === 'live';
      const n = total();
      return h('div', { class: 'rt-bar' },
        h('div', { class: 'rt-title' },
          h('strong', {}, r.question),
          h('span', { class: 'muted' }, `${tr(MODES[r.mode].name, 'both', ' ')} · ${r.className} · ${r.source === 'devices' ? 'devices' : r.mode === 'words' ? 'typed' : 'hands'}`)),
        h('div', { class: 'row gap wrap' },
          h('span', { class: 'rt-count', title: 'Answers so far' }, `${n} answer${n === 1 ? '' : 's'}`),
          r.url && live ? h('button', { class: 'btn small with-icon', onclick: bigQr, title: 'Show the QR code large' }, icon('qrcode'), 'QR') : null,
          h('button', { class: 'btn small with-icon', onclick: () => { ctx.save({ run: { ...r, revealed: !r.revealed } }); render(); } },
            icon(r.revealed ? 'eye-off' : 'eye'), r.revealed ? 'Hide results' : 'Show results'),
          r.formId && live ? googleChip() : null,
          live && r.source === 'hands' && r.mode !== 'words' ? confirmButton('Reset', 'Reset counts?', () => { ctx.save({ tally: emptyTally(r.mode) }); render(); }, 'btn small') : null,
          live ? confirmButton(h('span', { class: 'with-icon' }, icon('player-stop'), 'End'), 'End the poll?', end, 'btn small danger') : null,
          !live ? h('button', { class: 'btn small with-icon', onclick: downloadCsv, title: 'Download this poll as a spreadsheet (CSV)' }, icon('download'), 'CSV') : null,
          !live ? h('button', { class: 'btn small primary', onclick: () => { ctx.save({ run: null, answers: [], tally: null }); render(); } }, 'New poll') : null,
        ));
    }

    function statusLine() {
      const r = run();
      if (busy) return h('p', { class: 'rt-status muted' }, busy);
      if (error) {
        return h('p', { class: 'rt-status error' }, error, ' ',
          r.status === 'ended' && !r.saved ? h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, 'Try again') : null);
      }
      if (r.status === 'ended') {
        if (r.saved) return h('p', { class: 'rt-status ok' }, icon('check'), ' Ended. Saved to Google Sheets and to this class’s past results. ', h('a', { href: r.sheetUrl, target: '_blank', rel: 'noopener' }, 'Open the Sheet'));
        return h('p', { class: 'rt-status muted' }, r.logged ? 'Ended. Kept in this class’s past results. ' : 'Ended. ',
          h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, 'Save to Google Sheets'));
      }
      if (r.formId && !google.isConnected()) return h('p', { class: 'rt-status warn' }, 'The Google sign-in has run out, so new answers are not arriving. Click Reconnect Google.');
      return null;
    }

    // While results are hidden: the question large, with the QR code.
    function renderCollect() {
      const r = run();
      const n = total();
      const showQr = r.url && r.status === 'live';
      return h('div', { class: 'rt-prompt pl-collect' + (showQr ? ' with-qr' : '') },
        h('div', { class: 'rt-prompt-main' },
          h('h2', { class: 'rt-prompt-title' }, r.question),
          r.mode === 'likert' ? h('p', { class: 'pl-collect-ends' }, `1 = ${r.low}`, h('br'), `5 = ${r.high}`) : null,
          r.mode === 'mood' ? h('div', { class: 'pl-zone-preview big' }, ...ZONES.map((z) => h('span', { class: `pl-zone-chip z-${z.key}` }, tr(z.name, r.lang), h('small', {}, tr(z.eg, r.lang, ' / '))))) : null,
          h('p', { class: 'pl-collect-count' }, h('strong', {}, String(n)), ` answer${n === 1 ? '' : 's'} · 已有 ${n} 个回答`),
          h('p', { class: 'muted small' }, 'Results are hidden. 结果暂不显示。 ',
            h('button', { class: 'link-btn', onclick: () => { ctx.save({ run: { ...r, revealed: true } }); render(); } }, 'Show results'))),
        showQr ? h('div', { class: 'rt-qr', onclick: bigQr, title: 'Show large' }, qrSvg(r.url), h('span', { class: 'muted small' }, 'Scan to answer · 扫码作答')) : null);
    }

    function renderResults() {
      const r = run();
      const live = r.status === 'live';
      const tallying = live && r.source === 'hands';
      const res = result();
      if (r.mode === 'likert') return h('div', { class: 'pl-main' }, likertChart(res, { tally: tallying, onTally: tally }));
      if (r.mode === 'mood') return h('div', { class: 'pl-main' }, moodChart(res, { tally: tallying, onTally: tally }));

      // Word cloud
      const { hidden } = wordList(st.answers.map((a) => a.v), r.split);
      const adder = h('input', { type: 'text', class: 'input pl-add', maxlength: 80, placeholder: '+ Type an answer and press Enter 输入回答' });
      adder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const v = adder.value; adder.value = ''; refocus = true; addTyped(v); }
        if (e.key === 'Escape') { adder.value = ''; adder.blur(); }
      });
      return h('div', { class: 'pl-main pl-words' },
        cloudChart(res.words, (k) => setWordHidden(k, true), observers),
        h('div', { class: 'pl-words-foot' },
          seg([[false, 'Whole answers'], [true, 'Split words']], !!r.split, (v) => { ctx.save({ run: { ...r, split: v } }); render(); }, 'Count'),
          hidden.length ? h('button', { class: 'link-btn', onclick: () => { showHiddenList = !showHiddenList; render(); } },
            showHiddenList ? 'Close the hidden list' : `${hidden.length} hidden`) : h('span', { class: 'muted small' }, 'Click a word to hide it'),
          live ? adder : null),
        showHiddenList && hidden.length ? h('div', { class: 'pl-hidden-list' },
          h('span', { class: 'muted small' }, 'Hidden words (click to show on the board again):'),
          ...hidden.map(([k, n]) => h('button', { class: 'chip', title: 'Show on the board again', onclick: () => setWordHidden(k, false) }, `${wc.mask(k)}${n > 1 ? ` ×${n}` : ''}`))) : null);
    }

    let refocus = false;
    function render() {
      if (!alive) return;
      observers.forEach((o) => o.disconnect());
      observers = [];
      if (!st.run) { renderSetup(); return; }
      const active = document.activeElement;
      const typing = active?.classList?.contains('pl-add') && root.contains(active);
      const draft = typing ? active.value : '';
      root.replaceChildren(runBar(), statusLine() || '', st.run.revealed ? renderResults() : renderCollect());
      if (typing || refocus) {
        const box = root.querySelector('.pl-add');
        if (box) { box.value = typing ? draft : ''; box.focus(); }
      }
      refocus = false;
    }

    function bigQr() {
      const r = run();
      if (!r?.url) return;
      openModal('Scan to answer · 扫码作答', (mb) => {
        mb.append(h('div', { class: 'rt-qr-big' }, qrSvg(r.url)),
          h('p', { class: 'center-text' }, `${tr({ en: 'Class poll', zh: '课堂投票' }, 'both')} · ${r.className}`),
          h('p', { class: 'muted small center-text' }, 'This class keeps the same link for every poll, so you can print the QR code and put it up in the classroom.'),
          h('div', { class: 'row center gap' }, h('button', { class: 'btn with-icon', onclick: () => printQr(r.url, r.className) }, icon('download'), 'Print the QR code')),
          h('p', { class: 'muted small center-text rt-link' }, r.url));
      });
    }

    function printQr(url, className) {
      const w = window.open('', '_blank', 'width=700,height=900');
      if (!w) { ctx.toast('The browser blocked the print window. Allow pop-ups for this site.'); return; }
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Class poll · ${esc(className)}</title>
        <style>body{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;text-align:center;padding:40px}
        .qr svg{width:70vmin;height:70vmin}h1{margin:0 0 8px;font-size:40px}p{font-size:22px;color:#444}</style></head>
        <body><h1>Class poll · 课堂投票</h1><p>${esc(className)}</p><div class="qr">${qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true })}</div>
        <p>Scan to answer · 扫码作答</p><script>setTimeout(()=>print(),300)<\/script></body></html>`);
      w.document.close();
    }

    // ---------- Past results ----------
    function openHistory() {
      let key = classKey();
      let open = null; // id of the entry shown as a chart
      let obs = [];
      openModal('Past results 历史记录', (mb) => {
        const draw = () => {
          obs.forEach((o) => o.disconnect()); obs = [];
          const list = polls.list(key).slice().reverse();
          const sel = classSelect(ctx, () => (key === 'general' ? null : key), (id) => { key = id; open = null; draw(); });
          const allCsv = () => {
            const name = ctx.store.getClass(key)?.name || 'All classes';
            polls.downloadCsv([
              ['Date', 'Time', 'Type', 'Question', 'Collected', 'Answers', 'Average (1–5)', '1', '2', '3', '4', '5', 'Red 红', 'Yellow 黄', 'Blue 蓝', 'Green 绿', 'Top words'],
              ...polls.list(key).map((e) => {
                const d = new Date(e.at);
                return [d.toLocaleDateString('en-CA'), d.toTimeString().slice(0, 5), MODES[e.mode]?.name.en || e.mode, e.question,
                  e.source === 'devices' ? 'devices' : 'hands/typed', e.n,
                  e.mode === 'likert' ? Number((average(e.counts) || 0).toFixed(2)) : '',
                  ...(e.mode === 'likert' ? e.counts : ['', '', '', '', '']),
                  ...ZONES.map((z) => (e.mode === 'mood' ? e.counts[z.key] || 0 : '')),
                  (e.words || []).slice(0, 10).map(([w, n]) => `${w} (${n})`).join('; ')];
              }),
            ], `xingtan-polls-${polls.asciiName(name)}-${new Date().toLocaleDateString('en-CA')}.csv`);
          };
          mb.replaceChildren(...[
            h('div', { class: 'row gap wrap space-between' },
              ctx.store.getClasses().length ? sel.el : h('span', { class: 'muted' }, 'All classes'),
              list.length ? h('button', { class: 'btn small with-icon', onclick: allCsv }, icon('download'), 'Download all (CSV)') : null),
            list.length ? null : h('p', { class: 'muted' }, 'No finished polls for this class yet. Results are kept here when a poll ends.'),
            h('div', { class: 'pl-history' }, ...list.map((e) => {
              const row = h('div', { class: 'pl-hist-row' + (open === e.id ? ' open' : '') },
                h('button', { class: 'pl-hist-main', onclick: () => { open = open === e.id ? null : e.id; draw(); } },
                  icon(MODES[e.mode]?.icon || 'chart-bar'),
                  h('span', { class: 'pl-hist-text' }, h('strong', {}, e.question), h('span', { class: 'muted small' }, `${fmtDay(e.at)} · ${e.n} answer${e.n === 1 ? '' : 's'} · ${summary(e)}`))),
                confirmButton(icon('x'), 'Delete?', () => { polls.remove(key, e.id); draw(); }, 'btn small', { title: 'Delete this result', 'aria-label': 'Delete this result' }));
              if (open !== e.id) return row;
              const res = { ...e, words: e.words || [], feel: e.feel || null };
              const chart = e.mode === 'likert' ? likertChart(res) : e.mode === 'mood' ? moodChart(res) : cloudChart(res.words, null, obs);
              return h('div', {}, row, h('div', { class: 'pl-hist-chart' }, chart));
            })),
            list.length ? h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
              confirmButton('Clear this class’s history', 'Click again to clear', () => { polls.clear(key); open = null; draw(); }, 'btn small danger')) : null,
          ].filter(Boolean));
        };
        draw();
      });
    }

    const offGoogle = google.onChange(() => { syncPolling(); render(); });
    const offClasses = ctx.onClassesChange(() => { if (!st.run) render(); });
    render();
    syncPolling();
    return { destroy() { alive = false; clearInterval(pollTimer); observers.forEach((o) => o.disconnect()); offGoogle(); offClasses(); } };
  },
};
