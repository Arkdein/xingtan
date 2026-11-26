// My classes (overview.html): every class on this computer at a glance, for the
// teacher only. It opens in its own tab from the boards screen, so it never sits
// on a board that might be projected.
//
// Read-only: it shows points, 行为表现 (skills), badges, groups and students to
// check in with, prints student reports and downloads a CSV. Changes are made in
// the Points and Groups tools; this page follows them (and other windows) live.
//
// Flags for a check-in (from the lessons the class has had points in):
//   below    term total below zero
//   repeat   the same needs-work reason 3 or more times in the last 5 lessons
//   sliding  the last 3 lessons each ended below zero for the student
//   quiet    no praise in the last 5 lessons (no 行为表现 praise, and no lesson above zero)
import * as store from './store.js';
import * as points from './points.js';
import * as grouping from './grouping.js';
import { h } from './ui.js';
import { icon } from './icons.js';
import { t, getLang, setLang, onLangChange, locale } from './i18n.js';

const RECENT = 5;   // lessons looked at for "repeat" and "quiet"
const REPEAT = 3;   // times the same needs-work reason counts as repeated
const SLIDE = 3;    // lessons in a row below zero for "sliding"
const CHART_MAX = 24; // lessons shown in a report's chart

const root = document.getElementById('overview');
const ui = { cls: 'all', q: '', flagged: false, levels: false, sort: 'class', dir: 1, report: null };

// ---------- Working out each class ----------

const fmtLesson = (k) => {
  const d = new Date(`${points.lessonDate(k)}T00:00:00`);
  const day = d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  const n = points.lessonNumber(k);
  return n > 1 ? `${day} (${n})` : day;
};
const fmtWhen = (ms) => new Date(ms).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

function classData(c) {
  const hist = points.history(c.id);
  const skills = new Map(points.skills(c.id).list.map((k) => [k.id, k]));
  const bar = points.bar(c.id);
  const g = grouping.settings(c);
  const rounds = g.history.slice().reverse(); // newest first
  const last = rounds[0] || null;
  const lesson = points.lessonInfo(c.id);
  const away = new Set(points.absentNames(c.id));
  const recent = hist.keys.slice(-RECENT);
  const slide = hist.keys.slice(-SLIDE);
  const net = (k, name) => hist.log[k]?.[name] || 0;
  const given = (k, name) => Object.entries(hist.skillLog[k]?.[name] || {});

  const students = c.students.map((name) => {
    const pos = new Map();
    const neg = new Map();
    let lessons = 0;
    hist.keys.forEach((k) => {
      if (hist.log[k]?.[name] || hist.skillLog[k]?.[name]) lessons += 1;
      given(k, name).forEach(([id, [n]]) => {
        const kind = skills.get(id)?.kind === 'neg' ? neg : pos;
        kind.set(id, (kind.get(id) || 0) + n);
      });
    });
    const total = points.totalOf(c.id, name);
    const flags = [];
    if (total < 0) flags.push({ id: 'below' });
    const lately = new Map();
    recent.forEach((k) => given(k, name).forEach(([id, [n]]) => {
      if (skills.get(id)?.kind === 'neg') lately.set(id, (lately.get(id) || 0) + n);
    }));
    [...lately].filter(([, n]) => n >= REPEAT).forEach(([id, n]) => flags.push({ id: 'repeat', skill: skills.get(id), n }));
    if (slide.length === SLIDE && slide.every((k) => net(k, name) < 0)) flags.push({ id: 'sliding' });
    if (recent.length === RECENT && recent.every((k) => net(k, name) <= 0 && !given(k, name).some(([id]) => skills.get(id)?.kind === 'pos'))) {
      flags.push({ id: 'quiet' });
    }
    const gi = last ? last.groups.findIndex((grp) => grp.includes(name)) : -1;
    return {
      name, cls: c, total, lessons,
      now: lesson ? points.lessonOf(c.id, name) : null,
      badges: bar?.stu?.[name]?.b || 0,
      pos: sortCounts(pos, skills), neg: sortCounts(neg, skills),
      flags,
      group: gi >= 0 ? gi + 1 : null,
      role: last?.roles?.[name] || '',
      level: g.levels[name] || null,
      away: away.has(name),
      series: hist.keys.slice(-CHART_MAX).map((k) => [k, net(k, name)]),
    };
  });
  return {
    c, hist, students, rounds, lesson,
    classTotal: points.classTotal(c),
    lessonTotal: lesson ? points.lessonTotal(c) : null,
    lastUsed: hist.keys.length ? hist.keys[hist.keys.length - 1] : null,
    away: [...away].filter((n) => c.students.includes(n)).length,
  };
}

