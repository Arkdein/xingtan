// Lesson flow (课堂流程): learning intentions and success criteria, then the
// lesson's steps with Now / Next, so students can see where the lesson is going.
// Everything is kept in the tool on the board, so each lesson board has its own.
import { h, put, segmented, bi } from '../ui.js';
import { icon } from '../icons.js';

const LANGS = [['en', 'EN'], ['zh', '中文'], ['both', 'Both 双语']];

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
    const t = (pair) => bi(pair[0], pair[1], st.lang);

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
          h('h3', {}, icon('target'), t(L.li)),
          h('p', { class: 'lf-stem' }, t(L.liStem)),
          h('ul', {}, ...st.li.map((x) => h('li', {}, x.text)))) : null,
        st.sc.length && !compact ? h('section', { class: 'lf-goal sc' },
          h('h3', {}, icon('circle-check'), t(L.sc)),
          h('p', { class: 'lf-stem' }, t(L.scStem)),
          h('ul', { class: 'lf-sc' }, ...st.sc.map((x, i) => h('li', {},
            h('button', { class: 'lf-tick' + (x.done ? ' done' : ''), 'aria-pressed': String(!!x.done), title: x.done ? 'Not yet' : 'Tick off', onclick: () => toggleSc(i) },
              icon(x.done ? 'square-check' : 'square')),
            h('span', { class: x.done ? 'done' : '' }, x.text))))) : null);
    }

    function listView() {
      const i = curIndex();
      const nextIdx = st.steps.findIndex((s, k) => k > i && !s.done);
      return h('ol', { class: 'lf-steps' }, ...st.steps.map((s, k) => {
        const state = k === i ? 'now' : k === nextIdx ? 'next' : s.done ? 'done' : '';
        return h('li', { class: `lf-step ${state}` },
          h('button', { class: 'lf-check', title: s.done ? 'Mark as not done' : 'Mark as done', 'aria-label': s.done ? 'Mark as not done' : 'Mark as done', onclick: () => toggleDone(k) },
            s.done ? icon('check') : h('span', {}, String(k + 1))),
          h('button', { class: 'lf-step-text', title: 'Make this the current step', onclick: () => setCur(k) }, s.text),
          state === 'now' ? h('span', { class: 'lf-badge now' }, t(L.now)) : state === 'next' ? h('span', { class: 'lf-badge next' }, t(L.next)) : null);
      }));
    }

    function focusView() {
      const i = curIndex();
      const cur = st.steps[i];
      const nextStep = st.steps.find((s, k) => k > i && !s.done);
      return h('div', { class: 'lf-focus' },
        cur ? h('div', { class: 'lf-now' },
          h('span', { class: 'lf-badge now' }, `${t(L.now)} · ${i + 1} / ${st.steps.length}`),
          h('p', { class: 'lf-now-text' }, cur.text))
          : h('div', { class: 'lf-now' }, h('p', { class: 'lf-now-text' }, icon('flag'), ' ', t(L.done))),
        nextStep ? h('p', { class: 'lf-next-line' }, h('span', { class: 'lf-badge next' }, t(L.next)), nextStep.text) : null);
    }

    function showView() {
      const i = curIndex();
      const finished = st.steps.length > 0 && i >= st.steps.length;
      const content = st.view === 'focus' ? [goals(true), focusView()] : [goals(), st.steps.length ? listView() : null,
        finished ? h('p', { class: 'lf-finished' }, icon('flag'), t(L.done)) : null];
      put(root, 
        st.title ? h('h2', { class: 'lf-title' }, st.title) : null,
        h('div', { class: 'lf-body' }, ...content),
        h('div', { class: 'lf-bar' },
          h('div', { class: 'row gap' },
            h('button', { class: 'btn small with-icon', onclick: back, disabled: curIndex() === 0, title: 'Back a step' }, icon('chevron-left'), 'Back'),
            h('button', { class: 'btn small primary with-icon', onclick: next, disabled: finished || !st.steps.length, title: 'Tick off this step and go to the next' }, 'Next', icon('chevron-right'))),
          h('div', { class: 'row gap wrap lf-bar-end' },
            segmented([['list', 'List'], ['focus', 'Now / Next']], st.view, (v) => { ctx.save({ view: v }); render(); }, 'View'),
            segmented(LANGS, st.lang, (v) => { ctx.save({ lang: v }); render(); }, 'Language'),
            h('button', { class: 'icon-btn small', title: 'Start again: untick everything', 'aria-label': 'Start again', onclick: restart }, icon('rotate')),
            h('button', { class: 'icon-btn small', title: 'Edit', 'aria-label': 'Edit', onclick: () => { editing = true; render(); } }, icon('pencil')))),
      );
    }

    function editView() {
      const title = h('input', { class: 'input', type: 'text', value: st.title || '', maxlength: 120, placeholder: 'e.g. 中二华文 · 第五课《背影》' });
      const li = h('textarea', { class: 'input', rows: 2, placeholder: 'One per line, e.g.\nidentify how the writer shows the father’s love\n理解作者如何通过细节描写表现父爱' });
      const sc = h('textarea', { class: 'input', rows: 3, placeholder: 'One per line, e.g.\npoint out two details that show the father’s love\n用自己的话说明一个细节的作用' });
      const steps = h('textarea', { class: 'input lf-steps-input', rows: 6, placeholder: 'One step per line, e.g.\nWarm-up: 看图说话\nRead paragraphs 4–6 together\nPair work: find the details\nShare and discuss\nExit ticket' });
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
        h('label', { class: 'field' }, h('span', {}, 'Lesson title 课题 (optional)'), title),
        h('label', { class: 'field' }, h('span', {}, `${L.li[0]} ${L.li[1]}: ${L.liStem[0]}`), li),
        h('label', { class: 'field' }, h('span', {}, `${L.sc[0]} ${L.sc[1]}: ${L.scStem[0]}`), sc),
        h('label', { class: 'field' }, h('span', {}, 'Steps 步骤'), steps),
        h('div', { class: 'row gap wrap space-between' },
          h('label', { class: 'row gap lf-check-label' }, goalsBox, 'Show the intentions and criteria on the board'),
          h('button', { class: 'btn primary', onclick: () => { save(); editing = false; render(); } }, 'Done')),
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
