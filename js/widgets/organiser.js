// Graphic organisers (图形组织器): T-chart, Venn diagram, Frayer model, KWL,
// 5W1H, cause and effect, sequence, story mountain, concept web or the
// teacher's own columns. Ideas go on as sticky notes that can be dragged
// between parts, starred, hidden, edited and deleted. The teacher or a student
// scribe types them in.
import { h, put, openModal, closeModal, confirmButton, segmented, bi } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang } from '../i18n.js';

// 'Both' goes through t() where the buttons are drawn; EN and 中文 stay in their own script.
const LANGS = [['en', 'EN'], ['zh', '中文'], ['both', 'Both']];
const langOptions = () => LANGS.map(([v, text]) => [v, v === 'both' ? t(text) : text]);
const z = (id, en, zh) => ({ id, en, zh });

// layout: how the parts are arranged (see styles.css, .og-<layout>)
export const TEMPLATES = [
  { id: 'tchart', en: 'T-chart', zh: 'T 型图', layout: 'cols', hint: 'Two sides: for and against, then and now, two characters…',
    zones: [z('a', 'For', '支持'), z('b', 'Against', '反对')] },
  { id: 'venn', en: 'Venn diagram', zh: '韦恩图', layout: 'venn', hint: 'What two things share, and what is only true of each.',
    zones: [z('a', 'Only A', '只属于甲'), z('both', 'Both', '共同点'), z('b', 'Only B', '只属于乙')] },
  { id: 'frayer', en: 'Frayer model', zh: '弗雷尔模型', layout: 'frayer', hint: 'Build up the meaning of a word or idea (the topic goes in the middle).',
    zones: [z('def', 'Definition', '定义'), z('char', 'Characteristics', '特征'), z('ex', 'Examples', '例子'), z('non', 'Non-examples', '反例')] },
  { id: 'kwl', en: 'KWL chart', zh: 'KWL 表', layout: 'cols', hint: 'Before and after a topic.',
    zones: [z('k', 'What I know', '我已知道'), z('w', 'What I want to know', '我想知道'), z('l', 'What I learned', '我学到了')] },
  { id: '5w1h', en: '5W1H', zh: '六何法', layout: 'grid3', hint: 'Who, what, when, where, why and how: for a news report, story or event.',
    zones: [z('who', 'Who', '何人'), z('what', 'What', '何事'), z('when', 'When', '何时'), z('where', 'Where', '何地'), z('why', 'Why', '为何'), z('how', 'How', '如何')] },
  { id: 'cause', en: 'Cause and effect', zh: '因果关系', layout: 'flow', hint: 'Causes on the left, the event in the middle, effects on the right.',
    zones: [z('cause', 'Causes', '原因'), z('event', 'Event', '事件'), z('effect', 'Effects', '结果')] },
  { id: 'sequence', en: 'Sequence', zh: '顺序图', layout: 'flow', hint: 'Steps or events in order.',
    zones: [z('1', 'First', '首先'), z('2', 'Next', '然后'), z('3', 'Then', '接着'), z('4', 'Finally', '最后')] },
  { id: 'story', en: 'Story mountain', zh: '故事山', layout: 'mountain', hint: 'The shape of a story, from opening to ending.',
    zones: [z('open', 'Opening', '开端'), z('build', 'Build-up', '发展'), z('climax', 'Climax', '高潮'), z('resolve', 'Resolution', '解决'), z('end', 'Ending', '结局')] },
  { id: 'web', en: 'Concept web', zh: '概念图', layout: 'web', hint: 'Ideas around a central topic (the topic goes in the middle).',
    zones: [z('1', 'Idea 1', '想法一'), z('2', 'Idea 2', '想法二'), z('3', 'Idea 3', '想法三'), z('4', 'Idea 4', '想法四'), z('5', 'Idea 5', '想法五'), z('6', 'Idea 6', '想法六')] },
  { id: 'columns', en: 'My own columns', zh: '自定义', layout: 'cols', hint: 'Name 2 to 6 columns yourself.', custom: true,
    zones: [z('c1', 'Column 1', '第一栏'), z('c2', 'Column 2', '第二栏'), z('c3', 'Column 3', '第三栏')] },
];
const byId = (id) => TEMPLATES.find((x) => x.id === id) || TEMPLATES[0];