function sortCounts(map, skills) {
  return [...map].map(([id, n]) => ({ id, n, skill: skills.get(id) || { label: t('Deleted skill'), icon: 'dots' } }))
    .sort((a, b) => b.n - a.n || a.skill.label.localeCompare(b.skill.label));
}

// ---------- Pieces ----------

const FLAG_TEXT = {
  below: () => [t('Below zero'), t('Term total is below zero.')],
  repeat: (f) => [t('{skill} ×{n}', { skill: shortLabel(f.skill?.label || t('Deleted skill')), n: f.n }), t('“{skill}” {n} times in the last 5 lessons.', { skill: f.skill?.label || t('Deleted skill'), n: f.n })],
  sliding: () => [t('Sliding'), t('Each of the last 3 lessons ended below zero.')],
  quiet: () => [t('No praise lately'), t('No praise and no lesson above zero in the last 5 lessons.')],
};
function flagChip(f) {
  const [label, why] = FLAG_TEXT[f.id](f);
  return h('span', { class: `ov-flag ov-flag-${f.id}`, title: why }, label);
}

function skillChips(list, max = 3) {
  if (!list.length) return h('span', { class: 'muted' }, '–');
  return h('span', { class: 'ov-skills' }, ...list.slice(0, max).map((x) => h('span', { class: 'ov-skill', title: x.skill.label },
    icon(x.skill.icon || 'dots'), h('span', {}, shortLabel(x.skill.label)), h('b', {}, `×${x.n}`))),
  list.length > max ? h('span', { class: 'muted small' }, `+${list.length - max}`) : null);
}
// "帮助同学 Helping others" shows as the part in the app's language when there are both.
function shortLabel(label) {
  const m = /^([㐀-鿿豈-﫿·、，]+)\s+(.+)$/.exec(label);
  if (!m) return label;
  return getLang() === 'zh' ? m[1] : m[2];
}

const groupText = (s) => (s.group ? t('Group {n}', { n: s.group }) : '–');

// ---------- Page ----------

function render() {
  const lang = getLang();
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans-SG' : 'en';
  document.title = `${t('My classes')} · 杏坛 · ClassroomBoard`;
  const classes = store.getClasses();
  const data = classes.map(classData);
  if (ui.cls !== 'all' && !classes.some((c) => c.id === ui.cls)) ui.cls = 'all';

  const top = h('header', { class: 'g-top' },
    h('a', { class: 'g-brand', href: './' },
      h('img', { src: 'icons/icon.svg', alt: '' }),
      h('span', { class: 'brand-zh' }, '杏坛'), h('span', { class: 'g-brand-dot' }, '·'), h('span', {}, 'ClassroomBoard')),
    h('span', { class: 'g-top-title' }, t('My classes')),
    h('span', { class: 'g-grow' }),
    h('button', { class: 'g-lang', onclick: () => setLang(lang === 'zh' ? 'en' : 'zh'), title: lang === 'zh' ? 'Switch to English' : '切换到中文' }, lang === 'zh' ? 'EN' : '中文'),
    h('a', { class: 'g-open', href: './' }, t('Open 杏坛')));

  const main = h('main', { class: 'ov-main' },
    h('div', { class: 'ov-intro' },
      h('h1', {}, t('My classes')),
      h('p', { class: 'muted' }, t('Every class on this computer: points, 行为表现, groups, and students who may need a check-in. This page is for you, not the projector. Changes are made in the Points and Groups tools, and show here straight away.'))));

  if (!classes.length) {
    main.append(h('div', { class: 'empty-state ov-empty' },
      h('p', {}, t('No classes yet.')),
      h('p', { class: 'muted' }, t('Add a class list in 杏坛 (corner menu → Class lists), then give points or make groups.')),
      h('a', { class: 'btn primary', href: './' }, t('Open 杏坛'))));
    root.replaceChildren(top, main);
    return;
  }

  main.append(classCards(data), studentsSection(data), groupsSection(data), legend());
  root.replaceChildren(top, main);
  if (ui.report) root.append(reportView(data));
}

