import { h, classSelect, openModal, closeModal, confirmButton } from '../ui.js';
import * as points from '../points.js';
import { icon } from '../icons.js';

const SORTS = [
  { id: 'class', label: 'Class order', title: 'Order of the class list' },
  { id: 'az', label: 'A–Z', title: 'Alphabetical' },
  { id: 'top', label: 'Top', title: 'Highest points first. Tap again to re-sort.' },
];

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export default {
  type: 'points',
  title: 'Points',
  icon: 'star',
  tone: 'people', // dock tile colour: time | people | signal | content
  size: { w: 420, h: 520 },
  minSize: { w: 320, h: 300 },
  // Points live with the class list, not in the board, so shared files carry none.
  share: () => ({}),

  mount(body, ctx) {
    // Board state: classId only. Points, absences, undo and goal are kept per class (see points.js).
    const cls = () => ctx.store.getClass(ctx.state.classId) || ctx.store.getActiveClass();

    // Always opens in class-list order; sorting is a deliberate choice each lesson.
    let sort = 'class';
    let order = [];        // names in display order
    let builtFor = '';     // key of the list the rows were built for
    const rows = new Map(); // name -> { row, val, minus, plus }

    const sel = classSelect(ctx, () => ctx.state.classId, (id) => {
      ctx.save({ classId: id });
      sort = 'class';
      render();
    });

    const sortBtns = SORTS.map((s) => h('button', {
      class: 'seg-btn', title: s.title, 'data-sort': s.id,
      onclick: () => { sort = s.id; builtFor = ''; render(); },
    }, s.label));
    const moreBtn = h('button', { class: 'icon-btn small', title: 'Goal, export and reset', 'aria-label': 'Points options', onclick: openOptions }, icon('dots'));

    const list = h('div', { class: 'pts-list', role: 'list' });
    const goalFill = h('div', { class: 'pts-goal-fill' });
    const goalText = h('span', { class: 'pts-goal-text' });
    const goalBar = h('div', { class: 'pts-goal', title: 'Class total towards the goal' },
      h('div', { class: 'pts-goal-track' }, goalFill), goalText);

    const minusAll = h('button', { class: 'btn pts-all minus', title: '−1 for every student present' }, '− All');
    const plusAll = h('button', { class: 'btn primary pts-all plus', title: '+1 for every student present' }, '+ All');
    const undoBtn = h('button', { class: 'btn with-icon', title: 'Undo the last change' }, icon('arrow-back-up'), 'Undo');
    const totalEl = h('span', { class: 'pts-total' });
    const absentEl = h('span', { class: 'muted small' });

    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, 'Add a class list to start giving points.'),
      h('button', { class: 'btn primary', onclick: () => ctx.openClasses() }, 'Add class list'),
    );
    const main = h('div', { class: 'pts' },
      h('div', { class: 'row gap space-between pts-top' },
        sel.el,
        h('div', { class: 'row gap' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Sort' }, ...sortBtns), moreBtn),
      ),
      list,
      goalBar,
      h('div', { class: 'row gap space-between pts-foot' },
        h('div', { class: 'row gap' }, minusAll, plusAll, undoBtn),
        h('div', { class: 'pts-foot-info' }, totalEl, absentEl),
      ),
    );
    body.append(main, emptyMsg);

    function present(c) {
      const away = new Set(points.absentNames(c.id));
      return c.students.filter((n) => !away.has(n));
    }

    function sortedNames(c) {
      const names = [...new Set(c.students)];
      if (sort === 'az') return names.sort(collator.compare);
      if (sort === 'top') return names.sort((a, b) => points.totalOf(c.id, b) - points.totalOf(c.id, a) || collator.compare(a, b));
      return names;
    }

    function buildRows(c) {
      order = sortedNames(c);
      rows.clear();
      list.replaceChildren(...order.map((name) => {
        const val = h('span', { class: 'pts-val', 'aria-live': 'polite' });
        const minus = h('button', { class: 'pts-btn minus', 'aria-label': `Take a point from ${name}` }, '−');
        const plus = h('button', { class: 'pts-btn plus', 'aria-label': `Give a point to ${name}` }, '+');
        const nameBtn = h('button', { class: 'pts-name', title: 'Tap to mark absent or present' }, name);
        minus.addEventListener('click', () => give(c, { [name]: -1 }));
        plus.addEventListener('click', () => give(c, { [name]: 1 }));
        nameBtn.addEventListener('click', () => points.toggleAbsent(c.id, name));
        const row = h('div', { class: 'pts-row', role: 'listitem' }, nameBtn, h('div', { class: 'pts-ctrl' }, minus, val, plus));
        rows.set(name, { row, val, minus, plus, nameBtn });
        return row;
      }));
    }

    function render() {
      const c = cls();
      const has = c && c.students.length > 0;
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) {
        if (c) emptyMsg.querySelector('p').textContent = `“${c.name}” has no names yet.`;
        builtFor = '';
        return;
      }
      sortBtns.forEach((b) => b.classList.toggle('active', b.dataset.sort === sort));

      // Rebuild rows only when the class, its names or the sort changes,
      // so a tap never moves rows under the teacher's finger.
      const key = `${c.id}|${sort}|${c.students.join('\n')}`;
      if (key !== builtFor) { buildRows(c); builtFor = key; }

      const away = new Set(points.absentNames(c.id));
      for (const [name, r] of rows) {
        const v = points.totalOf(c.id, name);
        r.val.textContent = String(v);
        r.val.classList.toggle('neg', v < 0);
        const isAway = away.has(name);
        r.row.classList.toggle('absent', isAway);
        r.minus.disabled = isAway;
        r.plus.disabled = isAway;
        r.nameBtn.setAttribute('aria-pressed', String(isAway));
        r.nameBtn.title = isAway ? 'Absent today. Tap to mark present.' : 'Tap to mark absent';
      }

      const total = points.classTotal(c);
      const g = points.goal(c.id);
      goalBar.hidden = !g;
      totalEl.textContent = g ? '' : `Class total ${total}`;
      totalEl.hidden = !!g;
      if (g) {
        goalFill.style.width = `${Math.max(0, Math.min(1, total / g)) * 100}%`;
        goalText.textContent = `${total} / ${g}`;
      }
      absentEl.textContent = away.size ? `${away.size} absent` : '';
      const nPresent = present(c).length;
      plusAll.disabled = minusAll.disabled = nPresent === 0;
      undoBtn.disabled = !points.canUndo(c.id);
    }

    function pop(name, d) {
      const r = rows.get(name);
      if (!r) return;
      const tag = h('span', { class: 'pts-pop ' + (d > 0 ? 'up' : 'down') }, d > 0 ? `+${d}` : `−${-d}`);
      r.val.parentElement.append(tag);
      setTimeout(() => tag.remove(), 800);
      r.row.classList.remove('flash-up', 'flash-down');
      void r.row.offsetWidth; // restart the animation
      r.row.classList.add(d > 0 ? 'flash-up' : 'flash-down');
    }

    function give(c, deltas) {
      points.change(c.id, deltas);
      Object.entries(deltas).forEach(([n, d]) => pop(n, d));
    }

    function giveAll(d) {
      const c = cls();
      if (!c) return;
      const names = present(c);
      give(c, Object.fromEntries(names.map((n) => [n, d])));
    }

    minusAll.addEventListener('click', () => giveAll(-1));
    plusAll.addEventListener('click', () => giveAll(1));
    undoBtn.addEventListener('click', () => {
      const c = cls();
      if (!c) return;
      const undone = points.undo(c.id);
      if (undone) {
        const n = Object.keys(undone).length;
        ctx.toast(n > 1 ? `Undone: whole-class change (${n} students)` : `Undone: ${Object.keys(undone)[0]}`);
      }
    });

    function openOptions() {
      const c = cls();
      if (!c) return;
      openModal(`Points · ${c.name}`, (mb) => {
        const goalInput = h('input', {
          type: 'number', min: 1, step: 1, class: 'input num wide', placeholder: 'e.g. 500',
          value: points.goal(c.id) ?? '', 'aria-label': 'Class goal',
        });
        const goalForm = h('form', { class: 'row gap' }, goalInput,
          h('button', { class: 'btn primary', type: 'submit' }, 'Save goal'),
          h('button', { class: 'btn', type: 'button', onclick: () => { points.setGoal(c.id, null); closeModal(); } }, 'No goal'));
        goalForm.addEventListener('submit', (e) => {
          e.preventDefault();
          points.setGoal(c.id, goalInput.value);
          closeModal();
        });
        mb.append(
          h('section', { class: 'panel' },
            h('h3', {}, 'Class goal'),
            h('p', { class: 'muted' }, `The bar fills as the class total grows. It adds up everyone’s points, so one “+ All” adds ${c.students.length} for a full class.`),
            goalForm,
          ),
          h('section', { class: 'panel' },
            h('h3', {}, 'Lesson log'),
            h('p', { class: 'muted' }, 'A spreadsheet (CSV) with one row per student and one column per day, plus each running total. Opens in Excel or Google Sheets.'),
            h('button', { class: 'btn with-icon', onclick: () => { points.exportCsv(c); ctx.toast('Points log downloaded'); } }, icon('download'), 'Download log (CSV)'),
          ),
          h('section', { class: 'panel' },
            h('h3', {}, 'New term'),
            h('p', { class: 'muted' }, `Sets every total in ${c.name} back to 0. The day-by-day log is kept.`),
            confirmButton('Reset points to 0', 'Click again to reset', () => {
              points.resetTotals(c.id);
              closeModal();
              ctx.toast(`${c.name}: points reset to 0`);
            }),
          ),
          h('p', { class: 'muted small' }, 'Tap a name to mark a student absent for today; “+ All” and “− All” skip them. Points are saved in this browser with the class list, so every board showing this class shows the same totals.'),
        );
        setTimeout(() => goalInput.focus(), 30);
      });
    }

    // Class lists and points share one store, so this also fires after every tap,
    // and when another window changes them.
    const unsub = ctx.onClassesChange(() => { sel.refresh(); render(); });
    render();
    return { destroy: unsub };
  },
};
