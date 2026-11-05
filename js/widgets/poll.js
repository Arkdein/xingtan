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
import { t, getLang, locale } from '../i18n.js';

const POLL_MS = 5000;
// Option labels stay in English here and go through t() where they are shown.
// 'English' and '中文' are in their own script and are not translated.
const LANGS = [['en', 'English'], ['zh', '中文'], ['both', 'Both']];
const NAMES = [['none', 'Anonymous'], ['sheet', 'Ask names (Sheet only)']];
const tOpts = (options, keep = []) => options.map(([v, text]) => [v, keep.includes(v) ? text : t(text)]);
// Space between sentences: none after Chinese full stops.
const sp = () => (getLang() === 'zh' ? '' : ' ');

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
const SCAN = { en: 'Scan to answer', zh: '扫码作答' };

const emptyTally = (mode) => (mode === 'likert' ? [0, 0, 0, 0, 0] : mode === 'mood' ? { red: 0, yellow: 0, blue: 0, green: 0 } : null);
const fmt = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
const answersText = (n) => (n === 1 ? t('{n} answer', { n }) : t('{n} answers', { n }));
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
  if (e.mode === 'likert') { const a = average(e.counts); return a == null ? '–' : t('Average {n}', { n: a.toFixed(1) }); }
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
        class: 'pl-col', title: opts.tally ? t('Add one to {n}', { n: i + 1 }) : null,
        'aria-label': opts.tally ? t('{n}: {c}. Add one', { n: i + 1, c }) : null,
        onclick: opts.tally ? () => opts.onTally(i, 1) : null,
      },
      h('span', { class: 'pl-col-val' }, String(c), total ? h('small', {}, ` ${pct(c, total)}%`) : null),
      h('span', { class: 'pl-col-track' }, h('span', { class: `pl-col-bar s${i + 1}`, style: { height: `${(c / max) * 100}%` } })),
      h('span', { class: 'pl-col-num' }, String(i + 1)));
      return h('div', { class: 'pl-col-wrap' }, col,
        opts.tally ? h('button', { class: 'pl-minus', 'aria-label': t('Take one from {n}', { n: i + 1 }), title: t('Take one away'), disabled: !c, onclick: () => opts.onTally(i, -1) }, icon('minus')) : null);
    })),
    h('div', { class: 'pl-ends' }, h('span', {}, `1 = ${low}`), h('span', {}, `5 = ${high}`)),
    // Shown on the board for students, so it follows the poll's own language.
    h('div', { class: 'pl-sum' },
      h('strong', {}, avg == null ? '–' : avg.toFixed(1)), h('span', { class: 'muted' }, ` ${tr({ en: 'average', zh: '平均' }, r.lang, ' ')} · ${tr({ en: `${total} answer${total === 1 ? '' : 's'}`, zh: `${total} 个回答` }, r.lang)}`)));
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
        title: opts.tally ? t('Add one') : null, onclick: opts.tally ? () => opts.onTally(z.key, 1) : null,
      },
      h('span', { class: 'pl-zone-name' }, tr(z.name, L)),
      h('span', { class: 'pl-zone-desc' }, tr(z.desc, L, '\n')),
      h('span', { class: 'pl-zone-count' }, String(c), total ? h('small', {}, ` ${pct(c, total)}%`) : null),
      words.length ? h('span', { class: 'pl-zone-words' }, words.map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(' · ')) : null);
      return h('div', { class: 'pl-zone-wrap' }, zone,
        opts.tally ? h('button', { class: 'pl-minus', 'aria-label': t('Take one from {n}', { n: tr(z.name, getLang()) }), title: t('Take one away'), disabled: !c, onclick: () => opts.onTally(z.key, -1) }, icon('minus')) : null);
    })),
    h('div', { class: 'pl-axis-x' }, tr({ en: 'More pleasant', zh: '越愉快' }, L), ' →'));
}

