// Thinking routine (思维常规): a Making Thinking Visible routine on the board.
// Prompt view shows the steps and stems large; Wall view collects answers as
// sticky notes, one column per step. With Google connected, students answer
// a Google Form on their own devices (via a QR code) and the notes arrive live;
// without it, the teacher or a scribe types notes straight onto the wall.
// When a routine ends, the answers are saved to the class's Google Sheet.
import { h, classSelect, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import * as R from '../routines.js';
import * as google from '../google.js';
import * as gf from '../gforms.js';
import { t, getLang, locale } from '../i18n.js';

const POLL_MS = 5000;
// Labels stay in English here; t() is called where they are shown.
const LANGS = [['en', 'English'], ['zh', '中文'], ['both', 'Both']];
const NAMES = [['hidden', 'Hidden on screen'], ['shown', 'Shown'], ['none', 'Don’t ask']];
const NO_T = new Set(['English', '中文']); // language names stay in their own script

const clone = (x) => JSON.parse(JSON.stringify(x));
const fmt = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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
    }, NO_T.has(text) ? text : t(text))));
}

export default {
  type: 'routine',
  title: 'Thinking routine',
  icon: 'bulb',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 880, h: 580 },
  minSize: { w: 440, h: 340 },
  // Shared board files keep the set-up but never students' answers or names.
  // Closed for good (or its board deleted) during a run on student devices:
  // stop the form taking answers, now or as soon as Google is connected.
  closed: (st) => { if (st.run?.status === 'live' && st.run.formId) gf.closeLater(st.run.formId); },
  share: (st) => ({ routineId: st.routineId, lang: st.lang, names: st.names, topic: st.topic, viewpoints: st.viewpoints, sides: st.sides }),

  mount(body, ctx) {
    const st = ctx.state;
    if (!st.routineId) {
      ctx.save({ routineId: 'see-think-wonder', lang: 'both', names: 'hidden', topic: '', viewpoints: [], sides: ['', ''], run: null, notes: [], view: 'setup' });
    }
    if (!Array.isArray(st.notes)) ctx.save({ notes: [] });

    const root = h('div', { class: 'rt' });
    body.append(root);
    let pollTimer = null;
    let busy = '';          // message while something is in progress
    let error = '';
    let showHidden = false;
    let dragging = null;    // { id, el, ghost }
    let refocus = null;     // column whose "Add a note" box keeps the cursor after a re-render
    let alive = true;
    let missingNote = false; // the board's custom routine wasn't found here

    const routine = () => (st.run ? st.run.routine : R.byId(st.routineId) || R.BUILT_IN[0]);
    const lang = () => (st.run ? st.run.lang : st.lang);
    const cls = () => ctx.store.getClass(st.classId) || ctx.store.getActiveClass();

    // ---------- Google ----------
    function googleChip() {
      const s = google.status();
      if (s.connected) {
        const who = s.email || t('Google account');
        const n = s.minutesLeft;
        return h('span', { class: 'rt-google ok', title: n === 1 ? t('Signed in as {who} for about {n} more minute', { who, n }) : t('Signed in as {who} for about {n} more minutes', { who, n }) },
          icon('check'), s.email ? s.email.replace(/@.*/, '') : 'Google');
      }
      return h('button', { class: 'btn small with-icon', onclick: connect }, icon('link'), st.run?.formId ? t('Reconnect Google') : t('Connect Google'));
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
    async function start(withDevices) {
      error = '';
      const r = R.byId(st.routineId);
      if (!r) return;
      const viewpoints = (st.viewpoints || []).map((v) => v.trim()).filter(Boolean);
      const sides = (st.sides || ['', '']).map((v) => (v || '').trim());
      if (r.kind === 'viewpoints' && viewpoints.length < 2) { error = t('Add at least two viewpoints, one per line.'); render(); return; }
      if (r.kind === 'tug' && (!sides[0] || !sides[1])) { error = t('Name both sides of the tug of war.'); render(); return; }
      const run = {
        id: ctx.store.uid(), routine: clone(r), lang: st.lang, names: st.names, topic: (st.topic || '').trim(),
        viewpoints, sides, classId: cls()?.id || null, className: cls()?.name || t('All classes'),
        startedAt: new Date().toISOString(), formId: null, url: null, qmap: null, status: 'live', saved: false, sheetUrl: null,
      };
      if (withDevices) {
        if (!google.isConnected()) { await connect(); if (!google.isConnected()) return; }
        busy = t('Making the Google Form…');
        render();
        try {
          Object.assign(run, await gf.createForm(run));
        } catch (e) {
          busy = ''; error = t('The form could not be made. {msg}', { msg: e.message }); render(); return;
        }
        busy = '';
      }
      ctx.save({ run, notes: [], view: withDevices ? 'prompt' : 'wall' });
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
      const run = st.run;
      if (!run?.formId || polling) return;
      polling = true;
      try {
        const list = await gf.responses(run.formId, run.qmap);
        if (st.run !== run) return;
        const seen = new Set(st.notes.filter((n) => n.rid).map((n) => n.rid));
        const fresh = [];
        list.forEach((resp) => {
          if (seen.has(resp.id)) return;
          const a = resp.answers;
          run.routine.steps.forEach((step) => {
            if (!a[step.id]) return;
            fresh.push({ id: `${resp.id}:${step.id}`, rid: resp.id, step: step.id, text: a[step.id], who: a.name || '',
              vp: a.vp || '', pos: a.pos ? Number(a.pos) : null, time: resp.time, src: 'form' });
          });
          if (!run.routine.steps.some((s2) => a[s2.id])) {
            // Someone answered only the name / position: keep a marker so it counts.
            fresh.push({ id: `${resp.id}:_`, rid: resp.id, step: '_', text: '', who: a.name || '', vp: a.vp || '',
              pos: a.pos ? Number(a.pos) : null, time: resp.time, src: 'form', empty: true });
          }
        });
        if (fresh.length) ctx.save({ notes: [...st.notes, ...fresh] });
        if (error && /Google|internet|网络/.test(error)) error = '';
        if (!dragging) render();
      } catch (e) {
        error = e.message;
        if (e.status === 401) syncPolling();
        if (!dragging) render();
      } finally { polling = false; }
    }

    const responseCount = () => new Set(st.notes.filter((n) => n.rid).map((n) => n.rid)).size;

    // ---------- Ending and saving ----------
    async function end() {
      const run = st.run;
      if (!run) return;
      error = '';
      // The form has to be closed, so sign in again if the hour has run out.
      if (run.formId && !google.isConnected()) await connect();
      if (run.formId && google.isConnected()) {
        busy = t('Closing the form and saving…');
        render();
        try { await gf.setAccepting(run.formId, false); } catch (e) { gf.closeLater(run.formId); }
        await poll();
      } else if (run.formId) {
        gf.closeLater(run.formId);
        error = t('Ended. The form will stop taking answers as soon as Google is connected again.');
      }
      ctx.save({ run: { ...st.run, status: 'ended', endedAt: new Date().toISOString() } });
      syncPolling();
      await save();
    }

    function rows() {
      const run = st.run;
      const r = run.routine;
      const L = run.lang;
      const header = [t('Time'), ...(run.names !== 'none' ? [t('Name')] : []), ...(r.kind === 'viewpoints' ? [t('Viewpoint')] : []),
        ...(r.kind === 'tug' ? [t('Position (1 = {a}, 5 = {b})', { a: run.sides[0], b: run.sides[1] })] : []),
        ...r.steps.map((s2) => R.tr(s2.label, L)), t('Hidden on board'), t('Source')];
      const byResp = new Map();
      const out = [];
      st.notes.forEach((n) => {
        if (n.src === 'form') {
          if (!byResp.has(n.rid)) byResp.set(n.rid, { time: n.time, who: n.who, vp: n.vp, pos: n.pos, ans: {}, hidden: false });
          const g = byResp.get(n.rid);
          if (!n.empty) g.ans[n.step] = n.text;
          g.hidden = g.hidden || !!n.hidden;
        }
      });
      const line = (time, who, vp, pos, ans, hidden, src) => [time ? fmt(time) : '', ...(run.names !== 'none' ? [who || ''] : []),
        ...(r.kind === 'viewpoints' ? [vp || ''] : []), ...(r.kind === 'tug' ? [pos ?? ''] : []),
        ...r.steps.map((s2) => ans[s2.id] || ''), hidden ? t('yes') : '', src];
      byResp.forEach((g) => out.push(line(g.time, g.who, g.vp, g.pos, g.ans, g.hidden, t('Google Form'))));
      st.notes.filter((n) => n.src === 'manual').forEach((n) => out.push(line(n.time, '', n.vp, n.pos, { [n.step]: n.text }, n.hidden, t('Typed on board'))));
      return [
        [t('Routine'), R.tr(r.name, 'both')], [t('Topic'), run.topic || ''], [t('Started'), fmt(run.startedAt)],
        [t('Class'), run.className], [], header, ...out,
      ];
    }

    async function save() {
      const run = st.run;
      if (!run) return;
      if (!google.isConnected()) { busy = ''; render(); return; }
      busy = t('Saving to Google Sheets…');
      render();
      try {
        const d = new Date(run.startedAt);
        const tab = `${d.toLocaleDateString('en-CA')} ${d.toTimeString().slice(0, 5).replace(':', '.')} ${run.routine.name.en || run.routine.name.zh}`;
        const url = await gf.saveToClassSheet(run.classId || 'general', run.className, tab, rows());
        ctx.save({ run: { ...st.run, saved: true, sheetUrl: url } });
        ctx.toast(t('Answers saved to Google Sheets'));
      } catch (e) {
        error = t('Not saved to Sheets yet. {msg}', { msg: e.message });
      }
      busy = '';
      render();
    }

    // ---------- Notes ----------
    function updateNote(id, patch) {
      ctx.save({ notes: st.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
      render();
    }
    function addNote(step, text, extra = {}) {
      if (!text.trim()) return;
      ctx.save({ notes: [...st.notes, { id: ctx.store.uid(), step, text: text.trim(), src: 'manual', time: new Date().toISOString(), ...extra }] });
      render();
    }

    // Columns: one per step; for Tug of War, five positions between the two sides.
    function columns() {
      const r = routine();
      if (r.kind === 'tug') {
        const [a, b] = st.run.sides;
        return [1, 2, 3, 4, 5].map((p) => ({
          key: `pos${p}`, title: p === 1 ? a : p === 5 ? b : p === 3 ? R.tr({ en: 'In between', zh: '中间' }, lang())
            : `${R.tr({ en: 'Leaning', zh: '偏向' }, lang())}: ${p === 2 ? a : b}`,
          match: (n) => n.pos === p, extra: { step: r.steps[0].id, pos: p },
        }));
      }
      return r.steps.map((s2) => ({ key: s2.id, title: R.tr(s2.label, lang()), sub: R.tr(s2.stem, lang(), '\n'), match: (n) => n.step === s2.id, extra: { step: s2.id } }));
    }

    function noteEl(n) {
      const showWho = st.run.names === 'shown' && n.who;
      const el = h('div', { class: 'rt-note' + (n.starred ? ' starred' : '') + (n.hidden ? ' is-hidden' : '') + (n.src === 'manual' ? ' manual' : ''), 'data-id': n.id },
        h('div', { class: 'rt-note-text' }, n.text),
        (showWho || n.vp) ? h('div', { class: 'rt-note-meta' }, n.vp ? h('span', { class: 'rt-vp' }, n.vp) : null, showWho ? h('span', {}, n.who) : null) : null,
        h('div', { class: 'rt-note-tools' },
          h('button', { class: 'rt-tool', title: n.starred ? t('Unstar') : t('Star'), 'aria-label': t('Star'), onclick: () => updateNote(n.id, { starred: !n.starred }) }, icon('star')),
          h('button', { class: 'rt-tool', title: n.hidden ? t('Show on the wall') : t('Hide from the wall'), 'aria-label': t('Hide'), onclick: () => updateNote(n.id, { hidden: !n.hidden }) }, icon(n.hidden ? 'eye' : 'eye-off')),
          n.src === 'manual' ? h('button', { class: 'rt-tool', title: t('Delete'), 'aria-label': t('Delete'), onclick: () => { ctx.save({ notes: st.notes.filter((x) => x.id !== n.id) }); render(); } }, icon('x')) : null,
        ));
      el.addEventListener('pointerdown', (e) => startDrag(e, n, el));
      return el;
    }

    // ---------- Drag to regroup ----------
    function startDrag(e, n, el) {
      if (e.button !== 0 || e.target.closest('button') || st.run?.status !== 'live' && st.run?.status !== 'ended') return;
      const x0 = e.clientX, y0 = e.clientY;
      let moved = false;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        if (!moved) {
          moved = true;
          const r = el.getBoundingClientRect();
          const ghost = el.cloneNode(true);
          ghost.classList.add('rt-ghost');
          Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
          document.body.append(ghost);
          el.classList.add('rt-dragging');
          dragging = { id: n.id, el, ghost, dx: x0 - r.left, dy: y0 - r.top };
        }
        dragging.ghost.style.left = (ev.clientX - dragging.dx) + 'px';
        dragging.ghost.style.top = (ev.clientY - dragging.dy) + 'px';
        root.querySelectorAll('.rt-col').forEach((c) => c.classList.remove('drop'));
        const col = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.rt-col');
        if (col && root.contains(col)) col.classList.add('drop');
      };
      const up = (ev) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        if (!moved) return;
        dragging.ghost.remove();
        const col = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.rt-col');
        const id = dragging.id;
        dragging = null;
        if (col && root.contains(col)) drop(id, col, ev.clientY);
        render();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }

    function drop(id, col, y) {
      const c = columns().find((x) => x.key === col.dataset.key);
      if (!c) return;
      const note = { ...st.notes.find((n) => n.id === id), ...c.extra };
      const rest = st.notes.filter((n) => n.id !== id);
      // Insert before the first note in the column whose middle is below the pointer.
      const els = [...col.querySelectorAll('.rt-note:not(.rt-dragging)')];
      const before = els.find((e2) => { const r = e2.getBoundingClientRect(); return y < r.top + r.height / 2; });
      let i;
      if (before) i = rest.findIndex((n) => n.id === before.dataset.id);
      else {
        const lastInCol = [...rest].reverse().find((n) => c.match(n));
        i = lastInCol ? rest.indexOf(lastInCol) + 1 : rest.length;
      }
      rest.splice(i < 0 ? rest.length : i, 0, note);
      ctx.save({ notes: rest });
    }

    // ---------- Views ----------
    function renderSetup() {
      // A board from a colleague (or a routine deleted on another board) can name a
      // custom routine this computer doesn't have: fall back to the first one, so
      // Start works, and say so.
      if (st.routineId && !R.byId(st.routineId)) {
        ctx.save({ routineId: R.BUILT_IN[0].id });
        missingNote = true;
      }
      const r = R.byId(st.routineId) || R.BUILT_IN[0];
      const select = h('select', { class: 'rt-select', 'aria-label': t('Thinking routine') },
        ...R.GROUPS.map((g) => {
          const list = R.all().filter((x) => x.group === g.id);
          // Group headings follow the interface language; routine names stay bilingual (students see them).
          return list.length ? h('optgroup', { label: getLang() === 'zh' ? (g.zh || g.en) : (g.en || g.zh) }, ...list.map((x) => h('option', { value: x.id }, R.tr(x.name, 'both')))) : null;
        }),
        h('option', { value: '__new' }, t('+ New custom routine…')));
      select.value = r.id;
      select.addEventListener('change', () => {
        if (select.value === '__new') { select.value = r.id; editCustom(null); return; }
        missingNote = false;
        ctx.save({ routineId: select.value }); render();
      });

      const topic = h('input', { type: 'text', class: 'input', value: st.topic || '', maxlength: 200, placeholder: t('Topic or stimulus (optional), e.g. 《背影》 or the painting on screen') });
      topic.addEventListener('input', () => ctx.save({ topic: topic.value }));

      const extra = [];
      if (r.kind === 'viewpoints') {
        const ta = h('textarea', { class: 'input rt-vps', rows: 4, placeholder: t('One viewpoint per line, e.g.\nThe father\nThe son\nA passer-by') });
        ta.value = (st.viewpoints || []).join('\n');
        ta.addEventListener('input', () => ctx.save({ viewpoints: ta.value.split('\n') }));
        extra.push(h('label', { class: 'field' }, h('span', {}, t('Viewpoints students can choose')), ta));
      }
      if (r.kind === 'tug') {
        const mk = (i, ph) => {
          const inp = h('input', { type: 'text', class: 'input', value: (st.sides || [])[i] || '', maxlength: 80, placeholder: ph });
          inp.addEventListener('input', () => { const s2 = [...(st.sides || ['', ''])]; s2[i] = inp.value; ctx.save({ sides: s2 }); });
          return inp;
        };
        extra.push(h('div', { class: 'field' }, h('span', {}, t('The two sides')),
          h('div', { class: 'row gap' }, mk(0, t('Side A, e.g. Keep traditions')), h('span', { class: 'muted' }, t('vs')), mk(1, t('Side B, e.g. Embrace change')))));
      }

      const sel = classSelect(ctx, () => st.classId, (id) => ctx.save({ classId: id }));
      const connected = google.isConnected();
      root.replaceChildren(h('div', { class: 'rt-setup' },
        h('div', { class: 'rt-setup-top' },
          h('label', { class: 'field grow' }, h('span', {}, t('Routine')), h('div', { class: 'row gap' }, select,
            r.group === 'custom' ? h('button', { class: 'btn small with-icon', onclick: () => editCustom(r) }, icon('pencil'), t('Edit')) : null)),
          h('div', { class: 'rt-google-wrap' }, googleChip()),
        ),
        h('div', { class: 'rt-steps-preview' }, ...r.steps.map((s2) => h('span', { class: 'chip' }, R.tr(s2.label, st.lang)))),
        h('label', { class: 'field' }, h('span', {}, t('Topic')), topic),
        ...extra,
        h('div', { class: 'rt-opts' },
          h('div', { class: 'field' }, h('span', {}, t('Language for students')), seg(LANGS, st.lang, (v) => { ctx.save({ lang: v }); render(); }, t('Language for students'))),
          h('div', { class: 'field' }, h('span', {}, t('Students’ names')), seg(NAMES, st.names, (v) => { ctx.save({ names: v }); render(); }, t('Students’ names'))),
          ctx.store.getClasses().length ? h('div', { class: 'field' }, h('span', {}, t('Class (for the Sheet)')), sel.el) : null,
        ),
        missingNote ? h('p', { class: 'rt-status warn' }, t('This board used a custom routine that isn’t on this computer, so {name} is chosen instead. Pick another from the list, or make it with “+ New custom routine…”.', { name: R.tr(r.name, 'both') })) : null,
        error ? h('p', { class: 'error' }, error) : null,
        busy ? h('p', { class: 'muted' }, busy) : null,
        h('div', { class: 'row gap wrap rt-start' },
          h('button', { class: 'btn primary with-icon', disabled: !!busy, onclick: () => start(true) }, icon('qrcode'),
            connected ? t('Start with student devices') : t('Connect Google and start')),
          h('button', { class: 'btn with-icon', disabled: !!busy, onclick: () => start(false) }, icon('player-play'), t('Start without devices')),
        ),
        h('p', { class: 'muted small' }, connected
          ? t('Students scan a QR code and answer a Google Form; their answers appear here. When you end the routine, the answers are saved to this class’s Google Sheet.')
          : t('Without Google, you or a student scribe type notes onto the wall. Connect Google to let students answer on their own devices.')),
      ));
    }

    function newRoutine() { ctx.save({ run: null, notes: [], view: 'setup' }); render(); }

    function runBar() {
      const run = st.run;
      const r = run.routine;
      const live = run.status === 'live';
      const n = responseCount();
      return h('div', { class: 'rt-bar' },
        h('div', { class: 'rt-title' },
          h('strong', {}, R.tr(r.name, lang())),
          run.topic ? h('span', { class: 'muted' }, run.topic) : null),
        h('div', { class: 'row gap' },
          seg([['prompt', 'Prompt'], ['wall', 'Wall']], st.view === 'prompt' ? 'prompt' : 'wall', (v) => { ctx.save({ view: v }); render(); }, t('View')),
          run.url && live ? h('button', { class: 'btn small with-icon', onclick: bigQr, title: t('Show the QR code large') }, icon('qrcode'), 'QR') : null,
          run.formId ? h('span', { class: 'rt-count', title: t('Students who have answered') }, n === 1 ? t('{n} answer', { n }) : t('{n} answers', { n })) : null,
          run.formId ? googleChip() : null,
          live ? confirmButton(h('span', { class: 'with-icon' }, icon('player-stop'), t('End')), t('End and save?'), end, 'btn small danger')
            // A new routine clears the wall, so ask first unless it is already saved to Sheets.
            : run.saved || !st.notes.length
              ? h('button', { class: 'btn small primary', onclick: newRoutine }, t('New routine'))
              : confirmButton(t('New routine'), t('Clear the wall?'), newRoutine, 'btn small primary'),
        ));
    }

    function statusLine() {
      const run = st.run;
      if (busy) return h('p', { class: 'rt-status muted' }, busy);
      if (error) {
        return h('p', { class: 'rt-status error' }, error, ' ',
          run.status === 'ended' && !run.saved ? h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, t('Try again')) : null);
      }
      if (run.status === 'ended') {
        if (run.saved) return h('p', { class: 'rt-status ok' }, icon('check'), ' ', t('Ended. Saved to Google Sheets.'), ' ', h('a', { href: run.sheetUrl, target: '_blank', rel: 'noopener' }, t('Open the Sheet')));
        return h('p', { class: 'rt-status muted' }, t('Ended.'), ' ', h('button', { class: 'link-btn', onclick: async () => { if (!google.isConnected()) await connect(); save(); } }, t('Save to Google Sheets')));
      }
      if (run.formId && !google.isConnected()) return h('p', { class: 'rt-status warn' }, t('The Google sign-in has run out, so new answers are not arriving. Click Reconnect Google.'));
      return null;
    }

    function renderPrompt() {
      const run = st.run;
      const r = run.routine;
      const L = lang();
      const steps = r.kind === 'tug'
        ? [h('div', { class: 'rt-tug-sides' }, h('span', {}, run.sides[0]), h('span', { class: 'rt-rope' }), h('span', {}, run.sides[1])),
          ...r.steps.map((s2) => h('li', {}, h('span', { class: 'rt-step-label' }, R.tr(s2.label, L)), h('span', { class: 'rt-stem' }, R.tr(s2.stem, L, '\n'))))]
        : r.steps.map((s2) => h('li', {}, h('span', { class: 'rt-step-label' }, R.tr(s2.label, L)), h('span', { class: 'rt-stem' }, R.tr(s2.stem, L, '\n'))));
      return h('div', { class: 'rt-prompt' + (run.url && run.status === 'live' ? ' with-qr' : '') },
        h('div', { class: 'rt-prompt-main' },
          h('h2', { class: 'rt-prompt-title' }, R.tr(r.name, L, '\n')),
          run.topic ? h('p', { class: 'rt-prompt-topic' }, run.topic) : null,
          r.kind === 'viewpoints' ? h('div', { class: 'rt-vp-list' }, ...run.viewpoints.map((v) => h('span', { class: 'chip' }, v))) : null,
          h('ol', { class: 'rt-prompt-steps' }, ...steps)),
        run.url && run.status === 'live' ? h('div', { class: 'rt-qr', onclick: bigQr, title: t('Show large') }, qrSvg(run.url), h('span', { class: 'muted small' }, 'Scan to answer · 扫码作答')) : null,
      );
    }

    function renderWall() {
      const cols = columns();
      const hiddenCount = st.notes.filter((n) => n.hidden && !n.empty).length;
      const wall = h('div', { class: 'rt-wall' + (routine().kind === 'tug' ? ' tug' : ''), style: { gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` } },
        ...cols.map((c) => {
          const notes = st.notes.filter((n) => !n.empty && c.match(n) && (showHidden || !n.hidden));
          const adder = h('textarea', { class: 'rt-add', rows: 1, placeholder: t('+ Add a note') });
          const commit = (keepFocus) => {
            const v = adder.value;
            adder.value = '';
            if (!v.trim()) return;
            refocus = keepFocus ? c.key : null;
            addNote(c.extra.step, v, c.extra.pos ? { pos: c.extra.pos } : {});
          };
          adder.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(true); }
            if (e.key === 'Escape') { adder.value = ''; adder.blur(); }
          });
          adder.addEventListener('blur', () => commit(false));
          return h('section', { class: 'rt-col', 'data-key': c.key },
            h('header', { class: 'rt-col-head' }, h('strong', {}, c.title), c.sub ? h('span', { class: 'muted small' }, c.sub) : null,
              h('span', { class: 'rt-col-count' }, String(notes.length))),
            h('div', { class: 'rt-notes' }, ...notes.map(noteEl)),
            adder);
        }));
      return h('div', { class: 'rt-wall-wrap' }, wall,
        hiddenCount ? h('button', { class: 'link-btn rt-hidden-toggle', onclick: () => { showHidden = !showHidden; render(); } },
          showHidden
            ? (hiddenCount === 1 ? t('Hide the {n} hidden note again', { n: hiddenCount }) : t('Hide the {n} hidden notes again', { n: hiddenCount }))
            : (hiddenCount === 1 ? t('{n} hidden note · show', { n: hiddenCount }) : t('{n} hidden notes · show', { n: hiddenCount }))) : null);
    }

    function render() {
      if (!alive) return;
      if (!st.run) { renderSetup(); return; }
      // Keep the cursor where the teacher is typing when answers arrive.
      const active = document.activeElement;
      const typingIn = active?.classList?.contains('rt-add') && root.contains(active) ? active.closest('.rt-col')?.dataset.key : null;
      const draft = typingIn ? active.value : '';
      root.replaceChildren(runBar(), statusLine() || '', st.view === 'prompt' ? renderPrompt() : renderWall());
      const key = refocus || typingIn;
      refocus = null;
      if (key) {
        const box = root.querySelector(`.rt-col[data-key="${key}"] .rt-add`);
        if (box) { box.value = draft; box.focus(); }
      }
    }

    function bigQr() {
      const run = st.run;
      if (!run?.url) return;
      openModal('Scan to answer · 扫码作答', (mb) => {
        mb.append(h('div', { class: 'rt-qr-big' }, qrSvg(run.url)),
          h('p', { class: 'center-text' }, R.tr(run.routine.name, run.lang)),
          h('p', { class: 'muted small center-text rt-link' }, run.url));
      });
    }

    // ---------- Custom routines ----------
    function editCustom(existing) {
      const r = existing ? clone(existing) : { id: 'custom-' + ctx.store.uid(), group: 'custom', kind: 'columns', name: { en: '', zh: '' },
        steps: [{ id: 's1', label: { en: '', zh: '' }, stem: { en: '', zh: '' } }, { id: 's2', label: { en: '', zh: '' }, stem: { en: '', zh: '' } }] };
      openModal(existing ? t('Edit custom routine') : t('New custom routine'), (mb) => {
        const inp = (obj, key, ph) => {
          const el = h('input', { type: 'text', class: 'input', value: obj[key] || '', placeholder: ph, maxlength: 160 });
          el.addEventListener('input', () => { obj[key] = el.value; });
          return el;
        };
        const stepsBox = h('div', { class: 'rt-edit-steps' });
        const drawSteps = () => {
          stepsBox.replaceChildren(...r.steps.map((s2, i) => h('div', { class: 'rt-edit-step' },
            h('div', { class: 'row gap space-between' }, h('strong', {}, t('Step {n}', { n: i + 1 })),
              r.steps.length > 1 ? h('button', { class: 'link-btn', onclick: () => { r.steps.splice(i, 1); drawSteps(); } }, t('Remove')) : null),
            h('div', { class: 'rt-edit-grid' },
              inp(s2.label, 'en', t('English heading, e.g. See')), inp(s2.label, 'zh', t('Chinese heading, e.g. 看')),
              inp(s2.stem, 'en', t('English sentence starter, e.g. I see…')), inp(s2.stem, 'zh', t('Chinese sentence starter, e.g. 我看到……'))))),
          r.steps.length < 6 ? h('button', { class: 'btn small with-icon', onclick: () => {
            r.steps.push({ id: 's' + (Math.max(0, ...r.steps.map((x) => Number(x.id.slice(1)) || 0)) + 1), label: { en: '', zh: '' }, stem: { en: '', zh: '' } });
            drawSteps();
          } }, icon('plus'), t('Add a step')) : null);
        };
        drawSteps();
        const msg = h('p', { class: 'error' });
        mb.append(
          h('div', { class: 'rt-edit-grid' }, h('label', { class: 'field' }, h('span', {}, t('Name (English)')), inp(r.name, 'en', t('e.g. Think · Pair · Share'))),
            h('label', { class: 'field' }, h('span', {}, t('Name (Chinese)')), inp(r.name, 'zh', t('e.g. 想·配·享')))),
          stepsBox, msg,
          h('div', { class: 'row gap space-between' },
            existing ? confirmButton(t('Delete routine'), t('Click again to delete'), () => {
              R.deleteCustom(r.id); if (st.routineId === r.id) ctx.save({ routineId: 'see-think-wonder' }); closeModal(); render();
            }, 'btn danger') : h('span'),
            h('div', { class: 'row gap' },
              h('button', { class: 'btn', onclick: closeModal }, t('Cancel')),
              h('button', { class: 'btn primary', onclick: () => {
                r.steps = r.steps.filter((s2) => (s2.label.en || s2.label.zh || s2.stem.en || s2.stem.zh).trim());
                r.steps.forEach((s2) => { if (!s2.label.en && !s2.label.zh) s2.label = { en: s2.stem.en, zh: s2.stem.zh }; if (!s2.stem.en && !s2.stem.zh) s2.stem = { ...s2.label }; });
                if (!(r.name.en || r.name.zh).trim()) { msg.textContent = t('Give the routine a name.'); return; }
                if (!r.steps.length) { msg.textContent = t('Add at least one step.'); return; }
                R.saveCustom(r); ctx.save({ routineId: r.id }); closeModal(); render();
              } }, t('Save')))),
        );
      });
    }

    const offGoogle = google.onChange(() => { syncPolling(); if (!dragging) render(); });
    const offClasses = ctx.onClassesChange(() => { if (!st.run && !dragging) render(); });
    render();
    syncPolling();
    return { destroy() { alive = false; clearInterval(pollTimer); offGoogle(); offClasses(); dragging?.ghost?.remove(); } };
  },
};
