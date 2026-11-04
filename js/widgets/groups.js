import { h, classSelect, shuffle } from '../ui.js';
import { t } from '../i18n.js';

export default {
  type: 'groups',
  title: 'Groups',
  icon: 'users-group',
  tone: 'people', // dock tile colour: time | people | signal | content
  size: { w: 560, h: 400 },
  minSize: { w: 300, h: 240 },
  // Shared board files never include student names.
  share: (st) => ({ mode: st.mode, n: st.n, groups: [] }),

  mount(body, ctx) {
    // State: classId, mode ('size' | 'count'), n, groups ([[names]])
    if (ctx.state.mode == null) ctx.save({ mode: 'size', n: 4, groups: [] });

    const cls = () => ctx.store.getClass(ctx.state.classId) || ctx.store.getActiveClass();
    const sel = classSelect(ctx, () => ctx.state.classId, (id) => { ctx.save({ classId: id, groups: [] }); render(); });

    const mode = h('select', { 'aria-label': t('Group by') },
      h('option', { value: 'size' }, t('per group')),
      h('option', { value: 'count' }, t('groups')),
    );
    mode.value = ctx.state.mode;
    const n = h('input', { type: 'number', min: 2, max: 20, value: ctx.state.n, class: 'num', 'aria-label': t('Number') });
    const goBtn = h('button', { class: 'btn primary' }, t('Make groups'));
    const grid = h('div', { class: 'groups-grid' });
    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, t('Add a class list to make groups.')),
      h('button', { class: 'btn primary', onclick: () => ctx.openClasses() }, t('Add class list')),
    );
    const main = h('div', { class: 'groups' },
      h('div', { class: 'row gap wrap' }, sel.el, n, mode, goBtn),
      grid,
    );
    body.append(main, emptyMsg);

    function make() {
      const c = cls();
      if (!c || !c.students.length) return;
      const names = shuffle(c.students);
      const k = Math.max(1, parseInt(n.value, 10) || 2);
      const count = mode.value === 'size' ? Math.max(1, Math.round(names.length / k)) : Math.min(k, names.length);
      const groups = Array.from({ length: count }, () => []);
      names.forEach((name, i) => groups[i % count].push(name));
      ctx.save({ mode: mode.value, n: k, groups });
      render();
    }

    function render() {
      const c = cls();
      const has = c && c.students.length > 0;
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) return;
      grid.replaceChildren(...(ctx.state.groups || []).map((g, i) =>
        h('div', { class: 'group-card' },
          h('div', { class: 'group-title' }, t('Group {n}', { n: i + 1 })),
          h('ul', {}, ...g.map((name) => h('li', {}, name))),
        )));
      if (!ctx.state.groups?.length) {
        const n = c.students.length;
        grid.append(h('p', { class: 'muted' }, n === 1
          ? t('{n} student. Choose a size and click “Make groups”.', { n })
          : t('{n} students. Choose a size and click “Make groups”.', { n })));
      }
    }

    goBtn.addEventListener('click', make);
    mode.addEventListener('change', () => ctx.save({ mode: mode.value }));
    n.addEventListener('change', () => ctx.save({ n: parseInt(n.value, 10) || 2 }));
    const unsub = ctx.onClassesChange(() => { sel.refresh(); render(); });
    render();
    return { destroy: unsub };
  },
};
