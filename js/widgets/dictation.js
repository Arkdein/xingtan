// Dictation (听写) and word cards. Teachers keep word lists (shared by all boards,
// see wordlists.js) in Chinese, English, Malay or Tamil. The tool can:
// - show the words as cards, with pinyin, meanings and example sentences that
//   can be looked up in a dictionary (see dictionary.js) or typed in;
// - run a dictation: it reads each word aloud with the computer's own voices,
//   numbers it on screen without showing it, then reveals the answers.
import { h, put, openModal, closeModal, confirmButton, segmented, shuffle } from '../ui.js';
import { icon } from '../icons.js';
import * as WL from '../wordlists.js';
import * as D from '../dictionary.js';

const RATES = [[0.7, 'Slow 慢'], [0.9, 'Normal 正常'], [1.1, 'Fast 快']];
const REPEATS = [[1, '1×'], [2, '2×'], [3, '3×']];
const PAUSES = [[0, 'I click Next'], [5, '5 s'], [10, '10 s'], [15, '15 s'], [20, '20 s']];
const DEFAULT_OPTS = { rate: 0.9, repeats: 2, pause: 0, order: 'list', sentence: false };
const GAP_MS = 1200; // between saying a word again

const LOOKUP_ERRORS = {
  network: 'Couldn’t reach the dictionary. Check the internet connection.',
  server: 'The dictionary isn’t answering right now. Try again later.',
};

