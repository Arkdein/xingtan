import { h } from '../ui.js';

// Bilingual work-mode signs.
const SYMBOLS = [
  { id: 'silent', icon: '🤫', en: 'Work silently', zh: '安静作业' },
  { id: 'whisper', icon: '💬', en: 'Whisper voices', zh: '小声交谈' },
  { id: 'partner', icon: '👥', en: 'Work with a partner', zh: '两人合作' },
  { id: 'group', icon: '🧑‍🤝‍🧑', en: 'Group discussion', zh: '小组讨论' },
  { id: 'hands', icon: '✋', en: 'Raise your hand', zh: '先举手' },
  { id: 'eyes', icon: '👀', en: 'Eyes on me', zh: '请看前面' },
];

export default {
  type: 'symbols',
  title: 'Work mode',
  icon: '🪧',
  size: { w: 380, h: 300 },
  minSize: { w: 220, h: 200 },

  mount(body, ctx) {
    if (ctx.state.lang == null) ctx.save({ lang: 'both', current: null });

    const big = h('button', { class: 'symbol-big', title: 'Click to choose another' });
    const grid = h('div', { class: 'symbol-grid' });
    const lang = h('select', { class: 'symbol-lang', 'aria-label': 'Language' },
      h('option', { value: 'both' }, 'EN + 中文'),
      h('option', { value: 'en' }, 'English'),
      h('option', { value: 'zh' }, '中文'),
    );
    lang.value = ctx.state.lang;
    body.append(h('div', { class: 'symbols' }, big, grid, lang));

    const label = (s) => {
      const l = ctx.state.lang;
      return l === 'en' ? [h('span', { class: 'en' }, s.en)]
        : l === 'zh' ? [h('span', { class: 'zh' }, s.zh)]
          : [h('span', { class: 'zh' }, s.zh), h('span', { class: 'en' }, s.en)];
    };

    function render() {
      const cur = SYMBOLS.find((s) => s.id === ctx.state.current);
      big.hidden = !cur;
      grid.hidden = !!cur;
      if (cur) {
        big.replaceChildren(h('span', { class: 'symbol-icon' }, cur.icon), h('span', { class: 'symbol-label' }, ...label(cur)));
      } else {
        grid.replaceChildren(...SYMBOLS.map((s) =>
          h('button', { class: 'symbol-tile', onclick: () => { ctx.save({ current: s.id }); render(); } },
            h('span', { class: 'symbol-icon' }, s.icon), h('span', { class: 'symbol-label' }, ...label(s)))));
      }
    }
    big.addEventListener('click', () => { ctx.save({ current: null }); render(); });
    lang.addEventListener('change', () => { ctx.save({ lang: lang.value }); render(); });
    render();
  },
};
