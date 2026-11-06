// Splits a Read-aloud passage into pieces (words, punctuation, spaces, line
// breaks), and groups the words into phrases and sentences. Positions are
// string indices into the passage, the same ones speech boundary events use.
//
//   parse(text, lang) -> {
//     pieces:    [{ s, e, text, word, han, sent, phrase, w }]   w: index in words, or -1
//     words:     [{ s, e, piece }]
//     sentences: [{ s, e, w0, w1 }]   words w0 … w1 - 1
//     phrases:   [{ s, e, w0, w1 }]   split again at ，、：; and commas
//   }
// Word breaks come from the browser (Intl.Segmenter), which knows Chinese words;
// without it, each Chinese character is a word.

const HAN = /\p{Script=Han}/u;
const LETTER = /[\p{L}\p{N}]/u;
const SENT_END = /[。！？!?；;…]/;
const EN_STOP = '.';
const PHRASE_END = /[，,、：:—]/;
const CLOSER = /[”’」』）)\]】》〉"'»]/;
const SPACE = /\s/;

function segments(text, lang) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const seg = new Intl.Segmenter(lang === 'zh' ? 'zh' : 'en', { granularity: 'word' });
      return [...seg.segment(text)].map((x) => ({ s: x.index, text: x.segment, word: !!x.isWordLike || HAN.test(x.segment) }));
    } catch (err) { /* fall through */ }
  }
  // A simple fallback: runs of letters are words, each Chinese character is a word.
  const out = [];
  const re = /\p{Script=Han}|[\p{L}\p{N}'’-]+|[^\p{L}\p{N}]/gu;
  let m;
  while ((m = re.exec(text))) out.push({ s: m.index, text: m[0], word: HAN.test(m[0]) || LETTER.test(m[0]) });
  return out;
}

export function parse(text, lang = 'zh') {
  const pieces = [];
  let sent = 0, phrase = 0;
  let pending = '';        // 's' after a sentence ends, 'p' after a phrase ends
  let wordsInSent = 0;
  const close = () => {
    if (pending === 's') { sent++; phrase++; wordsInSent = 0; } else if (pending === 'p') phrase++;
    pending = '';
  };
  const push = (p) => pieces.push({ sent, phrase, w: -1, han: false, ...p });

  let prev = '';
  for (const seg of segments(text, lang)) {
    if (seg.word) {
      // In English, “Wait!” said Ann goes on as one sentence.
      if (pending === 's' && lang === 'en' && /^\p{Ll}/u.test(seg.text)) pending = 'p';
      if (pending) close();
      push({ s: seg.s, e: seg.s + seg.text.length, text: seg.text, word: true, han: HAN.test(seg.text) });
      wordsInSent++;
      prev = seg.text.slice(-1);
      continue;
    }
    // Punctuation and spaces, one character at a time.
    let i = seg.s;
    for (const c of seg.text) {
      const e = i + c.length;
      if (c === '\n') {
        if (wordsInSent) pending = 's';
        close();
        pieces.push({ s: i, e, text: c, word: false, nl: true, sent: -1, phrase: -1, w: -1 });
      } else if (pending && SPACE.test(c)) {
        // A space after the end of a part belongs to neither part.
        pieces.push({ s: i, e, text: c, word: false, sent: -1, phrase: -1, w: -1 });
      } else if (pending && !(CLOSER.test(c) && !SPACE.test(prev)) && !SENT_END.test(c) && c !== EN_STOP) {
        // Something that starts the next part (an opening quote, a dash…).
        close();
        push({ s: i, e, text: c, word: false });
      } else {
        push({ s: i, e, text: c, word: false });
        if (SENT_END.test(c) || (c === EN_STOP && lang === 'en') || c === '。') pending = 's';
        else if (PHRASE_END.test(c) && pending !== 's') pending = 'p';
      }
      prev = c;
      i = e;
    }
  }

  // Number the words, then the sentences and phrases that have words in them.
  const words = [];
  pieces.forEach((p, k) => { if (p.word) { p.w = words.length; words.push({ s: p.s, e: p.e, piece: k }); } });
  const group = (key) => {
    const found = new Map();
    pieces.forEach((p) => {
      if (p[key] < 0) return;
      const g = found.get(p[key]) || { s: p.s, e: p.e, w0: -1, w1: -1 };
      g.s = Math.min(g.s, p.s);
      g.e = Math.max(g.e, p.e);
      if (p.word) { if (g.w0 < 0) g.w0 = p.w; g.w1 = p.w + 1; }
      found.set(p[key], g);
    });
    const kept = [...found.entries()].filter(([, g]) => g.w0 >= 0);
    const renumber = new Map(kept.map(([old], i) => [old, i]));
    pieces.forEach((p) => { if (p[key] >= 0) p[key] = renumber.has(p[key]) ? renumber.get(p[key]) : -1; });
    // Spaces between parts don't belong to either, so they aren't highlighted.
    return kept.map(([, g]) => g);
  };
  const sentences = group('sent');
  const phrases = group('phrase');
  return { pieces, words, sentences, phrases };
}

// The word at a position in the text (for speech boundary events), or -1.
export function wordAt(parsed, pos) {
  const ws = parsed.words;
  let lo = 0, hi = ws.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ws[mid].s <= pos) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

// The part (sentence or phrase) a position falls in, or the nearest one after it.
export function chunkAt(chunks, pos) {
  if (!chunks.length) return 0;
  const i = chunks.findIndex((c) => pos < c.e);
  return i < 0 ? chunks.length - 1 : i;
}

// Roughly how long a word takes to say at speed 1, in ms, for when the voice
// doesn't say where it is. Chinese is close to one syllable per character.
export function wordMs(text, lang) {
  if (HAN.test(text)) return [...text].filter((c) => HAN.test(c)).length * 230;
  const letters = (text.match(/\p{L}/gu) || []).length;
  return lang === 'zh' ? 120 + letters * 45 : 110 + letters * 50;
}

export const isSentenceEnd = (c) => SENT_END.test(c) || c === EN_STOP;
export const isPhraseEnd = (c) => PHRASE_END.test(c);