function classCards(data) {
  return h('section', { class: 'ov-cards', 'aria-label': t('Classes') }, ...data.map((d) => {
    const flagged = d.students.filter((s) => s.flags.length).length;
    const badges = d.students.reduce((n, s) => n + s.badges, 0);
    const on = ui.cls === d.c.id;
    return h('button', {
      class: 'ov-card' + (on ? ' on' : ''), 'aria-pressed': String(on),
      onclick: () => { ui.cls = on ? 'all' : d.c.id; render(); },
    },
    h('span', { class: 'ov-card-name' }, d.c.name),
    h('span', { class: 'ov-card-sub' }, d.c.students.length === 1 ? t('{n} student', { n: 1 }) : t('{n} students', { n: d.c.students.length }),
      ' · ', d.lastUsed ? t('Last points {date}', { date: fmtLesson(d.lastUsed) }) : t('No points yet')),
    h('span', { class: 'ov-card-stats' },
      stat(t('Class total'), signed(d.classTotal)),
      d.lessonTotal != null ? stat(t('This lesson'), signed(d.lessonTotal)) : null,
      stat(t('Lessons'), String(d.hist.keys.length)),
      badges ? stat(t('Badges'), String(badges)) : null),
    h('span', { class: 'ov-card-foot' },
      flagged ? h('span', { class: 'ov-flag ov-flag-sum' }, flagged === 1 ? t('1 to check in with') : t('{n} to check in with', { n: flagged })) : null,
      d.away ? h('span', { class: 'muted' }, t('{n} absent today', { n: d.away })) : null,
      d.rounds.length ? h('span', { class: 'muted' }, t('Groups {when}', { when: fmtWhen(d.rounds[0].at) })) : null));
  }));
}
const stat = (label, value) => h('span', { class: 'ov-stat' }, h('b', {}, value), h('span', {}, label));

function visibleStudents(data) {
  const q = ui.q.trim().toLowerCase();
  let rows = data.filter((d) => ui.cls === 'all' || d.c.id === ui.cls).flatMap((d) => d.students);
  if (q) rows = rows.filter((s) => s.name.toLowerCase().includes(q));
  if (ui.flagged) rows = rows.filter((s) => s.flags.length);
  const coll = new Intl.Collator(locale(), { sensitivity: 'base', numeric: true });
  const order = data.map((d) => d.c.id);
  const by = {
    class: (a, b) => order.indexOf(a.cls.id) - order.indexOf(b.cls.id) || a.cls.students.indexOf(a.name) - b.cls.students.indexOf(b.name),
    name: (a, b) => coll.compare(a.name, b.name),
    total: (a, b) => a.total - b.total,
    now: (a, b) => (a.now ?? -Infinity) - (b.now ?? -Infinity),
    badges: (a, b) => a.badges - b.badges,
    flags: (a, b) => a.flags.length - b.flags.length,
    group: (a, b) => (a.group ?? 999) - (b.group ?? 999),
  }[ui.sort];
  return rows.sort((a, b) => ui.dir * by(a, b) || coll.compare(a.name, b.name));
}

