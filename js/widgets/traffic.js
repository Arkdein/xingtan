import { h } from '../ui.js';
import { t } from '../i18n.js';

const LABELS = { red: 'Red light', amber: 'Amber light', green: 'Green light' };

export default {
  type: 'traffic',
  title: 'Traffic light',
  icon: 'traffic-lights',
  tone: 'signal', // dock tile colour: time | people | signal | content
  size: { w: 180, h: 380 },
  minSize: { w: 120, h: 240 },

  mount(body, ctx) {
    if (ctx.state.on == null) ctx.save({ on: 'green' });
    const lights = ['red', 'amber', 'green'].map((c) =>
      h('button', { class: `light ${c}`, 'aria-label': t(LABELS[c]), 'data-c': c }));
    const box = h('div', { class: 'traffic' }, ...lights);
    body.append(box);

    // Chip when minimised: the three lights, still clickable.
    const miniLights = ['red', 'amber', 'green'].map((c) =>
      h('button', { class: `mini-light ${c}`, 'aria-label': t(LABELS[c]), title: t(LABELS[c]), 'data-c': c }));
    ctx.setMiniControls?.(h('span', { class: 'mini-lights' }, ...miniLights));
    const render = () => [...lights, ...miniLights].forEach((l) => l.classList.toggle('on', l.dataset.c === ctx.state.on));
    [...lights, ...miniLights].forEach((l) => l.addEventListener('click', () => {
      ctx.save({ on: ctx.state.on === l.dataset.c ? null : l.dataset.c });
      render();
    }));
    render();
  },
};