// Splits pasted words: one per line, or separated by commas, 、 or semicolons.
const splitWords = (s) => s.split(/[\n\r\t,，、;；]+/).map((x) => x.trim()).filter(Boolean);
const exampleLines = (w) => (w.examples || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default {
  type: 'dictation',
  title: 'Dictation',
  icon: 'vocabulary',
  tone: 'language', // dock tile colour: time | people | signal | content | language
  size: { w: 660, h: 500 },
  minSize: { w: 340, h: 280 },
  // A shared board file takes a copy of the word list, so a colleague gets it too.
  share: (st) => ({ listId: st.listId, opts: st.opts, view: 'words', ...(WL.byId(st.listId) ? { listCopy: WL.byId(st.listId) } : {}) }),

  mount(body, ctx) {
    const st = ctx.state;
    if (!st.opts) ctx.save({ opts: { ...DEFAULT_OPTS }, view: 'words', listId: null });
    // A list that came with a shared board file joins this browser's lists.
    if (st.listCopy) {
      const got = WL.adopt(st.listCopy);
      delete st.listCopy;
      ctx.save({ listId: got?.id || st.listId });
    }
    const opts = () => ({ ...DEFAULT_OPTS, ...(st.opts || {}) });
    const setOpts = (patch) => ctx.save({ opts: { ...opts(), ...patch } });
    const list = () => WL.byId(st.listId) || null;
    if (!list() && WL.all().length) ctx.save({ listId: WL.all()[0].id });

    const root = h('div', { class: 'dc', tabindex: '-1' });
    body.append(root);
    let alive = true;
    let token = 0;        // bumps whenever a dictation step is interrupted
    let phase = '';       // listen | write | done
    let countdown = 0;
    let tick = null;
    let voices = [];
    D.loadVoices().then((v) => { voices = v; if (alive && st.view === 'words') render(); });

    // ---------- Speech ----------
    const voiceFor = (lang) => {
      const chosen = ctx.store.get().dictation?.voices?.[lang];
      const options = D.voicesFor(lang, voices);
      return options.find((v) => v.name === chosen) || options[0] || null;
    };
    const say = (text, lang) => D.speak(text, { lang, voice: voiceFor(lang), rate: opts().rate });
    const langOf = (w) => D.langOf(w.w, list()?.lang);
    const missingVoices = () => {
      if (!voices.length) return [];
      const langs = new Set((list()?.words || []).map(langOf));
      return [...langs].filter((l) => !D.voicesFor(l, voices).length);
    };

    // ---------- Views ----------
    function bar(...kids) { return h('div', { class: 'dc-bar' }, ...kids); }

    function listPicker() {
      const sel = h('select', { class: 'dc-select', 'aria-label': 'Word list' },
        ...WL.all().map((l) => h('option', { value: l.id }, `${l.name || 'Untitled list'} (${l.words.length})`)),
        h('option', { value: '__new' }, '+ New word list… 新建'));
      sel.value = list()?.id || '__new';
      sel.addEventListener('change', () => {
        if (sel.value === '__new') { sel.value = list()?.id || '__new'; editList(null); return; }
        ctx.save({ listId: sel.value, view: 'words', run: null });
        render();
      });
      return sel;
    }

    function wordsView() {
      const l = list();
      if (!l) {
        put(root, h('div', { class: 'empty-state' },
          h('span', { class: 'tool-tile tone-language yt-empty-tile' }, icon('vocabulary')),
          h('p', {}, 'Make a word list for dictation and word cards.', h('br'), '新建一个听写词语表。'),
          h('p', { class: 'muted small' }, 'Chinese, English, Malay or Tamil. Lists are shared by all your boards.'),
          h('button', { class: 'btn primary', onclick: () => editList(null) }, 'New word list')));
        return;
      }
      const missing = missingVoices();
      put(root, 
        bar(listPicker(), h('div', { class: 'row gap' },
          h('button', { class: 'btn small with-icon', onclick: () => editList(l) }, icon('pencil'), 'Edit'),
          h('button', { class: 'icon-btn small', title: 'Dictation settings: voices, speed, pauses', 'aria-label': 'Dictation settings', onclick: settings }, icon('settings')))),
        l.words.length
          ? h('div', { class: 'dc-grid' }, ...l.words.map((w) => h('button', { class: 'dc-tile', onclick: () => { ctx.save({ view: 'card', cardId: w.id }); render(); } },
            h('span', { class: 'dc-tile-w', lang: langOf(w) === 'zh' ? 'zh-CN' : null }, w.w),
            w.py ? h('span', { class: 'dc-tile-py' }, w.py) : null,
            w.meaning ? h('span', { class: 'dc-tile-dot', title: 'Has a meaning' }) : null)))
          : h('div', { class: 'empty-state' }, h('p', {}, 'This list has no words yet.'), h('button', { class: 'btn', onclick: () => editList(l) }, 'Add words')),
        missing.length ? h('p', { class: 'dc-warn' }, icon('alert-triangle'),
          `This computer has no ${missing.map((m) => D.LANGS.find((x) => x[0] === m)?.[1] || m).join(' or ')} voice, so those words can’t be read aloud. `,
          h('button', { class: 'link-btn', onclick: voiceHelp }, 'How to add one')) : null,
        h('div', { class: 'dc-foot' },
          h('span', { class: 'muted small' }, `${l.words.length} word${l.words.length === 1 ? '' : 's'} · click a word for its card`),
          h('button', { class: 'btn primary with-icon', disabled: !l.words.length || !D.speechAvailable(), onclick: startRun }, icon('player-play'), 'Start dictation 开始听写')),
      );
    }

    function cardView() {
      const l = list();
      const words = l?.words || [];
      const i = words.findIndex((w) => w.id === st.cardId);
      if (i < 0) { ctx.save({ view: 'words' }); render(); return; }
      const w = words[i];
      const lang = langOf(w);
      const go = (d) => { ctx.save({ cardId: words[(i + d + words.length) % words.length].id }); render(); };
      const status = h('p', { class: 'dc-status', role: 'status' });
      const src = D.SOURCES[w.src];
      const ex = exampleLines(w);
      const lookupBtn = D.canLookUp(w.w, l.lang)
        ? h('button', { class: 'btn small with-icon', onclick: async (e) => {
          e.currentTarget.disabled = true;
          status.textContent = 'Looking it up…';
          const msg = await lookupInto(l.id, w.id);
          if (alive && st.view === 'card') { render(); if (msg) root.querySelector('.dc-status')?.replaceChildren(msg); }
        } }, icon('world-search'), w.meaning ? 'Look up again' : 'Look up 查词典')
        : null;
      put(root, 
        bar(h('button', { class: 'btn small with-icon', onclick: () => { ctx.save({ view: 'words' }); render(); } }, icon('arrow-left'), 'Words'),
          h('div', { class: 'row gap' },
            h('span', { class: 'im-counter' }, `${i + 1} / ${words.length}`),
            h('button', { class: 'icon-btn small', title: 'Edit this word', 'aria-label': 'Edit this word', onclick: () => editList(l, w.id) }, icon('pencil')))),
        h('div', { class: 'dc-card' },
          h('button', { class: 'im-nav prev', 'aria-label': 'Previous word', onclick: () => go(-1) }, icon('chevron-left')),
          h('div', { class: 'dc-card-main' },
            h('div', { class: 'dc-card-head' },
              h('h2', { class: 'dc-word', lang: lang === 'zh' ? 'zh-CN' : null }, w.w),
              h('div', { class: 'dc-say' },
                (w.py || w.phonetic) ? h('span', { class: 'dc-py' }, w.py || w.phonetic) : null,
                h('button', { class: 'icon-btn small', title: 'Say it', 'aria-label': 'Say it', onclick: () => say(w.w, lang) }, icon('volume')),
                w.audio ? h('button', { class: 'btn small', title: 'A recording from the dictionary', onclick: () => new Audio(w.audio).play().catch(() => {}) }, 'Recording') : null)),
            w.meaning ? h('div', { class: 'dc-meaning' }, h('h3', {}, 'Meaning 释义'), h('p', {}, w.meaning)) : null,
            ex.length ? h('div', { class: 'dc-examples' }, h('h3', {}, 'Examples 例句'),
              h('ul', {}, ...ex.map((x) => h('li', {}, x, h('button', { class: 'rt-tool', title: 'Read this sentence', 'aria-label': 'Read this sentence', onclick: () => say(x, lang) }, icon('volume')))))) : null,
            !w.meaning && !ex.length ? h('p', { class: 'muted' }, D.canLookUp(w.w, l.lang)
              ? 'No meaning yet. Look it up, or type one in with Edit.' : 'No meaning yet. Type one in with Edit.') : null,
            h('div', { class: 'row gap wrap' }, lookupBtn, status),
            src ? h('p', { class: 'dc-credit' }, 'Source: ', h('a', { href: src.url, target: '_blank', rel: 'noopener' }, src.credit),
              w.trad && w.trad !== w.w ? ` · entry ${w.trad}` : '') : null),
          h('button', { class: 'im-nav next', 'aria-label': 'Next word', onclick: () => go(1) }, icon('chevron-right'))),
      );
    }

    // ---------- Dictation ----------
    function runWords() {
      const l = list();
      const ids = st.run?.order || [];
      return ids.map((id) => l?.words.find((w) => w.id === id)).filter(Boolean);
    }

    function startRun() {
      const l = list();
      if (!l?.words.length) return;
      const ids = l.words.map((w) => w.id);
      ctx.save({ view: 'run', run: { order: opts().order === 'shuffle' ? shuffle(ids) : ids, i: 0 } });
      // Speaking must start from the click itself in some browsers.
      play(0);
    }

    function stopAll() {
      token++;
      clearInterval(tick);
      tick = null;
      D.stopSpeaking();
    }

    async function play(i) {
      stopAll();
      const my = token;
      const words = runWords();
      if (i >= words.length) { phase = 'done'; ctx.save({ run: { ...st.run, i: words.length } }); render(); return; }
      ctx.save({ run: { ...st.run, i } });
      phase = 'listen';
      countdown = 0;
      render();
      const w = words[i];
      const lang = langOf(w);
      const o = opts();
      const sentence = o.sentence ? exampleLines(w)[0] : '';
      for (let r = 0; r < o.repeats; r++) {
        if (r > 0) { await wait(GAP_MS); if (my !== token) return; }
        await say(w.w, lang);
        if (my !== token) return;
        if (r === 0 && sentence) {
          await wait(GAP_MS / 2); if (my !== token) return;
          await say(sentence, lang);
          if (my !== token) return;
        }
      }
      phase = 'write';
      if (o.pause > 0) {
        countdown = o.pause;
        tick = setInterval(() => {
          if (my !== token) return;
          countdown -= 1;
          if (countdown <= 0) { clearInterval(tick); tick = null; play(i + 1); } else updateCountdown();
        }, 1000);
      }
      render();
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    function updateCountdown() {
      const el = root.querySelector('.dc-countdown');
      if (el) el.textContent = `Next word in ${countdown} s`;
    }

    function runView() {
      const words = runWords();
      const i = Math.min(st.run?.i ?? 0, words.length);
      const finished = i >= words.length;
      const paused = phase === 'write' && opts().pause > 0 && !tick;
      put(root, 
        bar(h('button', { class: 'btn small with-icon', onclick: () => { stopAll(); ctx.save({ view: 'words' }); render(); } }, icon('player-stop'), 'Stop'),
          h('span', { class: 'dc-list-name' }, list()?.name || ''),
          h('button', { class: 'icon-btn small', title: 'Dictation settings', 'aria-label': 'Dictation settings', onclick: settings }, icon('settings'))),
        finished
          ? h('div', { class: 'dc-run done' },
            h('p', { class: 'dc-big' }, icon('flag')),
            h('p', { class: 'dc-phase' }, 'Finished · 听写完毕'),
            h('div', { class: 'row gap wrap center' },
              h('button', { class: 'btn primary with-icon', onclick: () => { ctx.save({ view: 'answers' }); render(); } }, icon('eye'), 'Show answers 对答案'),
              h('button', { class: 'btn with-icon', onclick: () => play(0) }, icon('rotate'), 'Read again from the start')))
          : h('div', { class: 'dc-run' },
            h('p', { class: 'dc-big', 'aria-live': 'polite' }, String(i + 1), h('span', { class: 'dc-of' }, ` / ${words.length}`)),
            h('p', { class: 'dc-phase' + (phase === 'listen' ? ' listen' : '') },
              phase === 'listen' ? [icon('ear'), ' Listen · 听'] : [icon('writing'), ' Write · 写']),
            phase === 'write' && tick ? h('p', { class: 'dc-countdown muted' }, `Next word in ${countdown} s`) : null,
            h('div', { class: 'dc-dots', 'aria-hidden': 'true' }, ...words.map((_, k) => h('span', { class: k < i ? 'past' : k === i ? 'now' : '' })))),
        finished ? null : h('div', { class: 'dc-controls' },
          h('button', { class: 'btn with-icon', disabled: i === 0, onclick: () => play(i - 1), title: 'Previous word (←)' }, icon('player-skip-back'), 'Back'),
          h('button', { class: 'btn with-icon', onclick: () => play(i), title: 'Say it again (R)' }, icon('repeat'), 'Again 再读'),
          opts().pause > 0 && phase === 'write'
            ? h('button', { class: 'btn with-icon', onclick: () => { if (tick) { clearInterval(tick); tick = null; } else { play(i + 1); return; } render(); } },
              tick ? icon('player-pause') : icon('player-play'), tick ? 'Pause' : 'Go on')
            : null,
          h('button', { class: 'btn primary with-icon', onclick: () => play(i + 1), title: 'Next word (→)' }, 'Next 下一个', icon('player-skip-forward'))),
      );
      if (paused) root.querySelector('.dc-countdown')?.remove();
      // Keep the keys (→, ←, R) working after the buttons are redrawn.
      if (!root.contains(document.activeElement) && !document.querySelector('#modal[open]')) root.focus({ preventScroll: true });
    }

    function answersView() {
      const words = runWords();
      put(root, 
        bar(h('button', { class: 'btn small with-icon', onclick: () => { ctx.save({ view: 'words' }); render(); } }, icon('arrow-left'), 'Words'),
          h('strong', { class: 'dc-list-name' }, 'Answers · 答案'),
          h('button', { class: 'btn small with-icon', onclick: () => play(0) }, icon('rotate'), 'Again')),
        h('ol', { class: 'dc-answers' }, ...words.map((w) => h('li', {},
          h('button', { class: 'dc-answer', title: 'Say it', onclick: () => say(w.w, langOf(w)) },
            h('span', { class: 'dc-tile-w', lang: langOf(w) === 'zh' ? 'zh-CN' : null }, w.w),
            w.py ? h('span', { class: 'dc-tile-py' }, w.py) : null)))),
      );
    }

    function render() {
      if (!alive) return;
      const v = st.view;
      if (v === 'card') cardView();
      else if (v === 'run' && st.run) runView();
      else if (v === 'answers' && st.run) answersView();
      else wordsView();
    }

    // ---------- Look-ups ----------
    // Looks a word up and saves the result into its list. Returns a message if it didn't work.
    async function lookupInto(listId, wordId) {
      const l = WL.byId(listId);
      const w = l?.words.find((x) => x.id === wordId);
      if (!w) return '';
      try {
        const r = await D.lookup(w.w, l.lang);
        if (!r.found) return D.langOf(w.w, l.lang) === 'zh' ? '萌典 has no entry for this word. Type a meaning with Edit.' : 'The dictionary has no entry for this word.';
        const fresh = WL.byId(listId);
        if (!fresh) return '';
        WL.save({ ...fresh, words: fresh.words.map((x) => (x.id === wordId ? {
          ...x, meaning: r.meaning, examples: r.examples || x.examples || '', src: r.source,
          ...(r.trad ? { trad: r.trad } : {}), ...(r.phonetic ? { phonetic: r.phonetic } : {}), ...(r.audio ? { audio: r.audio } : {}),
        } : x)) });
        return '';
      } catch (err) {
        return LOOKUP_ERRORS[err.code] || LOOKUP_ERRORS.network;
      }
    }

    // ---------- Word list editor ----------
    function editList(existing, focusWordId = null) {
      let l = existing ? JSON.parse(JSON.stringify(existing)) : WL.blank(WL.all()[0]?.lang || 'zh');
      let saved = !!existing;
      const persist = () => {
        if (!l.name.trim() && !l.words.length) return;
        if (!l.name.trim()) l.name = `Word list ${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}`;
        WL.save(l);
        if (!saved) { saved = true; ctx.save({ listId: l.id, view: 'words' }); }
      };

      openModal(existing ? 'Edit word list · 编辑词语表' : 'New word list · 新建词语表', (mb) => {
        const name = h('input', { class: 'input', type: 'text', value: l.name, maxlength: 80, placeholder: 'e.g. 第五课 词语 or Unit 3 spelling' });
        name.addEventListener('input', () => { l.name = name.value; persist(); });
        const langSeg = h('div');
        const drawLang = () => put(langSeg, segmented(D.LANGS, l.lang, (v) => { l.lang = v; persist(); drawLang(); drawRows(); }, 'Language'));
        drawLang();

        const paste = h('textarea', { class: 'input', rows: 3, placeholder: 'Type or paste words: one per line, or separated by commas or 、\n例如：学习、认真、一丝不苟' });
        const addBtn = h('button', { class: 'btn primary', onclick: addWords }, 'Add words');
        const rows = h('div', { class: 'dc-rows' });
        const status = h('p', { class: 'dc-status', role: 'status' });
        const allBtn = h('button', { class: 'btn small with-icon', onclick: lookupAll }, icon('world-search'), 'Look up words without a meaning');

        async function addWords() {
          const words = splitWords(paste.value);
          if (!words.length) return;
          paste.value = '';
          const have = new Set(l.words.map((w) => w.w));
          for (const w of words) {
            if (have.has(w)) continue;
            have.add(w);
            let py = '';
            try { py = await D.pinyinOf(w); } catch (err) { /* offline before pinyin was cached */ }
            l.words.push({ id: ctx.store.uid(), w, py, meaning: '', examples: '' });
          }
          persist();
          drawRows();
        }
        paste.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addWords(); });

        async function lookupOne(w, statusEl = null) {
          if (statusEl) statusEl.textContent = 'Looking up…';
          persist();
          const msg = await lookupInto(l.id, w.id);
          const fresh = WL.byId(l.id)?.words.find((x) => x.id === w.id);
          if (fresh) Object.assign(w, fresh);
          if (statusEl) statusEl.textContent = msg;
          return !msg;
        }

        async function lookupAll() {
          const todo = l.words.filter((w) => !w.meaning && D.canLookUp(w.w, l.lang));
          if (!todo.length) { status.textContent = 'Every word that can be looked up already has a meaning.'; return; }
          allBtn.disabled = true;
          let n = 0, missed = 0;
          for (const w of todo) {
            status.textContent = `Looking up ${++n} of ${todo.length}…`;
            const ok = await lookupOne(w);
            if (!ok) missed++;
          }
          allBtn.disabled = false;
          status.textContent = missed ? `Done. ${missed} word${missed === 1 ? '' : 's'} weren’t found; type those meanings in yourself.` : 'Done.';
          drawRows();
        }

        function row(w, i) {
          const zh = D.langOf(w.w, l.lang) === 'zh';
          const word = h('input', { class: 'input dc-in-word', type: 'text', value: w.w, 'aria-label': 'Word', lang: zh ? 'zh-CN' : null });
          const py = h('input', { class: 'input dc-in-py', type: 'text', value: w.py || '', placeholder: zh ? 'pinyin' : 'sounds like (optional)', 'aria-label': 'Pinyin or pronunciation' });
          const meaning = h('textarea', { class: 'input', rows: 2, placeholder: 'Meaning 释义' });
          const examples = h('textarea', { class: 'input', rows: 2, placeholder: 'Example sentences 例句, one per line' });
          meaning.value = w.meaning || '';
          examples.value = w.examples || '';
          const rowStatus = h('span', { class: 'dc-row-status' });
          word.addEventListener('change', async () => {
            const v = word.value.trim();
            if (!v) return;
            w.w = v;
            if (D.hasHan(v)) { try { w.py = await D.pinyinOf(v); py.value = w.py; } catch (err) { /* keep */ } }
            persist();
          });
          py.addEventListener('input', () => { w.py = py.value; persist(); });
          meaning.addEventListener('input', () => { w.meaning = meaning.value; persist(); });
          examples.addEventListener('input', () => { w.examples = examples.value; persist(); });
          const move = (d) => {
            const j = i + d;
            if (j < 0 || j >= l.words.length) return;
            [l.words[i], l.words[j]] = [l.words[j], l.words[i]];
            persist();
            drawRows();
          };
          return h('div', { class: 'dc-row', 'data-id': w.id },
            h('div', { class: 'dc-row-head' },
              h('span', { class: 'dc-row-n' }, String(i + 1)), word, py,
              h('div', { class: 'row dc-row-tools' },
                D.canLookUp(w.w, l.lang) ? h('button', { class: 'icon-btn small', title: 'Look up in the dictionary', 'aria-label': 'Look up', onclick: async (e) => {
                  const b = e.currentTarget;
                  b.disabled = true;
                  if (await lookupOne(w, rowStatus)) { meaning.value = w.meaning || ''; examples.value = w.examples || ''; drawCredit(); }
                  b.disabled = false;
                } }, icon('world-search')) : null,
                h('button', { class: 'icon-btn small', title: 'Say it', 'aria-label': 'Say it', onclick: () => say(w.w, D.langOf(w.w, l.lang)) }, icon('volume')),
                h('button', { class: 'icon-btn small', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: () => move(-1) }, icon('arrow-up')),
                h('button', { class: 'icon-btn small', title: 'Move down', 'aria-label': 'Move down', disabled: i === l.words.length - 1, onclick: () => move(1) }, icon('arrow-down')),
                confirmButton(icon('trash'), icon('check'), () => { l.words = l.words.filter((x) => x.id !== w.id); persist(); drawRows(); }, 'icon-btn small dc-del', { title: 'Delete this word (click twice)', 'aria-label': 'Delete this word' }))),
            h('div', { class: 'dc-row-body' }, meaning, examples),
            h('div', { class: 'dc-row-foot' }, rowStatus, h('span', { class: 'dc-credit-slot' })));
          function drawCredit() { creditInto(rows.querySelector(`.dc-row[data-id="${w.id}"] .dc-credit-slot`), w); }
        }

        function creditInto(slot, w) {
          const s = D.SOURCES[w.src];
          put(slot, s ? h('span', { class: 'dc-credit' }, s.name, w.trad && w.trad !== w.w ? ` · ${w.trad}` : '') : '');
        }

        function drawRows() {
          put(rows, ...(l.words.length ? l.words.map(row) : [h('p', { class: 'muted small' }, 'No words yet. Add some above.')]));
          l.words.forEach((w) => creditInto(rows.querySelector(`.dc-row[data-id="${w.id}"] .dc-credit-slot`), w));
          allBtn.hidden = !l.words.some((w) => D.canLookUp(w.w, l.lang));
        }
        drawRows();

        mb.append(
          h('div', { class: 'dc-edit-top' },
            h('label', { class: 'field grow' }, h('span', {}, 'Name 名称'), name),
            h('div', { class: 'field' }, h('span', {}, 'Language 语言'), langSeg)),
          h('div', { class: 'field' }, h('span', {}, 'Add words 添加词语'), paste, h('div', { class: 'row gap' }, addBtn, h('span', { class: 'muted small' }, 'Chinese words get their pinyin straight away.'))),
          h('div', { class: 'row gap wrap space-between' }, h('strong', {}, 'Words 词语'), allBtn),
          status,
          rows,
          h('p', { class: 'muted small' }, 'Look-ups: English words from the Free Dictionary API (Wiktionary); Chinese words from 萌典 (Taiwan’s 《重編國語辭典修訂本》), shown in traditional characters as the dictionary has them. Only the word is sent. You can change anything they fill in.'),
          h('div', { class: 'row gap wrap space-between' },
            existing ? confirmButton('Delete this list', 'Click again to delete', () => {
              WL.remove(l.id);
              ctx.save({ listId: WL.all()[0]?.id || null, view: 'words', run: null });
              closeModal();
              render();
            }) : h('span'),
            h('button', { class: 'btn primary', onclick: () => { persist(); closeModal(); } }, 'Done')),
        );
        if (focusWordId) setTimeout(() => rows.querySelector(`.dc-row[data-id="${focusWordId}"] textarea`)?.focus(), 50);
        else if (!existing) name.focus();
        else if (!l.words.length) paste.focus();
      }, { wide: true });
    }

    // ---------- Settings ----------
    function settings() {
      openModal('Dictation settings · 听写设置', (mb) => {
        const draw = () => {
          const o = opts();
          const langs = [...new Set((list()?.words || []).map(langOf))];
          if (!langs.length) langs.push(list()?.lang || 'zh');
          const voiceRows = langs.map((lang) => {
            const options = D.voicesFor(lang, voices);
            const label = D.LANGS.find((x) => x[0] === lang)?.[1] || lang;
            if (!options.length) {
              return h('div', { class: 'field' }, h('span', {}, `${label} voice`),
                h('p', { class: 'dc-warn' }, icon('alert-triangle'), 'None on this computer. ', h('button', { class: 'link-btn', onclick: voiceHelp }, 'How to add one')));
            }
            const sel = h('select', { class: 'input' }, ...options.map((v) => h('option', { value: v.name }, `${v.name} (${v.lang})`)));
            sel.value = voiceFor(lang)?.name || options[0].name;
            sel.addEventListener('change', () => {
              ctx.store.update((m) => { m.dictation = { ...(m.dictation || {}), voices: { ...(m.dictation?.voices || {}), [lang]: sel.value } }; }, { notify: false });
            });
            const sample = { zh: '你好，我们开始听写。', en: 'Hello, let’s begin.', ms: 'Selamat pagi, mari kita mula.', ta: 'வணக்கம்' }[lang];
            return h('div', { class: 'field' }, h('span', {}, `${label} voice`),
              h('div', { class: 'row gap' }, sel, h('button', { class: 'btn small with-icon', onclick: () => say(sample, lang) }, icon('volume'), 'Test')));
          });
          put(mb, 
            ...voiceRows,
            h('div', { class: 'field' }, h('span', {}, 'Speed 语速'), segmented(RATES, o.rate, (v) => { setOpts({ rate: v }); draw(); }, 'Speed')),
            h('div', { class: 'field' }, h('span', {}, 'Say each word 每个词读'), segmented(REPEATS, o.repeats, (v) => { setOpts({ repeats: v }); draw(); }, 'Repeats')),
            h('div', { class: 'field' }, h('span', {}, 'Then 读完后'), segmented(PAUSES, o.pause, (v) => { setOpts({ pause: v }); draw(); }, 'Pause'),
              h('span', { class: 'muted small' }, o.pause ? `The next word comes after ${o.pause} seconds of writing time. Pause it at any time.` : 'You move on with Next (or the → key).')),
            h('div', { class: 'field' }, h('span', {}, 'Order 顺序'), segmented([['list', 'As listed 按顺序'], ['shuffle', 'Shuffled 打乱']], o.order, (v) => { setOpts({ order: v }); draw(); }, 'Order')),
            h('label', { class: 'row gap dc-check' }, (() => {
              const c = h('input', { type: 'checkbox', checked: o.sentence });
              c.addEventListener('change', () => setOpts({ sentence: c.checked }));
              return c;
            })(), 'Also read the first example sentence (word · sentence · word)'),
            h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => { closeModal(); render(); } }, 'Done')),
          );
        };
        draw();
      });
    }

    function voiceHelp() {
      openModal('Adding a voice · 添加语音', (mb) => {
        mb.append(
          h('p', {}, 'Dictation uses the voices that come with the computer. Most computers have English; Chinese, Malay and Tamil voices can be added for free.'),
          h('ul', { class: 'yt-steps' },
            h('li', {}, h('strong', {}, 'Windows: '), 'Settings → Time & language → Speech → Manage voices → Add voices. Choose “Chinese (Simplified, China)”, “Malay” or “Tamil”, then restart the browser.'),
            h('li', {}, h('strong', {}, 'Mac / iPad: '), 'System Settings → Accessibility → Spoken Content → System Voice → Manage Voices. Add a Chinese (China mainland), Malay or Tamil voice.'),
            h('li', {}, h('strong', {}, 'Chromebook: '), 'Settings → Accessibility → Text-to-Speech → Speech engine settings. In Chrome, Google’s online voices also work when connected to the internet.')),
          h('p', { class: 'muted small' }, 'Microsoft Edge also has natural-sounding online voices for Chinese, Malay, Tamil and Singapore English. They need the internet.'),
          h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: closeModal }, 'OK')));
      });
    }

    // ---------- Keys and updates ----------
    function onKey(e) {
      if (st.view !== 'run' || e.target.closest('input, textarea, select')) return;
      const i = st.run?.i ?? 0;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); play(i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); if (i > 0) play(i - 1); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); play(i); }
    }
    root.addEventListener('keydown', onKey);

    // Word lists live with the class lists, so refresh when they change.
    const unsub = ctx.onClassesChange(() => {
      if (!list() && WL.all().length && !st.listId) ctx.save({ listId: WL.all()[0].id });
      if (st.view === 'words' || st.view === 'card') render();
    });

    // A dictation interrupted by a reload resumes paused on its word.
    if (st.view === 'run') phase = 'write';
    render();
    return {
      destroy() {
        alive = false;
        stopAll();
        unsub();
        root.removeEventListener('keydown', onKey);
      },
    };
  },
};
