// Lesson flow (课堂流程): learning intentions and success criteria, then the
// lesson's steps with Now / Next, so students can see where the lesson is going.
// Everything is kept in the tool on the board, so each lesson board has its own.
import { h, put, segmented, bi } from '../ui.js';
import { icon } from '../icons.js';
import { t } from '../i18n.js';

// 'Both' goes through t() where the buttons are drawn; EN and 中文 stay in their own script.
const LANGS = [['en', 'EN'], ['zh', '中文'], ['both', 'Both']];
const langOptions = () => LANGS.map(([v, text]) => [v, v === 'both' ? t(text) : text]);

// What students see: shown in the tool's own language setting (EN / 中文 / both),
// not the interface language.
const L = {
  li: ['Learning intentions', '学习目标'],
  liStem: ['We are learning to…', '我们要学习……'],
  sc: ['Success criteria', '成功标准'],
  scStem: ['I can…', '我能够……'],
  now: ['Now', '现在'],
  next: ['Next', '接下来'],
  done: ['All done', '全部完成'],
  steps: ['Lesson flow', '课堂流程'],
};

const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default {
  type: 'lessonflow',
  title: 'Lesson flow',
  icon: 'list-check',
  tone: 'time', // dock tile colour: time | people | signal | content | language
  size: { w: 580, h: 540 },
  minSize: { w: 300, h: 240 },

  mount(body, ctx) {
    const st = ctx.state;
    if (!Array.isArray(st.steps)) {
      ctx.save({ title: '', li: [], sc: [], steps: [], cur: 0, lang: 'both', view: 'list', goals: true });
    }
    const root = h('div', { class: 'lf' });
    body.append(root);
    // A new, empty Lesson flow opens ready to type in.
    let editing = !st.steps.length && !st.li.length && !st.sc.length;
    const tl = (pair) => bi(pair[0], pair[1], st.lang);

    // ---------- Moving through the lesson ----------
    const curIndex = () => Math.max(0, Math.min(st.cur ?? 0, st.steps.length));
    function setCur(i) { ctx.save({ cur: Math.max(0, Math.min(i, st.steps.length)) }); render(); }
    function next() {
      const i = curIndex();
      if (i >= st.steps.length) return;
      const steps = st.steps.map((s, k) => (k === i ? { ...s, done: true } : s));
      const after = steps.findIndex((s, k) => k > i && !s.done);
      ctx.save({ steps, cur: after < 0 ? steps.length : after });
      render();
    }
    function back() {
      const i = curIndex();
      if (i <= 0) return;
      const steps = st.steps.map((s, k) => (k === i - 1 ? { ...s, done: false } : s));
      ctx.save({ steps, cur: i - 1 });
      render();
    }
    function toggleDone(i) {
      ctx.save({ steps: st.steps.map((s, k) => (k === i ? { ...s, done: !s.done } : s)) });
      render();
    }
    function toggleSc(i) {
      ctx.save({ sc: st.sc.map((s, k) => (k === i ? { ...s, done: !s.done } : s)) });
      render();
    }
    function restart() {
      ctx.save({ steps: st.steps.map((s) => ({ ...s, done: false })), sc: st.sc.map((s) => ({ ...s, done: false })), cur: 0 });
      render();
    }

    // ---------- Views ----------
    function goals(compact = false) {
      if (!st.goals || (!st.li.length && !st.sc.length)) return null;
      return h('div', { class: 'lf-goals' + (compact ? ' compact' : '') },
        st.li.length ? h('section', { class: 'lf-goal li' },
          h('h3', {}, icon('target'), tl(L.li)),
          h('p', { class: 'lf-stem' }, tl(L.liStem)),
          h('ul', {}, ...st.li.map((x) => h('li', {}, x.text)))) : null,
        st.sc.length && !compact ? h('section', { class: 'lf-goal sc' },
          h('h3', {}, icon('circle-check'), tl(L.sc)),
          h('p', { class: 'lf-stem' }, tl(L.scStem)),
          h('ul', { class: 'lf-sc' }, ...st.sc.map((x, i) => h('li', {},
            h('button', { class: 'lf-tick' + (x.done ? ' done' : ''), 'aria-pressed': String(!!x.done), title: x.done ? t('Untick') : t('Tick off'), onclick: () => toggleSc(i) },
              icon(x.done ? 'square-check' : 'square')),
            h('span', { class: x.done ? 'done' : '' }, x.text))))) : null);
    }

    function listView() {
      const i = curIndex();
      const nextIdx = st.steps.findIndex((s, k) => k > i && !s.done);
      return h('ol', { class: 'lf-steps' }, ...st.steps.map((s, k) => {
        const state = k === i ? 'now' : k === nextIdx ? 'next' : s.done ? 'done' : '';
        return h('li', { class: `lf-step ${state}` },
          h('button', { class: 'lf-check', title: s.done ? t('Mark as not done') : t('Mark as done'), 'aria-label': s.done ? t('Mark as not done') : t('Mark as done'), onclick: () => toggleDone(k) },
            s.done ? icon('check') : h('span', {}, String(k + 1))),
          h('button', { class: 'lf-step-text', title: t('Make this the current step'), onclick: () => setCur(k) }, s.text),
          state === 'now' ? h('span', { class: 'lf-badge now' }, tl(L.now)) : state === 'next' ? h('span', { class: 'lf-badge next' }, tl(L.next)) : null);
      }));
    }

    function focusView() {
      const i = curIndex();
      const cur = st.steps[i];
      const nextStep = st.steps.find((s, k) => k > i && !s.done);
      return h('div', { class: 'lf-focus' },
        cur ? h('div', { class: 'lf-now' },
          h('span', { class: 'lf-badge now' }, `${tl(L.now)} · ${i + 1} / ${st.steps.length}`),
          h('p', { class: 'lf-now-text' }, cur.text))
          : h('div', { class: 'lf-now' }, h('p', { class: 'lf-now-text' }, icon('flag'), ' ', tl(L.done))),
        nextStep ? h('p', { class: 'lf-next-line' }, h('span', { class: 'lf-badge next' }, tl(L.next)), nextStep.text) : null);
    }

    function showView() {
      const i = curIndex();
      const finished = st.steps.length > 0 && i >= st.steps.length;
      const content = st.view === 'focus' ? [goals(true), focusView()] : [goals(), st.steps.length ? listView() : null,
        finished ? h('p', { class: 'lf-finished' }, icon('flag'), tl(L.done)) : null];
      put(root, 
        st.title ? h('h2', { class: 'lf-title' }, st.title) : null,
        h('div', { class: 'lf-body' }, ...content),
        h('div', { class: 'lf-bar' },
          h('div', { class: 'row gap' },
            h('button', { class: 'btn small with-icon', onclick: back, disabled: curIndex() === 0, title: t('Back a step') }, icon('chevron-left'), t('Back')),
            h('button', { class: 'btn small primary with-icon', onclick: next, disabled: finished || !st.steps.length, title: t('Tick off this step and go to the next') }, t('Next'), icon('chevron-right'))),
          h('div', { class: 'row gap wrap lf-bar-end' },
            segmented([['list', t('List')], ['focus', t('Now / Next')]], st.view, (v) => { ctx.save({ view: v }); render(); }, t('View')),
            segmented(langOptions(), st.lang, (v) => { ctx.save({ lang: v }); render(); }, t('Language for students')),
            h('button', { class: 'icon-btn small', title: t('Start again: untick everything'), 'aria-label': t('Start again'), onclick: restart }, icon('rotate')),
            h('button', { class: 'icon-btn small', title: t('Edit'), 'aria-label': t('Edit'), onclick: () => { editing = true; render(); } }, icon('pencil')))),
      );
    }

    function editView() {
      const title = h('input', { class: 'input', type: 'text', value: st.title || '', maxlength: 120, placeholder: t('e.g. 中二华文 · 第五课《背影》') });
      const li = h('textarea', { class: 'input', rows: 2, placeholder: t('One per line, e.g.\nidentify how the writer shows the father’s love') });
      const sc = h('textarea', { class: 'input', rows: 3, placeholder: t('One per line, e.g.\npoint out two details that show the father’s love\nexplain in my own words what one detail does') });
      const steps = h('textarea', { class: 'input lf-steps-input', rows: 6, placeholder: t('One step per line, e.g.\nWarm-up: 看图说话\nRead paragraphs 4–6 together\nPair work: find the details\nShare and discuss\nExit ticket') });
      li.value = st.li.map((x) => x.text).join('\n');
      sc.value = st.sc.map((x) => x.text).join('\n');
      steps.value = st.steps.map((x) => x.text).join('\n');
      const goalsBox = h('input', { type: 'checkbox', checked: st.goals !== false });

      // Keep ticks on lines that are still there.
      const keep = (old, texts) => texts.map((text, i) => {
        const same = old[i]?.text === text ? old[i] : old.find((o) => o.text === text);
        return { id: same?.id || ctx.store.uid(), text, done: !!same?.done };
      });
      const save = () => {
        const newSteps = keep(st.steps, lines(steps.value));
        ctx.save({ title: title.value.trim(), li: keep(st.li, lines(li.value)), sc: keep(st.sc, lines(sc.value)), steps: newSteps,
          cur: Math.min(st.cur ?? 0, newSteps.length), goals: goalsBox.checked });
      };
      [title, li, sc, steps].forEach((el) => el.addEventListener('input', save));
      goalsBox.addEventListener('change', save);

      put(root, h('div', { class: 'lf-edit' },
        h('label', { class: 'field' }, h('span', {}, t('Lesson title (optional)')), title),
        h('label', { class: 'field' }, h('span', {}, t('Learning intentions: We are learning to…')), li),
        h('label', { class: 'field' }, h('span', {}, t('Success criteria: I can…')), sc),
        h('label', { class: 'field' }, h('span', {}, t('Steps')), steps),
        h('div', { class: 'row gap wrap space-between' },
          h('label', { class: 'row gap lf-check-label' }, goalsBox, t('Show the intentions and criteria on the board')),
          h('button', { class: 'btn primary', onclick: () => { save(); editing = false; render(); } }, t('Done'))),
      ));
      (st.steps.length ? title : li).focus({ preventScroll: true });
    }

    function render() {
      if (editing) editView(); else showView();
    }
    render();
    return { destroy() {} };
  },
};
