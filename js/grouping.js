// Group settings for a class, used by the Groups tool, and the grouping itself.
//
// Kept on the class (cls.grouping), not on a board, so every board's Groups tool
// uses the same settings. It goes into full backups with the class list and
// never into shared board files.
//
//   levels      { name: 1 | 2 | 3 }  teacher-set levels for Mix levels (never shown on the board)
//   together    [[a, b], …]          pairs to keep in the same group (pairs that share a
//                                    name join up: a+b and b+c keep all three together)
//   apart       [[a, b], …]          pairs to keep in different groups
//   roles       [string] | null      roles to give out, in order; null = the presets
//   avoid       false to stop avoiding the last rounds' groupings (default on)
//   history     [{ at, groups: [[names]], roles: { name: role } }]  the last ROUNDS rounds, newest last
//   roleCounts  { name: { role: n } }  how often each student has had each role, for rotation
//
// Pressing Make groups again within REDO_MS of the last round replaces that round
// (a fresh mix of the same moment), so trying a few mixes doesn't use up the history
// or the role turns.
//
// Rules and levels for a name that leaves the class list are kept (they are ignored
// while the name is off the list), so they come back with the student. A rename
// moves them (see roster.js).
import * as store from './store.js';

export const ROUNDS = 3;
export const REDO_MS = 2 * 60 * 1000;
export const LEVELS = [1, 2, 3];
export const MAX_ROLES = 8;
export const MAX_ROLE = 40;
// Bilingual, like the Work mode signs: the students see them.
export const PRESET_ROLES = ['组长 Leader', '记录员 Scribe', '计时员 Timekeeper', '汇报员 Reporter'];

const APART = 1000;          // cost of two students who should be apart sharing a group
const BALANCE = 6;           // weight of an uneven spread of levels or points
const RECENT = [3, 2, 1];    // cost of sharing a group again, last round first

const findClass = (m, classId) => m.classes.find((c) => c.id === classId);
const pairsOf = (v) => (Array.isArray(v) ? v.filter((p) => Array.isArray(p) && p.length === 2 && p[0] !== p[1]) : []);

export function normalise(g) {
  const x = g && typeof g === 'object' ? g : {};
  return {
    levels: x.levels && typeof x.levels === 'object' ? x.levels : {},
    together: pairsOf(x.together),
    apart: pairsOf(x.apart),
    roles: Array.isArray(x.roles) ? x.roles.filter((r) => typeof r === 'string' && r.trim()) : null,
    avoid: x.avoid !== false,
    history: Array.isArray(x.history) ? x.history.filter((r) => r && Array.isArray(r.groups)) : [],
    roleCounts: x.roleCounts && typeof x.roleCounts === 'object' ? x.roleCounts : {},
  };
}

// For reading: never writes.
export function settings(cls) {
  return normalise(cls?.grouping);
}

export const rolesOf = (g) => (g.roles ? g.roles : PRESET_ROLES);

// fn(g, cls) changes the class's settings in place.
export function update(classId, fn) {
  store.update((m) => {
    const cls = findClass(m, classId);
    if (!cls) return;
    cls.grouping = normalise(cls.grouping);
    fn(cls.grouping, cls);
  });
}

const samePair = (p, a, b) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);

// kind: 'together' | 'apart'. A pair can only be one of the two.
export function addRule(classId, kind, a, b) {
  if (!a || !b || a === b) return;
  update(classId, (g) => {
    g.together = g.together.filter((p) => !samePair(p, a, b));
    g.apart = g.apart.filter((p) => !samePair(p, a, b));
    g[kind].push([a, b]);
  });
}

export function removeRule(classId, kind, a, b) {
  update(classId, (g) => { g[kind] = g[kind].filter((p) => !samePair(p, a, b)); });
}

export function setLevel(classId, name, level) {
  update(classId, (g) => {
    if (LEVELS.includes(level)) g.levels[name] = level;
    else delete g.levels[name];
  });
}

export const cleanRole = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ROLE);

// Called inside store.update by roster.js when a student is renamed.
export function renameIn(cls, from, to) {
  if (!cls?.grouping) return;
  const g = normalise(cls.grouping);
  const swap = (n) => (n === from ? to : n);
  if (from in g.levels) { g.levels[to] = g.levels[from]; delete g.levels[from]; }
  g.together = g.together.map((p) => p.map(swap));
  g.apart = g.apart.map((p) => p.map(swap));
  g.history = g.history.map((r) => ({
    ...r,
    groups: r.groups.map((grp) => grp.map(swap)),
    roles: Object.fromEntries(Object.entries(r.roles || {}).map(([n, role]) => [swap(n), role])),
  }));
  if (from in g.roleCounts) { g.roleCounts[to] = g.roleCounts[from]; delete g.roleCounts[from]; }
  cls.grouping = g;
}

