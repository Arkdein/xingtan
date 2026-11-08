import { h, put, classSelect, segmented, openModal, closeModal, confirmButton } from '../ui.js';
import * as points from '../points.js';
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
    const moreBtn = h('button', { class: 'icon-btn small', title: t('Goal bar, export and reset'), 'aria-label': t('Points options'), onclick: openOptions }, icon('dots'));

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

    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, t('Add a class list to start giving points.')),
      h('button', { class: 'btn primary', onclick: () => ctx.openClasses() }, t('Add class list')),
    );
    const main = h('div', { class: 'pts' },
      h('div', { class: 'row gap space-between pts-top' },
        sel.el,
        h('div', { class: 'row gap' }, h('div', { class: 'seg', role: 'group', 'aria-label': t('Sort') }, ...sortBtns), muteBtn, viewBtn, moreBtn),
      ),
      list,
      goalBar,
      h('div', { class: 'row gap space-between pts-foot' },
        h('div', { class: 'row gap' }, minusAll, plusAll, undoBtn),
        h('div', { class: 'pts-foot-info' }, totalEl, absentEl),
      ),
      banner,
    );
    body.append(main, emptyMsg);

    // Chip when minimised: the class bar, or how many goals students have reached.
    const miniLane = buildLane('pts-lane mini');
    const miniText = h('span', { class: 'mini-text' });
    const mini = h('span', { class: 'pts-mini' });
    ctx.setMiniControls?.(mini);

    // A track: the marker runs along it to the finish. --p (0–1) places the marker.
    function buildLane(cls) {
      const mk = h('span', { class: 'pts-mk' });
      const fin = h('span', { class: 'pts-fin' });
      const ticks = [1, 2, 3].map((q) => h('i', { class: 'pts-tick', style: `--q:${q / 4}` }));
      const el = h('div', { class: cls }, h('div', { class: 'pts-run' }, ...ticks, mk), fin);
      let shown = '';
      return {
        el,
        set(markerId, p) {
          if (markerId !== shown) {
            shown = markerId;
            mk.replaceChildren(markerEl(markerId));
            fin.replaceChildren(markerEl(markerId, 'finish'));
            const m = markerDef(markerId);
            mk.title = t(m.label);
            fin.title = t(m.finish.label);
          }
          el.style.setProperty('--p', String(Math.max(0, Math.min(1, p))));
        },
      };
    }

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

    function buildRows(c, withLanes) {
      order = sortedNames(c);
      rows.clear();
      list.replaceChildren(...order.map((name) => {
        const val = h('span', { class: 'pts-val', 'aria-live': 'polite' });
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
          nameBtn, lane?.el, h('div', { class: 'pts-ctrl' }, minus, val, plus));
        rows.set(name, { row, val, minus, plus, nameBtn, lane, badge, badgeKey: '' });
        return row;
      }));
    }

    function render() {
      const c = cls();
      const has = c && c.students.length > 0;
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) {
        if (c) emptyMsg.querySelector('p').textContent = t('“{name}” has no names yet.', { name: c.name });
        builtFor = '';
        put(mini);
        return;
      }
      points.migrateGoal(c); // older class goals become a class bar (once)
      const b = points.bar(c.id);
      const mode = b?.mode || 'none';
      const big = mode === 'class' && ctx.state.view === 'bar';
      main.classList.toggle('big', big);
      sortBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.sort === sort));

      // Rebuild rows only when the class, its names, the sort or the bar's mode changes,
      // so a tap never moves rows under the teacher's finger.
      const key = `${c.id}|${sort}|${mode === 'student'}|${c.students.join('\n')}`;
      if (key !== builtFor) { buildRows(c, mode === 'student'); builtFor = key; }

      const now = Date.now();
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
        r.nameBtn.title = isAway ? t('Absent today. Tap to mark present.') : t('Tap to mark absent');
        if (r.lane && b) {
          const s = points.studentProgress(c.id, name);
          const id = b.markers[name] || b.marker;
          const atFinish = (cheering.get(name) || 0) > now;
          r.row.classList.toggle('cheer', atFinish);
          r.lane.set(id, atFinish ? 1 : s.e / b.target);
          r.lane.el.title = t('{name}: {e} of {target} towards the next goal', { name, e: s.e, target: b.target });
          const badgeKey = `${id}|${s.b}`;
          if (badgeKey !== r.badgeKey) {
            r.badgeKey = badgeKey;
            put(r.badge, s.b ? [markerEl(id, 'finish'), h('span', {}, `×${s.b}`)] : null);
            r.badge.title = s.b ? t('Goals reached: {n}', { n: s.b }) : '';
          }
        }
      }

      const total = points.classTotal(c);
      totalEl.textContent = t('Class total {total}', { total });
      goalBar.hidden = mode !== 'class';
      list.hidden = big;
      if (mode === 'class') {
        const reached = b.cls.e >= b.target;
        race.set(b.marker, b.cls.e / b.target);
        goalBar.classList.toggle('done', reached);
        reachedEl.hidden = !reached;
        rewardEl.textContent = b.reward;
        rewardEl.hidden = !b.reward;
        roundEl.textContent = b.cls.round > 1 ? t('Round {n}', { n: b.cls.round }) : '';
        countEl.textContent = `${Math.min(b.cls.e, b.target)} / ${b.target}`;
        goalBar.title = t('Points the class has earned towards the goal');
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
      viewBtn.hidden = mode !== 'class';
      if (mode === 'class') {
        const label = big ? t('Show the names') : t('Big goal bar (hides the names)');
        viewBtn.replaceChildren(icon(big ? 'list' : 'arrows-maximize'));
        viewBtn.title = label;
        viewBtn.setAttribute('aria-label', label);
      }

      // Chip
      if (mode === 'class') {
        miniLane.set(b.marker, b.cls.e / b.target);
        miniText.textContent = `${Math.min(b.cls.e, b.target)}/${b.target}`;
        put(mini, miniLane.el, miniText);
      } else if (mode === 'student') {
        const goals = c.students.reduce((n, name) => n + points.studentProgress(c.id, name).b, 0);
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
      const ev = points.change(c.id, deltas);
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
      if (undone) {
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
          goalPanel(c),
          h('section', { class: 'panel' },
            h('h3', {}, t('Lesson log')),
            h('p', { class: 'muted' }, t('A spreadsheet (CSV) with one row per student and one column per day, plus each running total. Opens in Excel or Google Sheets.')),
            h('button', { class: 'btn with-icon', onclick: () => { points.exportCsv(c); ctx.toast(t('Points log downloaded')); } }, icon('download'), t('Download log (CSV)')),
          ),
          h('section', { class: 'panel' },
            h('h3', {}, t('New term')),
            h('p', { class: 'muted' }, t('Sets every total in {name} back to 0, and the goal bar back to the start. The day-by-day log is kept.', { name: c.name })),
            confirmButton(t('Reset points to 0'), t('Click again to reset'), () => {
              points.resetTotals(c.id);
              closeModal();
              ctx.toast(t('{name}: points reset to 0', { name: c.name }));
            }),
          ),
          h('p', { class: 'muted small' }, t('Tap a name to mark a student absent for today; “+ All” and “− All” skip them. Points are saved in this browser with the class list, so every board showing this class shows the same totals.')),
        );
      }, { wide: true });
    }

    function goalPanel(c) {
      const saved = points.bar(c.id);
      const draft = {
        mode: saved?.mode || 'none',
        target: saved?.target || '',
        marker: saved?.marker || DEFAULT_MARKER,
        chime: saved?.chime || DEFAULT_CHIME,
        reward: saved?.reward || '',
        milestones: saved ? saved.milestones : true,
        markers: { ...(saved?.markers || {}) },
      };
      // Teachers often switch modes to compare; keep the number typed for each.
      const targets = { class: saved?.mode === 'class' ? saved.target : '', student: saved?.mode === 'student' ? saved.target : '' };
      const panel = h('section', { class: 'panel pts-goal-panel' });

      function fill() {
        const kids = [h('h3', {}, t('Goal bar')),
          segmented([['none', t('No goal')], ['class', t('Class goal')], ['student', t('Student goal')]], draft.mode, (v) => {
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
        const targetInput = h('input', {
          type: 'number', min: 1, max: 100000, step: 1, class: 'input num wide', value: draft.target,
          placeholder: isClass ? t('e.g. 100') : t('e.g. 10'),
          oninput: (e) => { draft.target = e.target.value; },
        });
        kids.push(
          h('p', { class: 'muted' }, isClass
            ? t('One track for the whole class. Every point anyone earns moves the marker on, so one “+ All” moves it {n} for a full class. At the finish the chime plays and you choose when to start the next round.', { n: c.students.length })
            : t('A track in every student’s row. A student who reaches the finish hears the chime, collects a badge and starts the next round straight away.')),
          h('label', { class: 'field' }, h('span', {}, isClass ? t('Points the class needs') : t('Points each student needs')), targetInput),
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
          saved ? confirmButton(t('Start everyone from zero'), t('Click again to restart'), () => {
            points.restartBar(c.id);
            closeModal();
            ctx.toast(isClass ? t('The class starts from zero') : t('Everyone starts from zero; badges cleared'));
          }, 'btn') : null));
        kids.push(h('p', { class: 'muted small' }, t('A new number, or switching between class and student goals, starts the bar from zero. Changing the marker, chime or reward keeps everyone’s place.')));
        put(panel, kids);

        function save() {
          const target = Math.round(Number(draft.target));
          if (!Number.isFinite(target) || target < 1) {
            targetInput.focus();
            ctx.toast(t('Type how many points to reach.'));
            return;
          }
          const markers = Object.fromEntries(Object.entries(draft.markers).filter(([n]) => c.students.includes(n)));
          const restarted = points.setBar(c.id, { ...draft, target, markers });
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
