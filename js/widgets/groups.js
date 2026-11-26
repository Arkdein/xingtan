// Groups: sorts a class into groups, by the number in each group or the number of groups.
//   Mix: random, a spread of teacher-set levels in each group, or a spread of Points totals.
//   Keep together / keep apart, roles (rotating), and avoiding the last 3 rounds' groupings
//   come from the class's group settings (⚙, see grouping.js), shared by every board.
//   +/− on a group card gives every member a point in Points.
import { h, classSelect, editClassButton, segmented, openModal } from '../ui.js';
import * as roster from '../roster.js';
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import * as points from '../points.js';
import * as grouping from '../grouping.js';
import { playChime } from '../sounds.js';
import { openSkillPicker, closeSkillPicker, isOpenFor } from '../skillpick.js';

const BALANCES = [
  ['random', 'Random'],
  ['levels', 'Mix levels'],
  ['points', 'Mix points'],
];

export default {
  type: 'groups',
  title: 'Groups',
  icon: 'users-group',
  tone: 'people', // dock tile colour: time | people | signal | content
  size: { w: 600, h: 420 },
  minSize: { w: 300, h: 240 },
  // Shared board files never include student names.
  share: (st) => ({ mode: st.mode, n: st.n, balance: st.balance, showRoles: st.showRoles, ptsBtns: st.ptsBtns, groups: [], roleMap: {}, notes: null }),

  mount(body, ctx) {
    // State: classId, mode ('size' | 'count'), n, groups ([[names]]), balance ('random' | 'levels' | 'points'),
    // showRoles, roleMap ({ name: role } for the groups on screen), notes (what the last mix couldn't do),
    // ptsBtns (+/− on group cards).
    if (ctx.state.mode == null) ctx.save({ mode: 'size', n: 4, groups: [] });
    if (ctx.state.balance == null) ctx.save({ balance: 'random', showRoles: false, roleMap: {}, notes: null, ptsBtns: true });

    const cls = () => ctx.store.getClass(ctx.state.classId) || ctx.store.getActiveClass();
    const sel = classSelect(ctx, () => ctx.state.classId, (id) => { ctx.save({ classId: id, groups: [], roleMap: {}, notes: null }); render(); });

    const mode = h('select', { 'aria-label': t('Group by') },
      h('option', { value: 'size' }, t('per group')),
      h('option', { value: 'count' }, t('groups')),
    );
    mode.value = ctx.state.mode;
    const n = h('input', { type: 'number', min: 2, max: 20, value: ctx.state.n, class: 'num', 'aria-label': t('Number') });
    const balance = h('select', { 'aria-label': t('Mix'), title: t('How to mix the groups') },
      ...BALANCES.map(([v, label]) => h('option', { value: v }, t(label))));
    balance.value = ctx.state.balance;
    const rolesBox = h('input', { type: 'checkbox', checked: !!ctx.state.showRoles });
    const goBtn = h('button', { class: 'btn primary' }, t('Make groups'));
    const setBtn = h('button', {
      class: 'icon-btn small', title: t('Levels, keep together / apart, roles'), 'aria-label': t('Group settings'),
      onclick: () => openSettings(),
    }, icon('adjustments-horizontal'));
    const grid = h('div', { class: 'groups-grid' });
    const noteEl = h('div', { class: 'groups-notes' });
    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, t('Add a class list to make groups.')),
      h('button', { class: 'btn primary', onclick: () => { const c = cls(); ctx.openClasses(c ? c.id : null); } }, t('Add class list')),
    );
    const main = h('div', { class: 'groups' },
      h('div', { class: 'row gap wrap' }, sel.el, editClassButton(ctx, cls), n, mode, balance,
        h('label', { class: 'row gap groups-roles-pick', title: t('Give each member a role, such as leader or scribe') }, rolesBox, t('Roles')),
        goBtn, setBtn),
      noteEl,
      grid,
    );
    body.append(main, emptyMsg);

    // Students marked absent today in Points are left out of new groups.
    const absent = (c) => new Set(points.absentNames(c.id));
    const present = (c) => { const a = absent(c); return c.students.filter((s) => !a.has(s)); };

    function make() {
      const c = cls();
      if (!c || !present(c).length) return;
      const names = present(c);
      const k = Math.max(1, parseInt(n.value, 10) || 2);
      const count = mode.value === 'size' ? Math.max(1, Math.round(names.length / k)) : Math.min(k, names.length);
      const g = grouping.settings(c);
      const { groups, notes } = grouping.makeGroups(names, count, {
        g, balance: balance.value, pointsOf: (name) => points.totalOf(c.id, name),
      });
      const roleMap = rolesBox.checked ? grouping.giveRoles(groups, grouping.rolesOf(g), g) : {};
      ctx.save({ mode: mode.value, n: k, balance: balance.value, groups, roleMap, notes: { ...notes, balance: balance.value } });
      grouping.record(c.id, groups, roleMap);
      render();
    }

    const membersHere = (c, i) => {
      const away = absent(c);
      const onList = new Set(c.students);
      return (ctx.state.groups[i] || []).filter((name) => onList.has(name) && !away.has(name));
    };

    // + or − on a group. In a class with skills (see Points ⋯), a short list of
    // reasons opens first; otherwise it's a plain point.
    function ask(c, i, sign, btn) {
      if (!membersHere(c, i).length) return;
      const choices = points.skillsToGive(c.id, sign > 0 ? 'pos' : 'neg');
      if (!choices.length) { give(c, i, sign); return; }
      if (isOpenFor(btn)) { closeSkillPicker(); return; }
      openSkillPicker(btn, choices, sign, (k) => give(c, i, sign * (k ? k.value : 1), k), { title: t('Group {n}', { n: i + 1 }) });
    }

    // Points for everyone in a group who is on the list and here today. skill: the
    // skill they are for, or null.
    function give(c, i, d, skill = null) {
      const members = membersHere(c, i);
      if (!members.length) return;
      const ev = points.change(c.id, Object.fromEntries(members.map((name) => [name, d])), c.students, skill?.id || null);
      const card = grid.children[i];
      if (card) {
        const tag = h('span', { class: 'pts-pop group-pop ' + (d > 0 ? 'up' : 'down') }, d > 0 ? `+${d}` : `−${-d}`);
        card.append(tag);
        setTimeout(() => tag.remove(), 800);
        card.classList.remove('flash-up', 'flash-down');
        void card.offsetWidth; // restart the animation
        card.classList.add(d > 0 ? 'flash-up' : 'flash-down');
      }
      // Praise is named; a needs-work reason stays in the log.
      let msg = skill?.kind === 'pos' ? t('Group {n}: {skill} +{v}', { n: i + 1, skill: skill.label, v: d })
        : d > 0 ? t('+{v} for Group {n}', { n: i + 1, v: d }) : t('−{v} for Group {n}', { n: i + 1, v: -d });
      const b = points.bar(c.id);
      if (ev.classReached || ev.reached.length) {
        if (b && !b.muted) playChime(b.chime);
        const [first, second] = ev.reached;
        const k = ev.reached.length;
        msg = ev.classReached ? t('Goal reached! Well done, everyone!')
          : k === 1 ? t('{name} reached the goal!', { name: first })
            : k === 2 ? t('{a} and {b} reached the goal!', { a: first, b: second })
              : t('{name} and {n} others reached the goal!', { name: first, n: k - 1 });
      }
      ctx.toast(msg, 4000, { label: t('Undo'), run: () => { points.undo(c.id); ctx.toast(t('Undone: Group {n}', { n: i + 1 })); } });
    }

    function noteLines(c) {
      const notes = ctx.state.notes;
      if (!notes || !(ctx.state.groups || []).length) return [];
      const onList = new Set(c.students);
      const lines = [];
      (notes.apart || []).filter(([a, b]) => onList.has(a) && onList.has(b)).forEach(([a, b]) => {
        lines.push(t('{a} and {b} couldn’t be kept apart.', { a, b }));
      });
      (notes.big || []).forEach((names) => {
        lines.push(t('{names} are kept together, which makes their group bigger than the rest.', { names: names.join(', ') }));
      });
      if (notes.flat && notes.balance === 'levels') {
        lines.push(h('span', {}, t('No levels set for these students, so the groups are random. '),
          h('button', { class: 'link-btn', onclick: () => openSettings() }, t('Set levels'))));
      }
      if (notes.flat && notes.balance === 'points') lines.push(t('Everyone has the same points, so the groups are random.'));
      return lines;
    }

    function render() {
      const c = cls();
      const has = c && c.students.length > 0;
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) {
        if (c) emptyMsg.querySelector('p').textContent = t('“{name}” has no names yet.', { name: c.name });
        emptyMsg.querySelector('button').textContent = c ? t('Add students') : t('Add class list');
        return;
      }
      // The class list changed since the groups were made: drop names that are no
      // longer on it, and say who isn't in a group yet.
      const onList = new Set(c.students);
      const groups = (ctx.state.groups || []).map((g) => g.filter((name) => onList.has(name))).filter((g) => g.length);
      if (JSON.stringify(groups) !== JSON.stringify(ctx.state.groups || [])) ctx.save({ groups });
      const grouped = new Set(groups.flat());
      const left = groups.length ? present(c).filter((s) => !grouped.has(s)) : [];
      const roleMap = ctx.state.roleMap || {};
      const order = grouping.rolesOf(grouping.settings(c));
      const rank = (name) => (name in roleMap ? (order.indexOf(roleMap[name]) + 1 || order.length + 1) : order.length + 2);
      const away = absent(c);
      grid.replaceChildren(...groups.map((g, i) => {
        // Members with roles first, in the order the roles are listed.
        const members = g.slice().sort((a, b) => rank(a) - rank(b));
        return h('div', { class: 'group-card' },
          h('div', { class: 'group-head' },
            h('div', { class: 'group-title' }, t('Group {n}', { n: i + 1 })),
            ctx.state.ptsBtns !== false ? h('div', { class: 'group-pts' },
              h('button', { class: 'icon-btn small', title: t('−1 for everyone in Group {n}', { n: i + 1 }), 'aria-label': t('−1 for everyone in Group {n}', { n: i + 1 }), onclick: (e) => ask(c, i, -1, e.currentTarget) }, icon('minus')),
              h('button', { class: 'icon-btn small', title: t('+1 for everyone in Group {n}', { n: i + 1 }), 'aria-label': t('+1 for everyone in Group {n}', { n: i + 1 }), onclick: (e) => ask(c, i, 1, e.currentTarget) }, icon('plus')),
            ) : null),
          h('ul', {}, ...members.map((name) => h('li', { class: away.has(name) ? 'away' : '' },
            h('span', {}, name),
            roleMap[name] ? h('span', { class: 'role-tag' }, roleMap[name]) : null))),
        );
      }));
      if (left.length) {
        grid.append(h('p', { class: 'muted groups-note' }, t('Not in a group yet: {names}. Click “Make groups” to include them.', { names: left.join(', ') })));
      }
      if (!groups.length) {
        const n = present(c).length;
        const awayN = c.students.length - n;
        grid.append(h('p', { class: 'muted' }, n === 1
          ? t('{n} student. Choose a size and click “Make groups”.', { n })
          : t('{n} students. Choose a size and click “Make groups”.', { n }),
        awayN ? ' ' + (awayN === 1 ? t('1 student marked absent in Points is left out.') : t('{n} students marked absent in Points are left out.', { n: awayN })) : ''));
      }
      const lines = noteLines(c);
      noteEl.replaceChildren(...lines.map((line) => h('p', {}, line)));
      noteEl.hidden = !lines.length;
    }

    // ---------- ⚙ Group settings (kept with the class) ----------
    function openSettings() {
      const c = cls();
      if (!c) return;
      const id = c.id;
      openModal(t('Groups · {name}', { name: c.name }), (mb) => {
        let roleDraft = null; // the roles being typed, until the dialog is drawn again
        const draw = () => {
          const cur = ctx.store.getClass(id);
          if (!cur) { mb.replaceChildren(h('p', {}, t('This class is no longer here.'))); return; }
          const g = grouping.settings(cur);
          mb.replaceChildren(levelsPanel(cur, g), rulesPanel(cur, g), rolesPanel(cur, g), roundsPanel(cur, g), toolPanel());
        };

        function levelsPanel(cur, g) {
          const setN = cur.students.filter((s) => grouping.LEVELS.includes(g.levels[s])).length;
          return h('section', { class: 'panel' },
            h('h3', {}, t('Levels for Mix levels')),
            h('p', { class: 'muted' }, t('Give students a level from 1 to 3, such as their language strength. Mix levels then puts a spread of levels in every group. Levels never show on the board, but this window does, so set them when the screen isn’t on the projector.')),
            h('div', { class: 'groups-levels' }, ...cur.students.map((name) => h('div', { class: 'groups-level-row' },
              h('span', { class: 'groups-level-name' }, name),
              segmented([[0, '–'], [1, '1'], [2, '2'], [3, '3']], g.levels[name] || 0, (v) => { grouping.setLevel(id, name, v); draw(); }, t('Level for {name}', { name })),
            ))),
            h('div', { class: 'row gap' },
              h('span', { class: 'muted small' }, t('{n} of {total} students have a level.', { n: setN, total: cur.students.length })),
              setN ? h('button', { class: 'link-btn', onclick: () => { grouping.update(id, (x) => { cur.students.forEach((s) => delete x.levels[s]); }); draw(); } }, t('Clear levels')) : null),
          );
        }

        function rulesPanel(cur, g) {
          const onList = new Set(cur.students);
          const pick = (label) => h('select', { 'aria-label': label },
            h('option', { value: '' }, t('Choose…')), ...cur.students.map((s) => h('option', { value: s }, s)));
          const a = pick(t('First student'));
          const b = pick(t('Second student'));
          const addBtn = (kind, label) => h('button', {
            class: 'btn small', onclick: () => {
              if (!a.value || !b.value) { ctx.toast(t('Choose two students.')); return; }
              if (a.value === b.value) { ctx.toast(t('Choose two different students.')); return; }
              grouping.addRule(id, kind, a.value, b.value);
              draw();
            },
          }, label);
          const list = (kind, joiner) => {
            const pairs = g[kind].filter(([x, y]) => onList.has(x) && onList.has(y));
            return pairs.length
              ? h('ul', { class: 'groups-rules' }, ...pairs.map(([x, y]) => h('li', {},
                h('span', {}, `${x} ${joiner} ${y}`),
                h('button', { class: 'icon-btn small', title: t('Remove'), 'aria-label': t('Remove'), onclick: () => { grouping.removeRule(id, kind, x, y); draw(); } }, icon('x')))))
              : h('p', { class: 'muted small' }, t('None yet.'));
          };
          return h('section', { class: 'panel' },
            h('h3', {}, t('Keep together / keep apart')),
            h('p', { class: 'muted' }, t('Used every time, whichever mix you choose. A student who leaves the class list keeps their rules for when they come back.')),
            h('div', { class: 'row gap wrap' }, a, b, addBtn('together', t('Keep together')), addBtn('apart', t('Keep apart'))),
            h('div', { class: 'groups-rule-cols' },
              h('div', {}, h('strong', {}, t('Together')), list('together', '+')),
              h('div', {}, h('strong', {}, t('Apart')), list('apart', '≠'))),
          );
        }

        function rolesPanel(cur, g) {
          const saved = grouping.rolesOf(g);
          roleDraft = roleDraft || saved.slice();
          const save = () => {
            const roles = roleDraft.map(grouping.cleanRole).filter(Boolean).slice(0, grouping.MAX_ROLES);
            grouping.update(id, (x) => { x.roles = JSON.stringify(roles) === JSON.stringify(grouping.PRESET_ROLES) ? null : roles; });
          };
          return h('section', { class: 'panel' },
            h('h3', {}, t('Roles')),
            h('p', { class: 'muted' }, t('Tick Roles in the tool to give them out. They go in this order, so a group of 3 gets the first three. Each new round gives students the roles they have had least.')),
            h('ol', { class: 'groups-role-list' }, ...roleDraft.map((r, i) => h('li', {},
              h('input', {
                type: 'text', class: 'input', value: r, maxlength: grouping.MAX_ROLE, 'aria-label': t('Role {n}', { n: i + 1 }),
                oninput: (e) => { roleDraft[i] = e.target.value; save(); },
              }),
              h('button', { class: 'icon-btn small', title: t('Remove'), 'aria-label': t('Remove'), onclick: () => { roleDraft.splice(i, 1); save(); draw(); } }, icon('x'))))),
            h('div', { class: 'row gap' },
              roleDraft.length < grouping.MAX_ROLES ? h('button', { class: 'btn small', onclick: () => { roleDraft.push(''); draw(); mb.querySelector('.groups-role-list li:last-child input')?.focus(); } }, t('+ Add role')) : null,
              g.roles ? h('button', { class: 'link-btn', onclick: () => { roleDraft = grouping.PRESET_ROLES.slice(); save(); draw(); } }, t('Use the usual roles again')) : null),
          );
        }

        function roundsPanel(cur, g) {
          const box = h('input', {
            type: 'checkbox', checked: g.avoid,
            onchange: (e) => grouping.update(id, (x) => { x.avoid = e.target.checked; }),
          });
          return h('section', { class: 'panel' },
            h('h3', {}, t('Mixing with new people')),
            h('label', { class: 'row gap' }, box, t('Try not to put students together who were together in the last 3 rounds')),
            h('p', { class: 'muted small' }, t('Pressing Make groups again within 2 minutes counts as the same round, so trying a few mixes doesn’t use up the rounds or the role turns.')),
            g.history.length ? h('button', {
              class: 'btn small', onclick: () => { grouping.forgetRounds(id); ctx.toast(t('Past rounds forgotten')); draw(); },
            }, t('Forget past rounds and roles')) : null,
          );
        }

        // This one is the tool's own (this board), not the class's.
        function toolPanel() {
          const box = h('input', {
            type: 'checkbox', checked: ctx.state.ptsBtns !== false,
            onchange: (e) => { ctx.save({ ptsBtns: e.target.checked }); render(); },
          });
          return h('section', { class: 'panel' },
            h('h3', {}, t('Points')),
            h('label', { class: 'row gap' }, box, t('Show + and − on each group, to give everyone in it a point')),
          );
        }

        draw();
      }, { wide: true });
    }

    goBtn.addEventListener('click', make);
    mode.addEventListener('change', () => ctx.save({ mode: mode.value }));
    n.addEventListener('change', () => ctx.save({ n: parseInt(n.value, 10) || 2 }));
    balance.addEventListener('change', () => ctx.save({ balance: balance.value }));
    rolesBox.addEventListener('change', () => {
      // Turning roles on hands them out to the groups on screen; turning them off hides them.
      const c = cls();
      let roleMap = {};
      if (rolesBox.checked && c && (ctx.state.groups || []).length) {
        const g = grouping.settings(c);
        roleMap = grouping.giveRoles(ctx.state.groups, grouping.rolesOf(g), g);
        grouping.setRoundRoles(c.id, ctx.state.groups, roleMap);
      }
      ctx.save({ showRoles: rolesBox.checked, roleMap });
      render();
    });
    // A student renamed (in Points or the class list) stays in their group.
    const unsubRename = roster.onRename((classId, pairs) => {
      if (cls()?.id !== classId || !(ctx.state.groups || []).length) return;
      const map = new Map(pairs);
      const swap = (name) => map.get(name) ?? name;
      const notes = ctx.state.notes;
      ctx.save({
        groups: ctx.state.groups.map((g) => g.map(swap)),
        roleMap: Object.fromEntries(Object.entries(ctx.state.roleMap || {}).map(([name, r]) => [swap(name), r])),
        notes: notes ? { ...notes, apart: (notes.apart || []).map((p) => p.map(swap)), big: (notes.big || []).map((p) => p.map(swap)) } : null,
      });
    });
    const unsub = ctx.onClassesChange(() => { sel.refresh(); render(); });
    render();
    return { destroy() { closeSkillPicker(); unsub(); unsubRename(); } };
  },
};
