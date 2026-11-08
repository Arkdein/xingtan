// Chimes for the Points goal bar, made with the Web Audio API (no sound files,
// so they work offline and add nothing to the download).
//
//   playChime(id)      when a student or the class reaches the goal
//   playMilestone(q)   a short cue at ¼ (q = 1), ½ (2) and ¾ (3) of the way
//
// Labels are English source strings, translated with t() where shown.

export const CHIMES = [
  { id: 'bell', label: 'Bell' },
  { id: 'xylophone', label: 'Xylophone' },
  { id: 'fanfare', label: 'Fanfare' },
  { id: 'gong', label: 'Gong' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'windchimes', label: 'Wind chimes' },
];
export const DEFAULT_CHIME = 'xylophone';

let ac = null;
function audio() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// Note number to frequency (A4 = 69 = 440 Hz).
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

// One note: oscillator into a gain with a quick attack and an exponential fade.
function note(c, out, freq, at, { dur = 0.6, type = 'sine', vol = 0.25, attack = 0.008 } = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
  return osc;
}

// A struck metal sound: a fundamental with a few inharmonic partials.
function strike(c, out, freq, at, { dur = 1.6, vol = 0.22, partials = [[1, 1], [2.76, 0.35], [5.4, 0.15]] } = {}) {
  partials.forEach(([ratio, level], i) => note(c, out, freq * ratio, at, { dur: dur / (1 + i * 0.6), vol: vol * level }));
}

function master(c, vol = 0.9) {
  const g = c.createGain();
  g.gain.value = vol;
  g.connect(c.destination);
  return g;
}

const PENTA = [0, 2, 4, 7, 9]; // do re mi so la
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PLAYERS = {
  bell(c, out, t) {
    strike(c, out, hz(79), t, { dur: 1.8 });       // G5
    strike(c, out, hz(84), t + 0.32, { dur: 2.2 }); // C6
  },
  xylophone(c, out, t) {
    [72, 76, 79, 84, 88].forEach((n, i) => {
      const last = i === 4;
      note(c, out, hz(n), t + i * 0.09, { type: 'triangle', dur: last ? 0.9 : 0.3, vol: 0.28 });
      note(c, out, hz(n) * 4, t + i * 0.09, { dur: 0.08, vol: 0.05 }); // the mallet's tick
    });
    note(c, out, hz(84), t + 0.45, { type: 'triangle', dur: 0.9, vol: 0.18 });
  },
  fanfare(c, out, t) {
    // Brass: sawtooth through a filter that opens on each note.
    const play = (n, at, dur) => {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(600, at);
      f.frequency.linearRampToValueAtTime(2600, at + 0.06);
      f.frequency.exponentialRampToValueAtTime(900, at + dur);
      f.connect(out);
      [0, 7].forEach((cents) => {
        const o = note(c, f, hz(n), at, { type: 'sawtooth', dur, vol: 0.09, attack: 0.03 });
        o.detune.value = cents;
      });
    };
    play(67, t, 0.16); play(67, t + 0.15, 0.16); play(67, t + 0.3, 0.16);
    play(72, t + 0.48, 0.5); play(76, t + 0.82, 0.3); play(79, t + 1.08, 1.1);
    play(72, t + 1.08, 1.1);
  },
  gong(c, out, t) {
    // A low, warm 锣 with a slow shimmer.
    const base = hz(45); // A2
    [[1, 1], [1.48, 0.55], [2.1, 0.4], [2.93, 0.28], [3.6, 0.18], [4.7, 0.1]].forEach(([r, l], i) => {
      const o = note(c, out, base * r, t, { dur: 4 - i * 0.4, vol: 0.2 * l, attack: 0.02 });
      o.frequency.setValueAtTime(base * r * 1.012, t);
      o.frequency.exponentialRampToValueAtTime(base * r, t + 1.2);
    });
    // The beater's thud
    note(c, out, 80, t, { dur: 0.25, vol: 0.25, attack: 0.004 });
  },
  sparkle(c, out, t) {
    for (let i = 0; i < 12; i++) {
      const n = 84 + pick(PENTA) + (Math.random() < 0.4 ? 12 : 0);
      note(c, out, hz(n), t + i * 0.055, { dur: 0.25, vol: 0.12 });
    }
    [84, 88, 91, 96].forEach((n) => note(c, out, hz(n), t + 0.7, { dur: 1.2, vol: 0.1 }));
  },
  windchimes(c, out, t) {
    let at = t;
    for (let i = 0; i < 9; i++) {
      const n = 81 + pick(PENTA) + (Math.random() < 0.35 ? 12 : 0);
      strike(c, out, hz(n), at, { dur: 2.2, vol: 0.12, partials: [[1, 1], [2.4, 0.3]] });
      at += 0.08 + Math.random() * 0.18;
    }
  },
};

export function playChime(id) {
  try {
    const c = audio();
    (PLAYERS[id] || PLAYERS[DEFAULT_CHIME])(c, master(c), c.currentTime + 0.03);
  } catch (err) {
    console.warn('Sound unavailable', err);
  }
}

// Two soft notes that climb a little higher at each quarter.
export function playMilestone(q) {
  try {
    const c = audio();
    const out = master(c, 0.8);
    const t = c.currentTime + 0.02;
    const [a, b] = [[72, 76], [76, 79], [79, 84]][Math.max(0, Math.min(2, q - 1))];
    note(c, out, hz(a), t, { type: 'triangle', dur: 0.25, vol: 0.2 });
    note(c, out, hz(b), t + 0.11, { type: 'triangle', dur: 0.45, vol: 0.2 });
  } catch (err) {
    console.warn('Sound unavailable', err);
  }
}
