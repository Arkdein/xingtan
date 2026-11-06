// The voice picker and Test button in the Dictation and Read-aloud settings.
import { h } from './ui.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import * as D from './dictionary.js';

// A <select> with the recommended voices first and the rest under
// “Other voices on this computer”. Robotic ones are marked.
export function voiceSelect(lang, voices) {
  const all = D.voicesFor(lang, voices);
  const rec = new Set(D.recommendedVoices(lang, voices).map((v) => v.name));
  const option = (v) => h('option', { value: v.name },
    `${v.name} (${v.lang})${D.isPoorVoice(v) ? ` · ${t('robotic')}` : ''}${D.hasFailed(v) ? ` · ${t('no sound')}` : ''}`);
  const good = all.filter((v) => rec.has(v.name));
  const rest = all.filter((v) => !rec.has(v.name));
  if (!good.length || !rest.length) return h('select', { class: 'input' }, ...all.map(option));
  return h('select', { class: 'input' },
    h('optgroup', { label: t('Recommended') }, ...good.map(option)),
    h('optgroup', { label: t('Other voices on this computer') }, ...rest.map(option)));
}

// Test plays the sample with exactly the voice chosen, and says so if it makes no sound.
export function voiceTest(getVoice, sample, lang, getRate) {
  const note = h('span', { class: 'muted small voice-note', role: 'status' });
  const button = h('button', { class: 'btn small with-icon ra-voice-test', onclick: async () => {
    const v = getVoice();
    note.textContent = '';
    button.disabled = true;
    const r = await D.speak(sample, { lang, voice: v, rate: getRate() });
    button.disabled = false;
    if (r === 'failed') {
      D.voiceFailed(v);
      note.textContent = t('No sound from this voice. It may need downloading in the computer’s settings, or the internet (online voices). Choose another one.');
      note.classList.add('warn');
    } else note.classList.remove('warn');
  } }, icon('volume'), t('Test'));
  return { button, note };
}
