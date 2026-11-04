import { h } from '../ui.js';

export default {
  type: 'text',
  title: 'Text',
  icon: 'align-left',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 460, h: 280 },
  minSize: { w: 200, h: 140 },

  mount(body, ctx) {
    if (ctx.state.size == null) ctx.save({ size: 32, text: '' });
    const area = h('textarea', {
      class: 'text-board',
      placeholder: 'Type instructions, the lesson objective, homework…\n输入课堂指示、学习目标、功课…',
      spellcheck: 'false',
    });
    area.value = ctx.state.text || '';
    area.style.fontSize = ctx.state.size + 'px';

    const setSize = (d) => {
      const size = Math.max(14, Math.min(120, ctx.state.size + d));
      ctx.save({ size });
      area.style.fontSize = size + 'px';
    };
    const tools = h('div', { class: 'text-tools' },
      h('button', { class: 'chip', onclick: () => setSize(-4), title: 'Smaller text' }, 'A−'),
      h('button', { class: 'chip', onclick: () => setSize(4), title: 'Bigger text' }, 'A+'),
    );
    let t;
    area.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => ctx.save({ text: area.value }), 300);
    });
    area.addEventListener('blur', () => ctx.save({ text: area.value }));
    body.append(h('div', { class: 'text-wrap' }, area, tools));
    return { destroy() { clearTimeout(t); ctx.save({ text: area.value }); } };
  },
};
