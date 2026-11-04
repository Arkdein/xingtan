import { h, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import * as images from '../images.js';
import * as pdf from '../pdf.js';

// Pictures and PDFs for the lesson: upload, drag in, paste, a web link or a camera photo.
// The list is kept on the board (ctx.boardData), so closing the tool keeps it:
//   { items: [picture | pdf] }
//   picture   { id, imageId | url, w, h, name, caption, note, ink, texts }
//   pdf       { id, kind: 'pdf', name, caption, note, pages: [{ imageId, w, h, n, ink, texts }] }
//   imageId   picture stored in this browser (images.js, use: 'tool'); PDF pages are pictures too
//   url       a web picture the site won't let us copy; shown from the web
//   ink       drawings, in a 1000-wide box: { t: 'pen' | 'hl', c: colour, p: [x, y, x, y, …] }
//   texts     typed text, in the same box: { id, x, y, s: size, c: colour, v: text }
// Nothing shows until the teacher picks a picture.

const PEN_COLOURS = ['#e0413a', '#2563eb', '#16a34a', '#1d2733'];
const HL_COLOURS = ['#fde047', '#86efac', '#f9a8d4'];
const MAX_ZOOM = 6;

const titleOf = (it) => it.caption || it.name || (it.kind === 'pdf' ? 'PDF' : 'Picture');
const firstImageId = (it) => it.imageId || it.pages?.[0]?.imageId || null;
const allImageIds = (it) => [it.imageId, ...(it.pages || []).map((p) => p.imageId)].filter(Boolean);
const hasMarks = (it) => [it, ...(it.pages || [])].some((f) => f.ink?.length || f.texts?.length);

export default {
  type: 'images',
  title: 'Images/ PDF',
  icon: 'photo',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 640, h: 480 },
  minSize: { w: 320, h: 260 },

  mount(body, ctx) {
    const items = () => (Array.isArray(ctx.boardData.items) ? ctx.boardData.items : []);
    const saveItems = (list) => ctx.saveBoardData({ items: list });
    const find = (id) => items().find((it) => it.id === id);
    const updateItem = (id, patch) => saveItems(items().map((it) => (it.id === id ? { ...it, ...patch } : it)));

    const root = h('div', { class: 'im', tabindex: '-1' });
    body.append(root);
    // Focus the tool when it is used, so paste (Ctrl+V) and arrow keys reach it.
    root.addEventListener('pointerdown', (e) => {
      if (e.defaultPrevented && e.target.closest('.im-viewport[data-mode="text"]')) return; // a new text box has focus
      if (!e.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) root.focus({ preventScroll: true });
    });

    let leaveView = null; // cleans up the viewer or camera
    function show(viewEl) {
      leaveView?.();
      leaveView = null;
      root.replaceChildren(viewEl, dropHint);
    }
    const urlOf = async (it) => (it.url ? it.url : images.fullUrl(it.imageId));

    // ================= Adding pictures =================
    const fileInput = h('input', { type: 'file', accept: 'image/*,application/pdf,.pdf', multiple: true, hidden: true });
    fileInput.addEventListener('change', () => { addFiles([...fileInput.files]); fileInput.value = ''; });
    let busy = 0;

    async function addFiles(files) {
      const pdfs = files.filter(pdf.isPdf);
      const pics = files.filter((f) => !pdf.isPdf(f) && (/^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|bmp|avif|heic)$/i.test(f.name || '')));
      if (!pics.length && !pdfs.length) { ctx.toast('Those aren’t pictures or PDFs. Use JPG, PNG, GIF, WebP or PDF.'); return; }
      busy++;
      const added = [];
      let failed = '';
      if (pics.length) ctx.toast(pics.length > 1 ? `Adding ${pics.length} pictures…` : 'Adding the picture…', 8000);
      for (const f of pics) {
        try {
          const r = await images.add(f, { use: 'tool' });
          added.push({ id: ctx.store.uid(), imageId: r.id, w: r.w, h: r.h, name: r.name, caption: '', note: '', ink: [], texts: [] });
        } catch (err) { failed = err.message; }
      }
      for (const f of pdfs) {
        try {
          const it = await addPdf(f);
          if (it) added.push(it);
        } catch (err) { failed = err.message; }
      }
      busy--;
      if (added.length) {
        saveItems([...items(), ...added]);
        await images.preloadThumbs(added.map(firstImageId).filter(Boolean));
        showList(added[0].id);
      }
      const nPics = added.filter((x) => !x.pages).length;
      const docs = added.filter((x) => x.pages);
      const done = [
        nPics ? `${nPics} picture${nPics > 1 ? 's' : ''}` : '',
        ...docs.map((d) => `“${d.name}” (${d.pages.length} page${d.pages.length > 1 ? 's' : ''})`),
      ].filter(Boolean).join(' and ');
      if (failed) ctx.toast(done ? `Added ${done}. Some couldn’t be added: ${failed}` : failed, 5000);
      else if (done) ctx.toast(`Added ${done}`);
    }

    // Each chosen page becomes a picture, sharp enough to zoom into the text.
    async function addPdf(file) {
      ctx.toast(`Opening “${file.name}”…`, 10000);
      const doc = await pdf.open(file);
      const out = [];
      try {
        const pages = doc.pages > 1 ? await askPages(doc) : [1];
        if (!pages) { ctx.toast('PDF not added'); return null; }
        for (const [k, n] of pages.entries()) {
          ctx.toast(`Adding “${doc.name}”: page ${k + 1} of ${pages.length}…`, 10000);
          const r = await images.add(await doc.page(n), { use: 'tool', maxSide: 2400 });
          out.push({ imageId: r.id, w: r.w, h: r.h, n, ink: [], texts: [] });
        }
        return { id: ctx.store.uid(), kind: 'pdf', name: doc.name, caption: '', note: '', pages: out };
      } catch (err) {
        ctx.store.freeUnusedImages(out.map((p) => p.imageId)); // a half-added PDF leaves nothing behind
        throw err;
      } finally {
        doc.close();
      }
    }

    // All pages by default; or type which ones, e.g. 1-3, 7.
    function askPages(doc) {
      return new Promise((resolve) => {
        let answered = false;
        const finish = (v) => { if (!answered) { answered = true; resolve(v); } };
        openModal('Add a PDF', (mb) => {
          const all = h('input', { type: 'radio', name: 'im-pages', checked: true });
          const some = h('input', { type: 'radio', name: 'im-pages' });
          const which = h('input', { class: 'input', placeholder: 'e.g. 1-3, 7', 'aria-label': 'Pages', inputmode: 'numeric' });
          which.addEventListener('focus', () => { some.checked = true; });
          const err = h('p', { class: 'yt-form-error', role: 'alert' });
          const form = h('form', { class: 'yt-form' },
            h('p', { class: 'im-pdf-name' }, icon('file-type-pdf'), h('strong', {}, doc.name), h('span', { class: 'muted' }, ` · ${doc.pages} pages`)),
            h('label', { class: 'yt-check' }, all, h('span', {}, `All ${doc.pages} pages`)),
            h('label', { class: 'yt-check im-some' }, some, h('span', {}, 'Only pages'), which),
            doc.pages > 30 ? h('p', { class: 'muted small' }, `Each page takes about 0.2–0.4 MB in this browser, so all ${doc.pages} pages could be around ${Math.round(doc.pages * 0.3)} MB.`) : null,
            err,
            h('div', { class: 'row gap' },
              h('button', { class: 'btn primary', type: 'submit' }, 'Add'),
              h('button', { class: 'btn', type: 'button', onclick: () => { closeModal(); finish(null); } }, 'Cancel')),
          );
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (all.checked) { closeModal(); finish(Array.from({ length: doc.pages }, (_, i) => i + 1)); return; }
            const list = pdf.parsePages(which.value, doc.pages);
            if (!list) { err.textContent = `Type pages between 1 and ${doc.pages}, like 1-3, 7.`; return; }
            closeModal();
            finish(list);
          });
          mb.append(form);
        });
        document.getElementById('modal').addEventListener('close', () => finish(null), { once: true });
      });
    }

    // A web picture: copy it if the site allows; otherwise show it from the web.
    async function addLink(text) {
      const url = text.trim();
      if (!/^(https?:|data:image\/)/i.test(url)) { ctx.toast('Paste a web address that starts with https://'); return false; }
      try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        if (res.ok && /^image\//.test(blob.type)) {
          const name = decodeURIComponent((url.split(/[?#]/)[0].split('/').pop() || 'Web picture')).slice(0, 60);
          await addFiles([new File([blob], name || 'Web picture', { type: blob.type })]);
          return true;
        }
      } catch (err) { /* the site doesn't allow copying; try showing it instead */ }
      const size = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = url;
      });
      if (!size) {
        ctx.toast('That link didn’t open as a picture. On the web page, right-click the picture → Copy image, then press Ctrl+V here.', 6000);
        return false;
      }
      const item = { id: ctx.store.uid(), url, w: size.w, h: size.h, name: 'Web picture', caption: '', note: '', ink: [] };
      saveItems([...items(), item]);
      showList(item.id);
      ctx.toast('Saved as a web link: that site doesn’t allow copying, so the picture needs the internet to show.', 6000);
      return true;
    }

    // Paste: pictures (screenshots, "Copy image") or a picture's web address.
    root.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.length) { e.preventDefault(); addFiles(files); return; }
      if (e.target.closest('input, textarea') || e.target.isContentEditable) return;
      const text = e.clipboardData?.getData('text/plain') || '';
      if (/^https?:\/\/\S+$/i.test(text.trim())) { e.preventDefault(); addLink(text); }
    });

    // Drag and drop: files from the computer, or a picture dragged from a web page.
    const dropHint = h('div', { class: 'im-drop', hidden: true }, icon('photo-plus'), h('span', {}, 'Drop to add'));
    let dragDepth = 0;
    const hasDrop = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === 'Files' || t === 'text/uri-list');
    root.addEventListener('dragenter', (e) => { if (!hasDrop(e)) return; e.preventDefault(); dragDepth++; dropHint.hidden = false; });
    root.addEventListener('dragover', (e) => { if (hasDrop(e)) e.preventDefault(); });
    root.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropHint.hidden = true; });
    root.addEventListener('drop', (e) => {
      if (!hasDrop(e)) return;
      e.preventDefault();
      dragDepth = 0;
      dropHint.hidden = true;
      const files = [...(e.dataTransfer.files || [])];
      if (files.length) { addFiles(files); return; }
      const link = (e.dataTransfer.getData('text/uri-list') || '').split('\n').find((l) => l && !l.startsWith('#'));
      if (link) addLink(link);
    });

    function addButtons() {
      const linkInput = h('input', { class: 'input', type: 'url', placeholder: 'Or paste a picture’s web address', 'aria-label': 'Picture web address' });
      const linkForm = h('form', { class: 'im-link' }, linkInput,
        h('button', { class: 'btn small', type: 'submit' }, 'Add'));
      linkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await addLink(linkInput.value)) linkInput.value = '';
      });
      return h('div', { class: 'im-add' },
        h('div', { class: 'row gap wrap center' },
          h('button', { class: 'btn primary with-icon', onclick: () => fileInput.click() }, icon('upload'), 'Upload pictures or PDFs'),
          h('button', { class: 'btn with-icon', onclick: () => showCamera() }, icon('camera'), 'Take a photo'),
        ),
        h('p', { class: 'muted small' }, 'You can also drag pictures or PDFs here, or copy a picture or screenshot and press Ctrl+V (⌘V on a Mac). Each PDF page becomes a picture you can draw and type on.'),
        linkForm,
      );
    }

    // ================= Saved list (what the board opens to) =================
    const listEl = h('div', { class: 'yt-list', role: 'list', 'aria-label': 'Pictures' });
    const countEl = h('span', { class: 'yt-count' });
    const addPanel = h('div', { class: 'im-add-panel', hidden: true });
    const addToggle = h('button', { class: 'btn small primary with-icon', 'aria-expanded': 'false' }, icon('plus'), 'Add');
    addToggle.addEventListener('click', () => {
      addPanel.hidden = !addPanel.hidden;
      addToggle.setAttribute('aria-expanded', String(!addPanel.hidden));
      if (!addPanel.hidden) addPanel.replaceChildren(addButtons());
    });
    const slideBtn = h('button', { class: 'btn small with-icon', title: 'Show the pictures in order', onclick: () => items()[0] && showViewer(items()[0].id) },
      icon('presentation'), h('span', { class: 'yt-btn-text' }, 'Slideshow'));
    const emptyEl = h('div', { class: 'empty-state im-empty' },
      h('span', { class: 'tool-tile tone-content yt-empty-tile' }, icon('photo')),
      h('p', {}, 'No pictures or PDFs on this board yet.'),
    );
    const listView = h('div', { class: 'yt-view' },
      h('div', { class: 'yt-bar' }, countEl, h('div', { class: 'row gap' }, slideBtn, addToggle)),
      addPanel,
      listEl,
      emptyEl,
      fileInput,
    );

    function showList(flashId = null) {
      renderList(flashId);
      show(listView);
    }

    function renderList(flashId = null) {
      const list = items();
      const empty = list.length === 0;
      emptyEl.hidden = !empty;
      listEl.hidden = empty;
      slideBtn.hidden = empty;
      if (empty) { emptyEl.replaceChildren(emptyEl.firstChild, emptyEl.children[1], addButtons()); addPanel.hidden = true; }
      else if (flashId) addPanel.hidden = true;
      addToggle.hidden = empty;
      addToggle.setAttribute('aria-expanded', String(!addPanel.hidden));
      countEl.textContent = empty ? '' : `${list.length} item${list.length > 1 ? 's' : ''}`;
      listEl.replaceChildren(...list.map(rowFor));
      images.preloadThumbs(list.map(firstImageId).filter(Boolean)).then((loaded) => {
        if (!loaded) return;
        listEl.querySelectorAll('img[data-image]').forEach((img) => { img.src = images.cachedThumbUrl(img.dataset.image) || ''; });
      });
      if (flashId) {
        const row = listEl.querySelector(`[data-id="${flashId}"]`);
        row?.classList.add('flash');
        row?.scrollIntoView({ block: 'nearest' });
      }
    }

    function rowFor(it) {
      const open = () => showViewer(it.id);
      const handle = h('button', { class: 'yt-handle', title: 'Drag to reorder (or use the ↑ ↓ keys)', 'aria-label': `Move “${titleOf(it)}”` }, icon('grip-vertical'));
      const thumbId = firstImageId(it);
      const thumb = h('img', { alt: '', loading: 'lazy', ...(thumbId ? { 'data-image': thumbId } : {}), src: it.url || images.cachedThumbUrl(thumbId) || '' });
      const isPdf = Array.isArray(it.pages);
      const row = h('div', { class: 'yt-row im-row', role: 'listitem', 'data-id': it.id },
        handle,
        h('button', { class: 'yt-thumb im-thumb', onclick: open, tabindex: '-1', 'aria-hidden': 'true' }, thumb,
          isPdf ? h('span', { class: 'im-pdf-tag' }, 'PDF') : null,
          hasMarks(it) ? h('span', { class: 'im-badge', title: 'Has drawing or text' }, icon('pencil')) : null),
        h('div', { class: 'yt-meta' },
          h('button', { class: 'yt-title', onclick: open, title: titleOf(it) }, titleOf(it)),
          h('div', { class: 'yt-sub' },
            isPdf ? h('span', { class: 'im-pages' }, icon('file-type-pdf'), `${it.pages.length} page${it.pages.length > 1 ? 's' : ''}`) : null,
            it.url ? h('span', { class: 'im-web', title: 'Shown from the web: needs the internet' }, icon('link'), 'web') : null,
            it.caption && it.name ? h('span', { class: 'yt-channel' }, it.name) : null),
          it.note ? h('p', { class: 'yt-note', title: it.note }, it.note) : null),
        h('div', { class: 'yt-actions' },
          h('button', { class: 'btn small primary with-icon', onclick: open }, icon('eye'), h('span', { class: 'yt-btn-text' }, 'Show')),
          h('button', { class: 'icon-btn small', title: 'Caption and note', 'aria-label': `Edit “${titleOf(it)}”`, onclick: () => editItem(it.id) }, icon('pencil')),
          confirmButton(icon('trash'), icon('check'), () => removeItem(it.id), 'icon-btn small yt-del',
            { title: 'Remove from this board (click twice)', 'aria-label': `Remove “${titleOf(it)}”` }),
        ),
      );
      dragToReorder(handle, row);
      return row;
    }

    function removeItem(id) {
      const it = find(id);
      saveItems(items().filter((x) => x.id !== id));
      if (it) ctx.store.freeUnusedImages(allImageIds(it));
      renderList();
      ctx.toast(it?.pages ? 'PDF removed from this board' : 'Picture removed from this board');
    }

    function dragToReorder(handle, row) {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        row.classList.add('lifted');
        const move = (ev) => {
          const others = [...listEl.children].filter((r) => r !== row);
          const before = others.find((r) => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
          if (before) { if (row.nextElementSibling !== before) listEl.insertBefore(row, before); }
          else if (listEl.lastElementChild !== row) listEl.append(row);
          const box = listEl.getBoundingClientRect();
          if (ev.clientY < box.top + 30) listEl.scrollTop -= 10;
          else if (ev.clientY > box.bottom - 30) listEl.scrollTop += 10;
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          row.classList.remove('lifted');
          const order = [...listEl.children].map((r) => r.dataset.id);
          if (order.join() !== items().map((x) => x.id).join()) {
            const byId = new Map(items().map((x) => [x.id, x]));
            saveItems(order.map((id) => byId.get(id)).filter(Boolean));
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      handle.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        e.stopPropagation();
        const list = [...items()];
        const i = list.findIndex((x) => x.id === row.dataset.id);
        const j = i + (e.key === 'ArrowUp' ? -1 : 1);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        saveItems(list);
        renderList();
        listEl.querySelector(`[data-id="${row.dataset.id}"] .yt-handle`)?.focus();
      });
    }

    function editItem(id, after = renderList) {
      const it = find(id);
      if (!it) return;
      openModal('Caption and note', (mb) => {
        const caption = h('input', { class: 'input', value: it.caption || '', placeholder: 'Shown under the picture, e.g. 新加坡河，1900年代', 'aria-label': 'Caption' });
        const note = h('textarea', { class: 'input yt-note-input', rows: 3, placeholder: 'e.g. Ask: what do you notice first?\n例：先问学生“你看到了什么？”', 'aria-label': 'Teacher note' });
        note.value = it.note || '';
        const form = h('form', { class: 'yt-form' },
          h('label', {}, h('span', {}, 'Caption'), caption),
          h('p', { class: 'muted small' }, 'Shown to the class, under the picture.'),
          h('label', {}, h('span', {}, 'Teacher note'), note),
          h('p', { class: 'muted small' }, 'Shown in the list only, not on the picture.'),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn primary', type: 'submit' }, 'Save'),
            h('button', { class: 'btn', type: 'button', onclick: closeModal }, 'Cancel')),
        );
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          updateItem(id, { caption: caption.value.trim(), note: note.value.trim() });
          closeModal();
          after(id);
        });
        mb.append(form);
        setTimeout(() => caption.focus(), 30);
      });
    }

    // ================= Camera / visualiser =================
    async function showCamera() {
      let stream = null;
      let alive = true;
      const video = h('video', { class: 'im-video', autoplay: true, playsinline: true, muted: true });
      const still = h('canvas', { class: 'im-video', hidden: true });
      const status = h('p', { class: 'im-cam-status' }, icon('loader-2', { cls: 'spin' }), ' Starting the camera…');
      const pick = h('select', { class: 'im-cam-pick', 'aria-label': 'Camera', hidden: true });
      const snap = h('button', { class: 'btn primary with-icon', disabled: true }, icon('camera'), 'Take photo');
      const use = h('button', { class: 'btn primary with-icon', hidden: true }, icon('check'), 'Use this photo');
      const again = h('button', { class: 'btn', hidden: true }, 'Retake');
      const view = h('div', { class: 'yt-view' },
        h('div', { class: 'yt-bar' },
          h('button', { class: 'btn small with-icon', onclick: () => showList() }, icon('arrow-left'), 'Pictures'),
          pick),
        h('div', { class: 'im-cam' }, video, still, status),
        h('div', { class: 'row gap center' }, snap, again, use),
      );
      const stop = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };

      async function start(deviceId) {
        stop();
        status.hidden = false;
        snap.disabled = true;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
          if (!alive) { stop(); return; }
          video.srcObject = stream;
          status.hidden = true;
          snap.disabled = false;
          const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
          const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
          pick.replaceChildren(...cams.map((c, i) => h('option', { value: c.deviceId }, c.label || `Camera ${i + 1}`)));
          if (current) pick.value = current;
          pick.hidden = cams.length < 2;
        } catch (err) {
          status.replaceChildren(icon('alert-triangle'), ' ', err?.name === 'NotAllowedError'
            ? 'The browser wasn’t allowed to use the camera. Allow it from the camera icon in the address bar, then try again.'
            : 'No camera was found. Plug in the visualiser or camera, then try again.');
        }
      }
      pick.addEventListener('change', () => start(pick.value));
      snap.addEventListener('click', () => {
        still.width = video.videoWidth;
        still.height = video.videoHeight;
        still.getContext('2d').drawImage(video, 0, 0);
        video.hidden = true; still.hidden = false;
        snap.hidden = true; use.hidden = false; again.hidden = false;
      });
      again.addEventListener('click', () => {
        video.hidden = false; still.hidden = true;
        snap.hidden = false; use.hidden = true; again.hidden = true;
      });
      use.addEventListener('click', () => {
        use.disabled = true;
        still.toBlob((blob) => {
          const stamp = new Date().toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
          if (blob) addFiles([new File([blob], `Photo ${stamp}`, { type: 'image/jpeg' })]);
          else { use.disabled = false; ctx.toast('The photo couldn’t be saved'); }
        }, 'image/jpeg', 0.92);
      });

      show(view);
      leaveView = () => { alive = false; stop(); };
      if (!navigator.mediaDevices?.getUserMedia) {
        status.replaceChildren(icon('alert-triangle'), ' This browser can’t use a camera here.');
        return;
      }
      start(null);
    }

    // ================= Viewer =================
    // Steps through "frames": each picture, and each page of each PDF.
    function showViewer(startId) {
      let cur = { id: startId, page: 0 }; // page: index within a PDF
      let alive = true;
      let mode = 'move';              // move | pen | hl | text | erase
      const colour = { pen: PEN_COLOURS[0], hl: HL_COLOURS[0], text: PEN_COLOURS[3] };
      let textSize = 32;              // in the 1000-wide box
      let activeText = null;          // id of the text box last edited
      let z = 1, panX = 0, panY = 0;  // zoom and pan
      let base = { w: 0, h: 0 };      // picture size at zoom 1
      const cover = { on: false, n: 3, open: new Set() };

      const frames = () => items().flatMap((it) => (Array.isArray(it.pages)
        ? it.pages.map((_, i) => ({ id: it.id, page: i })) : [{ id: it.id, page: 0 }]));
      const item = () => find(cur.id);
      const frame = () => { const it = item(); if (!it) return null; return Array.isArray(it.pages) ? it.pages[cur.page] || null : it; };
      function updateFrame(patch) {
        const it = item();
        if (!it) return;
        if (Array.isArray(it.pages)) updateItem(it.id, { pages: it.pages.map((p, i) => (i === cur.page ? { ...p, ...patch } : p)) });
        else updateItem(it.id, patch);
      }

      const img = h('img', { class: 'im-img', alt: '', draggable: 'false' });
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'im-ink');
      svg.setAttribute('preserveAspectRatio', 'none');
      const tiles = h('div', { class: 'im-tiles', hidden: true });
      const textLayer = h('div', { class: 'im-texts' });
      const layer = h('div', { class: 'im-layer' }, img, tiles, svg, textLayer);
      const prev = h('button', { class: 'im-nav prev', 'aria-label': 'Previous', title: 'Previous (←)' }, icon('chevron-left'));
      const next = h('button', { class: 'im-nav next', 'aria-label': 'Next', title: 'Next (→)' }, icon('chevron-right'));
      const viewport = h('div', { class: 'im-viewport' }, layer, prev, next);
      const loading = h('div', { class: 'im-loading' });
      const captionEl = h('p', { class: 'im-caption' });
      const counter = h('span', { class: 'im-counter' });
      const titleEl = h('span', { class: 'yt-player-title' });

      // ---- Tool bar ----
      const modeBtn = (m, ic, label) => h('button', { class: 'im-tool', 'data-mode': m, title: label, 'aria-label': label, onclick: () => setMode(m) }, icon(ic));
      const modes = [modeBtn('move', 'hand-move', 'Move and zoom'), modeBtn('pen', 'pencil', 'Pen'), modeBtn('hl', 'highlight', 'Highlighter'),
        modeBtn('text', 'typography', 'Type text: click where the text should go'), modeBtn('erase', 'eraser', 'Rub out a line or text')];
      const swatches = h('div', { class: 'im-swatches' });
      const undoBtn = h('button', { class: 'im-tool', title: 'Undo the last line', 'aria-label': 'Undo the last line', onclick: undoInk }, icon('arrow-back-up'));
      const clearBtn = confirmButton(icon('trash'), icon('check'), clearInk, 'im-tool im-clear', { title: 'Clear all drawing and text on this page (click twice)', 'aria-label': 'Clear drawing and text' });
      const coverBtn = h('button', { class: 'im-tool with-label', title: 'Cover the picture and uncover it bit by bit', onclick: toggleCover }, icon('grid-4x4'), h('span', {}, 'Reveal'));
      const gridSeg = h('div', { class: 'seg im-grid-seg', role: 'group', 'aria-label': 'Pieces', hidden: true },
        ...[2, 3, 4].map((n) => h('button', { class: 'seg-btn', 'data-n': n, onclick: () => { cover.n = n; cover.open.clear(); drawTiles(); } }, `${n}×${n}`)));
      const showAllBtn = h('button', { class: 'chip', hidden: true, onclick: () => { for (let i = 0; i < cover.n * cover.n; i++) cover.open.add(i); drawTiles(); } }, 'Show all');
      const hideAllBtn = h('button', { class: 'chip', hidden: true, onclick: () => { cover.open.clear(); drawTiles(); } }, 'Cover all');
      const zoomOut = h('button', { class: 'im-tool', title: 'Zoom out (−)', 'aria-label': 'Zoom out', onclick: () => zoomBy(1 / 1.4) }, icon('zoom-out'));
      const zoomFit = h('button', { class: 'im-tool', title: 'Fit (0)', 'aria-label': 'Fit the picture', onclick: fit }, icon('zoom-reset'));
      const zoomIn = h('button', { class: 'im-tool', title: 'Zoom in (+)', 'aria-label': 'Zoom in', onclick: () => zoomBy(1.4) }, icon('zoom-in'));
      const toolbar = h('div', { class: 'im-toolbar' },
        h('div', { class: 'im-group' }, ...modes),
        swatches,
        h('div', { class: 'im-group' }, undoBtn, clearBtn),
        h('div', { class: 'im-group' }, coverBtn, gridSeg, showAllBtn, hideAllBtn),
      );
      const fitWidth = h('button', { class: 'im-tool', title: 'Fit the width (good for tall pages); drag to move down', 'aria-label': 'Fit the width', onclick: fitToWidth }, icon('arrow-autofit-width'));
      const zoomBar = h('div', { class: 'im-zoom' }, zoomOut, zoomFit, fitWidth, zoomIn);
      const fsBtn = h('button', { class: 'icon-btn small', title: 'Full screen', 'aria-label': 'Full screen' }, icon('maximize'));
      const view = h('div', { class: 'yt-view im-viewer', tabindex: '-1' },
        h('div', { class: 'yt-bar' },
          h('button', { class: 'btn small with-icon', onclick: () => showList(cur.id) }, icon('arrow-left'), 'List'),
          titleEl,
          h('div', { class: 'row gap yt-bar-end' }, counter,
            h('button', { class: 'icon-btn small', title: 'Caption and note', 'aria-label': 'Caption and note', onclick: () => editItem(cur.id, () => { load(); }) }, icon('pencil')),
            fsBtn)),
        h('div', { class: 'im-stage' }, viewport, loading, zoomBar),
        captionEl,
        toolbar,
      );
      fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else view.requestFullscreen?.().catch(() => ctx.toast('Full screen isn’t available here'));
      });

      function setMode(m) {
        if (mode === 'text' && m !== 'text') commitTexts();
        mode = m;
        modes.forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
        viewport.dataset.mode = m;
        textLayer.querySelectorAll('.im-text-edit').forEach((ed) => { ed.contentEditable = m === 'text' ? 'true' : 'false'; });
        const palette = m === 'pen' || m === 'text' ? PEN_COLOURS : m === 'hl' ? HL_COLOURS : [];
        swatches.replaceChildren(
          ...palette.map((c) => h('button', {
            class: 'im-swatch' + (colour[m] === c ? ' active' : ''), style: { background: c }, 'aria-label': `Colour ${c}`,
            onclick: () => { colour[m] = c; if (m === 'text') styleActiveText({ c }); setMode(m); },
          })),
          ...(m === 'text' ? [
            h('button', { class: 'im-tool', title: 'Smaller text', 'aria-label': 'Smaller text', onclick: () => resizeText(-1) }, 'A−'),
            h('button', { class: 'im-tool', title: 'Bigger text', 'aria-label': 'Bigger text', onclick: () => resizeText(1) }, 'A+'),
          ] : []),
        );
        swatches.hidden = !palette.length;
      }

      // ---- Picture and layout ----
      const vh = () => { const f = frame(); return f && f.w ? Math.round(1000 * f.h / f.w) : 750; };

      async function load() {
        const it = item();
        const f = frame();
        if (!it || !f) { showList(); return; }
        const fr = frames();
        const pos = fr.findIndex((x) => x.id === cur.id && x.page === cur.page);
        const list = items();
        const idx = list.findIndex((x) => x.id === it.id);
        counter.textContent = Array.isArray(it.pages)
          ? `p. ${cur.page + 1} / ${it.pages.length}${list.length > 1 ? ` · ${idx + 1} / ${list.length}` : ''}`
          : `${idx + 1} / ${list.length}`;
        counter.title = `${pos + 1} of ${fr.length} in this board’s list`;
        prev.hidden = next.hidden = fr.length < 2;
        titleEl.textContent = titleOf(it);
        titleEl.title = titleOf(it);
        captionEl.textContent = it.caption || '';
        captionEl.hidden = !it.caption;
        cover.open.clear();
        z = 1; panX = 0; panY = 0;
        svg.setAttribute('viewBox', `0 0 1000 ${vh()}`);
        drawInk();
        drawTexts();
        drawTiles();
        loading.hidden = false;
        loading.replaceChildren(icon('loader-2', { cls: 'spin' }));
        let src = null;
        try { src = await urlOf(f); } catch (err) { src = null; }
        if (!alive || frame() !== f) return;
        if (!src) { loading.replaceChildren(icon('alert-triangle'), ' This picture is missing from this browser.'); return; }
        img.onload = () => { if (alive) { loading.hidden = true; layout(); } };
        img.onerror = () => { if (alive) loading.replaceChildren(icon('alert-triangle'), f.url ? ' This web picture couldn’t be loaded. Check the internet connection.' : ' This picture couldn’t be opened.'); };
        img.src = src;
        if (img.complete && img.naturalWidth) { loading.hidden = true; layout(); }
      }

      function layout() {
        const f = frame();
        if (!f) return;
        const W = viewport.clientWidth, H = viewport.clientHeight;
        if (!W || !H) return;
        const a = (f.w || img.naturalWidth || 4) / (f.h || img.naturalHeight || 3);
        base = W / H > a ? { w: H * a, h: H } : { w: W, h: W / a };
        const maxX = Math.max(0, (base.w * z - W) / 2), maxY = Math.max(0, (base.h * z - H) / 2);
        panX = Math.max(-maxX, Math.min(maxX, panX));
        panY = Math.max(-maxY, Math.min(maxY, panY));
        Object.assign(layer.style, {
          width: base.w * z + 'px', height: base.h * z + 'px',
          left: (W - base.w * z) / 2 + panX + 'px', top: (H - base.h * z) / 2 + panY + 'px',
        });
        viewport.classList.toggle('zoomed', z > 1.001);
        sizeTexts();
      }
      const ro = new ResizeObserver(() => layout());
      ro.observe(viewport);

      function zoomAt(newZ, px, py) {
        newZ = Math.max(1, Math.min(MAX_ZOOM, newZ));
        const W = viewport.clientWidth, H = viewport.clientHeight;
        const left = (W - base.w * z) / 2 + panX, top = (H - base.h * z) / 2 + panY;
        const fx = (px - left) / (base.w * z), fy = (py - top) / (base.h * z);
        z = newZ;
        panX = px - fx * base.w * z - (W - base.w * z) / 2;
        panY = py - fy * base.h * z - (H - base.h * z) / 2;
        if (z === 1) { panX = 0; panY = 0; }
        layout();
      }
      const zoomBy = (f) => zoomAt(z * f, viewport.clientWidth / 2, viewport.clientHeight / 2);
      function fit() { z = 1; panX = 0; panY = 0; layout(); }
      // Zooms a tall page to the full width, starting at its top.
      function fitToWidth() {
        const W = viewport.clientWidth, H = viewport.clientHeight;
        if (!base.w) return;
        z = Math.max(1, Math.min(MAX_ZOOM, W / base.w));
        panX = 0;
        panY = (base.h * z - H) / 2; // top edge; layout() clamps
        layout();
      }

      // ---- Move, zoom, draw and type with the pointer ----
      const pointers = new Map();
      let pinch = null, pan = null, stroke = null, moved = 0;
      const local = (e) => { const r = viewport.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const toInk = (e) => {
        const r = layer.getBoundingClientRect();
        return [Math.round((e.clientX - r.left) / r.width * 1000), Math.round((e.clientY - r.top) / r.height * vh())];
      };

      viewport.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.im-nav')) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const onText = e.target.closest('.im-text');
        if (onText) {
          if (mode === 'erase') { e.preventDefault(); removeText(onText.dataset.id); }
          if (mode === 'erase' || mode === 'text') return; // typing and dragging are handled by the text box
        }
        if (mode === 'text') {
          e.preventDefault();
          if (activeText && textLayer.contains(document.activeElement)) { document.activeElement.blur(); return; }
          const [x, y] = toInk(e);
          if (x < 0 || y < 0 || x > 1000 || y > vh()) return;
          addText(x, Math.max(0, y - Math.round(textSize * 0.7)));
          return;
        }
        viewport.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, local(e));
        moved = 0;
        if (pointers.size === 2) { // pinch to zoom, in any mode
          stroke?.el.remove(); stroke = null; pan = null;
          const [a, b] = [...pointers.values()];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
          return;
        }
        if (mode === 'pen' || mode === 'hl') {
          e.preventDefault();
          const el = document.createElementNS(NS, 'polyline');
          el.setAttribute('class', mode === 'hl' ? 'hl' : 'pen');
          el.setAttribute('stroke', colour[mode]);
          svg.append(el);
          stroke = { t: mode, c: colour[mode], p: toInk(e), el };
          el.setAttribute('points', stroke.p.join(' '));
        } else if (mode === 'erase') {
          eraseAt(e);
        } else {
          pan = { x: e.clientX, y: e.clientY, px: panX, py: panY };
        }
      });
      viewport.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        const p = local(e);
        const before = pointers.get(e.pointerId);
        moved += Math.hypot(p.x - before.x, p.y - before.y);
        pointers.set(e.pointerId, p);
        if (pinch && pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          zoomAt(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / (pinch.d || 1), (a.x + b.x) / 2, (a.y + b.y) / 2);
        } else if (stroke) {
          const [x, y] = toInk(e);
          const n = stroke.p.length;
          if (Math.hypot(x - stroke.p[n - 2], y - stroke.p[n - 1]) >= 3) {
            stroke.p.push(x, y);
            stroke.el.setAttribute('points', stroke.p.join(' '));
          }
        } else if (mode === 'erase') {
          eraseAt(e);
        } else if (pan && z > 1) {
          panX = pan.px + e.clientX - pan.x;
          panY = pan.py + e.clientY - pan.y;
          layout();
        }
      });
      const endPointer = (e) => {
        if (e.type === 'pointerup' && mode === 'move' && cover.on && pointers.size === 1 && moved < 6) {
          const tile = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains('im-tile'));
          if (tile) flipTile([...tiles.children].indexOf(tile));
        }
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        if (stroke && pointers.size === 0) {
          const s = stroke;
          stroke = null;
          if (s.p.length === 2) s.p.push(s.p[0] + 1, s.p[1]); // a dot
          const f = frame();
          if (f) updateFrame({ ink: [...(f.ink || []), { t: s.t, c: s.c, p: s.p }] });
          drawInk();
        }
        if (pointers.size === 0) pan = null;
      };
      viewport.addEventListener('pointerup', endPointer);
      viewport.addEventListener('pointercancel', endPointer);
      // The wheel zooms; once zoomed in, it scrolls around the picture
      // (hold Ctrl or ⌘, or pinch on a trackpad, to keep zooming).
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (z > 1.001 && !e.ctrlKey && !e.metaKey) {
          const dx = e.shiftKey ? e.deltaY : e.deltaX;
          panX -= dx;
          panY -= e.shiftKey ? 0 : e.deltaY;
          layout();
          return;
        }
        const p = local(e);
        zoomAt(z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
      }, { passive: false });
      viewport.addEventListener('dblclick', (e) => {
        if (mode !== 'move' || e.target.closest('.im-nav, .im-tile')) return;
        const p = local(e);
        if (z > 1.001) fit(); else zoomAt(2.5, p.x, p.y);
      });

      // ---- Drawing ----
      function drawInk() {
        const ink = frame()?.ink || [];
        svg.replaceChildren(...ink.map((s, i) => {
          const el = document.createElementNS(NS, 'polyline');
          el.setAttribute('class', s.t === 'hl' ? 'hl' : 'pen');
          el.setAttribute('stroke', s.c);
          el.setAttribute('points', s.p.join(' '));
          el.dataset.i = i;
          return el;
        }));
        undoBtn.disabled = !ink.length;
        clearBtn.disabled = !ink.length && !(frame()?.texts || []).length;
      }
      function eraseAt(e) {
        let el = null;
        for (const [dx, dy] of [[0, 0], [-6, 0], [6, 0], [0, -6], [0, 6]]) {
          el = document.elementsFromPoint(e.clientX + dx, e.clientY + dy).find((x) => x.tagName === 'polyline' && svg.contains(x));
          if (el) break;
        }
        if (!el) return;
        const f = frame();
        const i = +el.dataset.i;
        if (!f || Number.isNaN(i)) return;
        updateFrame({ ink: (f.ink || []).filter((_, k) => k !== i) });
        drawInk();
      }
      function undoInk() {
        const f = frame();
        if (!f?.ink?.length) return;
        updateFrame({ ink: f.ink.slice(0, -1) });
        drawInk();
      }
      function clearInk() {
        if (!frame()) return;
        updateFrame({ ink: [], texts: [] });
        drawInk();
        drawTexts();
      }

      // ---- Typed text ----
      // { id, x, y, s, c, v } in the same 1000-wide box as the drawings.
      function drawTexts() {
        textLayer.replaceChildren(...(frame()?.texts || []).map(textEl));
        sizeTexts();
      }
      function sizeTexts() {
        const W = layer.offsetWidth || base.w * z;
        textLayer.querySelectorAll('.im-text').forEach((box) => { box.style.fontSize = (+box.dataset.s * W / 1000) + 'px'; });
      }
      function textEl(t) {
        const ed = h('div', { class: 'im-text-edit', contenteditable: mode === 'text' ? 'true' : 'false', spellcheck: 'false', role: 'textbox', 'aria-label': 'Text on the picture' });
        ed.innerText = t.v || '';
        const grip = h('button', { class: 'im-text-grip', title: 'Drag to move', 'aria-label': 'Move this text', tabindex: '-1' }, icon('grip-vertical'));
        const del = h('button', { class: 'im-text-del', title: 'Delete this text', 'aria-label': 'Delete this text', tabindex: '-1' }, icon('x'));
        const box = h('div', { class: 'im-text', 'data-id': t.id }, grip, ed, del);
        Object.assign(box.dataset, { x: t.x, y: t.y, s: t.s, c: t.c });
        placeText(box);
        ed.addEventListener('focus', () => { activeText = t.id; box.classList.add('editing'); });
        ed.addEventListener('blur', () => { box.classList.remove('editing'); commitTexts(); });
        ed.addEventListener('keydown', (e) => { if (e.key === 'Escape') ed.blur(); e.stopPropagation(); });
        ed.addEventListener('paste', (e) => { // plain text only
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') || '');
        });
        del.addEventListener('pointerdown', (e) => e.preventDefault());
        del.addEventListener('click', () => removeText(t.id));
        grip.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          grip.setPointerCapture(e.pointerId);
          const r = layer.getBoundingClientRect();
          const sx = e.clientX, sy = e.clientY, ox = +box.dataset.x, oy = +box.dataset.y;
          const move = (ev) => {
            box.dataset.x = Math.round(Math.max(0, Math.min(980, ox + (ev.clientX - sx) / r.width * 1000)));
            box.dataset.y = Math.round(Math.max(0, Math.min(vh() - 10, oy + (ev.clientY - sy) / r.height * vh())));
            placeText(box);
          };
          const up = () => {
            grip.removeEventListener('pointermove', move);
            grip.removeEventListener('pointerup', up);
            grip.removeEventListener('pointercancel', up);
            commitTexts();
          };
          grip.addEventListener('pointermove', move);
          grip.addEventListener('pointerup', up);
          grip.addEventListener('pointercancel', up);
        });
        return box;
      }
      function placeText(box) {
        box.style.left = (+box.dataset.x / 10) + '%';
        box.style.top = (+box.dataset.y / vh() * 100) + '%';
        box.style.color = box.dataset.c;
      }
      function addText(x, y) {
        const t = { id: ctx.store.uid(), x, y, s: textSize, c: colour.text, v: '' };
        const box = textEl(t);
        textLayer.append(box);
        sizeTexts();
        box.querySelector('.im-text-edit').focus({ preventScroll: true });
      }
      // Saves every text box on this page; empty ones are dropped.
      function commitTexts() {
        if (!alive || !frame()) return;
        const texts = [...textLayer.querySelectorAll('.im-text')].map((box) => ({
          id: box.dataset.id, x: +box.dataset.x, y: +box.dataset.y, s: +box.dataset.s, c: box.dataset.c,
          v: box.querySelector('.im-text-edit').innerText.replace(/\n+$/, ''),
        }));
        textLayer.querySelectorAll('.im-text').forEach((box) => {
          if (!box.querySelector('.im-text-edit').innerText.trim() && !box.classList.contains('editing')) box.remove();
        });
        const keep = texts.filter((t) => t.v.trim() || textLayer.querySelector(`.im-text.editing[data-id="${t.id}"]`));
        const saved = keep.filter((t) => t.v.trim());
        if (JSON.stringify(saved) !== JSON.stringify(frame().texts || [])) updateFrame({ texts: saved });
        clearBtn.disabled = !(frame()?.ink || []).length && !saved.length;
      }
      function removeText(id) {
        textLayer.querySelector(`.im-text[data-id="${id}"]`)?.remove();
        if (activeText === id) activeText = null;
        commitTexts();
      }
      const activeBox = () => (activeText ? textLayer.querySelector(`.im-text[data-id="${activeText}"]`) : null);
      function styleActiveText(patch) {
        const box = activeBox();
        if (!box) return;
        Object.assign(box.dataset, patch);
        placeText(box);
        sizeTexts();
        commitTexts();
      }
      function resizeText(d) {
        const steps = [16, 20, 24, 32, 40, 52, 68, 88];
        const box = activeBox();
        const from = box ? +box.dataset.s : textSize;
        const i = steps.findIndex((s) => s >= from);
        textSize = steps[Math.max(0, Math.min(steps.length - 1, (i < 0 ? steps.length - 1 : i) + d))];
        styleActiveText({ s: textSize });
        box?.querySelector('.im-text-edit').focus();
      }

      // ---- Reveal bit by bit ----
      function toggleCover() {
        cover.on = !cover.on;
        cover.open.clear();
        drawTiles();
      }
      function flipTile(i) {
        if (cover.open.has(i)) cover.open.delete(i); else cover.open.add(i);
        tiles.children[i]?.classList.toggle('open', cover.open.has(i));
      }
      function drawTiles() {
        coverBtn.classList.toggle('active', cover.on);
        gridSeg.hidden = showAllBtn.hidden = hideAllBtn.hidden = !cover.on;
        gridSeg.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', +b.dataset.n === cover.n));
        tiles.hidden = !cover.on;
        if (!cover.on) { tiles.replaceChildren(); return; }
        tiles.style.gridTemplateColumns = `repeat(${cover.n}, 1fr)`;
        tiles.replaceChildren(...Array.from({ length: cover.n * cover.n }, (_, i) => {
          const t = h('button', { class: 'im-tile' + (cover.open.has(i) ? ' open' : ''), 'aria-label': `Uncover piece ${i + 1}` }, h('span', {}, String(i + 1)));
          // Taps are handled in endPointer (the viewport holds the pointer); this is for the keyboard.
          t.addEventListener('click', (e) => { if (e.detail === 0) flipTile(i); });
          return t;
        }));
      }

      // ---- Next / previous (through every picture and PDF page) ----
      function go(d) {
        const fr = frames();
        if (fr.length < 2) return;
        commitTexts();
        const i = fr.findIndex((x) => x.id === cur.id && x.page === cur.page);
        cur = fr[(i + d + fr.length) % fr.length];
        load();
      }
      prev.addEventListener('click', () => go(-1));
      next.addEventListener('click', () => go(1));
      // Arrow keys, and the Page Up / Page Down that presentation clickers send.
      root.addEventListener('keydown', onKey);
      function onKey(e) {
        if (!root.contains(view) || e.target.closest('input, textarea, select') || e.target.isContentEditable) return;
        const k = e.key;
        if (k === ' ' && e.target.closest('button')) return;
        if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); go(1); }
        else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(-1); }
        else if (k === '+' || k === '=') zoomBy(1.4);
        else if (k === '-') zoomBy(1 / 1.4);
        else if (k === '0') fit();
      }

      setMode('move');
      show(view);
      root.focus({ preventScroll: true });
      load();
      leaveView = () => {
        commitTexts();
        alive = false;
        ro.disconnect();
        root.removeEventListener('keydown', onKey);
        if (document.fullscreenElement === view) document.exitFullscreen?.();
      };
    }

    // Another Images tool on this board changed the list.
    const unsub = ctx.onBoardDataChange(() => {
      if (root.contains(listView)) renderList();
    });

    // The board opens to the list; nothing shows by itself.
    showList();
    return { destroy() { unsub(); leaveView?.(); leaveView = null; } };
  },
};