function studentsSection(data) {
  const rows = visibleStudents(data);
  const one = ui.cls !== 'all' ? data.find((d) => d.c.id === ui.cls) : null;
  const sel = h('select', { class: 'input', 'aria-label': t('Class'), onchange: (e) => { ui.cls = e.target.value; render(); } },
    h('option', { value: 'all' }, t('All classes')), ...data.map((d) => h('option', { value: d.c.id }, d.c.name)));
  sel.value = ui.cls;
  const find = h('input', { type: 'search', class: 'input', placeholder: t('Find a student'), 'aria-label': t('Find a student'), value: ui.q });
  find.addEventListener('input', () => { ui.q = find.value; const pos = find.selectionStart; render(); const f = root.querySelector('.ov-tools input[type=search]'); f?.focus(); f?.setSelectionRange(pos, pos); });
  const check = (key, label) => h('label', { class: 'row gap ov-check' },
    h('input', { type: 'checkbox', checked: ui[key], onchange: (e) => { ui[key] = e.target.checked; render(); } }), label);

  const head = (key, label, cls = '') => h('th', { class: cls, 'aria-sort': ui.sort === key ? (ui.dir > 0 ? 'ascending' : 'descending') : 'none' },
    key ? h('button', { class: 'ov-sort', onclick: () => { if (ui.sort === key) ui.dir = -ui.dir; else { ui.sort = key; ui.dir = ['total', 'now', 'badges', 'flags'].includes(key) ? -1 : 1; } render(); } },
      label, ui.sort === key ? (ui.dir > 0 ? ' ↑' : ' ↓') : '') : label);

  const table = h('table', { class: 'ov-table' },
    h('thead', {}, h('tr', {},
      head('name', t('Student')),
      ui.cls === 'all' ? head('class', t('Class')) : null,
      head('total', t('Term total'), 'ov-num'),
      head('now', t('This lesson'), 'ov-num'),
      head('badges', t('Badges'), 'ov-num'),
      head(null, t('Top praise')),
      head(null, t('Needs work')),
      head('group', t('Latest group')),
      ui.levels ? head(null, t('Level'), 'ov-num') : null,
      head('flags', t('Check in')))),
    h('tbody', {}, ...rows.map((s) => h('tr', { class: s.away ? 'away' : '' },
      h('td', {}, h('button', { class: 'ov-name', title: t('Open {name}’s report', { name: s.name }), onclick: () => { ui.report = { classId: s.cls.id, names: [s.name] }; render(); } }, s.name),
        s.away ? h('span', { class: 'ov-away' }, t('absent today')) : null),
      ui.cls === 'all' ? h('td', {}, s.cls.name) : null,
      h('td', { class: 'ov-num' + (s.total < 0 ? ' neg' : '') }, signed(s.total)),
      h('td', { class: 'ov-num' + ((s.now || 0) < 0 ? ' neg' : '') }, s.now == null ? '–' : signed(s.now)),
      h('td', { class: 'ov-num' }, s.badges ? String(s.badges) : '–'),
      h('td', {}, skillChips(s.pos)),
      h('td', {}, skillChips(s.neg)),
      h('td', {}, groupText(s), s.role ? h('span', { class: 'role-tag' }, s.role) : null),
      ui.levels ? h('td', { class: 'ov-num' }, s.level ? String(s.level) : '–') : null,
      h('td', {}, ...s.flags.map(flagChip))))));

  return h('section', { class: 'ov-section' },
    h('h2', {}, one ? t('Students in {name}', { name: one.c.name }) : t('All students')),
    h('div', { class: 'row gap wrap ov-tools' }, sel, find, check('flagged', t('Only those to check in with')), check('levels', t('Show levels')),
      h('span', { class: 'g-grow' }),
      one ? h('button', { class: 'btn with-icon', onclick: () => { ui.report = { classId: one.c.id, names: one.c.students.slice() }; render(); } }, icon('file-text'), t('Reports for the class')) : null,
      h('button', { class: 'btn with-icon', onclick: () => downloadCsv(rows) }, icon('download'), t('Download (CSV)'))),
    rows.length ? h('div', { class: 'ov-table-wrap' }, table)
      : h('p', { class: 'muted ov-none' }, ui.flagged ? t('No one to check in with. 🎉') : t('No students match.')));
}

function groupsSection(data) {
  const shown = data.filter((d) => (ui.cls === 'all' || d.c.id === ui.cls) && d.rounds.length);
  if (!shown.length) return null;
  return h('section', { class: 'ov-section' },
    h('h2', {}, t('Groups')),
    h('p', { class: 'muted' }, t('The last 3 rounds made in the Groups tool for each class, newest first.')),
    ...shown.map((d) => h('details', { class: 'ov-rounds', open: ui.cls !== 'all' },
      h('summary', {}, d.c.name, h('span', { class: 'muted' }, ` · ${fmtWhen(d.rounds[0].at)}`)),
      ...d.rounds.map((r, i) => h('div', { class: 'ov-round' },
        h('h3', {}, i === 0 ? t('Latest round · {when}', { when: fmtWhen(r.at) }) : fmtWhen(r.at)),
        h('div', { class: 'groups-grid ov-groups' }, ...r.groups.map((grp, gi) => h('div', { class: 'group-card' },
          h('div', { class: 'group-title' }, t('Group {n}', { n: gi + 1 })),
          h('ul', {}, ...grp.map((name) => h('li', {}, h('span', {}, name), r.roles?.[name] ? h('span', { class: 'role-tag' }, r.roles[name]) : null)))))))))));
}

