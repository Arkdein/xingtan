// Quotes (名言佳句): sayings on life, work and learning, in Chinese and English,
// for a holding screen before the lesson or a values moment in CCE.
//
// Quotes come from the app's own library (js/quotelibrary.js: every quote names
// its source) and from the teacher's own collections (js/quotelists.js, shared
// by all boards in this browser). Chinese quotes can show pinyin, a modern
// Chinese gloss (白话释义) and an English translation.
//
// The tool keeps its settings in ctx.state:
//   mode: 'rotate' | 'pin' | 'day'   secs: seconds per quote   order: 'shuffle' | 'inorder'
//   sources: ['library', listId…]    lang: 'all' | 'zh' | 'en'  tags: [R³ICH value ids] (none = all)
//   layers: { py, gloss, en, src }   vertical: bool (Chinese quotes in 竖排)   look: 'paper' | 'ink' | 'clear'
//   prompt: '' | prompt id | 'own'   promptText: own prompt   promptLang: 'en' | 'zh' | 'both'
//   cur: key of the quote on screen   skip: [keys not to show]
// A key is the library id ('zh012') or '<collection id>/<quote id>'.
import { h, put, openModal, closeModal, confirmButton, segmented, shuffle, bi } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang, locale } from '../i18n.js';
import { QUOTES, VALUES, quoteById } from '../quotelibrary.js';
import * as QL from '../quotelists.js';
import { pinyinArray } from '../dictionary.js';

const SECS = [10, 20, 30, 60, 120, 300];
const LAYERS = { py: false, gloss: true, en: true, src: true };

// Thinking prompts under the quote, in the spirit of Making Thinking Visible.
const PROMPTS = [
  { id: 'meaning', en: 'What do you think this means? What makes you say that?', zh: '你认为这句话是什么意思？你为什么这么说？' },
  { id: 'agree', en: 'Do you agree? Why or why not?', zh: '你同意这句话吗？为什么？' },
  { id: 'connect', en: 'How does this connect to your own life?', zh: '这句话和你的生活有什么联系？' },
  { id: 'class', en: 'What would this look like in our class?', zh: '在我们班上，做到这句话会是什么样子？' },
  { id: 'words', en: 'Put it in your own words.', zh: '用自己的话说一说这句话。' },
  { id: 'value', en: 'Which of our core values does this show?', zh: '这句话体现了哪一个核心价值观？' },
];

const valueName = (id) => {
  const v = VALUES.find((x) => x.id === id);
  return v ? (getLang() === 'zh' ? v.zh : v.en) : id;
};

// Same quote for everyone on a given day, whatever the board.
function dayIndex(n, date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let x = 2166136261;
  for (const c of key) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; }
  return n ? x % n : 0;
}

