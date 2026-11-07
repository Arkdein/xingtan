// Sentence analysis (层次分析): split a Chinese or English sentence into its
// immediate constituents, layer by layer, and label each cut (主谓, 述宾…), for
// live demonstration. The diagram and the labels follow 庖丁, the 层次分析
// practice app: brackets under each part with its role (主｜谓), particles
// (的、地、得、了、着) in grey and kept with the word before them.
//
// Three views:
// - setup:   type the sentence; tap a word to grey it out (or not)
// - edit:    tap the gaps between words to cut the selected block, then pick the
//            relation. Tap a bracket to change or remove that cut. Any block can
//            be cut next; the tool moves on to the next uncut block by itself.
// - present: replay a prepared analysis cut by cut, optionally holding each
//            label back (shown as ?) until the next click.
//
// State (one saved item, see saved.js):
//   text, lang ('zh' | 'en'), toks: [{ t, p (grey), g ('prev' | 'next': no gap on that side) }]
//   splits: [{ s, e, cuts: [gap…], lab: { id, name, roles, rep } }] in the order they were made.
//     Gap g sits between toks[g-1] and toks[g]. Each split's span is the whole
//     sentence or one part of another split.
//   view, order ('cut' | 'layer'), pause (hold labels back), step (present)
// The teacher's own labels are shared by all boards: meta.icLabels.
import { h, put, segmented, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import { t, getLang } from '../i18n.js';
import { withSavedItems } from './saved.js';

// The 庖丁 labels. `rep`: the second role repeats for three or more parts (并｜列｜列).
const BUILTIN = [
  { id: '主谓', roles: ['主', '谓'], en: 'Subject–predicate' },
  { id: '述宾', roles: ['述', '宾'], en: 'Verb–object' },
  { id: '述补', roles: ['述', '补'], en: 'Verb–complement' },
  { id: '定中', roles: ['定', '中'], en: 'Attributive' },
  { id: '状中', roles: ['状', '中'], en: 'Adverbial' },
  { id: '中定', roles: ['中', '定'], en: 'Head + modifier after' },
  { id: '中状', roles: ['中', '状'], en: 'Head + adverbial after' },
  { id: '并列', roles: ['并', '列'], en: 'Coordinate', rep: true },
  { id: '连动', roles: ['连', '动'], en: 'Serial verbs', rep: true },
  { id: '介宾', roles: ['介', '宾'], en: 'Preposition–object' },
  { id: '方位', roles: ['方', '位'], en: 'Noun + localiser' },
  { id: '数量', roles: ['数', '量'], en: 'Numeral + measure' },
].map((l) => ({ ...l, name: l.id }));

// 虚词随前: these are greyed and kept with the word before them, unless they
// start a word (的确, 地方, 得到, 了解, 着急…).
const PARTICLES = new Set(['的', '地', '得', '了', '着']);
const NOT_PARTICLE = new Set(['的确', '的士', '地方', '地区', '地球', '地上', '地下', '地点', '地图', '地铁', '地位', '地址', '地面', '地理',
  '得到', '得出', '得意', '得分', '得失', '了解', '了不', '着急', '着想', '着手', '着重', '着实', '着陆', '着迷', '着火', '着凉']);
const OPENERS = new Set([...'“‘《〈（(「『【[{']);
const CJK = /[㐀-鿿豈-﫿\u{20000}-\u{2fa1f}]/u;
const PUNCT = /^[\p{P}\p{S}]+$/u;
const ASCII_RUN = /[A-Za-z0-9'’.%\-]/;

export function detectLang(text) { return CJK.test(text) ? 'zh' : 'en'; }

// Chinese: one token per character (Latin letters and digits stay together);
// English: one token per word, punctuation kept on the word.
export function tokenize(text, lang) {
  const out = [];
  const src = String(text || '').trim();
  if (lang === 'en') {
    src.split(/\s+/).filter(Boolean).forEach((w) => out.push({ t: w }));
    return out;
  }
  const chars = [...src.replace(/\s+/g, ' ')];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === ' ') continue;
    if (ASCII_RUN.test(c) && !CJK.test(c)) {
      let w = c;
      while (i + 1 < chars.length && ASCII_RUN.test(chars[i + 1])) w += chars[++i];
      if (PUNCT.test(w)) out.push({ t: w, g: 'prev' }); else out.push({ t: w });
      continue;
    }
    if (PUNCT.test(c)) { out.push({ t: c, g: OPENERS.has(c) ? 'next' : 'prev' }); continue; }
    const prev = out[out.length - 1];
    if (PARTICLES.has(c) && prev && !PUNCT.test(prev.t) && !NOT_PARTICLE.has(c + (chars[i + 1] || ''))) {
      out.push({ t: c, p: true, g: 'prev' });
      continue;
    }
    out.push({ t: c });
  }
  // Opening marks at the end, or closing ones at the start, have nothing to stick to.
  if (out.length) { if (out[0].g === 'prev') delete out[0].g; if (out[out.length - 1].g === 'next') delete out[out.length - 1].g; }
  return out;
}