function legend() {
  return h('section', { class: 'ov-section ov-legend' },
    h('h2', {}, t('About check-ins')),
    h('ul', {}, ...['below', 'repeat', 'sliding', 'quiet'].map((id) => {
      const [label, why] = id === 'repeat'
        ? [t('Repeated reason'), t('The same needs-work reason 3 or more times in the last 5 lessons.')]
        : FLAG_TEXT[id]({});
      return h('li', {}, h('span', { class: `ov-flag ov-flag-${id}` }, label), ' ', why);
    })),
    h('p', { class: 'muted small' }, t('Flags look only at lessons with points given, so a class that used Points for a few lessons only has fewer to go on. They are a prompt to talk, not a judgement.')));
}

// ---------- Student reports (print or save as PDF) ----------

function reportView(data) {
  const d = data.find((x) => x.c.id === ui.report.classId);
  const close = () => { ui.report = null; render(); };
  if (!d) { ui.report = null; return null; }
  const list = ui.report.names.map((n) => d.students.find((s) => s.name === n)).filter(Boolean);
  const wrap = h('div', { class: 'ov-report-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Student report') },
    h('div', { class: 'ov-report-bar' },
      h('strong', {}, list.length === 1 ? t('Report: {name}', { name: list[0].name }) : t('Reports: {name} ({n} students)', { name: d.c.name, n: list.length })),
      h('span', { class: 'g-grow' }),
      h('button', { class: 'btn primary with-icon', onclick: () => window.print() }, icon('printer'), t('Print or save as PDF')),
      h('button', { class: 'btn', onclick: close }, t('Close'))),
    h('div', { class: 'ov-reports' }, ...list.map((s) => report(d, s))));
  setTimeout(() => wrap.querySelector('.btn.primary')?.focus(), 0);
  return wrap;
}

function report(d, s) {
  const k0 = d.hist.keys.find((k) => d.hist.log[k]?.[s.name] || d.hist.skillLog[k]?.[s.name]);
  const roundsIn = d.rounds.map((r) => {
    const gi = r.groups.findIndex((grp) => grp.includes(s.name));
    return gi < 0 ? null : { at: r.at, group: gi + 1, role: r.roles?.[s.name] || '', with: r.groups[gi].filter((n) => n !== s.name) };
  }).filter(Boolean);
  const list = (items, empty) => (items.length
    ? h('ul', { class: 'ov-r-list' }, ...items.map((x) => h('li', {}, icon(x.skill.icon || 'dots'), h('span', {}, x.skill.label), h('b', {}, `×${x.n}`))))
    : h('p', { class: 'muted' }, empty));
  return h('article', { class: 'ov-report' },
    h('header', { class: 'ov-r-head' },
      h('div', {},
        h('h2', {}, s.name),
        h('p', { class: 'muted' }, d.c.name, ' · ', t('Report made {date}', { date: new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) }))),
      h('img', { src: 'icons/icon.svg', alt: '', class: 'ov-r-logo' })),
    h('div', { class: 'ov-r-stats' },
      stat(t('Term total'), signed(s.total)),
      stat(t('Lessons with points'), String(s.lessons)),
      stat(t('Badges'), String(s.badges)),
      k0 ? stat(t('Since'), fmtLesson(k0)) : null),
    h('section', {},
      h('h3', {}, t('Points by lesson')),
      s.series.some(([, v]) => v) ? chart(s.series) : h('p', { class: 'muted' }, t('No points given yet.'))),
    h('div', { class: 'ov-r-cols' },
      h('section', {}, h('h3', {}, t('Praise')), list(s.pos, t('None recorded.'))),
      h('section', {}, h('h3', {}, t('Needs work')), list(s.neg, t('None recorded.')))),
    roundsIn.length ? h('section', {},
      h('h3', {}, t('Groups')),
      h('ul', { class: 'ov-r-groups' }, ...roundsIn.map((r) => h('li', {},
        h('span', { class: 'muted' }, fmtWhen(r.at)), ' · ', t('Group {n}', { n: r.group }), r.role ? h('span', { class: 'role-tag' }, r.role) : null,
        r.with.length ? h('span', { class: 'muted' }, ` · ${t('with {names}', { names: r.with.join(', ') })}`) : null)))) : null,
    s.flags.length ? h('section', {},
      h('h3', {}, t('To talk about')),
      h('ul', {}, ...s.flags.map((f) => h('li', {}, FLAG_TEXT[f.id](f)[1])))) : null,
    h('footer', { class: 'muted small' }, t('From 杏坛 · ClassroomBoard. Points and 行为表现 are kept in the teacher’s browser.')));
}

