// Saved on this board: for tools whose work belongs to one lesson or class
// (Lesson flow, Organiser, Thinking routine, Whiteboard). Each board keeps a
// list of what these tools held, so closing a tool no longer loses it.
//
// withSavedItems(tool, opts) wraps a tool without changing it. The tool keeps
// working on its own state (ctx.state) as before; the wrapper:
// - opens to the list of items saved on this board (newest first), with
//   + New, Rename, a copy, and Delete (click twice, with Undo);
// - copies the tool's state into the list as the teacher works (a moment after
//   each change, and when the tool is closed or goes back to the list);
// - keeps the item when the tool is closed, and drops one that was left blank;
// - adds a “Saved on this board” button to the tool's title bar.
//
// The list lives on the board (board.toolData[type].items), so it goes with
// copies of the board, backups and shared board files (cleaned by the tool's
// own `share` when it has one). The open item's id is kept in the tool's state
// as `itemId`.
//
//   opts.isBlank(state)   nothing worth keeping
//   opts.describe(state)  { title, kind, sub } for the list: kind is the sort of
//                         item (such as “T-chart”), shown when the title is something else
//   opts.reuse(state)     the state for “Make a copy” (or “Use again”)
//   opts.reuseLabel       'Make a copy' (default) or another English label
//
// Inside the tool, ctx.startNew() keeps the open item and starts a new one
// from the same set-up (the Thinking routine's New routine button uses it).
import { h, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import { t, locale } from '../i18n.js';

const SYNC_MS = 500;
const UNDO_DELETE_MS = 8000;
const FIND_FROM = 7;

const clone = (x) => JSON.parse(JSON.stringify(x ?? null));
const withoutId = (st) => { const c = clone(st) || {}; delete c.itemId; return c; };

// “12:30” today, “5 Nov” this year, “5 Nov 2025” before that.
export function when(iso) {
  const d = new Date(iso || 0);
  if (!+d) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const opts = { day: 'numeric', month: 'short', ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) };
  return d.toLocaleDateString(locale(), opts);
}

