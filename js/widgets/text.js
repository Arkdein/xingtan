import { h, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import { cleanHtml, textToHtml, safeColour } from '../richtext.js';
import { t, locale } from '../i18n.js';
import * as posts from '../textposts.js';

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
const UNDO_DELETE_MS = 8000;
const FIND_FROM = 7; // show the Find box once there are this many posts

const lines = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
const titleOf = (p) => lines(p.text)[0] || '';

// “12:30” today, “5 Nov” this year, “5 Nov 2025” before that.
function when(iso) {
  const d = new Date(iso || 0);
  if (!+d) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const opts = { day: 'numeric', month: 'short', ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) };
  return d.toLocaleDateString(locale(), opts);
}

export default {
  type: 'text',
  title: 'Text',
  icon: 'align-left',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 460, h: 280 },
  minSize: { w: 200, h: 140 },

  // Each Text tool shows one saved post (see textposts.js), or the list of
  // saved posts to choose from. Posts are saved as the teacher types and stay
  // in the list when the tool is closed; they are deleted from the list.
  mount(body, ctx) {
    const widgetId = ctx.el.dataset.id;
    const boardId = () => ctx.store.getBoard()?.id;
    const wrap = h('div', { class: 'text-wrap' });
    body.append(wrap);
    posts.all(); // adds Text tools from before saved posts to the list, the first time

    let cur = null;     // the post open in this tool
    let view = null;    // { flush(), destroy() } of the editor while a post is open
    let query = '';

    // The post this tool showed last time, as it is in the list now.
    const st = ctx.state;
    const carried = (id) => ({ id, html: st.html != null ? st.html : textToHtml(st.text || ''), text: st.text || '', size: st.size, bg: st.bg });
    function resolve(id) {
      const saved = posts.byId(id);
      if (saved) return { ...saved };
      if (posts.wasDeleted(id)) return null; // deleted from the list (perhaps on another board)
      const post = carried(id);
      return posts.adopt(post) ? { ...posts.byId(id) } : post; // from a shared board file, or not typed in yet
    }
    let start = null;
    if ('postId' in st) start = st.postId ? resolve(st.postId) : null;
    else if (st.html || st.text) start = resolve(posts.legacyId(boardId(), widgetId)); // a Text tool from before saved posts
    else start = posts.all().length ? null : posts.blank(); // a new tool: straight to a new post if there are none yet

    // When minimised, the chip shows the first line of the post instead of “Text”.
    const updateChip = () => ctx.setMiniLabel?.(cur ? titleOf(cur).slice(0, 80) : '');

    // Posts open in other Text tools on this board can't be opened or deleted here.
    const openElsewhere = () => new Set((ctx.store.getBoard()?.widgets || [])
      .filter((w) => w.type === 'text' && w.id !== widgetId)
      .map((w) => posts.postIdOf(boardId(), w)).filter(Boolean));

    // Leaves the open post. One that was never typed in (or was emptied) isn't kept.
    function leavePost() {
      if (!cur) return;
      view?.flush();
      view?.destroy();
      view = null;
      if (posts.isBlank(cur)) posts.discard(cur.id);
      cur = null;
    }

    function openPost(post) {
      leavePost();
      cur = { size: 32, bg: null, ...post };
      ctx.save({ postId: cur.id, html: cur.html, text: cur.text, size: cur.size, bg: cur.bg || null });
      view = buildEditor();
      updateChip();
      posts.notify();
    }

    // ================= Saved posts =================
    const countEl = h('span', { class: 'tp-count' });
    const findBox = h('input', { class: 'tp-find', type: 'search', placeholder: t('Find a post'), 'aria-label': t('Find a post') });
    findBox.addEventListener('input', () => { query = findBox.value.trim().toLowerCase(); renderList(); });
    const listEl = h('div', { class: 'tp-list', role: 'list', 'aria-label': t('Saved posts') });
    const noMatch = h('p', { class: 'tp-none' }, t('No posts match'));
    const listEmpty = h('div', { class: 'empty-state tp-empty' },
      h('span', { class: 'tool-tile tone-content tp-empty-tile' }, icon('align-left')),
      h('p', {}, t('No saved posts yet')),
      h('p', { class: 'tp-hint' }, t('Posts are saved as you type and kept when you close the tool. Every board can use them.')),
      h('button', { class: 'btn primary with-icon', onclick: () => openPost(posts.blank()) }, icon('plus'), t('New post')),
    );
    const listView = h('div', { class: 'tp-view' },
      h('div', { class: 'tp-bar' },
        countEl,
        findBox,
        h('button', { class: 'btn small primary with-icon', onclick: () => openPost(posts.blank()) }, icon('plus'), t('New post')),
      ),
      listEl, noMatch, listEmpty,
    );

    function showList() {
      leavePost();
      ctx.save({ postId: null, html: '', text: '', size: undefined, bg: undefined });
      updateChip();
      ctx.el.classList.remove('text-card');
      wrap.replaceChildren(listView);
      renderList();
      posts.notify();
    }

    function renderList() {
      if (cur) return;
      const all = posts.all();
      const busy = openElsewhere();
      const shown = query ? all.filter((p) => String(p.text || '').toLowerCase().includes(query)) : all;
      countEl.textContent = !all.length ? '' : all.length === 1 ? t('1 post') : t('{n} posts', { n: all.length });
      findBox.hidden = all.length < FIND_FROM && !query;
      listEmpty.hidden = all.length > 0;
      listEl.hidden = !shown.length;
      noMatch.hidden = !all.length || shown.length > 0;
      listEl.replaceChildren(...shown.map((p) => rowFor(p, busy.has(p.id))));
    }

    function rowFor(p, busy) {
      const title = titleOf(p) || t('Untitled post');
      const rest = lines(p.text).slice(1).join(' · ');
      const open = h('button', {
        class: 'tp-open', disabled: busy, title: busy ? t('Open in another Text tool on this board') : title,
        onclick: () => openPost({ ...p }),
      },
      h('span', { class: 'tp-title' }, title),
      rest ? h('span', { class: 'tp-snippet' }, rest) : null,
      h('span', { class: 'tp-when' }, busy ? t('Open in another Text tool on this board') : t('Edited {when}', { when: when(p.updatedAt) })));
      const row = h('div', { class: 'tp-row' + (busy ? ' busy' : ''), role: 'listitem', 'data-id': p.id }, open,
        h('div', { class: 'tp-actions' },
          h('button', { class: 'icon-btn small', title: t('Make a copy'), 'aria-label': t('Make a copy of “{name}”', { name: title }),
            onclick: () => openPost(posts.save(posts.blank({ html: p.html, text: p.text, size: p.size, bg: p.bg }))) }, icon('copy')),
          busy ? null : confirmButton(icon('trash'), icon('check'), () => removePost(p), 'icon-btn small tp-del',
            { title: t('Delete post (click twice)'), 'aria-label': t('Delete “{name}”', { name: title }) }),
        ));
      if (p.bg) row.style.setProperty('--card', p.bg);
      return row;
    }

    function removePost(p) {
      const gone = posts.remove(p.id);
      if (!gone) return;
      const others = posts.openOnOtherBoards(p.id, boardId());
      const msg = !others ? t('Post deleted')
        : others === 1 ? t('Post deleted (it was also open on 1 other board)')
          : t('Post deleted (it was also open on {n} other boards)', { n: others });
      ctx.toast(msg, UNDO_DELETE_MS, { label: t('Undo'), run: () => posts.restore(gone) });
    }

    // Keep the list up to date when posts change in another Text tool or window.
    const offPosts = posts.onChange(() => renderList());
    const offMeta = ctx.onClassesChange?.(() => renderList());

    // ================= One post =================
    function buildEditor() {
      const editor = h('div', {
        class: 'text-board',
        contenteditable: 'true',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': t('Text'),
        'data-placeholder': t(PLACEHOLDER),
        spellcheck: 'false',
      });
      editor.innerHTML = cleanHtml(cur.html || '');
      editor.style.fontSize = cur.size + 'px';

      // ---- Card colour (each post has its own) ----
      const paintCard = (value) => {
        const ok = CARD_VALUES.has(value) ? value : null; // only colours from the list, even from a shared file
        ctx.el.classList.toggle('text-card', !!ok);
        if (ok) ctx.el.style.setProperty('--text-card', ok);
        else ctx.el.style.removeProperty('--text-card');
        return ok;
      };
      paintCard(cur.bg);

      const isEmpty = () => !editor.textContent.trim() && !editor.querySelector('li');
      const refreshEmpty = () => editor.classList.toggle('is-empty', isEmpty());
      refreshEmpty();

      // ---- Saving (waits while a pinyin word is still being chosen) ----
      let timer;
      let closed = false; // the editor still fires blur as it leaves the screen
      const commit = () => {
        clearTimeout(timer);
        if (closed) return;
        const html = isEmpty() ? '' : cleanHtml(editor.innerHTML);
        if (html === cur.html) return; // nothing new (and nothing to write after the board was changed elsewhere)
        // `text` keeps a plain copy, for the list of posts and older copies of the app.
        persist({ html, text: html ? editor.innerText.replace(/\n{3,}/g, '\n\n').trim() : '' });
        updateChip();
      };
      const later = () => { clearTimeout(timer); timer = setTimeout(commit, 300); };

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
        const size = Math.max(14, Math.min(120, cur.size + d));
        persist({ size });
        editor.style.fontSize = size + 'px';
      };
      const sizeBtn = (label, title, d) => keepSelection(h('button', { class: 'tt-btn tt-size', title: t(title), 'aria-label': t(title), onclick: () => setSize(d) }, label));

      const main = h('div', { class: 'tt-row' },
        btn('books', 'All posts', () => showList()),
        h('span', { class: 'tt-sep' }),
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
              'aria-pressed': kind === 'card' ? String((cur.bg || null) === c.value) : null,
              onclick: () => {
                if (kind === 'card') {
                  persist({ bg: paintCard(c.value) });
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

      wrap.replaceChildren(editor, tools);
      return {
        flush: commit,
        destroy() {
          clearTimeout(timer);
          closed = true;
          document.removeEventListener('selectionchange', onSelection);
        },
      };
    }

    // Saves a change to the open post: on the board (so a shared board file or
    // Undo carries it) and in the list of saved posts once it has some text.
    function persist(patch) {
      Object.assign(cur, patch);
      ctx.save({ postId: cur.id, html: cur.html, text: cur.text, size: cur.size, bg: cur.bg || null });
      if (!posts.isBlank(cur) || posts.byId(cur.id)) {
        const saved = posts.save(cur);
        cur.updatedAt = saved.updatedAt;
      }
    }

    if (start) openPost(start); else showList();

    return {
      destroy() {
        offPosts();
        offMeta?.();
        // Closing the tool keeps the post (a post is deleted from the list).
        if (cur) {
          view?.flush();
          view?.destroy();
          if (posts.isBlank(cur)) posts.discard(cur.id);
        }
      },
    };
  },
};