export default {
  type: 'quotes',
  title: 'Quotes',
  icon: 'quote',
  tone: 'content', // dock tile colour: time | people | signal | content | language
  size: { w: 760, h: 440 },
  minSize: { w: 300, h: 200 },
  // A shared board file takes a copy of the teacher's own collections in use.
  share: (st) => {
    const copies = (st.sources || []).filter((s) => s !== 'library').map(QL.byId).filter(Boolean);
    const { listCopies, ...rest } = st;
    return copies.length ? { ...rest, listCopies: copies } : rest;
  },

  mount(body, ctx) {
    const st = ctx.state;
    if (!st.mode) {
      ctx.save({ mode: 'rotate', secs: 30, order: 'shuffle', sources: ['library'], lang: 'all', tags: [],
        layers: { ...LAYERS }, vertical: false, look: 'paper', prompt: '', promptText: '', promptLang: 'both', cur: null, skip: [] });
    }
    // Collections that came with a shared board file join this browser's collections.
    if (Array.isArray(st.listCopies)) {
      const ids = st.listCopies.map((l) => QL.adopt(l)?.id).filter(Boolean);
      delete st.listCopies;
      ctx.save({ sources: [...new Set([...(st.sources || []), ...ids])] });
    }
    const layers = () => ({ ...LAYERS, ...(st.layers || {}) });

    // ---------- Which quotes ----------
    function sourceQuotes() {
      const out = [];
      const srcs = st.sources?.length ? st.sources : ['library'];
      if (srcs.includes('library')) QUOTES.forEach((q) => out.push({ key: q.id, q, from: 'library' }));
      srcs.filter((s) => s !== 'library').forEach((id) => {
        const l = QL.byId(id);
        (l?.quotes || []).forEach((q) => out.push({ key: `${l.id}/${q.id}`, q, from: l.name }));
      });
      return out;
    }
    const matches = (q) => (st.lang === 'all' || !st.lang || q.lang === st.lang)
      && (!st.tags?.length || (q.tags || []).some((tg) => st.tags.includes(tg)));
    const pool = () => sourceQuotes().filter((x) => matches(x.q) && !(st.skip || []).includes(x.key));
    const find = (key) => {
      if (!key) return null;
      if (!key.includes('/')) { const q = quoteById(key); return q ? { key, q, from: 'library' } : null; }
      const [lid, qid] = key.split('/');
      const l = QL.byId(lid);
      const q = l?.quotes.find((x) => x.id === qid);
      return q ? { key, q, from: l.name } : null;
    };

    // Shuffle deals every quote once before any comes round again.
    // “Back” retraces the quotes shown in this session.
    let deck = [];
    const history = [];
    function nextKey(step = 1) {
      const p = pool();
      if (!p.length) return null;
      const keys = p.map((x) => x.key);
      if (step < 0) {
        while (history.length) { const k = history.pop(); if (keys.includes(k) && k !== st.cur) return k; }
      } else if (st.cur) history.push(st.cur);
      if (history.length > 200) history.shift();
      if (st.order === 'inorder' || step < 0) {
        const i = keys.indexOf(st.cur);
        if (i < 0) return keys[step > 0 ? 0 : keys.length - 1];
        return keys[(i + step + keys.length) % keys.length];
      }
      deck = deck.filter((k) => keys.includes(k) && k !== st.cur);
      if (!deck.length) deck = shuffle(keys.filter((k) => k !== st.cur || keys.length === 1));
      return deck.pop();
    }
    function current() {
      const p = pool();
      if (!p.length) return null;
      if (st.mode === 'day') return p[dayIndex(p.length)];
      const got = p.find((x) => x.key === st.cur);
      if (got) return got;
      const k = st.order === 'inorder' ? p[0].key : nextKey();
      ctx.save({ cur: k });
      return find(k);
    }

    // ---------- Screen ----------
    const root = h('div', { class: 'qs', tabindex: '0' });
    const stageEl = h('div', { class: 'qs-stage' });
    const card = h('div', { class: 'qs-card' });
    const progress = h('div', { class: 'qs-progress', 'aria-hidden': 'true' });
    const bar = h('div', { class: 'qs-bar' });
    stageEl.append(card);
    root.append(stageEl, progress, bar);
    body.append(root);

    function applyLook() {
      const look = ['paper', 'ink', 'clear'].includes(st.look) ? st.look : 'paper';
      ['paper', 'ink', 'clear'].forEach((l) => ctx.el.classList.toggle(`qs-look-${l}`, l === look));
    }

    function rubyText(text, py) {
      const syl = (py || '').trim().split(/\s+/).filter(Boolean);
      const chars = [...text];
      const han = chars.filter((c) => QL.hasHan(c)).length;
      if (!syl.length || syl.length !== han) return [text];
      let k = 0;
      return chars.map((c) => (QL.hasHan(c) ? h('ruby', {}, c, h('rt', {}, syl[k++])) : c));
    }

    function promptEl() {
      let en = '', zh = '';
      if (st.prompt === 'own') { en = zh = (st.promptText || '').trim(); }
      else { const p = PROMPTS.find((x) => x.id === st.prompt); if (p) { en = p.en; zh = p.zh; } }
      if (!en && !zh) return null;
      const lang = st.promptLang || 'both';
      return h('div', { class: 'qs-prompt' }, icon('bulb'),
        h('div', {},
          lang !== 'en' && zh ? h('p', { lang: 'zh-CN' }, zh) : null,
          lang !== 'zh' && en && en !== zh ? h('p', { lang: 'en' }, en) : null));
    }

    function quoteView(item) {
      const q = item.q;
      const L = layers();
      if (q.lang === 'en') {
        return [
          h('blockquote', { class: 'qs-text qs-en', lang: 'en' }, q.text),
          L.src && (q.by || q.src) ? h('p', { class: 'qs-src', lang: 'en' }, '— ', [q.by, q.src].filter(Boolean).join(', ')) : null,
          promptEl(),
        ];
      }
      const vertical = !!st.vertical;
      // 竖排: one clause to a column, as in a printed classical text.
      const clauses = (q.text.match(/[^，。；：？！、…]+[，。；：？！、…」』”]*/g) || [q.text]);
      const text = h('blockquote', { class: 'qs-text qs-zh', lang: 'zh-CN' },
        ...(vertical ? clauses.map((c) => h('span', { class: 'qs-col' }, c)) : L.py ? rubyText(q.text, q.py) : [q.text]));
      const src = L.src && q.src ? h('p', { class: 'qs-src', lang: 'zh-CN' }, '——', q.src) : null;
      const extras = [
        L.gloss && q.gloss ? h('p', { class: 'qs-gloss', lang: 'zh-CN' }, q.gloss) : null,
        L.en && q.en ? h('p', { class: 'qs-trans', lang: 'en' }, q.en,
          L.src && q.srcEn ? h('span', { class: 'qs-src-en' }, ` (${q.srcEn})`) : null) : null,
        promptEl(),
      ].filter(Boolean);
      if (vertical) {
        return [h('div', { class: 'qs-vblock' }, text, src), extras.length ? h('div', { class: 'qs-extras' }, ...extras) : null];
      }
      return [text, src, ...extras];
    }

    let shownKey = null;
    let shownAt = Date.now();
    let fadeTimer = null;
    function render({ fade = false } = {}) {
      applyLook();
      const item = current();
      const draw = () => {
        card.className = 'qs-card' + (item?.q.lang === 'zh' && st.vertical ? ' vertical' : '') + (item ? ` lang-${item.q.lang}` : '') + (item && item.from !== 'library' ? ' own' : '');
        if (!item) {
          put(card, h('div', { class: 'qs-empty' },
            h('p', {}, t('No quotes match these settings.')),
            h('button', { class: 'btn small', onclick: openSettings }, t('Change settings'))));
        } else put(card, ...quoteView(item));
        card.classList.remove('fading');
        fit();
        drawBar(item);
        // When minimised, the chip shows the quote on screen instead of “Quotes”.
        ctx.setMiniLabel?.(item ? (item.q.text.length > 40 ? item.q.text.slice(0, 39) + '…' : item.q.text) : '');
      };
      if (item?.key !== shownKey) { shownKey = item?.key || null; shownAt = Date.now(); restartProgress(); }
      clearTimeout(fadeTimer);
      if (fade && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        card.classList.add('fading');
        fadeTimer = setTimeout(draw, 350);
      } else draw();
      ctx.setTitle(st.mode === 'day' ? t('Quote of the day') : t('Quotes'));
    }

    // Biggest type that fits the tool.
    function fit() {
      const cs = getComputedStyle(stageEl);
      const W = stageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const H = stageEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (W <= 0 || H <= 0) return;
      // 竖排: columns of even length, as tall as the tool allows. The column
      // block needs a set height, or the browser can't tell how wide it is.
      const vb = card.querySelector('.qs-vblock');
      const vq = vb?.querySelector('.qs-text');
      const longest = vq ? Math.max(...[...vq.children].map((c) => [...c.textContent].length)) : 0;
      const apply = (f) => {
        root.style.setProperty('--qf', f + 'px');
        // one character plus letter-spacing, for the longest clause
        if (vq) vq.style.height = Math.ceil(longest * f * 1.08 + f * 0.3) + 'px';
      };
      let lo = 10, hi = Math.max(12, Math.min(150, H * 0.36, W * (vb ? 0.12 : 0.16)));
      const fits = () => card.scrollHeight <= H + 1 && card.scrollWidth <= W + 1;
      apply(hi);
      if (fits()) return;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        apply(mid);
        if (fits()) lo = mid; else hi = mid;
      }
      apply(lo);
    }
    const ro = new ResizeObserver(() => fit());
    ro.observe(stageEl);
    document.fonts?.load('40px "Xingtan Kai"', '学').then(() => fit()).catch(() => {});

    function restartProgress() {
      progress.classList.remove('run');
      progress.style.removeProperty('--qs-secs');
      if (st.mode !== 'rotate' || !pool().length) return;
      void progress.offsetWidth; // restart the animation
      progress.style.setProperty('--qs-secs', `${st.secs || 30}s`);
      progress.classList.add('run');
    }

    // ---------- Moving between quotes ----------
    function go(step) {
      const k = nextKey(step);
      if (!k) return;
      ctx.save({ cur: k });
      render({ fade: true });
    }
    function setMode(mode) {
      ctx.save({ mode });
      shownKey = null;
      render({ fade: mode === 'day' });
    }
    const tick = setInterval(() => {
      if (st.mode !== 'rotate' || document.hidden) return;
      if (Date.now() - shownAt >= (st.secs || 30) * 1000) go(1);
    }, 500);
    // The day changes while a board is left open (quote of the day).
    let today = new Date().toDateString();
    const dayTick = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== today) { today = now; if (st.mode === 'day') render({ fade: true }); }
    }, 60_000);

    root.addEventListener('keydown', (e) => {
      if (e.target !== root) return;
      if (e.key === 'ArrowRight' && st.mode !== 'day') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' && st.mode !== 'day') { e.preventDefault(); go(-1); }
      else if (e.key === ' ' && st.mode !== 'day') { e.preventDefault(); setMode(st.mode === 'rotate' ? 'pin' : 'rotate'); }
    });

    // ---------- Bar (shows on hover, so it stays off the projector) ----------
    const toggle = (key, label, title, enabled = true) => h('button', {
      class: 'qs-toggle', 'aria-pressed': String(!!layers()[key]), title, disabled: !enabled,
      onclick: () => { ctx.save({ layers: { ...layers(), [key]: !layers()[key] } }); render(); },
    }, label);

    function drawBar(item) {
      const zh = item?.q.lang === 'zh';
      const day = st.mode === 'day';
      put(bar, h('div', { class: 'qs-bar-row' },
        day ? h('span', { class: 'qs-day' }, icon('calendar-event'),
          new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'short' })) : [
          h('button', { class: 'tt-btn', title: t('Previous quote'), 'aria-label': t('Previous quote'), onclick: () => go(-1) }, icon('chevron-left')),
          h('button', { class: 'tt-btn', title: st.mode === 'rotate' ? t('Stay on this quote') : t('Change quotes by themselves'),
            'aria-label': st.mode === 'rotate' ? t('Pause') : t('Play'), onclick: () => setMode(st.mode === 'rotate' ? 'pin' : 'rotate') },
          icon(st.mode === 'rotate' ? 'player-pause' : 'player-play')),
          h('button', { class: 'tt-btn', title: t('Next quote'), 'aria-label': t('Next quote'), onclick: () => go(1) }, icon('chevron-right')),
        ],
        h('span', { class: 'qs-bar-sep' }),
        toggle('py', t('Pinyin'), t('Pinyin above the Chinese'), zh && !st.vertical),
        toggle('gloss', '白话', t('Modern Chinese (白话) meaning'), zh),
        toggle('en', 'EN', t('English translation'), zh),
        h('span', { class: 'qs-bar-sep' }),
        item ? h('button', { class: 'tt-btn', title: t('Don’t show this quote again in this tool'), 'aria-label': t('Skip this quote'), onclick: () => {
          ctx.save({ skip: [...new Set([...(st.skip || []), item.key])] });
          ctx.toast(t('Quote skipped. Settings can bring it back.'));
          if (st.mode === 'day') render({ fade: true }); else go(1);
        } }, icon('eye-off')) : null,
        h('button', { class: 'tt-btn', title: t('Quote settings'), 'aria-label': t('Quote settings'), onclick: openSettings }, icon('adjustments-horizontal')),
      ));
    }

    // ---------- Settings ----------
    function openSettings() {
      openModal(t('Quote settings'), (mb) => {
        const draw = () => {
          const L = layers();
          const lists = QL.all();
          const srcs = st.sources?.length ? st.sources : ['library'];
          const toggleSource = (id, on) => {
            const next = on ? [...new Set([...srcs, id])] : srcs.filter((s) => s !== id);
            ctx.save({ sources: next.length ? next : ['library'] });
            render(); draw();
          };
          const n = pool().length;
          const skipped = (st.skip || []).length;

          put(mb,
            h('section', { class: 'panel' },
              h('h3', {}, t('Which quotes')),
              h('div', { class: 'qs-sources' },
                h('label', { class: 'qs-check' }, h('input', { type: 'checkbox', checked: srcs.includes('library'), onchange: (e) => toggleSource('library', e.target.checked) }),
                  t('杏坛 library ({n} quotes, each with its source)', { n: QUOTES.length })),
                ...lists.map((l) => h('label', { class: 'qs-check' }, h('input', { type: 'checkbox', checked: srcs.includes(l.id), onchange: (e) => toggleSource(l.id, e.target.checked) }),
                  t('{name} ({n})', { name: l.name || t('Untitled collection'), n: l.quotes.length })))),
              h('div', { class: 'row gap wrap' },
                h('button', { class: 'btn small with-icon', onclick: () => manageLists(draw) }, icon('books'), t('My quote collections'))),
              h('div', { class: 'field' }, h('span', {}, t('Language')),
                segmented([['all', t('Chinese and English')], ['zh', '中文'], ['en', 'English']], st.lang || 'all', (v) => { ctx.save({ lang: v }); render(); draw(); }, t('Language'))),
              h('div', { class: 'field' }, h('span', {}, t('Values (R³ICH)')),
                h('div', { class: 'row gap wrap qs-tags' },
                  h('button', { class: 'chip' + (!st.tags?.length ? ' active' : ''), 'aria-pressed': String(!st.tags?.length), onclick: () => { ctx.save({ tags: [] }); render(); draw(); } }, t('All values')),
                  ...VALUES.map((v) => {
                    const on = (st.tags || []).includes(v.id);
                    return h('button', { class: 'chip' + (on ? ' active' : ''), 'aria-pressed': String(on), onclick: () => {
                      const next = on ? st.tags.filter((x) => x !== v.id) : [...(st.tags || []), v.id];
                      ctx.save({ tags: next }); render(); draw();
                    } }, bi(v.en, v.zh, getLang() === 'zh' ? 'zh' : 'both'));
                  }))),
              h('p', { class: n ? 'muted small' : 'restore-warn' }, n === 1 ? t('1 quote to show.') : t('{n} quotes to show.', { n })),
              skipped ? h('div', { class: 'row gap wrap' },
                h('span', { class: 'muted small' }, skipped === 1 ? t('1 quote skipped.') : t('{n} quotes skipped.', { n: skipped })),
                h('button', { class: 'btn small', onclick: () => { ctx.save({ skip: [] }); render(); draw(); } }, t('Bring them back'))) : null),

            h('section', { class: 'panel' },
              h('h3', {}, t('On screen')),
              h('div', { class: 'qs-checks' },
                ...[['py', t('Pinyin above the Chinese')], ['gloss', t('Modern Chinese (白话) meaning')], ['en', t('English translation')], ['src', t('Where it comes from')]]
                  .map(([k, label]) => h('label', { class: 'qs-check' }, h('input', { type: 'checkbox', checked: !!L[k], onchange: (e) => { ctx.save({ layers: { ...layers(), [k]: e.target.checked } }); render(); } }), label)),
                h('label', { class: 'qs-check' }, h('input', { type: 'checkbox', checked: !!st.vertical, onchange: (e) => { ctx.save({ vertical: e.target.checked }); render(); draw(); } }),
                  t('Chinese quotes in vertical columns (竖排)'))),
              st.vertical && L.py ? h('p', { class: 'muted small' }, t('Pinyin shows only when the Chinese runs across.')) : null,
              h('div', { class: 'field' }, h('span', {}, t('Look')),
                segmented([['paper', t('Paper')], ['ink', t('Ink')], ['clear', t('On the background')]], st.look || 'paper', (v) => { ctx.save({ look: v }); render(); draw(); }, t('Look')))),

            h('section', { class: 'panel' },
              h('h3', {}, t('Changing quotes')),
              segmented([['rotate', t('Change by themselves')], ['pin', t('Stay on one')], ['day', t('Quote of the day')]], st.mode, (v) => { setMode(v); draw(); }, t('Changing quotes')),
              st.mode === 'rotate' ? h('div', { class: 'row gap wrap' },
                h('span', { class: 'muted small' }, t('Every')),
                segmented(SECS.map((s) => [s, s < 60 ? t('{n} s', { n: s }) : t('{n} min', { n: s / 60 })]), st.secs || 30, (v) => { ctx.save({ secs: v }); restartProgress(); shownAt = Date.now(); draw(); }, t('Every')),
                segmented([['shuffle', t('Shuffle')], ['inorder', t('In order')]], st.order || 'shuffle', (v) => { ctx.save({ order: v }); deck = []; draw(); }, t('Order'))) : null,
              st.mode === 'day' ? h('p', { class: 'muted small' }, t('Everyone with the same settings sees the same quote today, on every board. It changes at midnight.')) : null,
              st.mode === 'pin' ? h('p', { class: 'muted small' }, t('Use the arrows on the tool to choose the quote.')) : null),

            h('section', { class: 'panel' },
              h('h3', {}, t('Thinking prompt')),
              h('p', { class: 'muted small' }, t('A question under the quote, for students to think about while they settle in.')),
              h('select', { class: 'input', onchange: (e) => { ctx.save({ prompt: e.target.value }); render(); draw(); } },
                h('option', { value: '', selected: !st.prompt }, t('None')),
                ...PROMPTS.map((p) => h('option', { value: p.id, selected: st.prompt === p.id }, getLang() === 'zh' ? p.zh : p.en)),
                h('option', { value: 'own', selected: st.prompt === 'own' }, t('My own question…'))),
              st.prompt === 'own' ? (() => {
                const inp = h('input', { class: 'input', type: 'text', maxlength: 160, value: st.promptText || '', placeholder: t('e.g. 这句话对你今天的学习有什么启发？') });
                inp.addEventListener('input', () => { ctx.save({ promptText: inp.value }); render(); });
                return inp;
              })() : null,
              st.prompt && st.prompt !== 'own' ? h('div', { class: 'field' }, h('span', {}, t('Language for students')),
                segmented([['en', 'EN'], ['zh', '中文'], ['both', t('Both')]], st.promptLang || 'both', (v) => { ctx.save({ promptLang: v }); render(); draw(); }, t('Language for students'))) : null),

            h('section', { class: 'panel' },
              h('h3', {}, t('Holding screen')),
              h('p', { class: 'muted small' }, t('Lays out this tool with a 3-minute Timer and calm Music that plays with it, and hides the dock. Press Start on the Timer as students come in.')),
              h('button', { class: 'btn with-icon', onclick: () => { closeModal(); holdingScreen(); } }, icon('presentation'), t('Set up a holding screen'))),
          );
        };
        draw();
      }, { wide: true });
    }

    function holdingScreen() {
      document.dispatchEvent(new CustomEvent('xingtan:holding-screen', { detail: { id: ctx.el.dataset.id } }));
    }

    // ---------- The teacher's own collections ----------
    function manageLists(after) {
      openModal(t('My quote collections'), (mb) => {
        const draw = () => {
          const lists = QL.all();
          put(mb,
            h('p', { class: 'muted small' }, t('Your own quotes, kept in this browser and shared by all boards. They go into backups, and a shared board file takes a copy of the collections its Quotes tool shows.')),
            lists.length ? h('ul', { class: 'qs-lists' }, ...lists.map((l) => h('li', {},
              h('strong', {}, l.name || t('Untitled collection')),
              h('span', { class: 'muted small' }, l.quotes.length === 1 ? t('1 quote') : t('{n} quotes', { n: l.quotes.length })),
              h('button', { class: 'btn small', onclick: () => editList(l, () => openAgain()) }, t('Edit'))))) : h('p', {}, t('No collections yet.')),
            h('div', { class: 'row gap wrap space-between' },
              h('button', { class: 'btn with-icon', onclick: () => editList(null, () => openAgain()) }, icon('plus'), t('New collection')),
              h('button', { class: 'btn primary', onclick: () => { closeModal(); render(); openSettings(); } }, t('Done'))));
        };
        draw();
      });
      function openAgain() { manageLists(after); }
    }

    // Splits pasted rows: Tab (from a spreadsheet) or | between columns.
    //   Chinese: quote | source | English translation | 白话释义
    //   English: quote | who | source
    const splitRow = (line) => line.split(/\t|\s\|\s|\|/).map((x) => x.trim());

    async function pinyinFor(text) {
      const chars = QL.hanChars(text);
      if (!chars.length) return '';
      try { return (await pinyinArray(chars.join(''))).join(' '); } catch (err) { return ''; }
    }

    function editList(existing, back) {
      const l = existing ? JSON.parse(JSON.stringify(existing)) : QL.blank();
      let saved = !!existing;
      const persist = () => {
        if (!l.name.trim() && !l.quotes.length) return;
        if (!l.name.trim()) l.name = t('My quotes {date}', { date: new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) });
        QL.save(l);
        if (!saved) { saved = true; ctx.save({ sources: [...new Set([...(st.sources || ['library']), l.id])] }); }
      };

      openModal(existing ? t('Edit collection') : t('New collection'), (mb) => {
        const name = h('input', { class: 'input', type: 'text', value: l.name, maxlength: 80, placeholder: t('e.g. 中三华文 · 名句 or Sec 3 CCE values') });
        name.addEventListener('input', () => { l.name = name.value; persist(); });
        const paste = h('textarea', { class: 'input', rows: 3, placeholder: t('One quote per line. From a spreadsheet, paste the columns as they are:\nChinese: quote · source · English translation · 白话释义\nEnglish: quote · who said it · where') });
        const rows = h('div', { class: 'qs-rows' });

        async function addQuotes() {
          const lines = paste.value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
          if (!lines.length) return;
          paste.value = '';
          for (const line of lines) {
            const [text, a = '', b = '', c = ''] = splitRow(line);
            if (!text) continue;
            if (QL.hasHan(text)) {
              l.quotes.push({ id: ctx.store.uid(), lang: 'zh', text, py: await pinyinFor(text), src: a, en: b, gloss: c, tags: [] });
            } else {
              l.quotes.push({ id: ctx.store.uid(), lang: 'en', text, by: a, src: b, tags: [] });
            }
          }
          persist();
          drawRows();
        }
        paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addQuotes(); });

        function row(q, i) {
          const zh = q.lang === 'zh';
          const field = (key, placeholder, opts = {}) => {
            const el = h(opts.area ? 'textarea' : 'input', { class: 'input', type: opts.area ? null : 'text', rows: opts.area ? 2 : null, placeholder, 'aria-label': placeholder, lang: opts.lang || null });
            el.value = q[key] || '';
            el.addEventListener('input', () => { q[key] = el.value; persist(); });
            return el;
          };
          const text = field('text', t('Quote'), { area: true, lang: zh ? 'zh-CN' : 'en' });
          text.classList.add('qs-in-text');
          const py = zh ? field('py', t('pinyin, one syllable per character')) : null;
          text.addEventListener('change', async () => {
            const nowZh = QL.hasHan(text.value);
            if (nowZh !== zh) { q.lang = nowZh ? 'zh' : 'en'; }
            if (nowZh) { q.py = await pinyinFor(text.value); }
            persist();
            drawRows();
          });
          const move = (d) => {
            const j = i + d;
            if (j < 0 || j >= l.quotes.length) return;
            [l.quotes[i], l.quotes[j]] = [l.quotes[j], l.quotes[i]];
            persist();
            drawRows();
          };
          const tags = h('div', { class: 'row gap wrap qs-tags' }, ...VALUES.map((v) => {
            const on = (q.tags || []).includes(v.id);
            return h('button', { class: 'chip small' + (on ? ' active' : ''), 'aria-pressed': String(on), onclick: () => {
              q.tags = on ? q.tags.filter((x) => x !== v.id) : [...(q.tags || []), v.id];
              persist();
              drawRows();
            } }, valueName(v.id));
          }));
          return h('div', { class: 'qs-row' },
            h('div', { class: 'qs-row-head' },
              h('span', { class: 'qs-row-n' }, String(i + 1)),
              h('span', { class: 'qs-row-lang' }, zh ? '中文' : 'EN'),
              h('div', { class: 'row dc-row-tools' },
                h('button', { class: 'icon-btn small', title: t('Move up'), 'aria-label': t('Move up'), disabled: i === 0, onclick: () => move(-1) }, icon('arrow-up')),
                h('button', { class: 'icon-btn small', title: t('Move down'), 'aria-label': t('Move down'), disabled: i === l.quotes.length - 1, onclick: () => move(1) }, icon('arrow-down')),
                confirmButton(icon('trash'), icon('check'), () => { l.quotes = l.quotes.filter((x) => x.id !== q.id); persist(); drawRows(); }, 'icon-btn small dc-del', { title: t('Delete this quote (click twice)'), 'aria-label': t('Delete this quote') }))),
            text,
            zh ? h('div', { class: 'qs-row-body' }, py, field('src', t('Source, e.g. 《论语·为政》')), field('gloss', t('白话释义 (modern Chinese meaning)'), { area: true, lang: 'zh-CN' }), field('en', t('English translation'), { area: true, lang: 'en' }))
              : h('div', { class: 'qs-row-body' }, field('by', t('Who said it')), field('src', t('Where (book, speech, year)'))),
            tags);
        }

        function drawRows() {
          put(rows, ...(l.quotes.length ? l.quotes.map(row) : [h('p', { class: 'muted small' }, t('No quotes yet. Add some above.'))]));
        }
        drawRows();

        mb.append(
          h('label', { class: 'field' }, h('span', {}, t('Collection name')), name),
          h('div', { class: 'field' }, h('span', {}, t('Add quotes')), paste,
            h('div', { class: 'row gap wrap' }, h('button', { class: 'btn primary', onclick: addQuotes }, t('Add quotes')),
              h('span', { class: 'muted small' }, t('Chinese quotes get their pinyin straight away. Check it: words with more than one reading may need fixing.')))),
          h('strong', {}, t('Quotes in this collection')),
          rows,
          h('div', { class: 'row gap wrap space-between' },
            existing ? confirmButton(t('Delete this collection'), t('Click again to delete'), () => {
              QL.remove(l.id);
              ctx.save({ sources: (st.sources || []).filter((s) => s !== l.id) });
              render();
              back();
            }) : h('span'),
            h('button', { class: 'btn primary', onclick: () => { persist(); render(); back(); } }, t('Done'))),
        );
        if (!existing) name.focus();
      }, { wide: true });
    }

    render();
    return {
      destroy() {
        clearInterval(tick);
        clearInterval(dayTick);
        clearTimeout(fadeTimer);
        ro.disconnect();
        ['paper', 'ink', 'clear'].forEach((l) => ctx.el.classList.remove(`qs-look-${l}`));
      },
    };
  },
};