export function withSavedItems(tool, opts) {
  const isBlank = (st) => { try { return !!opts.isBlank(st || {}); } catch (err) { return true; } };
  const describe = (st) => { try { return opts.describe(st || {}) || {}; } catch (err) { return {}; } };
  const reuse = opts.reuse || ((st) => st);
  const reuseLabel = opts.reuseLabel || 'Make a copy';

  return {
    ...tool,
    // Shared board files: the tool's own cleaner, keeping which item is open.
    ...(tool.share ? { share: (st) => ({ ...tool.share(st), ...(st.itemId ? { itemId: st.itemId } : {}) }) } : {}),
    // Used by store.exportBoard to clean the saved list the same way.
    shareItem: tool.share ? (st) => tool.share(st) : null,
    isBlankItem: isBlank,

    mount(body, ctx) {
      const toolName = () => t(tool.title);
      const widgetId = ctx.el.dataset.id;
      let inner = null;      // the tool itself, while an item is open
      let offs = [];         // its listeners, removed when it closes
      let syncTimer = null;
      let query = '';
      let renaming = null;   // id of the item being renamed

      const items = () => (Array.isArray(ctx.boardData.items) ? ctx.boardData.items : []);
      const byId = (id) => items().find((x) => x.id === id) || null;
      const setItems = (list) => ctx.saveBoardData({ items: list });

      // ---- Keeping the list up to date ----
      function syncNow() {
        clearTimeout(syncTimer);
        syncTimer = null;
        const id = ctx.state.itemId;
        if (!id) return;
        const have = byId(id);
        if (isBlank(ctx.state) && !have) return; // not worth keeping (yet)
        const now = new Date().toISOString();
        const item = { id, name: have?.name || '', createdAt: have?.createdAt || now, updatedAt: now, state: withoutId(ctx.state) };
        setItems(have ? items().map((x) => (x.id === id ? item : x)) : [...items(), item]);
      }
      const syncSoon = () => { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, SYNC_MS); };

      // The tool sees the same ctx, except that its changes are copied to the list.
      const track = (off) => { if (typeof off === 'function') offs.push(off); return off; };
      const innerCtx = Object.create(ctx, {
        save: { value: (patch) => { ctx.save(patch); syncSoon(); } },
        onMinimize: { value: (fn) => track(ctx.onMinimize(fn)) },
        onClassesChange: { value: (fn) => track(ctx.onClassesChange(fn)) },
        // For a tool's own “start again” button: keeps this item in the list and
        // opens a new one from the same set-up (opts.reuse).
        startNew: { value: () => newItem(withoutId(reuse(clone(ctx.state)))) },
      });

      // Replaces the tool's state (the same object the board keeps).
      function setState(next) {
        const s = ctx.state;
        Object.keys(s).forEach((k) => { delete s[k]; });
        Object.assign(s, clone(next));
        ctx.save({});
      }

      // ---- Title-bar button ----
      const listBtn = h('button', {
        class: 'widget-close widget-saved', title: t('Saved on this board'), 'aria-label': t('Saved on this board'),
        onclick: () => showList(),
      }, icon('books'));
      ctx.el.querySelector('.widget-head-btns')?.prepend(listBtn);

      // ---- Opening and leaving an item ----
      function closeInner() {
        if (!inner) return;
        try { inner.destroy?.(); } catch (err) { console.warn(err); }
        offs.forEach((off) => { try { off(); } catch (err) { /* ignore */ } });
        offs = [];
        inner = null;
        syncNow();
        const id = ctx.state.itemId;
        if (id && isBlank(ctx.state) && byId(id)) setItems(items().filter((x) => x.id !== id));
        ctx.setMiniControls?.();
        ctx.setMiniLabel?.('');
        ctx.setTitle?.('');
      }

      function openItem(id, state) {
        closeInner();
        setState({ ...(state || {}), itemId: id });
        body.replaceChildren();
        listBtn.hidden = false;
        try {
          inner = tool.mount(body, innerCtx) || {};
        } catch (err) {
          console.error(err);
          body.append(h('p', { class: 'error' }, t('This tool failed to load.')));
          inner = {};
        }
        syncSoon();
      }

      const newItem = (state = {}) => openItem(ctx.store.uid(), state);

      // ---- The list ----
      const countEl = h('span', { class: 'tp-count' });
      const findBox = h('input', { class: 'tp-find', type: 'search', placeholder: t('Find'), 'aria-label': t('Find') });
      findBox.addEventListener('input', () => { query = findBox.value.trim().toLowerCase(); renderList(); });
      const listEl = h('div', { class: 'tp-list', role: 'list', 'aria-label': t('Saved on this board') });
      const noMatch = h('p', { class: 'tp-none' }, t('Nothing matches'));
      const newBtn = () => h('button', { class: 'btn small primary with-icon', onclick: () => newItem() }, icon('plus'), t('New'));
      const listEmpty = h('div', { class: 'empty-state tp-empty' },
        h('span', { class: `tool-tile tone-${tool.tone || 'content'} tp-empty-tile` }, icon(tool.icon)),
        h('p', {}, t('Nothing saved on this board yet')),
        h('p', { class: 'tp-hint' }, t('Your work is saved as you go and stays on this board when you close the tool.')),
        h('button', { class: 'btn primary with-icon', onclick: () => newItem() }, icon('plus'), t('New')),
      );
      const listView = h('div', { class: 'tp-view sv-view' },
        h('div', { class: 'tp-bar' }, countEl, findBox, newBtn()),
        listEl, noMatch, listEmpty);

      function showList() {
        closeInner();
        setState({});
        listBtn.hidden = true;
        body.replaceChildren(listView);
        renderList();
      }

      // Items open in another tool of this kind on this board.
      const openElsewhere = () => new Set((ctx.store.getBoard()?.widgets || [])
        .filter((w) => w.type === tool.type && w.id !== widgetId && w.state?.itemId)
        .map((w) => w.state.itemId));

      const titleOf = (it) => { const d = describe(it.state); return it.name || d.title || d.kind || t('Untitled'); };

      function renderList() {
        if (inner) return;
        const all = [...items()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const busy = openElsewhere();
        const shown = query ? all.filter((it) => { const d = describe(it.state); return `${titleOf(it)} ${d.kind || ''} ${d.sub || ''}`.toLowerCase().includes(query); }) : all;
        countEl.textContent = !all.length ? '' : t('{n} saved', { n: all.length });
        findBox.hidden = all.length < FIND_FROM && !query;
        listEmpty.hidden = all.length > 0;
        listEl.hidden = !shown.length;
        noMatch.hidden = !all.length || shown.length > 0;
        listEl.replaceChildren(...shown.map((it) => rowFor(it, busy.has(it.id))));
        if (renaming) listEl.querySelector('.sv-rename')?.focus();
      }

      function rowFor(it, busy) {
        const title = titleOf(it);
        const d = describe(it.state);
        const info = busy ? t('Open in another tool on this board')
          : [d.kind !== title ? d.kind : '', d.sub, t('Edited {when}', { when: when(it.updatedAt) })].filter(Boolean).join(' · ');
        let main;
        if (renaming === it.id) {
          const input = h('input', { class: 'input sv-rename', value: it.name || describe(it.state).title || '', 'aria-label': t('Item name'), placeholder: t('Item name') });
          const done = (keep) => {
            if (renaming !== it.id) return;
            renaming = null;
            if (keep) setItems(items().map((x) => (x.id === it.id ? { ...x, name: input.value.trim() } : x)));
            renderList();
          };
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); done(true); }
            if (e.key === 'Escape') { e.preventDefault(); done(false); }
          });
          input.addEventListener('blur', () => done(true));
          main = h('div', { class: 'tp-open sv-renaming' }, input, h('span', { class: 'tp-when' }, info));
        } else {
          main = h('button', {
            class: 'tp-open', disabled: busy, title: busy ? info : title,
            onclick: () => openItem(it.id, it.state),
          }, h('span', { class: 'tp-title' }, title), h('span', { class: 'tp-when' }, info));
        }
        return h('div', { class: 'tp-row' + (busy ? ' busy' : ''), role: 'listitem', 'data-id': it.id }, main,
          h('div', { class: 'tp-actions' },
            h('button', { class: 'icon-btn small', title: t('Rename'), 'aria-label': t('Rename “{name}”', { name: title }),
              onclick: () => { renaming = it.id; renderList(); } }, icon('pencil')),
            h('button', { class: 'icon-btn small', title: t(reuseLabel), 'aria-label': `${t(reuseLabel)}: ${title}`,
              onclick: () => copyItem(it) }, icon('copy')),
            busy ? null : confirmButton(icon('trash'), icon('check'), () => removeItem(it), 'icon-btn small tp-del',
              { title: t('Delete (click twice)'), 'aria-label': t('Delete “{name}”', { name: title }) }),
          ));
      }

      function copyItem(it) {
        const id = ctx.store.uid();
        const now = new Date().toISOString();
        const state = withoutId(reuse(clone(it.state)));
        setItems([...items(), { id, name: t('{name} (copy)', { name: titleOf(it) }), createdAt: now, updatedAt: now, state }]);
        openItem(id, state);
      }

      function removeItem(it) {
        const list = items();
        const at = list.findIndex((x) => x.id === it.id);
        if (at < 0) return;
        setItems(list.filter((x) => x.id !== it.id));
        renderList();
        ctx.toast(t('{tool} deleted', { tool: toolName() }), UNDO_DELETE_MS, {
          label: t('Undo'),
          // Once Undo has gone, the tool finishes with it (a routine's Google Form stops taking answers).
          onExpire: () => { try { tool.closed?.(it.state); } catch (err) { console.warn(err); } },
          run: () => {
            if (byId(it.id)) return;
            const now = items();
            setItems([...now.slice(0, at), it, ...now.slice(at)]);
            renderList();
          },
        });
      }

      // Another tool of this kind on this board changed the list.
      const offList = ctx.onBoardDataChange(() => renderList());

      // ---- What to show first ----
      const st = ctx.state;
      if (st.itemId) {
        openItem(st.itemId, withoutId(st)); // what the tool showed last time (adds it to the list again if needed)
      } else if (!isBlank(st)) {
        newItem(withoutId(st)); // a tool from before saved items: its work becomes the first item
      } else if (items().length) {
        showList();
      } else {
        newItem(); // nothing saved yet: straight to work
      }

      return {
        destroy() {
          // Closing the tool keeps the item on the board (it is deleted from the list).
          if (inner) {
            try { inner.destroy?.(); } catch (err) { console.warn(err); }
            offs.forEach((off) => { try { off(); } catch (err) { /* ignore */ } });
            inner = null;
            syncNow();
            const id = ctx.state.itemId;
            if (id && isBlank(ctx.state) && byId(id)) setItems(items().filter((x) => x.id !== id));
          }
          clearTimeout(syncTimer);
          offList?.();
        },
      };
    },
  };
}