// The rounds that count for "avoid": a round made in the last REDO_MS is about to be
// replaced, so it doesn't count.
export function pastRounds(g, now = Date.now()) {
  const h = g.history.slice();
  if (h.length && now - (h[h.length - 1].at || 0) < REDO_MS) h.pop();
  return h.slice(-ROUNDS);
}

// Keeps a round in the history and counts its roles.
export function record(classId, groups, roles, now = Date.now()) {
  update(classId, (g) => {
    const last = g.history[g.history.length - 1];
    if (last && now - (last.at || 0) < REDO_MS) {
      count(g.roleCounts, last.roles || {}, -1);
      g.history.pop();
    }
    g.history.push({ at: now, groups, roles: roles || {} });
    count(g.roleCounts, roles || {}, 1);
    if (g.history.length > ROUNDS) g.history.splice(0, g.history.length - ROUNDS);
  });
}

// Roles given out later to the groups already on screen: they belong to that round
// (when it is the latest), so the groups don't count twice for "avoid".
export function setRoundRoles(classId, groups, roles, now = Date.now()) {
  const last = normalise(store.getClass(classId)?.grouping).history.slice(-1)[0];
  if (!last || JSON.stringify(last.groups) !== JSON.stringify(groups)) { record(classId, groups, roles, now); return; }
  update(classId, (g) => {
    const r = g.history[g.history.length - 1];
    count(g.roleCounts, r.roles || {}, -1);
    r.roles = roles || {};
    count(g.roleCounts, r.roles, 1);
  });
}

function count(counts, roles, d) {
  for (const [name, role] of Object.entries(roles)) {
    const c = (counts[name] = counts[name] || {});
    c[role] = Math.max(0, (c[role] || 0) + d);
    if (!c[role]) delete c[role];
    if (!Object.keys(c).length) delete counts[name];
  }
}

export function forgetRounds(classId) {
  update(classId, (g) => { g.history = []; g.roleCounts = {}; });
}

// ---------- Making groups ----------

