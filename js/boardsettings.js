// Board settings: the board's name and background (colour, library image or upload).
// Opened from the board name (top left) and from the 🎨 button.
import * as store from './store.js';
import * as images from './images.js';
import { h, openModal, toast, confirmButton } from './ui.js';
import { BACKGROUNDS, backgroundCss, imageKind, libraryItem } from './backgrounds.js';
import { LIBRARY, CATEGORIES } from './library.js';

let hooks = { saveBoard: () => {}, applyBackground: () => {}, updateBoardBar: () => {} };
let libCategory = 'all';

export function initBoardSettings(h0) { hooks = { ...hooks, ...h0 }; }

function tabFor(bg) {
  const k = imageKind(bg || '');
  return k ? (k.kind === 'lib' ? 'library' : 'upload') : 'colours';
}

export function openBoardSettings(focus = 'name') {
  const board = store.getBoard();
  if (!board) return;
  let tab = tabFor(board.background);

  openModal('Board settings', (body) => {
    // ---- Name ----
    const nameInput = h('input', { type: 'text', class: 'input', value: board.name, maxlength: 80, 'aria-label': 'Board name' });
    const nameForm = h('form', { class: 'row gap' }, nameInput, h('button', { class: 'btn primary', type: 'submit' }, 'Save'));
    const saveName = () => {
      const v = nameInput.value.trim();
      if (v && v !== store.getBoard()?.name) { store.renameBoard(board.id, v); hooks.updateBoardBar(); }
    };
    nameForm.addEventListener('submit', (e) => { e.preventDefault(); saveName(); toast('Name saved'); });
    nameInput.addEventListener('blur', saveName);

    // ---- Background ----
    const tabs = h('div', { class: 'seg bg-tabs', role: 'tablist' });
    const pane = h('div', { class: 'bg-pane' });
    const dimRow = h('div', { class: 'bg-dim' });
    const credit = h('p', { class: 'bg-credit muted small' });

    const set = (fields) => {
      hooks.saveBoard((b) => Object.assign(b, fields));
      hooks.applyBackground();
      refresh();
    };

    function renderTabs() {
      tabs.replaceChildren(...[['colours', 'Colours'], ['library', 'Library'], ['upload', 'Upload']].map(([id, label]) =>
        h('button', { class: 'seg-btn' + (tab === id ? ' active' : ''), role: 'tab', 'aria-selected': String(tab === id),
          onclick: () => { tab = id; refresh(); } }, label)));
    }

    function coloursPane() {
      const cur = store.getBoard().background || 'navy';
      const grid = h('div', { class: 'bg-grid' });
      BACKGROUNDS.forEach((b) => grid.append(h('button', {
        class: 'bg-swatch' + (cur === b.id ? ' selected' : ''), style: { background: b.css }, title: b.label,
        onclick: () => set({ background: b.id, bgLum: null }),
      }, h('span', {}, b.label))));
      const picker = h('input', { type: 'color', value: cur.startsWith('custom:') ? cur.slice(7) : '#3a6ea5' });
      picker.addEventListener('input', () => {
        hooks.saveBoard((bd) => { bd.background = 'custom:' + picker.value; bd.bgLum = null; });
        hooks.applyBackground();
      });
      picker.addEventListener('change', refresh);
      return [grid, h('label', { class: 'row gap' }, 'Custom colour ', picker)];
    }

    function libraryPane() {
      if (!LIBRARY.length) return [h('p', { class: 'muted' }, 'No library images yet.')];
      const cur = store.getBoard().background;
      const chips = h('div', { class: 'row gap wrap' },
        ...[{ id: 'all', label: 'All', zh: '全部' }, ...CATEGORIES].map((c) => h('button', {
          class: 'chip' + (libCategory === c.id ? ' active' : ''),
          onclick: () => { libCategory = c.id; refresh(); },
        }, `${c.label} · ${c.zh}`)));
      const shown = LIBRARY.filter((x) => libCategory === 'all' || x.category === libCategory);
      const grid = h('div', { class: 'bg-grid images' }, ...shown.map((x) => h('button', {
        class: 'bg-swatch img' + (cur === 'lib:' + x.id ? ' selected' : ''),
        title: `${x.title}${x.creator ? ' — ' + x.creator : ''}`,
        'aria-label': x.title,
        onclick: () => set({ background: 'lib:' + x.id, bgLum: x.lum }),
      }, h('img', { src: `backgrounds/thumbs/${x.id}.webp`, alt: '', loading: 'lazy' }))));
      return [chips, grid];
    }

    function uploadPane() {
      const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
      const status = h('span', { class: 'muted small' });
      const upBtn = h('button', { class: 'btn primary', onclick: () => fileInput.click() }, '⬆ Upload an image');
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fileInput.value = '';
        if (!file) return;
        upBtn.disabled = true;
        status.textContent = 'Preparing image…';
        try {
          const { id, lum } = await images.add(file);
          await images.fullUrl(id);
          set({ background: 'upload:' + id, bgLum: lum });
          toast('Background set');
        } catch (err) {
          toast(err.message || 'Could not use that image', 4500);
          status.textContent = '';
          upBtn.disabled = false;
        }
      });
      const grid = h('div', { class: 'bg-grid images' });
      const cur = store.getBoard().background;
      images.list().then((items) => {
        if (!items.length) { grid.replaceWith(h('p', { class: 'muted small' }, 'Images you upload appear here, so you can use them on other boards too.')); return; }
        const used = usedUploads();
        grid.replaceChildren(...items.map((it) => {
          const pick = h('button', {
            class: 'bg-swatch img' + (cur === 'upload:' + it.id ? ' selected' : ''), title: it.name,
            onclick: async () => { await images.fullUrl(it.id); set({ background: 'upload:' + it.id, bgLum: it.lum }); },
          }, h('img', { src: images.cachedThumbUrl(it.id), alt: it.name }));
          const n = used.get(it.id) || 0;
          const del = confirmButton('✕', n ? `In use on ${n}. Delete?` : 'Delete?', async () => {
            await images.remove(it.id);
            if (store.getBoard().background === 'upload:' + it.id) set({ background: 'navy', bgLum: null });
            else refresh();
          }, 'chip danger bg-del');
          del.title = 'Delete this image from this computer';
          return h('div', { class: 'bg-upload-item' }, pick, del);
        }));
      }).catch(() => grid.replaceWith(h('p', { class: 'error' }, 'This browser’s image storage is not available.')));
      return [
        h('div', { class: 'row gap wrap' }, upBtn, status, fileInput),
        h('p', { class: 'muted small' }, 'Uploaded images stay on this computer. They are included in a full backup (⚙️), but not in ⬇ Share files, where the board falls back to a plain colour.'),
        grid,
      ];
    }

    function renderDim() {
      const b = store.getBoard();
      const k = imageKind(b.background || '');
      if (dimRow.parentElement) dimRow.parentElement.hidden = !k;
      credit.hidden = !k || k.kind !== 'lib';
      if (!k) return;
      const range = h('input', { type: 'range', min: -60, max: 60, step: 5, value: b.bgDim || 0, 'aria-label': 'Image brightness' });
      range.addEventListener('input', () => {
        hooks.saveBoard((bd) => { bd.bgDim = Number(range.value); });
        hooks.applyBackground();
      });
      dimRow.replaceChildren(
        h('span', { class: 'small muted' }, 'Lighter'), range, h('span', { class: 'small muted' }, 'Darker'),
        h('button', { class: 'link-btn', onclick: () => { range.value = 0; range.dispatchEvent(new Event('input')); } }, 'Reset'),
      );
      if (k.kind === 'lib') {
        const x = libraryItem(k.id);
        credit.replaceChildren(...(x ? [
          `${x.title}${x.creator ? ', ' + x.creator : ''} · ${x.source} · ${x.license} `,
          x.url ? h('a', { href: x.url, target: '_blank', rel: 'noopener' }, 'Source') : null,
        ] : []));
      }
    }

    function refresh() {
      renderTabs();
      pane.replaceChildren(...(tab === 'colours' ? coloursPane() : tab === 'library' ? libraryPane() : uploadPane()));
      renderDim();
    }

    const bgSection = h('section', { class: 'panel bg-section' },
      h('h3', {}, 'Background'), tabs, pane,
      h('div', { class: 'bg-adjust' }, h('span', { class: 'small' }, 'Image brightness'), dimRow), credit);
    body.append(
      h('section', { class: 'panel' }, h('h3', {}, 'Name'), nameForm),
      bgSection,
    );
    refresh();
    setTimeout(() => {
      if (focus === 'name') { nameInput.focus(); nameInput.select(); } else bgSection.scrollIntoView({ block: 'start' });
    }, 30);
  });
}

// upload id -> number of boards using it
function usedUploads() {
  const m = new Map();
  store.listBoards().forEach((b) => {
    const k = imageKind(b.background || '');
    if (k?.kind === 'upload') m.set(k.id, (m.get(k.id) || 0) + 1);
  });
  return m;
}

