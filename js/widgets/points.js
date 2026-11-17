import { h, put, classSelect, segmented, openModal, closeModal, confirmButton } from '../ui.js';
import * as points from '../points.js';
import * as roster from '../roster.js';
import { icon } from '../icons.js';
import { t, locale } from '../i18n.js';
import { MARKERS, DEFAULT_MARKER, marker as markerDef, markerEl } from '../markers.js';
import { CHIMES, DEFAULT_CHIME, playChime, playMilestone } from '../sounds.js';

// English labels; translated with t() where they are shown.
const SORTS = [
  { id: 'class', label: 'Class order', title: 'Order of the class list' },
  { id: 'az', label: 'A–Z', title: 'Alphabetical' },
  { id: 'top', label: 'Top', title: 'Highest points first. Tap again to re-sort.' },
];

const CHEER_MS = 1400;    // a student's marker waits at the finish this long before its next round
const BANNER_MS = 3600;
const fmt = (n) => (n < 0 ? `−${-n}` : String(n)); // a proper minus sign
const signed = (n) => (n > 0 ? `+${n}` : fmt(n));
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
    // Board state: classId, and view ('list' | 'bar', the big class bar).
    // Points, absences, undo and the goal bar are kept per class (see points.js).
    const cls = () => ctx.store.getClass(ctx.state.classId) || ctx.store.getActiveClass();
    const collator = new Intl.Collator(locale(), { sensitivity: 'base', numeric: true });

    // Always opens in class-list order; sorting is a deliberate choice each lesson.
    let sort = 'class';
    let order = [];        // names in display order
    let builtFor = '';     // key of the list the rows were built for
    const rows = new Map(); // name -> { row, val, minus, plus, nameBtn, lane? }
    const cheering = new Map(); // name -> time their marker leaves the finish
    let cheerTimer = null;

    const sel = classSelect(ctx, () => ctx.state.classId, (id) => {
      ctx.save({ classId: id });
      sort = 'class';
      render();
    });

    const sortBtns = SORTS.map((s) => h('button', {
      class: 'seg-btn', title: t(s.title), 'data-sort': s.id,
      onclick: () => { sort = s.id; builtFor = ''; render(); },
    }, t(s.label)));
    const muteBtn = h('button', { class: 'icon-btn small', onclick: () => { const c = cls(); const b = c && points.bar(c.id); if (b) points.setMuted(c.id, !b.muted); } });
    const viewBtn = h('button', { class: 'icon-btn small', onclick: () => { ctx.save({ view: ctx.state.view === 'bar' ? 'list' : 'bar' }); render(); } });
    const moreBtn = h('button', { class: 'icon-btn small', title: t('Reset, goal bar and export'), 'aria-label': t('Points options'), onclick: openOptions }, icon('dots'));
    // Edit students: add, rename or remove students, and past students' points.
    let editing = false;
    const editBtn = h('button', {
      class: 'icon-btn small', title: t('Rename the class, or add, rename or remove students'), 'aria-label': t('Edit students'), 'aria-pressed': 'false',
      onclick: () => setEditing(!editing),
    }, icon('users'));

    const list = h('div', { class: 'pts-list', role: 'list' });

    // The class goal bar: one shared track for the whole class.
    const race = buildLane('pts-lane big');
    const rewardEl = h('span', { class: 'pts-reward' });
    const roundEl = h('span', { class: 'pts-round' });
    const countEl = h('span', { class: 'pts-goal-text' });
    const nextBtn = h('button', { class: 'btn primary small', onclick: () => { const c = cls(); if (c) points.nextRound(c.id); } }, t('Next round'));
    const reachedEl = h('div', { class: 'pts-reached', role: 'status' }, h('span', {}, t('Goal reached! 🎉')), nextBtn);
    const goalBar = h('div', { class: 'pts-race' },
      h('div', { class: 'pts-race-head' }, rewardEl, h('span', { class: 'grow' }), roundEl, countEl),
      race.el, reachedEl);

    const minusAll = h('button', { class: 'btn pts-all minus', title: t('−1 for every student present') }, t('− All'));
    const plusAll = h('button', { class: 'btn primary pts-all plus', title: t('+1 for every student present') }, t('+ All'));
    const undoBtn = h('button', { class: 'btn with-icon', title: t('Undo the last change') }, icon('arrow-back-up'), t('Undo'));
    const totalEl = h('span', { class: 'pts-total' });
    const absentEl = h('span', { class: 'muted small' });
    const banner = h('div', { class: 'pts-cheer', role: 'status', 'aria-live': 'polite', hidden: true });

    const foot = h('div', { class: 'row gap space-between pts-foot' },
      h('div', { class: 'row gap' }, minusAll, plusAll, undoBtn),
      h('div', { class: 'pts-foot-info' }, totalEl, absentEl),
    );
    const emptyBtn = h('button', { class: 'btn primary', onclick: () => { const c = cls(); ctx.openClasses(c ? c.id : null); } }, t('Add class list'));
    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, t('Add a class list to start giving points.')),
      emptyBtn,
    );
    const editView = h('div', { class: 'pts-edit', hidden: true });
    const main = h('div', { class: 'pts' },
      h('div', { class: 'row gap space-between pts-top' },
        sel.el,
        h('div', { class: 'row gap' }, h('div', { class: 'seg pts-sort', role: 'group', 'aria-label': t('Sort') }, ...sortBtns), muteBtn, viewBtn, editBtn, moreBtn),
      ),
      list,
      editView,
      goalBar,
      foot,
      banner,
    );
    body.append(main, emptyMsg);

    // Chip when minimised: the class bar, or how many goals students have reached.
    const miniLane = buildLane('pts-lane mini');
    const miniText = h('span', { class: 'mini-text' });
    const mini = h('span', { class: 'pts-mini' });
    ctx.setMiniControls?.(mini);

    // A track: the marker runs along it to the finish.
    //   --p (0–1) places the marker; --z is where zero sits; --a and --f are where
    //   the fill starts and ends. Centred tracks (rules that keep points owed) have
    //   zero in the middle: blue from the middle to the right, red to the left, with
    //   the left end at minus the goal. Otherwise zero is at the left end.
    function buildLane(cls) {
      const mk = h('span', { class: 'pts-mk' });
      const fin = h('span', { class: 'pts-fin' });
      const ticks = [1, 2, 3].map((q) => h('i', { class: 'pts-tick', style: `--q:${q / 4}` }));
      const zero = h('i', { class: 'pts-zero' });
      const owe = h('span', { class: 'pts-owe' });
      const el = h('div', { class: cls }, h('div', { class: 'pts-run' }, h('i', { class: 'pts-fill' }), ...ticks, zero, owe, mk), fin);
      let shown = '';
      return {
        el,
        // e: points along (below 0 = owed); wait: at the finish, waiting for the total to reach 0
        set(markerId, e, target, { wait = 0, hold = false, centred = false } = {}) {
          if (markerId !== shown) {
            shown = markerId;
            mk.replaceChildren(markerEl(markerId));
            fin.replaceChildren(markerEl(markerId, 'finish'));
            const m = markerDef(markerId);
            mk.title = t(m.label);
            fin.title = t(m.finish.label);
          }
          const owed = e < 0 && !hold ? -e : 0;
          const z = centred ? 0.5 : 0;
          const r = hold ? 1 : Math.max(-1, Math.min(1, e / target)); // −1 … 1 of the goal
          const p = z + r * (r < 0 ? z : 1 - z);
          el.style.setProperty('--p', String(p));
          el.style.setProperty('--z', String(z));
          el.style.setProperty('--a', String(Math.min(p, z)));
          el.style.setProperty('--f', String(Math.max(p, z)));
          el.classList.toggle('centred', centred);
          el.classList.toggle('neg', !!owed);
          el.classList.toggle('wait', !!wait && !hold);
          owe.textContent = owed ? `−${owed}` : wait && !hold ? `−${wait}` : '';
        },
      };
    }

    // Track state for some progress, given the total (term points) behind it.
    function waiting(b, e, total) {
      return b.debt === 'zero' && e >= b.target && total < 0 ? -total : 0;
    }

    function present(c) {
      const away = new Set(points.absentNames(c.id));
      return c.students.filter((n) => !away.has(n));
    }

    function sortedNames(c) {
      const names = [...new Set(c.students)];
      if (sort === 'az') return names.sort(collator.compare);
      if (sort === 'top') return names.sort((a, b) => points.lessonOf(c.id, b) - points.lessonOf(c.id, a) || points.totalOf(c.id, b) - points.totalOf(c.id, a) || collator.compare(a, b));
      return names;
    }

    function buildRows(c, withLanes) {
      order = sortedNames(c);
      rows.clear();
      list.replaceChildren(...order.map((name) => {
        const val = h('span', { class: 'pts-val', 'aria-live': 'polite' });
        const carry = h('span', { class: 'pts-carry' });
        const minus = h('button', { class: 'pts-btn minus', 'aria-label': t('Take a point from {name}', { name }) }, '−');
        const plus = h('button', { class: 'pts-btn plus', 'aria-label': t('Give a point to {name}', { name }) }, '+');
        const nameBtn = h('button', { class: 'pts-name', title: t('Tap to mark absent or present') }, name);
        minus.addEventListener('click', () => give(c, { [name]: -1 }));
        plus.addEventListener('click', () => give(c, { [name]: 1 }));
        nameBtn.addEventListener('click', () => points.toggleAbsent(c.id, name));
        let lane = null;
        let badge = null;
        if (withLanes) {
          lane = buildLane('pts-lane small');
          badge = h('span', { class: 'pts-badge' });
          lane.el.append(badge);
        }
        const row = h('div', { class: 'pts-row' + (withLanes ? ' has-lane' : ''), role: 'listitem' },
          nameBtn, carry, lane?.el, h('div', { class: 'pts-ctrl' }, minus, val, plus));
        rows.set(name, { row, val, carry, minus, plus, nameBtn, lane, badge, badgeKey: '' });
        return row;
      }));
    }

    function render() {
      const c = cls();
      // While editing, an empty class still shows the edit view, to add names to.
      const has = c && (c.students.length > 0 || editing);
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) {
        if (c) emptyMsg.querySelector('p').textContent = t('“{name}” has no names yet.', { name: c.name });
        emptyBtn.textContent = c ? t('Add students') : t('Add class list');
        builtFor = '';
        editKey = '';
        put(mini);
        return;
      }
      points.migrateGoal(c); // older class goals become a class bar (once)
      points.ensureLesson(c.id); // the Lesson goal (once), and a new lesson on a new day
      const b = points.bar(c.id);
      const mode = b?.mode || 'none';
      const big = mode === 'class' && ctx.state.view === 'bar' && !editing;
      main.classList.toggle('big', big);
      sortBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.sort === sort));

      // Rebuild rows only when the class, its names, the sort or the bar's mode changes,
      // so a tap never moves rows under the teacher's finger.
      const lanes = mode === 'student' || mode === 'lesson';
      const key = `${c.id}|${sort}|${lanes}|${c.students.join('\n')}`;
      if (key !== builtFor) { buildRows(c, lanes); builtFor = key; }

      const now = Date.now();
      const away = new Set(points.absentNames(c.id).filter((n) => c.students.includes(n)));
      for (const [name, r] of rows) {
        // Beside the name: the total the student started this lesson with. On the
        // right: points this lesson, which join the total when the next lesson starts.
        const v = points.totalOf(c.id, name);
        const carried = points.carriedOf(c.id, name);
        const lp = v - carried;
        r.val.textContent = signed(lp);
        r.val.classList.toggle('neg', lp < 0);
        r.val.title = t('Points this lesson');
        r.carry.textContent = fmt(carried);
        r.carry.classList.toggle('neg', carried < 0);
        r.carry.title = t('Total before this lesson: {n}. This lesson’s points are added when the next lesson starts.', { n: fmt(carried) });
        const isAway = away.has(name);
        r.row.classList.toggle('absent', isAway);
        r.minus.disabled = isAway;
        r.plus.disabled = isAway;
        r.nameBtn.setAttribute('aria-pressed', String(isAway));
        r.nameBtn.title = isAway ? t('Absent today. Tap to mark present.') : t('Tap to mark absent');
        if (r.lane && b && mode === 'lesson') {
          const id = b.markers[name] || b.marker;
          const atFinish = (cheering.get(name) || 0) > now;
          r.row.classList.toggle('cheer', atFinish);
          r.lane.set(id, lp, b.target, { centred: true });
          r.lane.el.title = lp >= b.target ? t('{name} reached this lesson’s goal ({e} points)', { name, e: lp })
            : t('{name}: {e} of {target} this lesson', { name, e: signed(lp), target: b.target });
          const got = points.lessonBadges(c.id, name);
          const badgeKey = `${id}|${got.b}`;
          if (badgeKey !== r.badgeKey) {
            r.badgeKey = badgeKey;
            put(r.badge, got.b ? [markerEl(id, 'finish'), h('span', {}, `×${got.b}`)] : null);
            r.badge.title = got.b ? t('Goals reached: {n}', { n: got.b }) : '';
          }
        } else if (r.lane && b) {
          const s = points.studentProgress(c.id, name);
          const id = b.markers[name] || b.marker;
          const atFinish = (cheering.get(name) || 0) > now;
          r.row.classList.toggle('cheer', atFinish);
          const wait = waiting(b, s.e, v);
          r.lane.set(id, s.e, b.target, { wait, hold: atFinish, centred: b.debt !== 'zero' });
          r.lane.el.title = wait ? t('{name} is at the finish, but the total must be 0 or more first ({n} to go)', { name, n: wait })
            : s.e < 0 ? t('{name}: {n} points to earn back first', { name, n: -s.e })
              : t('{name}: {e} of {target} towards the next goal', { name, e: s.e, target: b.target });
          const badgeKey = `${id}|${s.b}`;
          if (badgeKey !== r.badgeKey) {
            r.badgeKey = badgeKey;
            put(r.badge, s.b ? [markerEl(id, 'finish'), h('span', {}, `×${s.b}`)] : null);
            r.badge.title = s.b ? t('Goals reached: {n}', { n: s.b }) : '';
          }
        }
      }

      const total = points.classTotal(c);
      const info = points.lessonInfo(c.id);
      totalEl.textContent = t('This lesson {n} · Class total {total}', { n: signed(points.lessonTotal(c)), total: fmt(total) });
      const since = points.classTotalSince(c.id);
      totalEl.title = [info && info.n > 1 ? t('Lesson {n} today', { n: info.n }) : '',
        since ? t('Counting from the class total reset on {date}', { date: since }) : ''].filter(Boolean).join('\n');
      goalBar.hidden = mode !== 'class' || editing;
      list.hidden = big || editing;
      foot.hidden = editing;
      editView.hidden = !editing;
      main.classList.toggle('editing', editing);
      editBtn.classList.toggle('active', editing);
      editBtn.setAttribute('aria-pressed', String(editing));
      if (editing) renderEdit(c);
      if (mode === 'class') {
        const reached = points.goalMet(b, b.cls.e, total);
        const wait = waiting(b, b.cls.e, total);
        race.set(b.marker, b.cls.e, b.target, { wait, centred: b.debt !== 'zero' });
        goalBar.classList.toggle('done', reached);
        reachedEl.hidden = !reached;
        rewardEl.textContent = b.reward;
        rewardEl.hidden = !b.reward;
        roundEl.textContent = b.cls.round > 1 ? t('Round {n}', { n: b.cls.round }) : '';
        countEl.textContent = `${fmt(Math.min(b.cls.e, b.target))} / ${b.target}`;
        countEl.classList.toggle('neg', b.cls.e < 0);
        goalBar.title = wait ? t('The class is at the finish, but the class total must be 0 or more first ({n} to go)', { n: wait })
          : b.cls.e < 0 ? t('The class has {n} points to earn back first', { n: -b.cls.e })
            : t('Points the class has earned towards the goal');
      }

      // Title-bar buttons for the bar.
      muteBtn.hidden = !b;
      if (b) {
        const label = b.muted ? t('Sounds off. Tap to turn on.') : t('Sounds on. Tap to turn off.');
        muteBtn.replaceChildren(icon(b.muted ? 'volume-off' : 'volume'));
        muteBtn.title = label;
        muteBtn.setAttribute('aria-label', label);
        muteBtn.setAttribute('aria-pressed', String(!!b.muted));
      }
      viewBtn.hidden = mode !== 'class' || editing;
      if (mode === 'class') {
        const label = big ? t('Show the names') : t('Big goal bar (hides the names)');
        viewBtn.replaceChildren(icon(big ? 'list' : 'arrows-maximize'));
        viewBtn.title = label;
        viewBtn.setAttribute('aria-label', label);
      }

      // Chip
      if (mode === 'class') {
        miniLane.set(b.marker, b.cls.e, b.target, { wait: waiting(b, b.cls.e, total), centred: b.debt !== 'zero' });
        miniText.textContent = `${fmt(Math.min(b.cls.e, b.target))}/${b.target}`;
        put(mini, miniLane.el, miniText);
      } else if (mode === 'student' || mode === 'lesson') {
        const goals = c.students.reduce((n, name) => n + (mode === 'lesson' ? points.lessonBadges(c.id, name).b : points.studentProgress(c.id, name).b), 0);
        miniText.textContent = `×${goals}`;
        put(mini, markerEl(b.marker, 'finish', 'pts-mini-fin'), miniText);
        mini.title = t('Goals reached: {n}', { n: goals });
      } else {
        put(mini);
      }

      absentEl.textContent = away.size ? t('{n} absent', { n: away.size }) : '';
      const nPresent = present(c).length;
      plusAll.disabled = minusAll.disabled = nPresent === 0;
      undoBtn.disabled = !points.canUndo(c.id);
    }

    // ---------- Edit students ----------
    // The class list in its own order, each with Rename and Remove; a box to add
    // a student; past students (taken off the list, points kept) to bring back
    // or delete; and a link to the whole class list.
    let editKey = '';     // what the edit view was last built for
    let renaming = null;  // name being renamed
    const addInput = h('input', {
      type: 'text', class: 'input', maxlength: roster.MAX_NAME, placeholder: t('New student’s name'),
      'aria-label': t('New student’s name'), enterkeyhint: 'done',
    });
    const addBtn = h('button', { class: 'btn primary with-icon' }, icon('user-plus'), t('Add'));
    const addStudent = () => {
      const c = cls();
      if (!c) return;
      const r = roster.addStudent(c.id, addInput.value);
      if (r.error) { ctx.toast(r.error); addInput.focus(); return; }
      addInput.value = '';
      addInput.focus();
      ctx.toast(r.back ? t('{name} is back, with their points', { name: r.name }) : t('{name} added', { name: r.name }));
    };
    addBtn.addEventListener('click', addStudent);
    addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addStudent(); } });
    const addRow = h('div', { class: 'pts-add' }, addInput, addBtn);
    // The class's name, at the top.
    const classNameInput = h('input', {
      type: 'text', class: 'input', maxlength: roster.MAX_CLASS_NAME, 'aria-label': t('Class name'), enterkeyhint: 'done',
    });
    const classNameBtn = h('button', { class: 'btn small', disabled: true }, t('Rename'));
    const syncClassName = () => { const c = cls(); classNameBtn.disabled = !c || roster.cleanClassName(classNameInput.value) === c.name; };
    const renameClass = () => {
      const c = cls();
      if (!c) return;
      const r = roster.renameClass(c.id, classNameInput.value);
      if (r.error) { ctx.toast(r.error); classNameInput.focus(); return; }
      classNameInput.value = r.name;
      syncClassName();
      if (r.changed) ctx.toast(t('Class renamed to {name}', { name: r.name }));
    };
    classNameInput.addEventListener('input', syncClassName);
    classNameInput.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); renameClass(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); classNameInput.value = cls()?.name || ''; syncClassName(); classNameInput.blur(); }
    });
    classNameBtn.addEventListener('click', renameClass);
    const classNameRow = h('label', { class: 'pts-cname' }, h('span', {}, t('Class name')), classNameInput, classNameBtn);
    const editList = h('div', { class: 'pts-elist', role: 'list' });
    const pastBox = h('div', { class: 'pts-past' });
    const wholeBtn = h('button', { class: 'link-btn', onclick: () => { const c = cls(); if (c) ctx.openClasses(c.id); } }, t('Edit the whole class list…'));
    const doneBtn = h('button', { class: 'btn primary', onclick: () => setEditing(false) }, t('Done'));
    editView.append(
      classNameRow,
      h('p', { class: 'muted small pts-edit-help' }, t('A student who is removed keeps their points under Past students, in case they come back. Renaming a student keeps their points.')),
      editList, addRow, pastBox,
      h('div', { class: 'row gap space-between pts-edit-foot' }, wholeBtn, doneBtn));

    function setEditing(on) {
      editing = on;
      renaming = null;
      editKey = '';
      if (!on) { sort = 'class'; builtFor = ''; }
      render();
      if (on && !cls()?.students.length) addInput.focus();
    }

    function renderEdit(c) {
      // Keep what the teacher is typing; otherwise show the name as it is now.
      if (document.activeElement !== classNameInput) classNameInput.value = c.name;
      syncClassName();
      const past = points.pastStudents(c);
      const key = JSON.stringify([c.id, c.students, past, renaming, c.students.map((n) => points.totalOf(c.id, n))]);
      if (key === editKey) return;
      editKey = key;
      editList.replaceChildren(...c.students.map((name) => {
        const total = h('span', { class: 'pts-etotal' + (points.totalOf(c.id, name) < 0 ? ' neg' : '') }, fmt(points.totalOf(c.id, name)));
        if (renaming === name) {
          const input = h('input', { type: 'text', class: 'input', value: name, maxlength: roster.MAX_NAME, 'aria-label': t('New name for {name}', { name }) });
          const save = () => {
            const r = roster.renameStudent(c.id, name, input.value);
            if (r.error) { ctx.toast(r.error); input.focus(); return; }
            renaming = null;
            if (r.name !== name) ctx.toast(t('{from} is now {to}. Points kept.', { from: name, to: r.name }));
            render();
          };
          const cancel = () => { renaming = null; render(); };
          input.addEventListener('keydown', (e) => {
            if (e.isComposing) return;
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
          });
          setTimeout(() => { input.focus(); input.select(); }, 0);
          return h('div', { class: 'pts-erow renaming', role: 'listitem' }, input,
            h('button', { class: 'btn small primary', onclick: save }, t('Save')),
            h('button', { class: 'btn small', onclick: cancel }, t('Cancel')));
        }
        return h('div', { class: 'pts-erow', role: 'listitem' },
          h('span', { class: 'pts-ename' }, name), total,
          h('button', {
            class: 'icon-btn small', title: t('Rename {name}', { name }), 'aria-label': t('Rename {name}', { name }),
            onclick: () => { renaming = name; render(); },
          }, icon('pencil')),
          confirmButton(t('Remove'), t('Sure?'), () => {
            roster.removeStudent(c.id, name);
            ctx.toast(points.hasPoints(c.id, name)
              ? t('{name} removed. Their points are under Past students.', { name })
              : t('{name} removed', { name }));
          }, 'btn small danger', { 'aria-label': t('Remove {name}', { name }) }));
      }));
      if (!c.students.length) editList.append(h('p', { class: 'muted pts-enone' }, t('No students yet. Add them below.')));

      put(pastBox, past.length ? h('details', { class: 'pts-past-box', open: true },
        h('summary', {}, t('Past students ({n})', { n: past.length })),
        h('p', { class: 'muted small' }, t('Students taken off the class list keep their points here. Bring one back, or delete their points for good.')),
        ...past.map((p) => h('div', { class: 'pts-erow past' },
          h('span', { class: 'pts-ename' }, p.name),
          h('span', { class: 'pts-etotal' + (p.total < 0 ? ' neg' : '') }, fmt(p.total)),
          p.badges ? h('span', { class: 'muted small', title: t('Goals reached: {n}', { n: p.badges }) }, `×${p.badges}`) : null,
          h('button', {
            class: 'btn small with-icon', onclick: () => {
              const r = roster.bringBack(c.id, p.name);
              if (r.error) { ctx.toast(r.error); return; }
              ctx.toast(t('{name} is back, with their points', { name: p.name }));
            },
          }, icon('arrow-back-up'), t('Bring back')),
          confirmButton(t('Delete points'), t('Click again to delete'), () => {
            roster.forgetStudent(c.id, p.name);
            ctx.toast(t('{name}’s points deleted', { name: p.name }));
          }, 'btn small danger'),
        ))) : null);
    }

    function pop(name, d) {
      const r = rows.get(name);
      if (!r || !r.row.isConnected || list.hidden) return;
      const tag = h('span', { class: 'pts-pop ' + (d > 0 ? 'up' : 'down') }, d > 0 ? `+${d}` : `−${-d}`);
      r.val.parentElement.append(tag);
      setTimeout(() => tag.remove(), 800);
      r.row.classList.remove('flash-up', 'flash-down');
      void r.row.offsetWidth; // restart the animation
      r.row.classList.add(d > 0 ? 'flash-up' : 'flash-down');
    }

    // A burst of paper pieces from an element (skipped when motion is reduced).
    function confetti(target, n = 22) {
      if (reduceMotion() || !target?.isConnected) return;
      const box = main.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const colours = ['#ffd23f', '#ef4b4b', '#34c38f', '#3b82f6', '#ff7eb6', '#ffa51f'];
      for (let i = 0; i < n; i++) {
        const x = r.left - box.left + r.width * (0.3 + Math.random() * 0.7);
        const y = r.top - box.top + r.height / 2;
        const bit = h('i', {
          class: 'pts-bit',
          style: `left:${x}px;top:${y}px;background:${colours[i % colours.length]};`
            + `--dx:${(Math.random() - 0.5) * 220}px;--dy:${-60 - Math.random() * 120}px;--rot:${Math.random() * 720 - 360}deg`,
        });
        main.append(bit);
        setTimeout(() => bit.remove(), 1300);
      }
    }

    let bannerTimer = null;
    function showBanner(markerId, text, sub) {
      put(banner, markerEl(markerId, 'finish', 'pts-cheer-fin'),
        h('div', {}, h('strong', {}, text), sub ? h('span', {}, sub) : null));
      banner.hidden = false;
      banner.classList.remove('show');
      void banner.offsetWidth;
      banner.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => { banner.hidden = true; }, BANNER_MS);
    }

    function celebrate(c, ev) {
      const b = points.bar(c.id);
      if (!b) return;
      const sound = !b.muted;
      if (ev.classReached) {
        if (sound) playChime(b.chime);
        showBanner(b.marker, t('Goal reached! Well done, everyone!'), b.reward || '');
        setTimeout(() => confetti(race.el, 40), 350);
        return;
      }
      if (ev.reached.length) {
        if (sound) playChime(b.chime);
        const until = Date.now() + CHEER_MS;
        ev.reached.forEach((name) => cheering.set(name, until));
        const [first, second] = ev.reached;
        const n = ev.reached.length;
        const text = n === 1 ? t('{name} reached the goal!', { name: first })
          : n === 2 ? t('{a} and {b} reached the goal!', { a: first, b: second })
            : t('{name} and {n} others reached the goal!', { name: first, n: n - 1 });
        showBanner(n === 1 ? (b.markers[first] || b.marker) : b.marker, text, b.reward || '');
        render();
        ev.reached.slice(0, 12).forEach((name) => setTimeout(() => confetti(rows.get(name)?.lane?.el, n > 4 ? 10 : 22), 350));
        // Then each marker goes back to the start for the next round, without sliding back.
        clearTimeout(cheerTimer);
        cheerTimer = setTimeout(() => {
          for (const [name, until] of cheering) if (until <= Date.now() + 50) cheering.delete(name);
          ev.reached.forEach((name) => rows.get(name)?.lane?.el.classList.add('no-anim'));
          render();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            ev.reached.forEach((name) => rows.get(name)?.lane?.el.classList.remove('no-anim'));
          }));
        }, CHEER_MS);
        return;
      }
      if (ev.milestone && b.milestones && sound) playMilestone(ev.milestone);
    }

    function give(c, deltas) {
      const ev = points.change(c.id, deltas, c.students);
      Object.entries(deltas).forEach(([n, d]) => pop(n, d));
      celebrate(c, ev);
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
      cheering.clear();
      const undone = points.undo(c.id);
      if (undone?.lesson) {
        ctx.toast(t('Undone: new lesson'));
      } else if (undone?.reset) {
        ctx.toast(undone.reset === 'class' ? t('Undone: class total reset') : t('Undone: points reset'));
      } else if (undone) {
        const n = Object.keys(undone).length;
        ctx.toast(n > 1 ? t('Undone: whole-class change ({n} students)', { n }) : t('Undone: {name}', { name: Object.keys(undone)[0] }));
      }
    });

    // ---------- ⋯ options ----------
    function openOptions() {
      const c = cls();
      if (!c) return;
      openModal(t('Points · {name}', { name: c.name }), (mb) => {
        mb.append(
          lessonPanel(c),
          resetPanel(c),
          goalPanel(c),
          h('section', { class: 'panel' },
            h('h3', {}, t('Lesson log')),
            h('p', { class: 'muted' }, t('A spreadsheet (CSV) with one row per student and one column per day, plus each running total. Opens in Excel or Google Sheets.')),
            h('button', { class: 'btn with-icon', onclick: () => { points.exportCsv(c); ctx.toast(t('Points log downloaded')); } }, icon('download'), t('Download log (CSV)')),
          ),
          h('p', { class: 'muted small' }, t('Tap a name to mark a student absent for today; “+ All” and “− All” skip them. Points are saved in this browser with the class list, so every board showing this class shows the same totals.')),
        );
      }, { wide: true });
    }

    // The lesson now on, and a button for the next one (a second lesson the same day).
    function lessonPanel(c) {
      const info = points.lessonInfo(c.id);
      const n = points.lessonTotal(c);
      return h('section', { class: 'panel pts-lesson' },
        h('h3', {}, info && info.n > 1 ? t('Lesson {n} today', { n: info.n }) : t('This lesson')),
        h('p', { class: 'muted' }, t('Each lesson’s points start at 0. The number beside a name is the student’s total before this lesson; this lesson’s points ({n} for the class) are added to it when the next lesson starts. A new lesson starts by itself on a new day.', { n: signed(n) })),
        h('div', { class: 'pts-reset-opt' },
          confirmButton(t('Start a new lesson'), t('Click again to start'), () => {
            points.newLesson(c.id);
            cheering.clear();
            closeModal();
            ctx.toast(t('{name}: new lesson started', { name: c.name }));
          }, 'btn primary'),
          h('p', { class: 'muted small' }, t('For a second lesson with this class today. Absent marks clear. **Undo** takes it back.').split('**').map((x, i) => (i % 2 ? h('b', {}, x) : x)))),
      );
    }

    // Two resets, each clicked twice; Undo can reverse either today.
    function resetPanel(c) {
      const b = points.bar(c.id);
      const go = (kind, msg) => () => {
        points.reset(c.id, kind, c.students);
        cheering.clear();
        closeModal();
        ctx.toast(t(msg, { name: c.name }));
      };
      const opt = (button, text) => h('div', { class: 'pts-reset-opt' }, button, h('p', { class: 'muted small' }, text));
      return h('section', { class: 'panel pts-reset' },
        h('h3', {}, t('Reset points')),
        opt(confirmButton(t('Everyone to 0'), t('Click again to reset'), go('all', '{name}: points reset to 0')),
          b ? t('Every student’s points go back to 0, so the class total is 0 too. The goal bar starts again.')
            : t('Every student’s points go back to 0, so the class total is 0 too.')),
        opt(confirmButton(t('Class total only'), t('Click again to reset'), go('class', '{name}: class total reset to 0')),
          b?.mode === 'class' ? t('The class total and the class goal bar start again from 0. Students keep their own points.')
            : t('The class total starts again from 0. Students keep their own points.')),
        h('p', { class: 'muted small' }, t('Pressed by mistake? **Undo** brings everything back, today only. The log (CSV) keeps every day and shows the reset.').split('**').map((x, i) => (i % 2 ? h('b', {}, x) : x))),
      );
    }

    function goalPanel(c) {
      const saved = points.bar(c.id);
      const draft = {
        mode: saved?.mode || 'none',
        target: saved?.target || (saved ? '' : points.DEFAULT_LESSON_TARGET),
        marker: saved?.marker || DEFAULT_MARKER,
        chime: saved?.chime || DEFAULT_CHIME,
        reward: saved?.reward || '',
        milestones: saved ? saved.milestones : true,
        debt: saved?.debt || 'carry',
        markers: { ...(saved?.markers || {}) },
      };
      // Teachers often switch modes to compare; keep the number typed for each.
      const targets = {
        lesson: saved?.mode === 'lesson' ? saved.target : points.DEFAULT_LESSON_TARGET,
        class: saved?.mode === 'class' ? saved.target : '',
        student: saved?.mode === 'student' ? saved.target : '',
      };
      const panel = h('section', { class: 'panel pts-goal-panel' });

      function fill() {
        const kids = [h('h3', {}, t('Goal bar')),
          segmented([['none', t('No goal')], ['lesson', t('Lesson goal')], ['class', t('Class goal')], ['student', t('Student goal')]], draft.mode, (v) => {
            if (draft.mode !== 'none') targets[draft.mode] = draft.target;
            draft.mode = v;
            if (v !== 'none') draft.target = targets[v] || '';
            fill();
          }, t('Goal bar'))];

        if (draft.mode === 'none') {
          kids.push(h('p', { class: 'muted' }, t('Add a goal bar for younger learners: a marker of your choice moves along a track as points come in, with a chime at the finish.')));
          if (saved) kids.push(h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: () => { points.clearBar(c.id); closeModal(); ctx.toast(t('Goal bar removed')); } }, t('Remove goal bar'))));
          put(panel, kids);
          return;
        }

        const isClass = draft.mode === 'class';
        const isLesson = draft.mode === 'lesson';
        const targetInput = h('input', {
          type: 'number', min: 1, max: 100000, step: 1, class: 'input num wide', value: draft.target,
          placeholder: isClass ? t('e.g. 100') : t('e.g. 10'),
          oninput: (e) => { draft.target = e.target.value; },
        });
        kids.push(
          h('p', { class: 'muted' }, isLesson
            ? t('A track in every student’s row for this lesson only, from minus the goal on the left to the goal on the right, so points gained show in blue and points lost in red. Each lesson starts at 0. A student who reaches the goal hears the chime and collects a badge; points above it still count.')
            : isClass
              ? t('One track for the whole class. Every point anyone earns moves the marker on, so one “+ All” moves it {n} for a full class. At the finish the chime plays and you choose when to start the next round.', { n: c.students.length })
              : t('A track in every student’s row that runs across lessons. A student who reaches the finish hears the chime, collects a badge and starts the next round straight away.')),
          h('label', { class: 'field' }, h('span', {}, isLesson ? t('Points each student needs in a lesson') : isClass ? t('Points the class needs') : t('Points each student needs')), targetInput),
        );

        // Marker, with the finish it travels to
        const mkGrid = h('div', { class: 'pts-mk-grid', role: 'radiogroup', 'aria-label': t('Marker') },
          ...MARKERS.map((m) => {
            const on = m.id === draft.marker;
            return h('button', {
              class: 'pts-mk-opt' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on),
              title: t('{marker} to the {finish}', { marker: t(m.label), finish: t(m.finish.label) }),
              onclick: () => { draft.marker = m.id; fill(); },
            }, h('span', { class: 'pts-mk-pair' }, markerEl(m.id), h('span', { class: 'pts-mk-arrow' }, '→'), markerEl(m.id, 'finish')), h('span', {}, t(m.label)));
          }));
        kids.push(h('div', { class: 'field' }, h('span', {}, t('Marker')), mkGrid));

        // Chime: tap to choose and hear it
        const chimes = h('div', { class: 'pts-chimes', role: 'radiogroup', 'aria-label': t('Chime at the finish') },
          ...CHIMES.map((ch) => {
            const on = ch.id === draft.chime;
            return h('button', {
              class: 'btn small with-icon pts-chime' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on),
              title: t('Tap to choose and hear it'),
              onclick: () => { draft.chime = ch.id; playChime(ch.id); fill(); },
            }, icon('player-play'), t(ch.label));
          }));
        const milestoneBox = h('label', { class: 'pts-check' },
          h('input', { type: 'checkbox', checked: draft.milestones, onchange: (e) => { draft.milestones = e.target.checked; } }),
          t('Short sounds at ¼, ½ and ¾ of the way'),
          h('button', { class: 'icon-btn small', title: t('Hear them'), 'aria-label': t('Hear the milestone sounds'), onclick: (e) => { e.preventDefault(); [1, 2, 3].forEach((q, i) => setTimeout(() => playMilestone(q), i * 550)); } }, icon('player-play')));
        kids.push(h('div', { class: 'field' }, h('span', {}, t('Chime at the finish')), chimes), milestoneBox);

        // When points go below zero
        const RULES = [
          ['carry', t('Count points from before the goal'), isClass
            ? t('Lost points must be made up before the marker moves on again. If the class total is below zero when the goal is set, the class starts that far behind.')
            : t('Lost points must be made up before the marker moves on again. Anyone below zero when the goal is set starts that far behind.')],
          ['earn', t('Fresh start at the goal'), t('Lost points must still be made up, but everyone starts from zero when the goal is set.')],
          ['zero', t('Total must be 0 or more'), t('The marker never goes behind the start. At the finish it waits until the total is 0 or more before the goal counts.')],
        ];
        if (!isLesson) kids.push(h('div', { class: 'field' }, h('span', {}, t('If points go below zero')),
          h('div', { class: 'pts-rules', role: 'radiogroup', 'aria-label': t('If points go below zero') }, ...RULES.map(([id, label, help]) => h('label', { class: 'pts-rule' + (draft.debt === id ? ' on' : '') },
            h('input', { type: 'radio', name: 'pts-debt', value: id, checked: draft.debt === id, onchange: () => { draft.debt = id; fill(); } }),
            h('span', {}, h('strong', {}, label), h('span', { class: 'muted small' }, help)))))));

        // Reward
        kids.push(h('label', { class: 'field' }, h('span', {}, t('Reward at the finish (optional)')),
          h('input', {
            type: 'text', class: 'input', maxlength: 80, value: draft.reward, placeholder: t('e.g. Five more minutes of recess'),
            oninput: (e) => { draft.reward = e.target.value; },
          })));

        // Students' own markers
        if (!isClass) {
          const own = Object.keys(draft.markers).filter((n) => c.students.includes(n)).length;
          const details = h('details', { class: 'pts-own' },
            h('summary', {}, own ? t('Students’ own markers ({n} chosen)', { n: own }) : t('Students’ own markers')),
            h('p', { class: 'muted small' }, t('Let a student choose their own marker. Everyone else has the class marker.')),
            h('div', { class: 'pts-own-list' }, ...c.students.map((name) => {
              const s = h('select', { class: 'input small', 'aria-label': t('Marker for {name}', { name }) },
                h('option', { value: '' }, t('Like the class ({marker})', { marker: t(markerDef(draft.marker).label) })),
                ...MARKERS.map((m) => h('option', { value: m.id }, t(m.label))));
              s.value = draft.markers[name] || '';
              s.addEventListener('change', () => { if (s.value) draft.markers[name] = s.value; else delete draft.markers[name]; });
              return h('label', { class: 'pts-own-row' }, h('span', {}, name), s);
            })));
          kids.push(details);
        }

        const saveBtn = h('button', { class: 'btn primary', onclick: save }, t('Save goal bar'));
        kids.push(h('div', { class: 'row gap wrap' }, saveBtn,
          saved && isLesson && saved.mode === 'lesson' ? confirmButton(t('Clear badges'), t('Click again to clear'), () => {
            points.restartBar(c.id, c.students);
            closeModal();
            ctx.toast(t('Badges cleared'));
          }, 'btn') : saved && !isLesson ? confirmButton(t('Start everyone from zero'), t('Click again to restart'), () => {
            points.restartBar(c.id, c.students);
            closeModal();
            ctx.toast(isClass ? t('The class starts from zero') : t('Everyone starts from zero; badges cleared'));
          }, 'btn') : null));
        kids.push(h('p', { class: 'muted small' }, isLesson
          ? t('Badges build up until you clear them or reset points. Changing the number, marker, chime or reward keeps this lesson’s progress.')
          : t('A new number, a different rule for points below zero, or switching between class and student goals starts the bar again. Changing the marker, chime or reward keeps everyone’s place.')));
        put(panel, kids);

        function save() {
          const target = Math.round(Number(draft.target));
          if (!Number.isFinite(target) || target < 1) {
            targetInput.focus();
            ctx.toast(t('Type how many points to reach.'));
            return;
          }
          const markers = Object.fromEntries(Object.entries(draft.markers).filter(([n]) => c.students.includes(n)));
          const restarted = points.setBar(c.id, { ...draft, target, markers }, c.students);
          closeModal();
          ctx.toast(restarted ? t('Goal bar set. Counting starts from zero.') : t('Goal bar updated'));
        }
      }
      fill();
      return panel;
    }

    // Class lists and points share one store, so this also fires after every tap,
    // and when another window changes them.
    const unsub = ctx.onClassesChange(() => { sel.refresh(); render(); });
    render();
    return {
      destroy() {
        unsub();
        clearTimeout(cheerTimer);
        clearTimeout(bannerTimer);
      },
    };
  },
};
