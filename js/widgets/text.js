import { h } from '../ui.js';
import { icon } from '../icons.js';
import { cleanHtml, textToHtml, safeColour } from '../richtext.js';
import { t } from '../i18n.js';

// Colour names stay in English here; t() is called where they are shown.
// A small, high-contrast set that reads well on a projector.
const COLOURS = [
  { name: 'Default', value: null, show: '#1d2733' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#15803d' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#7c3aed' },
];
const HIGHLIGHTS = [
  { name: 'No highlight', value: null },
  { name: 'Yellow', value: '#fde047' },
  { name: 'Green', value: '#86efac' },
  { name: 'Blue', value: '#93c5fd' },
  { name: 'Pink', value: '#f9a8d4' },
];
// Soft card colours: every text colour and highlight above stays readable on them.
const CARDS = [
  { name: 'White', value: null, show: '#ffffff' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Peach', value: '#ffedd5' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#ede9fe' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Green', value: '#dcfce7' },
];
const CARD_VALUES = new Set(CARDS.map((c) => c.value).filter(Boolean));
// Marker colours used to find and remove a colour (there is no browser command for that).
const MARK_FG = 'rgb(1, 2, 3)';
const MARK_BG = 'rgb(1, 2, 4)';

const PLACEHOLDER = 'Type instructions, the lesson objective, homework…';

export default {
  type: 'text',
  title: 'Text',
  icon: 'align-left',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 460, h: 280 },
  minSize: { w: 200, h: 140 },

  mount(body, ctx) {
    if (ctx.state.size == null) ctx.save({ size: 32, text: '' });

    // Older boards kept plain text only; show it as formatted text with its line breaks.
    const start = ctx.state.html != null ? ctx.state.html : textToHtml(ctx.state.text || '');
    const editor = h('div', {
      class: 'text-board',
      contenteditable: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': t('Text'),
      'data-placeholder': t(PLACEHOLDER),
      spellcheck: 'false',
    });
    editor.innerHTML = cleanHtml(start);
    editor.style.fontSize = ctx.state.size + 'px';

    // ---- Card colour (each Text tool has its own) ----
    const paintCard = (value) => {
      const ok = CARD_VALUES.has(value) ? value : null; // only colours from the list, even from a shared file
      ctx.el.classList.toggle('text-card', !!ok);
      if (ok) ctx.el.style.setProperty('--text-card', ok);
      else ctx.el.style.removeProperty('--text-card');
      return ok;
    };
    paintCard(ctx.state.bg);

    const isEmpty = () => !editor.textContent.trim() && !editor.querySelector('li');
    const refreshEmpty = () => editor.classList.toggle('is-empty', isEmpty());
    refreshEmpty();

    // ---- Saving (waits while a pinyin word is still being chosen) ----
    let timer;
    const commit = () => {
      clearTimeout(timer);
      const html = isEmpty() ? '' : cleanHtml(editor.innerHTML);
      // `text` keeps a plain copy for older copies of the app.
      ctx.save({ html, text: html ? editor.innerText.replace(/\n{3,}/g, '\n\n').trim() : '' });
      updateChip();
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(commit, 300); };

    // When minimised, the chip shows the first line of the text instead of “Text”.
    const firstLine = () => (ctx.state.text || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
    const updateChip = () => ctx.setMiniLabel?.(firstLine().slice(0, 80));
    updateChip();

    editor.addEventListener('input', (e) => {
      refreshEmpty();
      // A drop, or a paste the browser handled itself, is cleaned straight away.
      if (e.inputType === 'insertFromDrop' || e.inputType === 'insertFromPaste') {
        const clean = cleanHtml(editor.innerHTML);
        if (clean !== editor.innerHTML) editor.innerHTML = clean;
      }
      if (e.isComposing) return;
      later();
      updateState();
    });
    editor.addEventListener('compositionend', later);
    editor.addEventListener('blur', commit);

    // ---- Paste: keep bold, italic, underline and lists; drop everything else ----
    editor.addEventListener('paste', (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      e.preventDefault();
      const html = cd.getData('text/html');
      const out = html ? cleanHtml(html, { colours: false }) : textToHtml(cd.getData('text/plain'));
      if (!out) return;
      document.execCommand('insertHTML', false, out);
      // The browser adds "background: transparent" to pasted text; take it off again.
      editor.querySelectorAll('[style]').forEach((el) => {
        if (el.style.backgroundColor && !safeColour(el.style.backgroundColor)) el.style.removeProperty('background-color');
        if (!el.getAttribute('style')) el.removeAttribute('style');
        if (el.tagName === 'SPAN' && !el.attributes.length) el.replaceWith(...el.childNodes);
      });
    });

    // ---- Formatting commands ----
    let lastRange = null;
    const selectionInEditor = () => {
      const sel = document.getSelection();
      return sel && sel.rangeCount && editor.contains(sel.anchorNode) ? sel : null;
    };
    // Put the caret back in the text if a button took focus away.
    const ready = () => {
      if (document.activeElement !== editor) editor.focus({ preventScroll: true });
      if (!selectionInEditor() && lastRange) {
        const sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastRange);
      }
    };
    const run = (cmd, value = null) => {
      ready();
      try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (err) { /* ignore */ }
      document.execCommand(cmd, false, value);
      afterChange();
    };
    const afterChange = () => { refreshEmpty(); later(); updateState(); };

    // Removes the marker colour, leaving the rest of the formatting.
    const stripMarker = (prop, mark) => {
      editor.querySelectorAll('[style]').forEach((el) => {
        if (el.style.getPropertyValue(prop) === mark) el.style.removeProperty(prop);
        if (!el.getAttribute('style')) el.removeAttribute('style');
        if (el.tagName === 'SPAN' && !el.attributes.length) el.replaceWith(...el.childNodes);
      });
    };

    const setColour = (kind, value) => {
      const fg = kind === 'fg';
      ready();
      document.execCommand('styleWithCSS', false, true);
      const colour = value || (fg ? MARK_FG : MARK_BG);
      if (fg) document.execCommand('foreColor', false, colour);
      else if (!document.execCommand('hiliteColor', false, colour)) document.execCommand('backColor', false, colour);
      document.execCommand('styleWithCSS', false, false);
      if (!value) stripMarker(fg ? 'color' : 'background-color', fg ? MARK_FG : MARK_BG);
      afterChange();
    };

    // ---- Toolbar ----
    // Buttons keep the text selected when pressed (mouse, pen and touch).
    const keepSelection = (el) => { el.addEventListener('mousedown', (e) => e.preventDefault()); return el; };
    // title is English; it is translated here.
    const btn = (name, title, onclick, extra = {}) => keepSelection(h('button', { class: 'tt-btn', title: t(title), 'aria-label': t(title), onclick, ...extra }, icon(name)));

    const toggles = {
      bold: btn('bold', 'Bold (Ctrl+B)', () => run('bold'), { 'aria-pressed': 'false' }),
      italic: btn('italic', 'Italic (Ctrl+I)', () => run('italic'), { 'aria-pressed': 'false' }),
      underline: btn('underline', 'Underline (Ctrl+U)', () => run('underline'), { 'aria-pressed': 'false' }),
      insertUnorderedList: btn('list', 'Bullet list', () => run('insertUnorderedList'), { 'aria-pressed': 'false' }),
      insertOrderedList: btn('list-numbers', 'Numbered list', () => run('insertOrderedList'), { 'aria-pressed': 'false' }),
    };

    const fgBar = h('span', { class: 'tt-bar', style: { background: COLOURS[1].value } });
    const bgBar = h('span', { class: 'tt-bar', style: { background: HIGHLIGHTS[1].value } });
    const fgBtn = btn('text-color', 'Text colour', () => openPalette('fg'));
    const bgBtn = btn('highlight', 'Highlight', () => openPalette('bg'));
    fgBtn.append(fgBar);
    bgBtn.append(bgBar);

    const setSize = (d) => {
      const size = Math.max(14, Math.min(120, ctx.state.size + d));
      ctx.save({ size });
      editor.style.fontSize = size + 'px';
    };
    const sizeBtn = (label, title, d) => keepSelection(h('button', { class: 'tt-btn tt-size', title: t(title), 'aria-label': t(title), onclick: () => setSize(d) }, label));

    const main = h('div', { class: 'tt-row' },
      toggles.bold, toggles.italic, toggles.underline,
      h('span', { class: 'tt-sep' }),
      toggles.insertUnorderedList, toggles.insertOrderedList,
      h('span', { class: 'tt-sep' }),
      fgBtn, bgBtn,
      btn('clear-formatting', 'Clear formatting', () => { run('removeFormat'); stripAllColour(); }),
      h('span', { class: 'tt-sep' }),
      btn('paint', 'Background colour', () => openPalette('card')),
      sizeBtn('A−', 'Smaller text', -4),
      sizeBtn('A+', 'Bigger text', 4),
    );

    // removeFormat leaves highlight behind in some browsers, so clear it as well.
    const stripAllColour = () => {
      const sel = selectionInEditor();
      if (!sel || sel.isCollapsed) return;
      setColour('bg', null);
    };

    const palette = h('div', { class: 'tt-row', hidden: true });
    const openPalette = (kind) => {
      const list = kind === 'fg' ? COLOURS : kind === 'bg' ? HIGHLIGHTS : CARDS;
      palette.replaceChildren(
        btn('arrow-left', 'Back', closePalette),
        h('span', { class: 'tt-sep' }),
        ...list.map((c) => {
          const sw = keepSelection(h('button', {
            class: `tt-swatch ${kind}${c.value ? '' : ' none'}`,
            title: t(c.name),
            'aria-label': t(c.name),
            'aria-pressed': kind === 'card' ? String((ctx.state.bg || null) === c.value) : null,
            onclick: () => {
              if (kind === 'card') {
                ctx.save({ bg: paintCard(c.value) });
                closePalette();
                return;
              }
              setColour(kind, c.value);
              if (c.value) (kind === 'fg' ? fgBar : bgBar).style.background = c.value;
              closePalette();
            },
          }, kind === 'fg' ? 'A' : ''));
          sw.style.setProperty('--sw', c.value || c.show || '#fff');
          return sw;
        }),
      );
      main.hidden = true;
      palette.hidden = false;
    };
    const closePalette = () => { palette.hidden = true; main.hidden = false; };

    const tools = h('div', { class: 'text-tools' }, main, palette);
    // In a narrow tool the bar scrolls sideways; let a mouse wheel do that too.
    tools.addEventListener('wheel', (e) => {
      if (tools.scrollWidth <= tools.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      tools.scrollLeft += e.deltaY;
    }, { passive: false });

    // Shows which styles are on where the caret is.
    const updateState = () => {
      if (!selectionInEditor()) return;
      for (const [cmd, el] of Object.entries(toggles)) {
        let on = false;
        try { on = document.queryCommandState(cmd); } catch (err) { /* ignore */ }
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };
    const onSelection = () => {
      const sel = selectionInEditor();
      if (!sel) return;
      lastRange = sel.getRangeAt(0).cloneRange();
      updateState();
    };
    document.addEventListener('selectionchange', onSelection);

    // ---- Keys: the same shortcuts in every browser, Tab to indent a list ----
    editor.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      const mod = (e.ctrlKey || e.metaKey) && !e.altKey;
      const k = e.key.toLowerCase();
      if (mod && !e.shiftKey && (k === 'b' || k === 'i' || k === 'u')) {
        e.preventDefault();
        run({ b: 'bold', i: 'italic', u: 'underline' }[k]);
      } else if (e.key === 'Tab') {
        const sel = selectionInEditor();
        const node = sel?.anchorNode;
        const li = (node?.nodeType === 1 ? node : node?.parentElement)?.closest('li');
        if (li && editor.contains(li)) {
          e.preventDefault();
          run(e.shiftKey ? 'outdent' : 'indent');
        }
      } else if (e.key === 'Escape' && !palette.hidden) {
        closePalette();
      }
    });

    body.append(h('div', { class: 'text-wrap' }, editor, tools));
    return {
      destroy() {
        document.removeEventListener('selectionchange', onSelection);
        commit();
      },
    };
  },
};
