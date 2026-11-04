// Share link (分享链接): a large QR code and the address of a web page, so
// students can open it on their own devices (a Padlet, a Google Form, a Slido,
// a reading…). Each board keeps a list of its links (ctx.boardData), so they
// come back when the tool is added again. The QR code is made in the browser.
import { h, put, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';

// Turns what the teacher typed into a web address, or null if it isn't one.
export function toUrl(text) {
  let t = (text || '').trim();
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = 'https://' + t;
  try {
    const u = new URL(t);
    if (!/^(https?|mailto|tel):$/.test(u.protocol)) return null;
    if (/^https?:$/.test(u.protocol) && !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch (err) { return null; }
}

// The address as students would type it: no https:// and no trailing slash.
const shown = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

function qrEl(url) {
  if (!window.qrcode) return h('p', { class: 'muted' }, url);
  // Type 0 picks the smallest code that holds the address.
  const qr = window.qrcode(0, url.length > 300 ? 'L' : 'M');
  qr.addData(url);
  qr.make();
  return h('div', { class: 'sl-qr-img', html: qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }) });
}

export default {
  type: 'sharelink',
  title: 'Share link',
  icon: 'qrcode',
  tone: 'content', // dock tile colour: time | people | signal | content | language
  size: { w: 460, h: 520 },
  minSize: { w: 260, h: 280 },

  mount(body, ctx) {
    const links = () => (Array.isArray(ctx.boardData.links) ? ctx.boardData.links : []);
    const saveLinks = (list) => ctx.saveBoardData({ links: list });
    const current = () => links().find((l) => l.id === ctx.state.linkId) || null;
    if (!current() && links().length) ctx.save({ linkId: links()[0].id });

    const root = h('div', { class: 'sl' });
    body.append(root);

    function editLink(existing = null) {
      openModal(existing ? 'Edit link · 编辑链接' : 'Add a link · 添加链接', (mb) => {
        const url = h('input', { class: 'input', type: 'url', value: existing?.url || '', placeholder: 'Paste a web address, e.g. padlet.com/… or forms.gle/…', inputmode: 'url' });
        const label = h('input', { class: 'input', type: 'text', value: existing?.label || '', maxlength: 80, placeholder: 'e.g. Exit ticket 课后反思 (optional)' });
        const err = h('p', { class: 'yt-form-error', role: 'alert' });
        const save = () => {
          const u = toUrl(url.value);
          if (!u) { err.textContent = 'That doesn’t look like a web address. Copy it from the browser’s address bar.'; url.focus(); return; }
          const item = { id: existing?.id || ctx.store.uid(), url: u, label: label.value.trim() };
          saveLinks(existing ? links().map((l) => (l.id === existing.id ? item : l)) : [...links(), item]);
          ctx.save({ linkId: item.id });
          closeModal();
          render();
        };
        [url, label].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); }));
        mb.append(h('div', { class: 'yt-form' },
          h('label', {}, 'Web address 网址', url),
          h('label', {}, 'Label 标题', label),
          err,
          h('p', { class: 'muted small' }, 'Long addresses make dense QR codes that are harder to scan from the back of the room. A short link (such as bit.ly) scans more easily and is easier to type.'),
          h('div', { class: 'row gap' }, h('button', { class: 'btn primary', onclick: save }, existing ? 'Save' : 'Add'), h('button', { class: 'btn', onclick: closeModal }, 'Cancel'))));
        url.focus();
      });
    }

    function bigQr(l) {
      openModal(l.label || 'Scan to open · 扫码打开', (mb) => {
        mb.append(h('div', { class: 'sl-big' }, qrEl(l.url), h('p', { class: 'sl-url big' }, shown(l.url))));
      }, { wide: true });
    }

    async function copy(l, btn) {
      try {
        await navigator.clipboard.writeText(l.url);
        put(btn, icon('check'), 'Copied');
        setTimeout(() => put(btn, icon('copy'), 'Copy'), 1500);
      } catch (err) { ctx.toast('Couldn’t copy. Select the address and copy it instead.'); }
    }

    function render() {
      const list = links();
      const l = current();
      if (!l) {
        put(root, h('div', { class: 'empty-state' },
          h('span', { class: 'tool-tile tone-content yt-empty-tile' }, icon('qrcode')),
          h('p', {}, 'Show a web page as a big QR code for students to scan.', h('br'), '用二维码分享网页。'),
          h('button', { class: 'btn primary with-icon', onclick: () => editLink() }, icon('link-plus'), 'Add a link')));
        return;
      }
      const sel = list.length > 1 ? h('select', { class: 'sl-select', 'aria-label': 'Link' }, ...list.map((x) => h('option', { value: x.id }, x.label || shown(x.url)))) : null;
      if (sel) {
        sel.value = l.id;
        sel.addEventListener('change', () => { ctx.save({ linkId: sel.value }); render(); });
      }
      const copyBtn = h('button', { class: 'btn small with-icon', onclick: () => copy(l, copyBtn) }, icon('copy'), 'Copy');
      put(root,
        h('div', { class: 'sl-bar' },
          sel || h('span'),
          h('div', { class: 'row gap' },
            h('button', { class: 'icon-btn small', title: 'Add another link', 'aria-label': 'Add another link', onclick: () => editLink() }, icon('plus')),
            h('button', { class: 'icon-btn small', title: 'Edit this link', 'aria-label': 'Edit this link', onclick: () => editLink(l) }, icon('pencil')),
            confirmButton(icon('trash'), icon('check'), () => {
              const rest = links().filter((x) => x.id !== l.id);
              saveLinks(rest);
              ctx.save({ linkId: rest[0]?.id || null });
              render();
            }, 'icon-btn small sl-del', { title: 'Remove this link (click twice)', 'aria-label': 'Remove this link' }))),
        l.label ? h('h2', { class: 'sl-label' }, l.label) : null,
        h('button', { class: 'sl-qr', title: 'Show larger', 'aria-label': 'Show the QR code larger', onclick: () => bigQr(l) }, qrEl(l.url)),
        h('p', { class: 'sl-url', title: l.url }, shown(l.url)),
        h('div', { class: 'row gap center sl-actions' },
          copyBtn,
          h('a', { class: 'btn small with-icon', href: l.url, target: '_blank', rel: 'noopener' }, icon('external-link'), 'Open')),
      );
    }

    const unsub = ctx.onBoardDataChange(render);
    render();
    return { destroy() { unsub(); } };
  },
};