// A word cloud that lays itself out again whenever its box changes size.
// onWord(key) makes the words clickable (to hide them). L is the poll's own
// language (for the empty message students see on the board).
function cloudChart(words, onWord, observers, L = 'both') {
  const box = h('div', { class: 'pl-cloud' });
  if (!words.length) {
    box.append(h('p', { class: 'pl-empty muted' }, tr({ en: 'No words yet', zh: '还没有回答' }, L)));
    return box;
  }
  const draw = () => {
    const W = box.clientWidth, H = box.clientHeight;
    const placed = wc.layout(words, W, H, cloudFont());
    box.replaceChildren(...placed.map((p) => h(onWord ? 'button' : 'span', {
      class: `pl-word c${p.rank % 6}` + (p.rank < 3 ? ' top' : ''),
      style: { left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, height: `${p.h}px`, fontSize: `${p.size}px` },
      title: onWord ? t('{n} × · click to hide', { n: p.count }) : `${p.count} ×`,
      onclick: onWord ? () => onWord(p.key) : null,
    }, p.key)));
    if (placed.length < words.length) box.append(h('span', { class: 'pl-more muted' }, t('+{n} more', { n: words.length - placed.length })));
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
  // Closed for good (or its board deleted) while a device poll was still open:
  // stop the form taking answers, now or as soon as Google is connected.
  closed: (st) => { if (st.run?.status === 'live' && st.run.formId) gf.closeLater(st.run.formId); },

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
        return h('span', { class: 'rt-google ok', title: t('Signed in as {email} for about {n} more minutes', { email: s.email || t('Google account'), n: s.minutesLeft }) },
          icon('check'), s.email ? s.email.replace(/@.*/, '') : 'Google');
      }
      return h('button', { class: 'btn small with-icon', onclick: connect }, icon('link'), run()?.formId ? t('Reconnect Google') : t('Connect Google'));
    }

    async function connect() {
      error = '';
      busy = t('Waiting for Google…');
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
        busy = t('Getting the class poll form ready…');
        render();
        try {
          const desc = [tr({ en: 'Your answer appears on your teacher’s board.', zh: '你的回答会显示在老师的白板上。' }, L, ' '),
            r.names === 'sheet' ? '' : tr({ en: 'Your name is not asked.', zh: '不需要填写姓名。' }, L, ' '),
            tr({ en: 'Seeing an old question? Reload this page.', zh: '看到的是旧问题？请刷新页面。' }, L, ' ')].filter(Boolean).join('\n');
          Object.assign(r, await gf.preparePollForm(r.classKey, r.className, {
            title: `${tr({ en: 'Class poll', zh: '课堂投票' }, L)} · ${r.className}`, description: desc, items: formItems(r),
          }));
        } catch (e) {
          busy = ''; error = t('The form could not be got ready. {msg}', { msg: e.message }); render(); return;
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
      const next = structuredClone(st.tally || emptyTally(run().mode));
      next[which] = Math.max(0, (next[which] || 0) + delta);
      ctx.save({ tally: next });
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
      // The form has to be closed, so sign in again if the hour has run out.
      if (r.formId && !google.isConnected()) await connect();
      if (r.formId && google.isConnected()) {
        busy = t('Closing the form…');
        render();
        try { await gf.setAccepting(r.formId, false); } catch (e) { gf.closeLater(r.formId); }
        await poll();
      } else if (r.formId) {
        gf.closeLater(r.formId);
        error = t('Ended. The form will stop taking answers as soon as Google is connected again.');
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
      // A spreadsheet for the teacher, so its headings and labels follow the app language.
      const UL = getLang();
      const head = [
        [t('Poll'), tr(MODES[r.mode].name, UL)], [t('Question'), r.question], [t('Class'), r.classId ? r.className : t('All classes')],
        [t('Started'), fmt(r.startedAt)], [t('Collected'), r.source === 'devices' ? t('Student devices (Google Form)') : r.mode === 'words' ? t('Typed in by the teacher') : t('Counted by the teacher (hands)')],
        [t('Number of answers'), res.n],
      ];
      let table = [];
      if (r.mode === 'likert') {
        const avg = average(res.counts);
        head.push([t('Average'), avg == null ? '' : Number(avg.toFixed(2))]);
        table = [[t('Rating'), t('Scale label'), t('Count'), '%'], ...res.counts.map((c, i) => [i + 1, i === 0 ? r.low : i === 4 ? r.high : '', c, pct(c, res.n)])];
      } else if (r.mode === 'mood') {
        table = [[t('Zone'), t('Description'), t('Count'), '%'], ...ZONES.map((z) => [tr(z.name, UL), tr(z.desc, UL), res.counts[z.key], pct(res.counts[z.key], res.n)])];
      } else {
        const w = wordList(st.answers.map((a) => a.v), r.split);
        table = [[r.split ? t('Word') : t('Word or phrase'), t('Count'), t('Hidden on board')], ...w.shown.map(([k, n]) => [k, n, '']), ...w.hidden.map(([k, n]) => [k, n, t('yes')])];
      }
      const answers = st.answers.length ? [
        [],
        [t('Time'), ...(r.names === 'sheet' ? [t('Name')] : []), t('Answer'), ...(r.mode === 'mood' ? [t('Feeling word')] : []), t('Source')],
        ...st.answers.map((a) => [a.time ? fmt(a.time) : '', ...(r.names === 'sheet' ? [a.who] : []),
          r.mode === 'mood' ? tr(ZONES.find((z) => z.key === a.v)?.name, UL) : a.v,
          ...(r.mode === 'mood' ? [a.feel] : []), a.src === 'form' ? 'Google Form' : t('Typed on board')]),
      ] : [];
      return [...head, [], ...table, ...answers];
    }

    async function save() {
      const r = run();
      if (!r) return;
      if (!google.isConnected()) { render(); return; }
      busy = t('Saving to Google Sheets…');
      render();
      try {
        const d = new Date(r.startedAt);
        const tab = `${d.toLocaleDateString('en-CA')} ${d.toTimeString().slice(0, 5).replace(':', '.')} Poll ${MODES[r.mode].name.en}`;
        const url = await gf.saveToClassSheet(r.classKey, r.className, tab, rows());
        ctx.save({ run: { ...st.run, saved: true, sheetUrl: url } });
        ctx.toast(t('Poll saved to Google Sheets'));
      } catch (e) {
        error = t('Not saved to Sheets yet. {msg}', { msg: e.message });
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
        icon(m.icon), h('strong', {}, tr(m.name, getLang(), ' ')), h('span', { class: 'muted' }, tr(m.about, getLang(), '\n')));
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
        extra.push(h('div', { class: 'field' }, h('span', {}, t('End labels')),
          h('div', { class: 'pl-ends-edit' }, h('span', { class: 'muted' }, '1 ='), lab('low', tr(LOW, L, ' / ')), h('span', { class: 'muted' }, '5 ='), lab('high', tr(HIGH, L, ' / ')))));
      }
      if (st.mode === 'mood') {
        extra.push(h('div', { class: 'pl-zone-preview' }, ...ZONES.map((z) => h('span', { class: `pl-zone-chip z-${z.key}` }, tr(z.name, L), h('small', {}, tr(z.eg, L, ' / '))))));
      }
      if (st.mode === 'words') {
        extra.push(h('div', { class: 'field' }, h('span', {}, t('Count by')),
          seg([[false, t('Whole answers')], [true, t('Split into words')]], !!st.split, (v) => { ctx.save({ split: v }); render(); }, t('Count by'))));
      }
      const sel = classSelect(ctx, () => st.classId, (id) => ctx.save({ classId: id }));
      const connected = google.isConnected();
      root.replaceChildren(h('div', { class: 'pl-setup' },
        h('div', { class: 'row space-between gap wrap' },
          h('strong', { class: 'pl-setup-title' }, t('New poll')),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn small with-icon', onclick: openHistory }, icon('history'), t('Past results')),
            googleChip())),
        h('div', { class: 'pl-modes' }, ...Object.keys(MODES).map(modeCard)),
        h('label', { class: 'field' }, h('span', {}, t('Question')), question),
        ...extra,
        h('div', { class: 'rt-opts' },
          h('div', { class: 'field' }, h('span', {}, t('Language')), seg(tOpts(LANGS, ['en', 'zh']), L, (v) => { ctx.save({ lang: v }); render(); }, t('Language'))),
          h('div', { class: 'field' }, h('span', {}, t('Names')), seg(tOpts(NAMES), st.names, (v) => { ctx.save({ names: v }); render(); }, t('Names'))),
          ctx.store.getClasses().length ? h('div', { class: 'field' }, h('span', {}, t('Class')), sel.el) : null,
        ),
        error ? h('p', { class: 'error' }, error) : null,
        busy ? h('p', { class: 'muted' }, busy) : null,
        h('div', { class: 'row gap wrap rt-start' },
          h('button', { class: 'btn primary with-icon', disabled: !!busy, onclick: () => start(true) }, icon('qrcode'),
            connected ? t('Collect on devices') : t('Connect Google and collect on devices')),
          h('button', { class: 'btn with-icon', disabled: !!busy, onclick: () => start(false) }, icon(st.mode === 'words' ? 'pencil' : 'hand-click'),
            st.mode === 'words' ? t('Type answers in') : t('Count hands')),
        ),
        h('p', { class: 'muted small' },
          st.mode === 'likert' ? t('Count hands: students show 1–5 fingers (fist-to-five) and you tap each number to count them.')
            : st.mode === 'mood' ? t('Count hands: students point to a zone on the board and you tap each zone to count them.')
              : t('Type answers in: you or a scribe type what students call out.'),
          sp(),
          t('Collect on devices: students scan a QR code and answer a Google Form. Each class keeps the same form and link, so a printed QR code works every time.'),
          sp(),
          t('On devices, results stay hidden until you show them.')),
      ));
    }

    function runBar() {
      const r = run();
      const live = r.status === 'live';
      const n = total();
      return h('div', { class: 'rt-bar' },
        h('div', { class: 'rt-title' },
          h('strong', {}, r.question),
          h('span', { class: 'muted' }, `${tr(MODES[r.mode].name, getLang(), ' ')} · ${r.classId ? r.className : t('All classes')} · ${r.source === 'devices' ? t('devices') : r.mode === 'words' ? t('typed') : t('hands')}`)),
        h('div', { class: 'row gap wrap' },
          h('span', { class: 'rt-count', title: t('Answers so far') }, answersText(n)),
          r.url && live ? h('button', { class: 'btn small with-icon', onclick: bigQr, title: t('Show the QR code large') }, icon('qrcode'), 'QR') : null,
          h('button', { class: 'btn small with-icon', onclick: () => { ctx.save({ run: { ...r, revealed: !r.revealed } }); render(); } },
            icon(r.revealed ? 'eye-off' : 'eye'), r.revealed ? t('Hide results') : t('Show results')),
          r.formId && live ? googleChip() : null,
          live && r.source === 'hands' && r.mode !== 'words' ? confirmButton(t('Reset'), t('Reset counts?'), () => { ctx.save({ tally: emptyTally(r.mode) }); render(); }, 'btn small') : null,
          live ? confirmButton(h('span', { class: 'with-icon' }, icon('player-stop'), t('End')), t('End the poll?'), end, 'btn small danger') : null,
          !live ? h('button', { class: 'btn small with-icon', onclick: downloadCsv, title: t('Download this poll as a spreadsheet (CSV)') }, icon('download'), 'CSV') : null,
          !live ? h('button', { class: 'btn small primary', onclick: () => { ctx.save({ run: null, answers: [], tally: null }); render(); } }, t('New poll')) : null,
        ));
    }

    function statusLine() {
      const r = run();
      if (busy) return h('p', { class: 'rt-status muted' }, busy);
      if (error) {
        return h('p', { class: 'rt-status error' }, error, ' ',
          r.status === 'ended' && !r.saved ? h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, t('Try again')) : null);
      }
      if (r.status === 'ended') {
        if (r.saved) return h('p', { class: 'rt-status ok' }, icon('check'), ' ', t('Ended. Saved to Google Sheets and to this class’s past results.'), ' ', h('a', { href: r.sheetUrl, target: '_blank', rel: 'noopener' }, t('Open the Sheet')));
        return h('p', { class: 'rt-status muted' }, r.logged ? t('Ended. Kept in this class’s past results.') : t('Ended.'), ' ',
          h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, t('Save to Google Sheets')));
      }
      if (r.formId && !google.isConnected()) return h('p', { class: 'rt-status warn' }, t('The Google sign-in has run out, so new answers are not arriving. Click Reconnect Google.'));
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
          // What students read on the board follows the poll's own language;
          // the teacher's button follows the app language.
          h('p', { class: 'pl-collect-count' }, h('strong', {}, String(n)),
            r.lang === 'zh' ? ' 个回答' : r.lang === 'en' ? ` answer${n === 1 ? '' : 's'}` : ` answer${n === 1 ? '' : 's'} · 已有 ${n} 个回答`),
          h('p', { class: 'muted small' }, tr({ en: 'Results are hidden.', zh: '结果暂不显示。' }, r.lang, ' '), ' ',
            h('button', { class: 'link-btn', onclick: () => { ctx.save({ run: { ...r, revealed: true } }); render(); } }, t('Show results')))),
        showQr ? h('div', { class: 'rt-qr', onclick: bigQr, title: t('Show large') }, qrSvg(r.url), h('span', { class: 'muted small' }, tr(SCAN, r.lang))) : null);
    }

    function renderResults() {
      const r = run();
      const live = r.status === 'live';
      const tallying = live && r.source === 'hands';
      const res = result();
      if (r.mode === 'likert') return h('div', { class: 'pl-main' }, likertChart(res, { tally: tallying, onTally: tally }));
      if (r.mode === 'mood') {
        // Feeling words hidden as rude can be put back, as in the word cloud.
        const { hidden: hiddenFeel } = wordList(st.answers.filter((a) => a.feel).map((a) => a.feel), false);
        return h('div', { class: 'pl-main' }, moodChart(res, { tally: tallying, onTally: tally }),
          hiddenFeel.length ? h('div', { class: 'pl-words-foot' },
            h('button', { class: 'link-btn', onclick: () => { showHiddenList = !showHiddenList; render(); } },
              showHiddenList ? t('Close the hidden list') : t('{n} hidden', { n: hiddenFeel.length }))) : null,
          showHiddenList && hiddenFeel.length ? h('div', { class: 'pl-hidden-list' },
            h('span', { class: 'muted small' }, t('Hidden words (click to show on the board again):')),
            ...hiddenFeel.map(([k, n]) => h('button', { class: 'chip', title: t('Show on the board again'), onclick: () => setWordHidden(k, false) }, `${wc.mask(k)}${n > 1 ? ` ×${n}` : ''}`))) : null);
      }

      // Word cloud
      const { hidden } = wordList(st.answers.map((a) => a.v), r.split);
      const adder = h('input', { type: 'text', class: 'input pl-add', maxlength: 80, placeholder: t('+ Type an answer and press Enter') });
      adder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const v = adder.value; adder.value = ''; refocus = true; addTyped(v); }
        if (e.key === 'Escape') { adder.value = ''; adder.blur(); }
      });
      return h('div', { class: 'pl-main pl-words' },
        cloudChart(res.words, (k) => setWordHidden(k, true), observers, r.lang),
        h('div', { class: 'pl-words-foot' },
          seg([[false, t('Whole answers')], [true, t('Split words')]], !!r.split, (v) => { ctx.save({ run: { ...r, split: v } }); render(); }, t('Count by')),
          hidden.length ? h('button', { class: 'link-btn', onclick: () => { showHiddenList = !showHiddenList; render(); } },
            showHiddenList ? t('Close the hidden list') : t('{n} hidden', { n: hidden.length })) : h('span', { class: 'muted small' }, t('Click a word to hide it')),
          live ? adder : null),
        showHiddenList && hidden.length ? h('div', { class: 'pl-hidden-list' },
          h('span', { class: 'muted small' }, t('Hidden words (click to show on the board again):')),
          ...hidden.map(([k, n]) => h('button', { class: 'chip', title: t('Show on the board again'), onclick: () => setWordHidden(k, false) }, `${wc.mask(k)}${n > 1 ? ` ×${n}` : ''}`))) : null);
    }

    // Chip when minimised: whether the poll is open and how many have answered.
    const miniPoll = h('span', { class: 'mini-poll mini-end' });
    function renderMini() {
      const r = st.run;
      if (!r) { ctx.setMiniControls?.(); return; }
      const live = r.status === 'live';
      miniPoll.replaceChildren(h('span', { class: 'mini-dot' + (live ? ' live' : '') }),
        h('span', { class: 'mini-text' }, `${live ? t('Poll open') : t('Poll ended')} · ${answersText(total())}`));
      miniPoll.title = r.question || '';
      ctx.setMiniControls?.(miniPoll);
    }

    let refocus = false;
    function render() {
      if (!alive) return;
      renderMini();
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
      // Shown large for students to scan, so the title follows the poll's own language.
      openModal(tr(SCAN, r.lang), (mb) => {
        mb.append(h('div', { class: 'rt-qr-big' }, qrSvg(r.url)),
          h('p', { class: 'center-text' }, `${tr({ en: 'Class poll', zh: '课堂投票' }, 'both')} · ${r.className}`),
          h('p', { class: 'muted small center-text' }, t('This class keeps the same link for every poll, so you can print the QR code and put it up in the classroom.')),
          h('div', { class: 'row center gap' }, h('button', { class: 'btn with-icon', onclick: () => printQr(r.url, r.className) }, icon('download'), t('Print the QR code'))),
          h('p', { class: 'muted small center-text rt-link' }, r.url));
      });
    }

    function printQr(url, className) {
      const w = window.open('', '_blank', 'width=700,height=900');
      if (!w) { ctx.toast(t('The browser blocked the print window. Allow pop-ups for this site.')); return; }
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
      openModal(t('Past results'), (mb) => {
        const draw = () => {
          obs.forEach((o) => o.disconnect()); obs = [];
          const list = polls.list(key).slice().reverse();
          const sel = classSelect(ctx, () => (key === 'general' ? null : key), (id) => { key = id; open = null; draw(); });
          const allCsv = () => {
            const name = ctx.store.getClass(key)?.name || 'All classes'; // for the file name
            const UL = getLang();
            polls.downloadCsv([
              [t('Date'), t('Time'), t('Type'), t('Question'), t('Collected'), t('Number of answers'), t('Average (1–5)'), '1', '2', '3', '4', '5',
                ...ZONES.map((z) => tr(z.name, UL)), t('Top words')],
              ...polls.list(key).map((e) => {
                const d = new Date(e.at);
                // Date as YYYY-MM-DD (en-CA) so spreadsheets sort it.
                return [d.toLocaleDateString('en-CA'), d.toTimeString().slice(0, 5), MODES[e.mode] ? tr(MODES[e.mode].name, UL) : e.mode, e.question,
                  e.source === 'devices' ? t('devices') : t('hands/typed'), e.n,
                  e.mode === 'likert' ? Number((average(e.counts) || 0).toFixed(2)) : '',
                  ...(e.mode === 'likert' ? e.counts : ['', '', '', '', '']),
                  ...ZONES.map((z) => (e.mode === 'mood' ? e.counts[z.key] || 0 : '')),
                  (e.words || []).slice(0, 10).map(([w, n]) => `${w} (${n})`).join('; ')];
              }),
            ], `xingtan-polls-${polls.asciiName(name)}-${new Date().toLocaleDateString('en-CA')}.csv`);
          };
          mb.replaceChildren(...[
            h('div', { class: 'row gap wrap space-between' },
              ctx.store.getClasses().length ? sel.el : h('span', { class: 'muted' }, t('All classes')),
              list.length ? h('button', { class: 'btn small with-icon', onclick: allCsv }, icon('download'), t('Download all (CSV)')) : null),
            list.length ? null : h('p', { class: 'muted' }, t('No finished polls for this class yet. Results are kept here when a poll ends.')),
            h('div', { class: 'pl-history' }, ...list.map((e) => {
              const row = h('div', { class: 'pl-hist-row' + (open === e.id ? ' open' : '') },
                h('button', { class: 'pl-hist-main', onclick: () => { open = open === e.id ? null : e.id; draw(); } },
                  icon(MODES[e.mode]?.icon || 'chart-bar'),
                  h('span', { class: 'pl-hist-text' }, h('strong', {}, e.question), h('span', { class: 'muted small' }, `${fmtDay(e.at)} · ${answersText(e.n)} · ${summary(e)}`))),
                confirmButton(icon('x'), t('Delete?'), () => { polls.remove(key, e.id); draw(); }, 'btn small', { title: t('Delete this result'), 'aria-label': t('Delete this result') }));
              if (open !== e.id) return row;
              const res = { ...e, words: e.words || [], feel: e.feel || null };
              const chart = e.mode === 'likert' ? likertChart(res) : e.mode === 'mood' ? moodChart(res) : cloudChart(res.words, null, obs, e.lang);
              return h('div', {}, row, h('div', { class: 'pl-hist-chart' }, chart));
            })),
            list.length ? h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
              confirmButton(t('Clear this class’s history'), t('Click again to clear'), () => { polls.clear(key); open = null; draw(); }, 'btn small danger')) : null,
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