export default {
  type: 'organiser',
  title: 'Organiser',
  icon: 'sitemap',
  tone: 'content', // dock tile colour: time | people | signal | content | language
  size: { w: 820, h: 540 },
  minSize: { w: 420, h: 320 },

  mount(body, ctx) {
    const st = ctx.state;
    if (!Array.isArray(st.notes)) ctx.save({ tpl: null, topic: '', labels: {}, cols: null, notes: [], lang: 'both' });
    const root = h('div', { class: 'og' });
    body.append(root);
    let alive = true;
    let showHidden = false;
    let refocus = null;

    const tpl = () => byId(st.tpl);
    // The parts, with the teacher's own labels where they changed them.
    const zones = () => {
      const tp = tpl();
      const list = tp.custom && Array.isArray(st.cols) && st.cols.length ? st.cols : tp.zones;
      return list.map((x) => ({ ...x, ...(st.labels?.[x.id] || {}) }));
    };
    const label = (zn) => bi(zn.en, zn.zh, st.lang);

    // ---------- Notes ----------
    function addNote(zone, text) {
      if (!text.trim()) return;
      ctx.save({ notes: [...st.notes, { id: ctx.store.uid(), zone, text: text.trim() }] });
      render();
    }
    function updateNote(id, patch) {
      ctx.save({ notes: st.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
      render();
    }

    function noteEl(n) {
      const text = h('div', { class: 'rt-note-text' }, n.text);
      const el = h('div', { class: 'rt-note og-note' + (n.starred ? ' starred' : '') + (n.hidden ? ' is-hidden' : ''), 'data-id': n.id },
        text,
        h('div', { class: 'rt-note-tools' },
          h('button', { class: 'rt-tool', title: n.starred ? t('Unstar') : t('Star'), 'aria-label': t('Star'), onclick: () => updateNote(n.id, { starred: !n.starred }) }, icon('star')),
          h('button', { class: 'rt-tool', title: t('Edit'), 'aria-label': t('Edit'), onclick: () => editNote(el, n) }, icon('pencil')),
          h('button', { class: 'rt-tool', title: n.hidden ? t('Show') : t('Hide'), 'aria-label': t('Hide'), onclick: () => updateNote(n.id, { hidden: !n.hidden }) }, icon(n.hidden ? 'eye' : 'eye-off')),
          h('button', { class: 'rt-tool', title: t('Delete'), 'aria-label': t('Delete'), onclick: () => { ctx.save({ notes: st.notes.filter((x) => x.id !== n.id) }); render(); } }, icon('x'))));
      el.addEventListener('pointerdown', (e) => startDrag(e, n, el));
      el.addEventListener('dblclick', () => editNote(el, n));
      return el;
    }

    function editNote(el, n) {
      const ta = h('textarea', { class: 'rt-add og-edit', rows: 2 });
      ta.value = n.text;
      put(el, ta);
      el.classList.add('editing');
      ta.focus();
      ta.select();
      let done = false;
      const finish = (keep) => {
        if (done) return;
        done = true;
        if (keep && ta.value.trim()) updateNote(n.id, { text: ta.value.trim() }); else render();
      };
      ta.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') finish(false);
      });
      ta.addEventListener('blur', () => finish(true));
    }

    // ---------- Drag between parts ----------
    function startDrag(e, n, el) {
      if (e.button !== 0 || e.target.closest('button, textarea') || el.classList.contains('editing')) return;
      const x0 = e.clientX, y0 = e.clientY;
      let drag = null;
      const move = (ev) => {
        if (!drag && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        if (!drag) {
          const r = el.getBoundingClientRect();
          const ghost = el.cloneNode(true);
          ghost.classList.add('rt-ghost');
          Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
          document.body.append(ghost);
          el.classList.add('rt-dragging');
          drag = { ghost, dx: x0 - r.left, dy: y0 - r.top };
        }
        drag.ghost.style.left = (ev.clientX - drag.dx) + 'px';
        drag.ghost.style.top = (ev.clientY - drag.dy) + 'px';
        root.querySelectorAll('.og-zone').forEach((c) => c.classList.remove('drop'));
        const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.og-zone');
        if (zone && root.contains(zone)) zone.classList.add('drop');
      };
      const up = (ev) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        if (!drag) return;
        drag.ghost.remove();
        const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.og-zone');
        if (zone && root.contains(zone)) drop(n.id, zone, ev.clientY);
        render();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }

    function drop(id, zoneEl, y) {
      const key = zoneEl.dataset.zone;
      const note = { ...st.notes.find((n) => n.id === id), zone: key };
      const rest = st.notes.filter((n) => n.id !== id);
      const before = [...zoneEl.querySelectorAll('.og-note:not(.rt-dragging)')].find((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
      let i;
      if (before) i = rest.findIndex((n) => n.id === before.dataset.id);
      else { const last = [...rest].reverse().find((n) => n.zone === key); i = last ? rest.indexOf(last) + 1 : rest.length; }
      rest.splice(i < 0 ? rest.length : i, 0, note);
      ctx.save({ notes: rest });
    }

    // ---------- Views ----------
    function pickView() {
      put(root, h('div', { class: 'og-pick' },
        h('p', { class: 'og-pick-head' }, h('strong', {}, t('Choose an organiser'))),
        // The teacher chooses here, so names follow the app language (the organiser itself
        // shows its labels in the language chosen for students).
        h('div', { class: 'og-pick-grid' }, ...TEMPLATES.map((tp) => h('button', { class: 'og-pick-card', onclick: () => choose(tp.id) },
          h('span', { class: `og-thumb og-thumb-${tp.layout}` }, ...Array.from({ length: tp.layout === 'frayer' ? 5 : tp.layout === 'venn' ? 2 : Math.min(tp.zones.length, 6) }, () => h('i'))),
          h('strong', {}, getLang() === 'zh' ? (tp.zh || tp.en) : tp.en),
          h('span', { class: 'muted small' }, t(tp.hint))))),
      ));
    }

    function choose(id) {
      const tp = byId(id);
      ctx.save({ tpl: id, labels: {}, cols: tp.custom ? tp.zones.map((x) => ({ ...x })) : null });
      // Notes in parts that don't exist any more go to the first part.
      const ids = new Set(zones().map((x) => x.id));
      ctx.save({ notes: st.notes.map((n) => (ids.has(n.zone) ? n : { ...n, zone: zones()[0].id })) });
      render();
      if (tp.custom) editLabels();
    }

    function zoneEl(zn, extraClass = '') {
      const notes = st.notes.filter((n) => n.zone === zn.id && (showHidden || !n.hidden));
      const adder = h('textarea', { class: 'rt-add', rows: 1, placeholder: t('+ Add a note') });
      const commit = (keep) => {
        const v = adder.value;
        adder.value = '';
        if (!v.trim()) return;
        refocus = keep ? zn.id : null;
        addNote(zn.id, v);
      };
      adder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(true); }
        if (e.key === 'Escape') { adder.value = ''; adder.blur(); }
      });
      adder.addEventListener('blur', () => commit(false));
      return h('section', { class: `og-zone ${extraClass}`.trim(), 'data-zone': zn.id },
        h('header', { class: 'og-zone-head' }, h('strong', {}, label(zn)), notes.length ? h('span', { class: 'rt-col-count' }, String(notes.length)) : null),
        h('div', { class: 'og-notes' }, ...notes.map(noteEl)),
        adder);
    }

    function topicEl() {
      return h('div', { class: 'og-topic' }, st.topic || bi('Topic', '主题', st.lang));
    }

    function boardView() {
      const tp = tpl();
      const zs = zones();
      let diagram;
      if (tp.layout === 'venn') {
        diagram = h('div', { class: 'og-diagram og-venn' },
          h('div', { class: 'og-venn-rings', 'aria-hidden': 'true' }, h('i'), h('i')),
          zoneEl(zs[0], 'venn-a'), zoneEl(zs[1], 'venn-both'), zoneEl(zs[2], 'venn-b'));
      } else if (tp.layout === 'frayer') {
        diagram = h('div', { class: 'og-diagram og-frayer' }, ...zs.map((zn, i) => zoneEl(zn, `q${i + 1}`)), topicEl());
      } else if (tp.layout === 'web') {
        diagram = h('div', { class: 'og-diagram og-web' }, ...zs.map((zn, i) => zoneEl(zn, `w${i + 1}`)), topicEl());
      } else if (tp.layout === 'mountain') {
        diagram = h('div', { class: 'og-diagram og-mountain', style: { gridTemplateColumns: `repeat(${zs.length}, minmax(0, 1fr))` } },
          h('div', { class: 'og-mountain-line', 'aria-hidden': 'true',
            html: '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="0,100 0,96 25,62 50,8 75,62 100,96 100,100" /></svg>' }),
          ...zs.map((zn, i) => zoneEl(zn, `m${i + 1}`)));
      } else if (tp.layout === 'flow') {
        const kids = [];
        zs.forEach((zn, i) => { if (i) kids.push(h('span', { class: 'og-arrow', 'aria-hidden': 'true' }, icon('arrow-right'))); kids.push(zoneEl(zn)); });
        diagram = h('div', { class: 'og-diagram og-flow' }, ...kids);
      } else if (tp.layout === 'grid3') {
        diagram = h('div', { class: 'og-diagram og-grid3' }, ...zs.map((zn) => zoneEl(zn)));
      } else {
        diagram = h('div', { class: 'og-diagram og-cols' + (tp.id === 'tchart' ? ' tchart' : ''), style: { gridTemplateColumns: `repeat(${zs.length}, minmax(0, 1fr))` } },
          ...zs.map((zn) => zoneEl(zn)));
      }
      const hiddenCount = st.notes.filter((n) => n.hidden).length;
      const topic = h('input', { class: 'input og-topic-input', type: 'text', value: st.topic || '', maxlength: 120, placeholder: t('Topic or question (optional)') });
      topic.addEventListener('change', () => { ctx.save({ topic: topic.value.trim() }); render(); });
      topic.addEventListener('keydown', (e) => { if (e.key === 'Enter') topic.blur(); });
      put(root, 
        h('div', { class: 'og-bar' },
          h('strong', { class: 'og-name' }, bi(tp.en, tp.zh, st.lang)),
          topic,
          h('div', { class: 'row gap' },
            segmented(langOptions(), st.lang, (v) => { ctx.save({ lang: v }); render(); }, t('Language for students')),
            h('button', { class: 'icon-btn small', title: t('Rename the parts'), 'aria-label': t('Rename the parts'), onclick: editLabels }, icon('pencil')),
            h('button', { class: 'icon-btn small', title: t('Choose another organiser (the notes stay)'), 'aria-label': t('Choose another organiser'), onclick: () => { ctx.save({ tpl: null }); render(); } }, icon('layout-grid')),
            st.notes.length ? confirmButton(icon('trash'), icon('check'), () => { ctx.save({ notes: [] }); render(); }, 'icon-btn small og-clear', { title: t('Remove every note (click twice)'), 'aria-label': t('Remove every note') }) : null)),
        diagram,
        hiddenCount ? h('button', { class: 'link-btn rt-hidden-toggle', onclick: () => { showHidden = !showHidden; render(); } },
          showHidden
            ? (hiddenCount === 1 ? t('Hide the {n} hidden note again', { n: hiddenCount }) : t('Hide the {n} hidden notes again', { n: hiddenCount }))
            : (hiddenCount === 1 ? t('{n} hidden note · show', { n: hiddenCount }) : t('{n} hidden notes · show', { n: hiddenCount }))) : null,
      );
      if (refocus) {
        const box = root.querySelector(`.og-zone[data-zone="${refocus}"] .rt-add`);
        refocus = null;
        box?.focus();
      }
    }

    // Rename the parts (and, for “My own columns”, add or remove columns).
    function editLabels() {
      const tp = tpl();
      let list = zones().map((x) => ({ id: x.id, en: x.en, zh: x.zh }));
      openModal(t('Name the parts'), (mb) => {
        const draw = () => {
          put(mb, 
            h('p', { class: 'muted small' }, t('Each part can have an English and a Chinese name. The language buttons choose which show.')),
            ...list.map((x, i) => {
              const en = h('input', { class: 'input', type: 'text', value: x.en, maxlength: 40, placeholder: 'English' });
              const zh = h('input', { class: 'input', type: 'text', value: x.zh, maxlength: 40, placeholder: '中文', lang: 'zh-CN' });
              en.addEventListener('input', () => { x.en = en.value; });
              zh.addEventListener('input', () => { x.zh = zh.value; });
              return h('div', { class: 'og-label-row' }, h('span', { class: 'dc-row-n' }, String(i + 1)), en, zh,
                tp.custom && list.length > 2 ? h('button', { class: 'icon-btn small', title: t('Remove this column'), 'aria-label': t('Remove this column'), onclick: () => { list = list.filter((y) => y !== x); draw(); } }, icon('x')) : null);
            }),
            tp.custom && list.length < 6 ? h('button', { class: 'btn small with-icon', onclick: () => { list.push({ id: 'c' + ctx.store.uid(), en: `Column ${list.length + 1}`, zh: '' }); draw(); } }, icon('plus'), t('Add a column')) : null,
            h('div', { class: 'row gap space-between' },
              tp.custom ? h('span') : h('button', { class: 'btn', onclick: () => { ctx.save({ labels: {} }); closeModal(); render(); } }, t('Use the original names')),
              h('button', { class: 'btn primary', onclick: save }, t('Done'))),
          );
        };
        const save = () => {
          if (tp.custom) {
            ctx.save({ cols: list.map((x) => ({ id: x.id, en: x.en.trim(), zh: x.zh.trim() })), labels: {} });
            const ids = new Set(list.map((x) => x.id));
            ctx.save({ notes: st.notes.map((n) => (ids.has(n.zone) ? n : { ...n, zone: list[0].id })) });
          } else {
            ctx.save({ labels: Object.fromEntries(list.map((x) => [x.id, { en: x.en.trim(), zh: x.zh.trim() }])) });
          }
          closeModal();
          render();
        };
        draw();
      });
    }

    function render() {
      if (!alive) return;
      if (!st.tpl) pickView(); else boardView();
    }
    render();
    return { destroy() { alive = false; } };
  },
};
