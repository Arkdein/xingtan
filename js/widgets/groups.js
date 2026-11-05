import { h, classSelect, shuffle } from '../ui.js';
import { t } from '../i18n.js';
import * as points from '../points.js';

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

    // Students marked absent today in Points are left out of new groups.
    const absent = (c) => new Set(points.absentNames(c.id));
    const present = (c) => { const a = absent(c); return c.students.filter((s) => !a.has(s)); };

    function make() {
      const c = cls();
      if (!c || !present(c).length) return;
      const names = shuffle(present(c));
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
      // The class list changed since the groups were made: drop names that are no
      // longer on it, and say who isn't in a group yet.
      const onList = new Set(c.students);
      const groups = (ctx.state.groups || []).map((g) => g.filter((name) => onList.has(name))).filter((g) => g.length);
      if (JSON.stringify(groups) !== JSON.stringify(ctx.state.groups || [])) ctx.save({ groups });
      const grouped = new Set(groups.flat());
      const left = groups.length ? present(c).filter((s) => !grouped.has(s)) : [];
      grid.replaceChildren(...groups.map((g, i) =>
        h('div', { class: 'group-card' },
          h('div', { class: 'group-title' }, t('Group {n}', { n: i + 1 })),
          h('ul', {}, ...g.map((name) => h('li', {}, name))),
        )));
      if (left.length) {
        grid.append(h('p', { class: 'muted groups-note' }, t('Not in a group yet: {names}. Click “Make groups” to include them.', { names: left.join(', ') })));
      }
      if (!groups.length) {
        const n = present(c).length;
        const away = c.students.length - n;
        grid.append(h('p', { class: 'muted' }, n === 1
          ? t('{n} student. Choose a size and click “Make groups”.', { n })
          : t('{n} students. Choose a size and click “Make groups”.', { n }),
        away ? ' ' + (away === 1 ? t('1 student marked absent in Points is left out.') : t('{n} students marked absent in Points are left out.', { n: away })) : ''));
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
