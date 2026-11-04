import { h } from '../ui.js';

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
      h('button', { class: `light ${c}`, 'aria-label': c, 'data-c': c }));
    const box = h('div', { class: 'traffic' }, ...lights);
    body.append(box);

    const render = () => lights.forEach((l) => l.classList.toggle('on', l.dataset.c === ctx.state.on));
    lights.forEach((l) => l.addEventListener('click', () => {
      ctx.save({ on: ctx.state.on === l.dataset.c ? null : l.dataset.c });
      render();
    }));
    render();
  },
};