// ---------- The tree ----------
const key = (s, e) => `${s}:${e}`;
const bounds = (sp) => [sp.s, ...sp.cuts, sp.e];
const partsOf = (sp) => { const b = bounds(sp); return b.slice(0, -1).map((x, i) => [x, b[i + 1]]); };

export function gapOK(toks, g) {
  return g > 0 && g < toks.length && toks[g].g !== 'prev' && toks[g - 1].g !== 'next';
}

// Splits that hang together from the whole sentence down, with each one's depth.
export function treeOf(splits, n, toks) {
  const byKey = new Map();
  (splits || []).forEach((sp) => {
    if (!Array.isArray(sp.cuts) || !sp.cuts.length) return;
    const b = bounds(sp);
    if (b.some((x, i) => i && x <= b[i - 1])) return;
    if (toks && sp.cuts.some((g) => !gapOK(toks, g))) return;
    if (!byKey.has(key(sp.s, sp.e))) byKey.set(key(sp.s, sp.e), sp);
  });
  const depth = new Map();
  const order = [];
  const root = byKey.get(key(0, n));
  if (root) {
    const q = [[root, 0]];
    while (q.length) {
      const [sp, d] = q.shift();
      depth.set(sp, d);
      order.push(sp);
      partsOf(sp).forEach(([s, e]) => { const c = byKey.get(key(s, e)); if (c) q.push([c, d + 1]); });
    }
  }
  return { byKey: new Map(order.map((sp) => [key(sp.s, sp.e), sp])), depth, layerOrder: order };
}

// Roles under each part: 主｜谓, 并｜列｜列, or the label's own part names.
export function rolesFor(lab, count) {
  const r = (lab?.roles || []).filter(Boolean);
  if (!r.length) return Array(count).fill(lab?.name || '?');
  return Array.from({ length: count }, (_, k) => r[Math.min(k, r.length - 1)]);
}

const cuttable = (toks, s, e) => { for (let g = s + 1; g < e; g++) if (gapOK(toks, g)) return true; return false; };

