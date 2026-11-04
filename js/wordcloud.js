// Word cloud helpers for the Poll tool: tidy and count answers, a first
// filter for rude words, and a layout that packs the words without overlap.
// No outside library: the layout is a simple spiral search, and Chinese is
// split into words with the browser's own Intl.Segmenter.

const MAX_LEN = 40;

// One answer -> the key it is counted under (same spelling, case and spacing
// count together; full-width letters become normal ones).
export function tidy(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
    .toLowerCase()
    .slice(0, MAX_LEN)
    .trim();
}

// Little words left out when answers are split into words.
const STOP = new Set((
  'a an the and or but so to of in on at for with from by as is are was were be been am it its this that these those ' +
  'i me my you your he him his she her we us our they them their very really just also too ' +
  '的 了 是 在 和 与 及 也 就 都 而 着 吗 呢 吧 啊 呀 哦 嗯 这 那 这个 那个 一个 我 你 他 她 它 我们 你们 他们 很 有 让 被 把 给 得 地'
).split(' '));

let segmenter;
function segment(text) {
  try {
    segmenter = segmenter || new Intl.Segmenter('zh', { granularity: 'word' });
    return [...segmenter.segment(text)].filter((s) => s.isWordLike).map((s) => s.segment);
  } catch (e) {
    return text.split(/[\s\p{P}]+/u); // older browsers: split at spaces and punctuation only
  }
}

// answers: [text] -> Map(key -> count). split: count separate words instead of whole answers.
export function count(answers, split = false) {
  const out = new Map();
  answers.forEach((a) => {
    const whole = tidy(a);
    if (!whole) return;
    const keys = split ? segment(whole).map(tidy).filter((w) => w && !STOP.has(w) && !/^[a-z]$/.test(w)) : [whole];
    keys.forEach((k) => out.set(k, (out.get(k) || 0) + 1));
  });
  return out;
}

// A first filter only: anything it misses, the teacher hides with a click.
const RUDE_WORDS = ['fuck', 'fucking', 'fucker', 'shit', 'shitty', 'bitch', 'asshole', 'bastard', 'dick', 'cunt', 'wanker', 'slut', 'whore', 'retard', 'stfu', 'wtf',
  'knn', 'kns', 'cb', 'ccb', 'nabei', 'kanina', 'cheebai', 'chee bai', 'lanjiao', 'lj'];
const RUDE_PARTS = ['fuck', 'shit', '他妈', '妈的', '傻逼', '傻b', '煞笔', '草泥马', '操你', '卧槽', '我靠', '滚蛋', '去死', '贱人', '白痴'];
const rudeWord = new RegExp(`(^|[^a-z])(${RUDE_WORDS.map((w) => w.replace(/ /g, '\\s*')).join('|')})(?=$|[^a-z])`);

export function isRude(key) {
  return rudeWord.test(key) || RUDE_PARTS.some((p) => key.includes(p));
}

// Shown in the list of hidden words, so the screen never spells them out.
export const mask = (key) => (key.length <= 1 ? '•' : key[0] + '•'.repeat(Math.min(6, key.length - 1)));

// ---------- Layout ----------
let measureCtx;
function textWidth(text, size, font) {
  measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
  measureCtx.font = `700 ${size}px ${font}`;
  return measureCtx.measureText(text).width;
}

// words: [[key, count]] (most first). Returns [{ key, count, size, x, y, w, h, rank }]
// in px from the top left of a W×H box; words that cannot fit are left out.
export function layout(words, W, H, font) {
  if (!words.length || W < 40 || H < 40) return [];
  const list = words.slice(0, 80);
  const max = list[0][1];
  const min = list[list.length - 1][1];
  let big = Math.min(H * 0.26, W * 0.2, 120);
  for (let attempt = 0; attempt < 6; attempt++) {
    const small = Math.max(11, big * 0.22);
    const placed = [];
    let missedTop = false;
    const cx = W / 2, cy = H / 2;
    const ratio = W / H;
    list.forEach(([key, n], rank) => {
      const t = max === min ? 1 : (n - min) / (max - min);
      let size = small + (big - small) * Math.sqrt(t);
      let w = textWidth(key, size, font) + size * 0.5;
      if (w > W * 0.96) { size *= (W * 0.96) / w; w = W * 0.96; }
      const hgt = size * 1.18;
      const pad = 2;
      let spot = null;
      for (let i = 0; i < 1600 && !spot; i++) {
        const a = i * 0.32;
        const r = i * 0.9;
        const x = cx + r * Math.cos(a) * Math.max(1, ratio * 0.8) - w / 2;
        const y = cy + r * Math.sin(a) - hgt / 2;
        if (x < 0 || y < 0 || x + w > W || y + hgt > H) { if (r > Math.max(W, H)) break; continue; }
        const hit = placed.some((p) => x < p.x + p.w + pad && x + w + pad > p.x && y < p.y + p.h + pad && y + hgt + pad > p.y);
        if (!hit) spot = { x, y };
      }
      if (spot) placed.push({ key, count: n, size, x: spot.x, y: spot.y, w, h: hgt, rank });
      else if (rank < 8) missedTop = true;
    });
    if (!missedTop || attempt === 5) return placed;
    big *= 0.8; // the biggest words did not all fit: try again smaller
  }
  return [];
}
