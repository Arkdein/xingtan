import { h, classSelect } from '../ui.js';

export default {
  type: 'picker',
  title: 'Name picker',
  icon: '🎯',
  size: { w: 380, h: 300 },
  minSize: { w: 240, h: 220 },

  mount(body, ctx) {
    // State: classId, noRepeat (bool), pool (names not yet picked), last (string)
    if (ctx.state.noRepeat == null) ctx.save({ noRepeat: true, pool: null, last: '' });

    const cls = () => ctx.store.getClass(ctx.state.classId) || ctx.store.getActiveClass();

    const sel = classSelect(ctx, () => ctx.state.classId, (id) => {
      ctx.save({ classId: id, pool: null, last: '' });
      render();
    });
    const nameEl = h('div', { class: 'picker-name' });
    const pickBtn = h('button', { class: 'btn primary big' }, 'Pick a name');
    const noRepeat = h('input', { type: 'checkbox', checked: ctx.state.noRepeat });
    const info = h('span', { class: 'muted small' });
    const resetBtn = h('button', { class: 'link-btn' }, 'Reset');
    const emptyMsg = h('div', { class: 'empty-state' },
      h('p', {}, 'Add a class list to start picking names.'),
      h('button', { class: 'btn primary', onclick: () => ctx.openClasses() }, 'Add class list'),
    );
    const main = h('div', { class: 'picker' },
      h('div', { class: 'row gap space-between' }, sel.el),
      nameEl,
      h('div', { class: 'row center' }, pickBtn),
      h('div', { class: 'row gap space-between small' },
        h('label', { class: 'row gap' }, noRepeat, 'No repeats'),
        h('span', { class: 'row gap' }, info, resetBtn),
      ),
    );
    body.append(main, emptyMsg);

    let spinTimer = null;

    function pool() {
      const c = cls();
      if (!c) return [];
      if (!ctx.state.noRepeat) return c.students.slice();
      // Keep only names that are still in the class
      let p = (ctx.state.pool || c.students).filter((n) => c.students.includes(n));
      if (p.length === 0) p = c.students.slice();
      return p;
    }

    function render() {
      const c = cls();
      const has = c && c.students.length > 0;
      main.hidden = !has;
      emptyMsg.hidden = !!has;
      if (!has) {
        if (c) emptyMsg.querySelector('p').textContent = `“${c.name}” has no names yet.`;
        return;
      }
      nameEl.textContent = ctx.state.last || '?';
      nameEl.classList.toggle('placeholder', !ctx.state.last);
      if (ctx.state.noRepeat) {
        const left = (ctx.state.pool || c.students).filter((n) => c.students.includes(n)).length;
        info.textContent = `${left} of ${c.students.length} left`;
        resetBtn.hidden = false;
      } else {
        info.textContent = '';
        resetBtn.hidden = true;
      }
    }

    function pick() {
      const p = pool();
      if (!p.length || spinTimer) return;
      const chosen = p[Math.floor(Math.random() * p.length)];
      const all = cls().students;
      // Quick shuffle animation, slowing down
      let i = 0;
      const steps = Math.min(18, 6 + all.length);
      pickBtn.disabled = true;
      nameEl.classList.remove('placeholder', 'landed');
      const step = () => {
        if (i >= steps) {
          spinTimer = null;
          nameEl.textContent = chosen;
          nameEl.classList.add('landed');
          const rest = p.filter((n) => n !== chosen);
          ctx.save({ last: chosen, pool: ctx.state.noRepeat ? rest : null });
          pickBtn.disabled = false;
          render();
          return;
        }
        nameEl.textContent = all[Math.floor(Math.random() * all.length)];
        i++;
        spinTimer = setTimeout(step, 40 + i * i * 1.2);
      };
      step();
    }

    pickBtn.addEventListener('click', pick);
    noRepeat.addEventListener('change', () => { ctx.save({ noRepeat: noRepeat.checked, pool: null }); render(); });
    resetBtn.addEventListener('click', () => { ctx.save({ pool: null, last: '' }); render(); });

    const unsub = ctx.onClassesChange(() => { sel.refresh(); render(); });
    render();
    return { destroy() { clearTimeout(spinTimer); unsub(); } };
  },
};
