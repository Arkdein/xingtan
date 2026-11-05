// The "?" panel in each tool's title bar: that tool's guide card over the board,
// with a link to the full guide. Loaded only when a "?" is first pressed.
import { h, openModal } from '../ui.js';
import { getLang } from '../i18n.js';
import { renderCard, toolTitle, LABELS } from './index.js';

export function openToolHelp(def) {
  const lang = getLang();
  const L = LABELS[lang] || LABELS.en;
  openModal(`${toolTitle(def)} · ${L.guide}`, (body) => {
    body.append(h('div', { class: 'g-panel' },
      renderCard(def, lang, { heading: false }),
      h('p', { class: 'g-panel-foot' },
        h('a', { href: `guide.html#tool-${def.type}`, target: '_blank', rel: 'noopener' }, `${L.fullGuide} ↗`))));
  }, { wide: true });
}