const tool = {
  type: 'analysis',
  title: 'Sentence analysis',
  icon: 'scissors',
  tone: 'language',
  size: { w: 820, h: 540 },
  minSize: { w: 360, h: 260 },

  mount(body, ctx) {
    const st = ctx.state;
    if (!Array.isArray(st.splits)) {
      ctx.save({ text: '', lang: 'zh', toks: [], splits: [], view: 'setup', order: 'cut', pause: true, step: 0 });
    }
    if (!st.text) st.view = 'setup';

    const root = h('div', { class: 'ica', tabindex: '-1' });
    body.append(root);

    let sel = null;        // the block being cut, or the cut being changed: { s, e }
    let pending = [];      // gaps tapped in the selected block, not yet labelled
    let undoStack = [];    // earlier splits, for Undo
    let fitTimer = null;

    const n = () => st.toks.length;
    const tree = () => treeOf(st.splits, n(), st.toks);

    // ---------- Labels ----------
    const ownLabels = () => (Array.isArray(ctx.store.get().icLabels) ? ctx.store.get().icLabels : []);
    const allLabels = () => [...BUILTIN, ...ownLabels()];
    const labOf = (l) => ({ id: l.id, name: l.name, roles: l.roles.slice(), ...(l.rep ? { rep: true } : {}) });

    // ---------- Changing the analysis ----------
    function setSplits(next) {
      undoStack.push(JSON.parse(JSON.stringify(st.splits)));
      if (undoStack.length > 50) undoStack.shift();
      ctx.save({ splits: next, step: 0 });
    }
    function undo() {
      if (!undoStack.length) return;
      ctx.save({ splits: undoStack.pop(), step: 0 });
      pending = [];
      sel = nextBlock();
      render();
    }

    // The uncut block containing token i.
    function leafAt(i) {
      const { byKey } = tree();
      let s = 0; let e = n();
      for (;;) {
        const sp = byKey.get(key(s, e));
        if (!sp) return { s, e };
        const part = partsOf(sp).find(([a, b]) => i >= a && i < b);
        [s, e] = part;
      }
    }
    // The first uncut block that can still be cut, top-down, left to right.
    function nextBlock() {
      const { byKey } = tree();
      const q = [[0, n()]];
      while (q.length) {
        const [s, e] = q.shift();
        const sp = byKey.get(key(s, e));
        if (sp) partsOf(sp).forEach((p) => q.push(p));
        else if (cuttable(st.toks, s, e)) return { s, e };
      }
      return null;
    }
    const selSplit = () => (sel ? tree().byKey.get(key(sel.s, sel.e)) || null : null);
    const depthOfBlock = (s, e) => {
      const { byKey, depth } = tree();
      for (const sp of byKey.values()) if (partsOf(sp).some(([a, b]) => a === s && b === e)) return depth.get(sp) + 1;
      return 0;
    };

    function commit(l) {
      if (!sel || !pending.length) return;
      const cuts = [...pending].sort((a, b) => a - b);
      setSplits([...st.splits.filter((sp) => !(sp.s === sel.s && sp.e === sel.e)), { s: sel.s, e: sel.e, cuts, lab: labOf(l) }]);
      pending = [];
      sel = nextBlock();
      render();
    }
    function relabel(l) {
      const sp = selSplit();
      if (!sp) return;
      setSplits(st.splits.map((x) => (x === sp ? { ...x, lab: labOf(l) } : x)));
      render();
    }
    // Takes away a cut and every cut inside it.
    function removeCut() {
      const sp = selSplit();
      if (!sp) return;
      setSplits(st.splits.filter((x) => !(x.s >= sp.s && x.e <= sp.e)));
      pending = [];
      render();
    }

    // ---------- The diagram ----------
    // Columns: token i at 2i+1, gap g at 2g. Row 1 holds the words; each layer
    // of brackets sits on the row below its parent.
    function diagram({ shown, editing }) {
      const toks = st.toks;
      const grid = h('div', { class: `ica-dg ${st.lang}`, style: { gridTemplateColumns: toks.map((_, i) => (i ? 'var(--ica-gap) auto' : 'auto')).join(' ') } });
      const inSel = (i) => editing && sel && !selSplit() && i >= sel.s && i < sel.e;
      toks.forEach((tk, i) => {
        if (i) {
          const g = i;
          const active = editing && sel && !selSplit() && g > sel.s && g < sel.e && gapOK(toks, g);
          const cut = pending.includes(g);
          const gap = active
            ? h('button', {
              class: 'ica-gap in' + (cut ? ' cut' : ''), 'aria-pressed': String(cut),
              'aria-label': t('Cut between “{a}” and “{b}”', { a: toks[g - 1].t, b: tk.t }),
              title: cut ? t('Take this cut away') : t('Cut here'),
              onclick: (e) => { e.stopPropagation(); pending = cut ? pending.filter((x) => x !== g) : [...pending, g]; render(); },
            })
            : h('span', { class: 'ica-gap off' + (inSel(g - 1) && inSel(g) ? ' in' : '') });
          gap.style.gridColumn = String(2 * g);
          gap.style.gridRow = '1';
          grid.append(gap);
        }
        const word = h(editing ? 'button' : 'span', {
          class: 'ica-tok' + (tk.p ? ' part' : '') + (inSel(i) ? ' in' : ''),
          style: { gridColumn: String(2 * i + 1), gridRow: '1' },
          ...(editing ? { title: t('Cut this part next'), onclick: () => { sel = leafAt(i); pending = []; render(); } } : {}),
        }, tk.t);
        grid.append(word);
      });

      const { depth } = tree();
      const col = (a, b) => `${2 * a + 1} / ${2 * (b - 1) + 2}`;
      shown.forEach(({ sp, label }) => {
        const d = depth.get(sp) ?? 0;
        const roles = rolesFor(sp.lab, sp.cuts.length + 1);
        const isSel = editing && sel && sp.s === sel.s && sp.e === sel.e;
        partsOf(sp).forEach(([a, b], k) => {
          const lab = label ? roles[k] : '?';
          const attrs = {
            class: 'ica-br' + (isSel ? ' cur' : '') + (label ? '' : ' hidden-lab') + (sp === shown.fresh ? ' fresh' : ''),
            style: { gridColumn: col(a, b), gridRow: String(d + 2) },
          };
          if (editing) {
            Object.assign(attrs, { title: t('Change or remove this cut ({name})', { name: sp.lab?.name || '' }),
              onclick: () => { sel = { s: sp.s, e: sp.e }; pending = []; render(); } });
          } else if (!label) {
            Object.assign(attrs, { title: t('Show the label'), onclick: () => go(1) });
          }
          grid.append(h(editing || !label ? 'button' : 'div', attrs, h('span', { class: 'ica-line' }), h('span', { class: 'ica-lab' }, lab)));
        });
      });
      // Cuts tapped but not yet labelled.
      if (editing && sel && pending.length && !selSplit()) {
        const d = depthOfBlock(sel.s, sel.e);
        partsOf({ s: sel.s, e: sel.e, cuts: [...pending].sort((a, b) => a - b) }).forEach(([a, b]) => {
          grid.append(h('div', { class: 'ica-br pend', style: { gridColumn: col(a, b), gridRow: String(d + 2) } },
            h('span', { class: 'ica-line' }), h('span', { class: 'ica-lab' }, '?')));
        });
      }
      return grid;
    }

    // Shrinks the diagram to fit the tool's width (up to a large classroom size).
    const stage = h('div', { class: 'ica-stage' });
    function fit() {
      const grid = stage.querySelector('.ica-dg');
      if (!grid) return;
      const availW = stage.clientWidth - 32;
      const availH = stage.clientHeight - 32;
      if (availW <= 0 || availH <= 0) return;
      grid.style.fontSize = '40px';
      const w = grid.scrollWidth;
      const ht = grid.scrollHeight;
      const size = Math.max(16, Math.min(72, Math.floor(40 * Math.min(availW / Math.max(w, 1), availH / Math.max(ht, 1)))));
      grid.style.fontSize = `${size}px`;
      stage.classList.toggle('ica-scroll-x', grid.scrollWidth > stage.clientWidth);
    }
    const fitSoon = () => { cancelAnimationFrame(fitTimer); fitTimer = requestAnimationFrame(fit); };
    const ro = new ResizeObserver(fitSoon);
    ro.observe(body);

    // ---------- Labels palette ----------
    function palette({ current, enabled, onPick }) {
      const zhUi = getLang() === 'zh';
      return h('div', { class: 'ica-rels' + (enabled ? '' : ' idle'), role: 'group', 'aria-label': t('Relation') },
        ...allLabels().map((l) => h('button', {
          class: 'ica-rel' + (current === l.id ? ' on' : '') + (l.en ? '' : ' own'), disabled: !enabled,
          'aria-pressed': String(current === l.id), onclick: () => onPick(l),
          title: `${l.name} · ${l.roles.join('｜')}${l.en ? ` · ${t(l.en)}` : ''}`,
        }, h('b', {}, l.name), h('small', {}, l.en && !zhUi ? t(l.en) : l.roles.join('｜')))),
        h('button', { class: 'ica-rel ica-rel-add', onclick: manageLabels, title: t('Add your own labels') }, icon('tags'), h('small', {}, t('My labels'))));
    }

    function manageLabels() {
      openModal(t('My labels'), (mb) => {
        const list = h('div', { class: 'ica-own-list' });
        const draw = () => {
          const own = ownLabels();
          put(list, own.length ? own.map((l) => h('div', { class: 'ica-own-row' },
            h('b', {}, l.name), h('span', { class: 'muted' }, l.roles.join('｜')),
            confirmButton(icon('trash'), icon('check'), () => {
              ctx.store.update((m) => { m.icLabels = (m.icLabels || []).filter((x) => x.id !== l.id); });
              draw(); render();
            }, 'icon-btn small', { title: t('Delete (click twice)'), 'aria-label': t('Delete “{name}”', { name: l.name }) })))
            : h('p', { class: 'muted' }, t('No labels of your own yet.')));
        };
        const name = h('input', { class: 'input', maxlength: 8, placeholder: t('e.g. 同位') });
        const roles = h('input', { class: 'input', maxlength: 20, placeholder: t('e.g. 同 位') });
        const err = h('p', { class: 'error', hidden: true });
        const add = () => {
          const nm = name.value.trim();
          const rs = roles.value.split(/[\s｜|/,，、]+/).map((x) => x.trim()).filter(Boolean).slice(0, 4);
          if (!nm) { err.textContent = t('Type a name for the label.'); err.hidden = false; name.focus(); return; }
          if (allLabels().some((l) => l.name === nm)) { err.textContent = t('There is already a label called “{name}”.', { name: nm }); err.hidden = false; return; }
          err.hidden = true;
          const l = { id: `own-${ctx.store.uid()}`, name: nm, roles: rs.length ? rs : [...nm].slice(0, 2) };
          ctx.store.update((m) => { m.icLabels = [...(m.icLabels || []), l]; });
          name.value = ''; roles.value = '';
          draw(); render(); name.focus();
        };
        [name, roles].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }));
        draw();
        mb.append(
          h('p', { class: 'muted small' }, t('Your labels appear after the 庖丁 labels in every Sentence analysis tool, on all boards.')),
          list,
          h('div', { class: 'ica-own-form' },
            h('label', { class: 'field' }, h('span', {}, t('Label name')), name),
            h('label', { class: 'field' }, h('span', {}, t('Names of the parts')), roles),
            h('button', { class: 'btn primary with-icon', onclick: add }, icon('plus'), t('Add'))),
          err,
          h('div', { class: 'row gap space-between' }, h('span', { class: 'muted small' }, t('If you leave the parts blank, the label’s own characters are used (同位 → 同｜位).')),
            h('button', { class: 'btn', onclick: closeModal }, t('Done'))));
      });
    }

    // ---------- Setup ----------
    function setupView() {
      const box = h('textarea', { class: 'input ica-input', rows: 2, maxlength: 400, spellcheck: 'false',
        placeholder: t('Type or paste a sentence, e.g. 王平是一位优秀的园艺家 or The boy beside you raised his hand.') });
      box.value = st.text || '';
      let lang = st.text ? st.lang : 'zh';
      let langSet = !!st.text;
      let toks = st.text ? st.toks.map((x) => ({ ...x })) : [];
      const preview = h('div', { class: 'ica-preview' });
      const langBox = h('div');
      const warn = h('p', { class: 'ica-warn', hidden: true }, icon('alert-triangle'), t('Changing the sentence clears its cuts.'));
      const startBtn = h('button', { class: 'btn primary with-icon', onclick: () => start() }, icon('scissors'), t('Start cutting'));

      const sameWords = () => toks.length === st.toks.length && toks.every((x, i) => x.t === st.toks[i].t);
      function retokenize() {
        const old = toks;
        toks = tokenize(box.value, lang);
        // Keep the teacher's own grey / not grey choices on words that are still there.
        if (old.length === toks.length && old.every((x, i) => x.t === toks[i].t)) toks = old;
        drawPreview();
      }
      function drawPreview() {
        put(langBox, segmented([['zh', '中文'], ['en', 'English']], lang, (v) => { lang = v; langSet = true; retokenize(); }, t('Language of the sentence')));
        put(preview, toks.length ? toks.map((tk, i) => h('button', {
          class: 'ica-pv-tok' + (tk.p ? ' part' : ''), 'aria-pressed': String(!!tk.p),
          title: tk.p ? t('Show in black') : t('Grey out (a particle such as 的、地、得)'),
          onclick: () => {
            const c = { ...tk };
            if (c.p) { delete c.p; if (c.g === 'prev' && !PUNCT.test(c.t)) delete c.g; } else { c.p = true; if (lang === 'zh' && i > 0) c.g = 'prev'; }
            toks = toks.map((x, k) => (k === i ? c : x));
            drawPreview();
          },
        }, tk.t)) : h('span', { class: 'muted' }, t('The sentence will appear here.')));
        warn.hidden = !(st.splits.length && st.text && !sameWords());
        startBtn.disabled = toks.length < 2;
      }
      box.addEventListener('input', () => { if (!langSet) lang = detectLang(box.value); retokenize(); });
      box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); } });

      function start() {
        if (toks.length < 2) return;
        const keep = sameWords();
        const next = { text: box.value.trim(), lang, toks, view: 'edit', step: 0 };
        if (!keep) { next.splits = []; undoStack = []; }
        ctx.save(next);
        // Drop cuts that a newly greyed word now makes impossible.
        const valid = new Set(tree().byKey.values());
        if (st.splits.some((sp) => !valid.has(sp))) ctx.save({ splits: st.splits.filter((sp) => valid.has(sp)) });
        pending = [];
        sel = nextBlock();
        render();
      }

      toks.length || retokenize();
      drawPreview();
      put(root, h('div', { class: 'ica-setup' },
        h('label', { class: 'field' }, h('span', {}, t('Sentence or phrase (Chinese or English)')), box),
        h('div', { class: 'row gap wrap space-between' }, langBox, h('span', { class: 'muted small' }, t('Tap a word to grey it out or back. Greyed Chinese particles stay with the word before them.'))),
        preview, warn,
        h('div', { class: 'row gap wrap space-between' },
          st.text ? h('button', { class: 'btn', onclick: () => { ctx.save({ view: 'edit' }); render(); } }, t('Cancel')) : h('span'),
          startBtn)));
      box.focus({ preventScroll: true });
    }

    // ---------- Edit ----------
    function editPanel() {
      const sp = selSplit();
      const undoBtn = h('button', { class: 'btn small with-icon', onclick: undo, disabled: !undoStack.length, title: t('Undo the last change') }, icon('arrow-back-up'), t('Undo'));
      if (sp) {
        const parts = partsOf(sp).map(([a, b]) => st.toks.slice(a, b).map((x) => x.t).join(st.lang === 'en' ? ' ' : '')).join(' ｜ ');
        return h('div', { class: 'ica-panel' },
          h('p', { class: 'ica-hint' }, h('span', { class: 'ica-pill' }, sp.lab?.name || '?'), h('span', { class: 'ica-parts' }, parts)),
          palette({ current: sp.lab?.id, enabled: true, onPick: relabel }),
          h('div', { class: 'ica-actions' },
            h('button', { class: 'btn small danger with-icon', onclick: removeCut, title: t('Take away this cut and every cut inside it') }, icon('trash'), t('Remove this cut')),
            h('span', { class: 'grow' }), undoBtn,
            h('button', { class: 'btn small primary', onclick: () => { sel = nextBlock(); pending = []; render(); } }, t('Done'))));
      }
      if (!sel) {
        return h('div', { class: 'ica-panel ica-done' },
          h('p', { class: 'ica-hint' }, icon('circle-check'), st.splits.length ? t('Every part is cut. Tap a bracket to change a label, or present it cut by cut.') : t('Tap a word to choose a part to cut.')),
          h('div', { class: 'ica-actions' }, h('span', { class: 'grow' }), undoBtn,
            st.splits.length ? h('button', { class: 'btn small primary with-icon', onclick: () => present(0) }, icon('presentation'), t('Present')) : null));
      }
      const can = cuttable(st.toks, sel.s, sel.e);
      return h('div', { class: 'ica-panel' },
        h('p', { class: 'ica-hint' }, !can ? t('This part can’t be cut any further. Tap another word.')
          : pending.length ? t('Now choose the relation between the parts.')
            : t('Tap the gap where this part divides (two or more gaps for 并列 or 连动).')),
        palette({ current: null, enabled: can && pending.length > 0, onPick: commit }),
        h('div', { class: 'ica-actions' },
          pending.length ? h('button', { class: 'btn small', onclick: () => { pending = []; render(); } }, t('Clear cuts')) : null,
          h('span', { class: 'grow' }), undoBtn));
    }

    // ---------- Present ----------
    // Each cut is one step, or two when labels are held back (the cut, then its label).
    const sequence = () => {
      const tr = tree();
      return st.order === 'layer' ? tr.layerOrder : st.splits.filter((sp) => tr.byKey.get(key(sp.s, sp.e)) === sp);
    };
    const totalSteps = () => sequence().length * (st.pause ? 2 : 1);
    const clampStep = (x) => Math.max(0, Math.min(totalSteps(), x));
    function go(delta) { ctx.save({ step: clampStep((st.step || 0) + delta) }); render(); }
    function present(step = 0) { sel = null; pending = []; ctx.save({ view: 'present', step: clampStep(step) }); render(); root.focus({ preventScroll: true }); }

    function shownFor(step) {
      const seq = sequence();
      const per = st.pause ? 2 : 1;
      const shown = [];
      seq.forEach((sp, i) => { if (step > i * per) shown.push({ sp, label: !st.pause || step > i * per + 1 }); });
      const last = shown[shown.length - 1];
      shown.fresh = last && (st.pause ? step % 2 === 1 : true) ? last.sp : null;
      return shown;
    }

    // ---------- Drawing ----------
    const miniText = h('span', { class: 'mini-text' });
    const miniNext = h('button', { class: 'mini-btn soft', onclick: () => go(1), title: t('Next'), 'aria-label': t('Next') }, icon('chevron-right'));

    function render() {
      ctx.setMiniLabel?.(st.text || '');
      if (st.view === 'setup' || !st.text) { setupView(); ctx.setMiniControls?.(); return; }
      const editing = st.view === 'edit';
      const step = clampStep(st.step || 0);
      const shown = editing ? Object.assign(sequence().map((sp) => ({ sp, label: true })), { fresh: null }) : shownFor(step);
      put(stage, diagram({ shown, editing }));
      const total = totalSteps();

      const bar = h('div', { class: 'ica-bar' },
        segmented([['edit', t('Analyse')], ['present', t('Present')]], st.view, (v) => { if (v === 'present') present(0); else { ctx.save({ view: 'edit' }); sel = nextBlock(); render(); } }, t('View')),
        h('span', { class: 'grow' }),
        editing ? h('button', { class: 'btn small with-icon', onclick: () => { ctx.save({ view: 'setup' }); render(); }, title: t('Change the sentence') }, icon('pencil'), t('Sentence')) : null,
        !editing ? segmented([['cut', t('As cut')], ['layer', t('Layer by layer')]], st.order || 'cut', (v) => { ctx.save({ order: v, step: 0 }); render(); }, t('Order of the cuts')) : null,
        !editing ? h('label', { class: 'ica-check', title: t('Show each cut with ? first; the next click shows its label') },
          h('input', { type: 'checkbox', checked: !!st.pause, onchange: (e) => { ctx.save({ pause: e.target.checked, step: 0 }); render(); } }), t('Pause before labels')) : null);

      const foot = editing ? editPanel() : h('div', { class: 'ica-panel ica-present' },
        h('button', { class: 'btn with-icon', onclick: () => go(-1), disabled: step <= 0, title: t('Back (←)') }, icon('chevron-left'), t('Back')),
        h('span', { class: 'ica-count' }, total ? t('{k} of {n}', { k: step, n: total }) : t('Nothing cut yet')),
        h('button', { class: 'btn primary with-icon', onclick: () => go(1), disabled: step >= total, title: t('Next (→ or space)') }, t('Next'), icon('chevron-right')),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn small', onclick: () => { ctx.save({ step: total }); render(); }, disabled: step >= total }, t('Show all')),
        h('button', { class: 'icon-btn small', onclick: () => { ctx.save({ step: 0 }); render(); }, title: t('Start again'), 'aria-label': t('Start again') }, icon('rotate')));

      put(root, bar, stage, foot);
      fitSoon();

      if (!editing && total) {
        miniText.textContent = `${t('Sentence analysis')} · ${step}/${total}`;
        miniNext.disabled = step >= total;
        ctx.setMiniControls?.(miniText, miniNext);
      } else ctx.setMiniControls?.();
    }

    function onKey(e) {
      if (e.target.closest('input, textarea, select') || st.view === 'setup') return;
      if (st.view === 'present') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button'))) { e.preventDefault(); go(1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      } else if (e.key === 'Escape' && pending.length) { pending = []; render(); }
    }
    root.addEventListener('keydown', onKey);
    const offClasses = ctx.onClassesChange?.(() => { if (st.view === 'edit') render(); }); // labels added in another tool

    if (st.view === 'edit') sel = nextBlock();
    render();
    return {
      destroy() {
        ro.disconnect();
        cancelAnimationFrame(fitTimer);
        root.removeEventListener('keydown', onKey);
        offClasses?.();
      },
    };
  },
};

const count = (k, one, many) => (k === 1 ? t(one) : t(many, { n: k }));
export default withSavedItems(tool, {
  isBlank: (st) => !String(st.text || '').trim(),
  describe: (st) => ({
    title: String(st.text || '').trim(),
    sub: (st.splits || []).length ? count(st.splits.length, '1 cut', '{n} cuts') : '',
  }),
  // A copy keeps the cuts and starts the replay from the beginning.
  reuse: (st) => ({ ...st, step: 0, view: (st.splits || []).length ? 'present' : st.view }),
});