const rand = (n) => Math.floor(Math.random() * n);
function shuffled(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = rand(i + 1); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

// Sizes for `count` groups of `n` students, never more than one apart.
export function sizes(n, count) {
  const base = Math.floor(n / count);
  const extra = n % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

// names: the students to group (present, on the list). count: number of groups.
// opts: { g (settings), balance: 'random' | 'levels' | 'points', pointsOf(name) }
// Returns { groups: [[names]], notes } where notes says what couldn't be done:
//   apart  [[a, b]]  pairs who had to share a group
//   big    [[names]] students kept together who are more than a group can hold
//   flat   true when the chosen mix had nothing to go on (no levels set, or everyone
//          has the same points), so the groups are just random
export function makeGroups(names, count, { g = normalise(null), balance = 'random', pointsOf = () => 0, tries = 6, steps = 2500 } = {}) {
  const n = names.length;
  count = Math.max(1, Math.min(count, n));
  const notes = { apart: [], big: [], flat: false };
  if (!n) return { groups: [], notes };
  const idx = new Map(names.map((name, i) => [name, i]));

  // Students to keep together become one unit (joined through shared names).
  const parent = names.map((_, i) => i);
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  g.together.forEach(([a, b]) => {
    if (idx.has(a) && idx.has(b)) parent[root(idx.get(a))] = root(idx.get(b));
  });
  const byRoot = new Map();
  names.forEach((_, i) => { const r = root(i); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(i); });
  const units = [...byRoot.values()];
  const target = sizes(n, count);
  const biggest = Math.max(...target);
  units.filter((u) => u.length > biggest).forEach((u) => notes.big.push(u.map((i) => names[i])));

  // What sharing a group costs for each pair.
  const W = Array.from({ length: n }, () => new Float64Array(n));
  const add = (a, b, w) => { W[a][b] += w; W[b][a] += w; };
  g.apart.forEach(([a, b]) => { if (idx.has(a) && idx.has(b)) add(idx.get(a), idx.get(b), APART); });
  if (g.avoid) {
    pastRounds(g).reverse().forEach((round, k) => {
      const w = RECENT[k] || 0;
      round.groups.forEach((grp) => {
        const m = grp.filter((x) => idx.has(x)).map((x) => idx.get(x));
        for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) add(m[i], m[j], w);
      });
    });
  }

  // How evenly levels or points spread.
  let spread = null;
  if (balance === 'levels') {
    const lv = names.map((name) => (LEVELS.includes(g.levels[name]) ? g.levels[name] : 0));
    const totals = LEVELS.map((L) => lv.filter((x) => x === L).length);
    // Nothing to spread when no one has a level, or everyone has the same one.
    if (!lv.some(Boolean) || lv.every((x) => x === lv[0])) notes.flat = true;
    if (!notes.flat) {
      spread = (members) => {
        let c = 0;
        LEVELS.forEach((L, k) => {
          const want = (totals[k] * members.length) / n;
          const got = members.filter((i) => lv[i] === L).length;
          c += (got - want) ** 2;
        });
        return c;
      };
    }
  } else if (balance === 'points') {
    const pts = names.map((name) => Number(pointsOf(name)) || 0);
    const mean = pts.reduce((s, x) => s + x, 0) / n;
    const sd = Math.sqrt(pts.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
    if (!sd) notes.flat = true;
    else {
      spread = (members) => {
        if (!members.length) return 0;
        const m = members.reduce((s, i) => s + pts[i], 0) / members.length;
        return members.length * ((m - mean) / sd) ** 2;
      };
    }
  }

  const cost = (members) => {
    let c = 0;
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) c += W[members[i]][members[j]];
    return spread ? c + BALANCE * spread(members) : c;
  };

  let best = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    // Place units, biggest first, where there is most room left.
    const room = shuffled(target);
    const groups = room.map(() => []);
    const unitsIn = room.map(() => []);
    const order = shuffled(units).sort((a, b) => b.length - a.length);
    order.forEach((u) => {
      let pick = -1;
      let most = -Infinity;
      room.forEach((r, gi) => {
        const fits = r >= u.length ? 1 : 0;
        const score = fits * 1000 + r + Math.random() * 0.5;
        if (score > most) { most = score; pick = gi; }
      });
      room[pick] -= u.length;
      groups[pick].push(...u);
      unitsIn[pick].push(u);
    });
    const costs = groups.map(cost);
    // Swap units of the same size between groups while it helps (or is no worse).
    if (count > 1) {
      for (let s = 0; s < steps; s++) {
        const a = rand(count);
        let b = rand(count - 1);
        if (b >= a) b++;
        if (!unitsIn[a].length || !unitsIn[b].length) continue;
        const ua = rand(unitsIn[a].length);
        const same = unitsIn[b].map((u, k) => [u, k]).filter(([u]) => u.length === unitsIn[a][ua].length);
        if (!same.length) continue;
        const [, ub] = same[rand(same.length)];
        const A = unitsIn[a].slice(); const B = unitsIn[b].slice();
        [A[ua], B[ub]] = [B[ub], A[ua]];
        const ga = A.flat(); const gb = B.flat();
        const ca = cost(ga); const cb = cost(gb);
        if (ca + cb <= costs[a] + costs[b] + 1e-9) {
          unitsIn[a] = A; unitsIn[b] = B; groups[a] = ga; groups[b] = gb; costs[a] = ca; costs[b] = cb;
        }
      }
    }
    const total = costs.reduce((x, y) => x + y, 0);
    if (!best || total < best.total) best = { total, groups: groups.map((grp) => grp.slice()) };
  }

  const groups = best.groups.map((grp) => shuffled(grp).map((i) => names[i]));
  g.apart.forEach(([a, b]) => {
    if (groups.some((grp) => grp.includes(a) && grp.includes(b))) notes.apart.push([a, b]);
  });
  return { groups, notes };
}

// Gives out roles within each group, in the order they are listed (a group of 3
// gets the first three). Each student gets the role they have had least, and not
// the one they had last time if that can be helped.
// Returns { name: role }.
export function giveRoles(groups, roles, g = normalise(null), now = Date.now()) {
  const out = {};
  if (!roles.length) return out;
  // A round about to be replaced (see record) doesn't count.
  const h = g.history.slice();
  const counts = JSON.parse(JSON.stringify(g.roleCounts));
  if (h.length && now - (h[h.length - 1].at || 0) < REDO_MS) count(counts, h.pop().roles || {}, -1);
  const last = h[h.length - 1]?.roles || {};
  groups.forEach((members) => {
    const free = new Set(members);
    roles.slice(0, members.length).forEach((role) => {
      let pick = null;
      let low = Infinity;
      shuffled([...free]).forEach((name) => {
        const had = counts[name]?.[role] || 0;
        const score = had * 10 + (last[name] === role ? 5 : 0);
        if (score < low) { low = score; pick = name; }
      });
      if (pick != null) { out[pick] = role; free.delete(pick); }
    });
  });
  return out;
}
