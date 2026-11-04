import { h } from '../ui.js';
import { t, locale } from '../i18n.js';

export default {
  type: 'clock',
  title: 'Clock',
  icon: 'clock',
  tone: 'time', // dock tile colour: time | people | signal | content
  size: { w: 340, h: 180 },
  minSize: { w: 180, h: 110 },

  mount(body, ctx) {
    if (ctx.state.h24 == null) ctx.save({ h24: false });
    const time = h('div', { class: 'clock-time', title: t('Click to switch 12/24-hour') });
    const date = h('div', { class: 'clock-date' });
    body.append(h('div', { class: 'clock' }, time, date));

    const tick = () => {
      const now = new Date();
      time.textContent = now.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit', hour12: !ctx.state.h24 });
      date.textContent = now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    };
    time.addEventListener('click', () => { ctx.save({ h24: !ctx.state.h24 }); tick(); });
    tick();
    const id = setInterval(tick, 1000);
    return { destroy() { clearInterval(id); } };
  },
};
