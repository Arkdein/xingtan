// Skills (表现项) for Points: a named reason for a point, such as
// "帮助同学 Helping others +1". Each class that turns skills on keeps its own list
// (see points.js, p.skills): the presets below, ticked or not, plus its own.
//
// Labels are bilingual like the Work mode signs and Groups roles, because the
// students see them. Each preset is tagged with the CCE core value (R³ICH) it
// grows, where one fits.
//
//   id      stable id ('p-…' for presets, 's-…' for a class's own)
//   kind    'pos' (praise, shown on the board) | 'neg' (needs work: the board shows
//           only −1; the reason goes in the log)
//   label   what shows, editable
//   value   1–3 points
//   icon    an icon name from icons.js
//   tag     R³ICH value id, or ''
//   on      false: not in use for this class (kept so the log still knows it)
//   gone    a class's own skill deleted after it was given (hidden; the log still names it)

export const MAX_SKILLS = 24;
export const MAX_LABEL = 40;
export const VALUES = [1, 2, 3];

// The CCE core values (R³ICH), labels shown with t().
export const VALUE_TAGS = [
  ['respect', 'Respect'],
  ['responsibility', 'Responsibility'],
  ['resilience', 'Resilience'],
  ['integrity', 'Integrity'],
  ['care', 'Care'],
  ['harmony', 'Harmony'],
];

// on: in use when a class first turns skills on.
export const PRESETS = [
  { id: 'p-contribute', kind: 'pos', label: '积极发言 Contributing', icon: 'hand-stop', tag: 'responsibility', on: true },
  { id: 'p-help', kind: 'pos', label: '帮助同学 Helping others', icon: 'heart', tag: 'care', on: true },
  { id: 'p-persevere', kind: 'pos', label: '坚持不懈 Persevering', icon: 'trending-up', tag: 'resilience', on: true },
  { id: 'p-teamwork', kind: 'pos', label: '团队合作 Teamwork', icon: 'users', tag: 'harmony', on: true },
  { id: 'p-focus', kind: 'pos', label: '专心学习 On task', icon: 'target', tag: 'responsibility', on: true },
  { id: 'p-mandarin', kind: 'pos', label: '讲华语 Speaking Mandarin', icon: 'message-circle', tag: '', on: true },
  { id: 'p-respect', kind: 'pos', label: '尊重他人 Respecting others', icon: 'heart-handshake', tag: 'respect', on: false },
  { id: 'p-honest', kind: 'pos', label: '诚实守信 Honesty', icon: 'shield-check', tag: 'integrity', on: false },
  { id: 'p-prepared', kind: 'pos', label: '准备充分 Well prepared', icon: 'book', tag: 'responsibility', on: false },
  { id: 'p-ideas', kind: 'pos', label: '有创意 Creative ideas', icon: 'bulb', tag: '', on: false },
  { id: 'p-improve', kind: 'pos', label: '有进步 Improving', icon: 'rocket', tag: 'resilience', on: false },
  { id: 'p-offtask', kind: 'neg', label: '没专心 Off task', icon: 'mood-empty', tag: 'responsibility', on: true },
  { id: 'p-unprepared', kind: 'neg', label: '没准备 Unprepared', icon: 'book-off', tag: 'responsibility', on: true },
  { id: 'p-late', kind: 'neg', label: '迟到 Late', icon: 'clock-exclamation', tag: 'responsibility', on: true },
  { id: 'p-disrupt', kind: 'neg', label: '干扰别人 Disrupting others', icon: 'volume', tag: 'respect', on: true },
  { id: 'p-homework', kind: 'neg', label: '没交作业 Homework missing', icon: 'file-x', tag: 'responsibility', on: false },
  { id: 'p-english', kind: 'neg', label: '没讲华语 Not speaking Mandarin', icon: 'message-2-off', tag: '', on: false },
  { id: 'p-phone', kind: 'neg', label: '玩手机 On phone', icon: 'device-mobile-off', tag: 'responsibility', on: false },
];

// Icons a teacher can choose for their own skills (tap the icon to change it).
export const ICONS = ['star', 'thumb-up', 'award', 'sparkles', 'heart', 'bulb', 'puzzle', 'school', 'pencil-check', 'book',
  'users', 'hand-stop', 'target', 'rocket', 'trending-up', 'message-circle', 'thumb-down', 'mood-empty', 'clock-exclamation',
  'book-off', 'file-x', 'volume', 'device-mobile-off', 'mood-angry', 'alert-triangle'];

const PRESET_IDS = new Set(PRESETS.map((s) => s.id));
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);
export const cleanLabel = clean;
const value = (v) => (VALUES.includes(Number(v)) ? Number(v) : 1);

function item(s) {
  const preset = PRESETS.find((p) => p.id === s.id);
  const kind = preset ? preset.kind : s.kind === 'neg' ? 'neg' : 'pos';
  return {
    id: String(s.id),
    kind,
    label: clean(s.label) || preset?.label || '',
    value: value(s.value),
    icon: ICONS.includes(s.icon) || s.icon === preset?.icon ? s.icon : preset?.icon || (kind === 'neg' ? 'thumb-down' : 'star'),
    tag: preset ? preset.tag : VALUE_TAGS.some(([id]) => id === s.tag) ? s.tag : '',
    on: s.on !== false && !s.gone,
    // A class's own skill that was deleted after being given: hidden, but the log still names it.
    gone: !preset && !!s.gone,
  };
}

// { on, list } with every preset in the list (in preset order), then the class's own.
// fresh: true when the class has never had skills, so the presets come with their
// usual ticks.
export function normalise(x) {
  const s = x && typeof x === 'object' ? x : {};
  const saved = Array.isArray(s.list) ? s.list.filter((it) => it && typeof it === 'object' && it.id) : [];
  const fresh = !saved.length;
  const byId = new Map(saved.map((it) => [String(it.id), it]));
  const list = PRESETS.map((p) => item(byId.get(p.id) || { ...p, value: 1, on: fresh ? p.on : false }));
  saved.filter((it) => !PRESET_IDS.has(String(it.id))).forEach((it) => { const i = item(it); if (i.label) list.push(i); });
  return { on: !!s.on, list };
}

export const isPreset = (id) => PRESET_IDS.has(id);
export const newId = () => 's-' + Math.random().toString(36).slice(2, 9);