// Bars above and below a zero line, one for each lesson (the latest ones).
function chart(series) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, a) => { const x = document.createElementNS(NS, tag); Object.entries(a).forEach(([k, v]) => x.setAttribute(k, v)); return x; };
  const s = series.slice(-CHART_MAX);
  const W = 640; const H = 150; const top = 14; const bottom = 34;
  // Zero sits where the biggest gain and the biggest loss both fit.
  const up = Math.max(0, ...s.map(([, v]) => v));
  const down = Math.max(0, ...s.map(([, v]) => -v));
  const span = up + down || 1;
  const usable = H - top - bottom;
  const mid = top + (up || down ? (usable * up) / span : usable / 2);
  const scale = usable / span;
  const bw = Math.min(40, (W - 20) / s.length);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ov-chart', role: 'img', 'aria-label': t('Points by lesson') });
  svg.append(el('line', { x1: 0, x2: W, y1: mid, y2: mid, class: 'ov-zero' }));
  s.forEach(([k, v], i) => {
    const x = 10 + i * bw;
    const hgt = Math.abs(v) * scale;
    const r = el('rect', { x: x + 3, width: Math.max(2, bw - 6), y: v >= 0 ? mid - hgt : mid, height: Math.max(v ? 2 : 0, hgt), class: v >= 0 ? 'up' : 'down', rx: 2 });
    const tip = el('title', {}); tip.textContent = `${fmtLesson(k)}: ${signed(v)}`; r.append(tip);
    svg.append(r);
    if (v) { const tx = el('text', { x: x + bw / 2, y: v >= 0 ? mid - hgt - 3 : mid + hgt + 11, class: 'ov-val' }); tx.textContent = signed(v); svg.append(tx); }
    // Dates far enough apart to read (about 70 px each), and always the latest.
    const every = Math.max(1, Math.ceil(70 / bw));
    if ((i % every === 0 && s.length - 1 - i >= every) || i === s.length - 1) {
      const lab = el('text', { x: x + bw / 2, y: H - 4, class: 'ov-date' }); lab.textContent = fmtLesson(k); svg.append(lab);
    }
  });
  return svg;
}

// ---------- CSV ----------

function downloadCsv(rows) {
  const flagText = (s) => s.flags.map((f) => FLAG_TEXT[f.id](f)[0]).join('; ');
  const skillText = (list) => list.map((x) => `${x.skill.label} ×${x.n}`).join('; ');
  const out = [[t('Student'), t('Class'), t('Term total'), t('This lesson'), t('Badges'), t('Praise'), t('Needs work'), t('Latest group'), t('Role'),
    ...(ui.levels ? [t('Level')] : []), t('Check in')]];
  rows.forEach((s) => out.push([s.name, s.cls.name, s.total, s.now ?? '', s.badges, skillText(s.pos), skillText(s.neg), s.group || '', s.role,
    ...(ui.levels ? [s.level || ''] : []), flagText(s)]));
  const cell = (v) => { const x = String(v ?? ''); return /[",\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  const blob = new Blob(['﻿' + out.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  a.download = `xingtan-my-classes-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Start ----------

render();
store.subscribe(() => { if (!document.querySelector('.ov-tools input[type=search]:focus')) render(); });
store.watchOtherWindows({ list: () => {} });
onLangChange(render);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.report) { ui.report = null; render(); }
});
// The app's language can change in another tab.
window.addEventListener('storage', (e) => {
  if (e.key === 'xingtan:lang' && (e.newValue === 'en' || e.newValue === 'zh') && e.newValue !== getLang()) setLang(e.newValue);
});
