import { h, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import * as yt from '../youtube.js';
import { t } from '../i18n.js';

// Kept on the board itself (ctx.boardData), not in the tool, so closing the tool
// and adding it again brings the list back:
//   { videos: [{ id, videoId, title, channel, start, end, note }], coverPaused }
// Nothing plays until the teacher picks a video.
// Messages below stay in English here and go through t() when shown.

const PLAYING = 1, PAUSED = 2, ENDED = 0;

const PLAYER_ERRORS = {
  2: 'This link doesn’t point to a video YouTube recognises.',
  5: 'This video can’t play in this browser.',
  100: 'This video has been removed or made private.',
  101: 'The uploader doesn’t allow this video to play on other websites.',
  150: 'The uploader doesn’t allow this video to play on other websites.',
};

const SEARCH_ERRORS = {
  quota: () => t('This key’s searches for today are used up (about 100 a day). They come back at about {time}. Pasting links still works.', { time: yt.quotaResetTime() }),
  badKey: () => t('YouTube didn’t accept the search key. Check it in search settings.'),
  notEnabled: () => t('The key was found, but “YouTube Data API v3” isn’t turned on for its Google project (step 3 of the setup guide).'),
  blocked: () => t('The key is restricted, and this site isn’t allowed. In Google Cloud, add {origin}/* to the key’s website restrictions.', { origin: location.origin }),
  network: () => t('Couldn’t reach YouTube. Check the internet connection.'),
};

const clipText = (v) => {
  if (v.start == null && v.end == null) return '';
  return `${yt.fmtTime(v.start || 0)}–${v.end != null ? yt.fmtTime(v.end) : t('end')}`;
};

// A video whose title couldn't be looked up keeps yt.UNTITLED; show it in the interface language.
const titleText = (v) => (v.title === yt.UNTITLED ? t(yt.UNTITLED) : v.title);

export default {
  type: 'youtube',
  title: 'YouTube',
  icon: 'brand-youtube',
  tone: 'content', // dock tile colour: time | people | signal | content
  size: { w: 640, h: 460 },
  minSize: { w: 340, h: 260 },

  mount(body, ctx) {
    // The first version kept the list inside the tool; move it onto the board.
    if (Array.isArray(ctx.state.videos)) {
      const onBoard = Array.isArray(ctx.boardData.videos) ? ctx.boardData.videos : [];
      const ids = new Set(onBoard.map((v) => v.id));
      ctx.saveBoardData({
        videos: [...onBoard, ...ctx.state.videos.filter((v) => v && v.videoId && !ids.has(v.id))],
        ...(ctx.state.coverPaused && ctx.boardData.coverPaused == null ? { coverPaused: true } : {}),
      });
      delete ctx.state.videos;
      delete ctx.state.coverPaused;
      ctx.save({});
    }
    const videos = () => (Array.isArray(ctx.boardData.videos) ? ctx.boardData.videos : []);
    const saveVideos = (list) => ctx.saveBoardData({ videos: list });
    const find = (id) => videos().find((v) => v.id === id);
    const isSaved = (videoId) => videos().some((v) => v.videoId === videoId);

    const root = h('div', { class: 'yt' });
    body.append(root);
    let leavePlayer = null; // cleans up the open player, if any

    function show(viewEl) {
      leavePlayer?.();
      leavePlayer = null;
      root.replaceChildren(viewEl);
    }

    // ================= Saved list (what the board opens to) =================
    const listEl = h('div', { class: 'yt-list', role: 'list', 'aria-label': t('Saved videos') });
    const countEl = h('span', { class: 'yt-count' });
    const listEmpty = h('div', { class: 'empty-state' },
      h('span', { class: 'tool-tile tone-content yt-empty-tile' }, icon('brand-youtube')),
      h('p', {}, t('No videos saved on this board yet.')),
      h('button', { class: 'btn primary with-icon', onclick: () => showAdd() }, icon('plus'), t('Add a video')),
    );
    const listView = h('div', { class: 'yt-view' },
      h('div', { class: 'yt-bar' },
        countEl,
        h('div', { class: 'row gap' },
          h('button', { class: 'btn small primary with-icon', onclick: () => showAdd() }, icon('plus'), t('Add video')),
          h('button', { class: 'icon-btn small', title: t('YouTube settings'), 'aria-label': t('YouTube settings'), onclick: openSettings }, icon('dots')),
        ),
      ),
      listEl,
      listEmpty,
    );

    function showList() {
      renderList();
      show(listView);
    }

    function renderList(flashId = null) {
      const list = videos();
      listEmpty.hidden = list.length > 0;
      listEl.hidden = list.length === 0;
      countEl.textContent = !list.length ? ''
        : list.length === 1 ? t('{n} saved video', { n: 1 }) : t('{n} saved videos', { n: list.length });
      listEl.replaceChildren(...list.map(rowFor));
      if (flashId) {
        const row = listEl.querySelector(`[data-id="${flashId}"]`);
        row?.classList.add('flash');
        row?.scrollIntoView({ block: 'nearest' });
      }
    }

    function rowFor(v) {
      const playIt = () => play(v, 'list');
      const name = titleText(v);
      const handle = h('button', {
        class: 'yt-handle', title: t('Drag to reorder (or use the ↑ ↓ keys)'), 'aria-label': t('Move “{name}”', { name }),
      }, icon('grip-vertical'));
      const clip = clipText(v);
      const row = h('div', { class: 'yt-row', role: 'listitem', 'data-id': v.id },
        handle,
        h('button', { class: 'yt-thumb', onclick: playIt, tabindex: '-1', 'aria-hidden': 'true' },
          h('img', { src: yt.thumb(v.videoId), alt: '', loading: 'lazy' }),
          h('span', { class: 'yt-thumb-play' }, icon('player-play'))),
        h('div', { class: 'yt-meta' },
          h('button', { class: 'yt-title', onclick: playIt, title: name }, name),
          h('div', { class: 'yt-sub' },
            clip ? h('span', { class: 'yt-clip', title: t('Plays only this part') }, icon('scissors'), clip) : null,
            v.channel ? h('span', { class: 'yt-channel' }, v.channel) : null),
          v.note ? h('p', { class: 'yt-note', title: v.note }, v.note) : null),
        h('div', { class: 'yt-actions' },
          h('button', { class: 'btn small primary with-icon', onclick: playIt }, icon('player-play'), h('span', { class: 'yt-btn-text' }, t('Play'))),
          h('button', { class: 'icon-btn small', title: t('Edit clip, note and title'), 'aria-label': t('Edit “{name}”', { name }), onclick: () => editVideo(v.id) }, icon('pencil')),
          confirmButton(icon('trash'), icon('check'), () => removeVideo(v.id), 'icon-btn small yt-del',
            { title: t('Remove from this board (click twice)'), 'aria-label': t('Remove “{name}”', { name }) }),
        ),
      );
      dragToReorder(handle, row);
      return row;
    }

    function removeVideo(id) {
      saveVideos(videos().filter((v) => v.id !== id));
      renderList();
      ctx.toast(t('Video removed from this board'));
    }

    // ---- Reorder: drag the handle, or focus it and press ↑ / ↓ ----
    function dragToReorder(handle, row) {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        // Listen on the window: moving the row in the list would drop pointer capture.
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
          if (order.join() !== videos().map((v) => v.id).join()) {
            const byId = new Map(videos().map((v) => [v.id, v]));
            saveVideos(order.map((id) => byId.get(id)).filter(Boolean));
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      handle.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const list = [...videos()];
        const i = list.findIndex((v) => v.id === row.dataset.id);
        const j = i + (e.key === 'ArrowUp' ? -1 : 1);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        saveVideos(list);
        renderList();
        listEl.querySelector(`[data-id="${row.dataset.id}"] .yt-handle`)?.focus();
      });
    }

    // ---- Edit clip, note and title ----
    function editVideo(id) {
      const v = find(id);
      if (!v) return;
      openModal(t('Edit video'), (mb) => {
        const title = h('input', { class: 'input', value: titleText(v), 'aria-label': t('Title') });
        const start = h('input', { class: 'input yt-time', value: v.start != null ? yt.fmtTime(v.start) : '', placeholder: t('beginning'), inputmode: 'numeric', 'aria-label': t('Start time') });
        const end = h('input', { class: 'input yt-time', value: v.end != null ? yt.fmtTime(v.end) : '', placeholder: t('end of video'), inputmode: 'numeric', 'aria-label': t('End time') });
        const note = h('textarea', { class: 'input yt-note-input', rows: 3, placeholder: t('e.g. Pause at 2:10 for See–Think–Wonder'), 'aria-label': t('Teacher note') });
        note.value = v.note || '';
        const err = h('p', { class: 'yt-form-error', role: 'alert' });
        const form = h('form', { class: 'yt-form' },
          h('label', {}, h('span', {}, t('Title')), title),
          h('div', { class: 'yt-form-row' },
            h('label', {}, h('span', {}, t('Start at')), start),
            h('label', {}, h('span', {}, t('Stop at')), end),
          ),
          h('p', { class: 'muted small' }, t('Times like 1:20 or 1:02:30. Leave blank to play from the beginning or to the end. You can also set them while watching, with the ✂ Clip button.')),
          h('label', {}, h('span', {}, t('Teacher note')), note),
          h('p', { class: 'muted small' }, t('Shown in the saved list only, not on the video.')),
          err,
          h('div', { class: 'row gap' },
            h('button', { class: 'btn primary', type: 'submit' }, t('Save')),
            h('button', { class: 'btn', type: 'button', onclick: closeModal }, t('Cancel')),
          ),
        );
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const s = start.value.trim() ? yt.parseTime(start.value) : null;
          const en = end.value.trim() ? yt.parseTime(end.value) : null;
          if (Number.isNaN(s) || Number.isNaN(en)) { err.textContent = t('Type times like 1:20 or 1:02:30.'); return; }
          if (s != null && en != null && en <= s) { err.textContent = t('The stop time must be after the start time.'); return; }
          updateVideo(id, { title: (title.value.trim() && title.value.trim() !== titleText(v) ? title.value.trim() : v.title), start: s || null, end: en, note: note.value.trim() });
          closeModal();
          renderList(id);
        });
        mb.append(form);
        setTimeout(() => title.focus(), 30);
      });
    }

    function updateVideo(id, patch) {
      saveVideos(videos().map((v) => (v.id === id ? { ...v, ...patch } : v)));
    }

    function saveItem(item) {
      const rec = {
        id: ctx.store.uid(), videoId: item.videoId, title: item.title || yt.UNTITLED, channel: item.channel || '',
        start: item.start || null, end: null, note: '',
      };
      saveVideos([...videos(), rec]);
      ctx.toast(t('Saved to this board'));
      return rec;
    }

    // ================= Add: paste a link or search =================
    const input = h('input', { class: 'input yt-input', type: 'search', 'aria-label': t('YouTube link or keywords'), enterkeyhint: 'go', autocomplete: 'off' });
    const form = h('form', { class: 'yt-search' }, input,
      h('button', { class: 'btn primary with-icon', type: 'submit' }, icon('search'), t('Go')));
    const hint = h('p', { class: 'yt-hint' });
    const results = h('div', { class: 'yt-results', 'aria-live': 'polite' });
    const addView = h('div', { class: 'yt-view' },
      h('div', { class: 'yt-bar' },
        h('button', { class: 'btn small with-icon', onclick: () => showList() }, icon('arrow-left'), t('Saved videos')),
        h('button', { class: 'icon-btn small', title: t('Search settings'), 'aria-label': t('Search settings'), onclick: openSettings }, icon('key')),
      ),
      form, hint, results,
    );
    let request = 0; // ignores answers to older searches

    function refreshHint() {
      const key = yt.getKey();
      input.placeholder = key ? t('Paste a YouTube link, or type keywords to search') : t('Paste a YouTube link');
      if (key) {
        const n = yt.searchesToday();
        hint.replaceChildren(t('Keyword search uses YouTube’s SafeSearch (strict). Searches today on this computer: {n} (about 100 a day per key).', { n }));
      } else {
        hint.replaceChildren(t('Copy a video’s link from YouTube and paste it here. To search by keyword here as well, '),
          h('button', { class: 'link-btn', onclick: openSettings }, t('set up search')), t(' (free, about 5 minutes, once).'));
      }
    }

    function showAdd() {
      refreshHint();
      show(addView);
      setTimeout(() => input.focus(), 30);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const mine = ++request;
      const link = yt.parseVideo(q);
      if (link) { showLink(link, mine); return; }
      if (/^https?:\/\//i.test(q) || /\.\w{2,}\//.test(q)) {
        results.replaceChildren(message(t('That isn’t a YouTube video link. Copy the link from the video’s page or its Share button.')));
        return;
      }
      if (!yt.getKey()) { showNoKey(q); return; }
      results.replaceChildren(h('p', { class: 'yt-loading' }, icon('loader-2', { cls: 'spin' }), t('Searching YouTube…')));
      try {
        const items = await yt.search(q);
        if (mine !== request) return;
        refreshHint();
        results.replaceChildren(...(items.length
          ? [...items.map(resultCard), h('p', { class: 'muted small yt-foot' }, t('Only videos that are allowed to play on other websites are shown.'))]
          : [message(t('No videos found. Try other keywords.'))]));
      } catch (err) {
        if (mine !== request) return;
        const text = SEARCH_ERRORS[err.kind]?.() || t('YouTube search didn’t work: {error}', { error: err.message });
        results.replaceChildren(message(text, err.kind === 'badKey' || err.kind === 'notEnabled' || err.kind === 'blocked'
          ? h('button', { class: 'btn small', onclick: openSettings }, t('Search settings')) : null));
      }
    });

    function message(text, ...extra) {
      return h('div', { class: 'yt-message' }, h('p', {}, text), ...extra);
    }

    function showNoKey(q) {
      results.replaceChildren(message(
        t('Searching by keyword here needs a free YouTube search key, set up once in about 5 minutes. Or search on YouTube, then copy the video’s link and paste it above.'),
        h('div', { class: 'row gap wrap' },
          h('button', { class: 'btn small primary with-icon', onclick: openSettings }, icon('key'), t('Set up search')),
          h('a', { class: 'btn small with-icon', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, target: '_blank', rel: 'noopener' },
            icon('external-link'), t('Search on YouTube')),
        ),
      ));
    }

    function showLink(link, mine) {
      const item = { videoId: link.videoId, start: link.start, title: yt.UNTITLED, channel: '' };
      const card = resultCard(item);
      results.replaceChildren(card);
      yt.lookup(link.videoId).then((info) => {
        if (mine !== request || !info) return;
        if (info.problem) {
          card.querySelector('.yt-meta').append(h('p', { class: 'yt-warn' }, icon('alert-triangle'),
            info.problem === 'missing'
              ? t('YouTube couldn’t find this video. Check the link.')
              : t('This video may be private, or its uploader may not allow it on other websites. If it won’t play here, it will offer to open on YouTube.')));
          return;
        }
        item.title = info.title;
        item.channel = info.channel;
        card.querySelector('.yt-card-title').textContent = titleText(info);
        card.querySelector('.yt-channel').textContent = info.channel;
      });
    }

    function resultCard(item) {
      const saveBtn = h('button', { class: 'btn small with-icon' });
      const syncSave = () => {
        const done = isSaved(item.videoId);
        saveBtn.disabled = done;
        saveBtn.replaceChildren(icon(done ? 'check' : 'plus'), done ? t('Saved') : t('Save'));
        saveBtn.title = done ? t('Already on this board') : t('Save to this board for later');
      };
      saveBtn.addEventListener('click', () => { saveItem(item); syncSave(); });
      syncSave();
      const playIt = () => play(item, 'add');
      return h('div', { class: 'yt-card' },
        h('button', { class: 'yt-thumb', onclick: playIt, tabindex: '-1', 'aria-hidden': 'true' },
          h('img', { src: yt.thumb(item.videoId), alt: '', loading: 'lazy' }),
          item.duration ? h('span', { class: 'yt-duration' }, yt.fmtTime(item.duration)) : null,
          h('span', { class: 'yt-thumb-play' }, icon('player-play'))),
        h('div', { class: 'yt-meta' },
          h('div', { class: 'yt-card-title', title: titleText(item) }, titleText(item)),
          h('div', { class: 'yt-sub' },
            h('span', { class: 'yt-channel' }, item.channel),
            item.start ? h('span', { class: 'yt-clip' }, t('from {time}', { time: yt.fmtTime(item.start) })) : null)),
        h('div', { class: 'yt-actions' },
          h('button', { class: 'btn small primary with-icon', onclick: playIt }, icon('player-play'), t('Play now')),
          saveBtn),
      );
    }

    // ================= Player =================
    // `item` is a saved video (it has an id) or a search result / pasted link.
    function play(item, from) {
      let v = item.id ? find(item.id) || item : item;
      let player = null;
      let poll = null;
      let alive = true;
      let overrun = false;       // "Keep watching" past the clip's end
      let selfPause = false;     // our own pause at the clip end
      let dismissed = false;     // "Show video" on the paused cover

      const titleEl = h('span', { class: 'yt-player-title', title: titleText(v) }, titleText(v));
      const clipEl = h('span', { class: 'yt-clip' });
      const frame = h('div', { class: 'yt-frame' });
      const cover = h('div', { class: 'yt-cover' });
      const stage = h('div', { class: 'yt-stage' }, frame, cover);
      const noteEl = h('p', { class: 'yt-note-bar' });
      const nowEl = h('span', { class: 'yt-now' });
      const clipTools = h('div', { class: 'yt-cliptools', hidden: true },
        h('span', { class: 'muted small' }, t('Clip:')),
        h('button', { class: 'chip', onclick: () => setClip('start') }, t('Start here')),
        h('button', { class: 'chip', onclick: () => setClip('end') }, t('Stop here')),
        h('button', { class: 'chip', onclick: () => setClip('clear') }, t('Whole video')),
        nowEl,
      );
      const saveBtn = h('button', { class: 'btn small with-icon' }, icon('plus'), t('Save'));
      saveBtn.addEventListener('click', () => {
        v = saveItem(v);
        renderBar();
      });
      const clipBtn = h('button', { class: 'chip with-icon', title: t('Set where this video starts and stops'), 'aria-expanded': 'false' }, icon('scissors'), t('Clip'));
      clipBtn.addEventListener('click', () => {
        clipTools.hidden = !clipTools.hidden;
        clipBtn.classList.toggle('active', !clipTools.hidden);
        clipBtn.setAttribute('aria-expanded', String(!clipTools.hidden));
      });
      const back = () => (from === 'add' ? showAdd() : showList());
      const view = h('div', { class: 'yt-view yt-player-view' },
        h('div', { class: 'yt-bar' },
          h('button', { class: 'btn small with-icon', onclick: back, title: from === 'add' ? t('Back to results') : t('Back to saved videos') },
            icon('arrow-left'), from === 'add' ? t('Back') : t('List')),
          titleEl,
          h('div', { class: 'row gap yt-bar-end' }, clipEl, saveBtn, clipBtn,
            h('a', { class: 'icon-btn small', href: yt.watchUrl(v.videoId, v.start), target: '_blank', rel: 'noopener', title: t('Open on YouTube'), 'aria-label': t('Open on YouTube') }, icon('external-link'))),
        ),
        stage, clipTools, noteEl,
      );

      function renderBar() {
        const saved = !!v.id;
        saveBtn.hidden = saved;
        if (!saved && isSaved(v.videoId)) {
          saveBtn.disabled = true;
          saveBtn.replaceChildren(icon('check'), t('Saved'));
          saveBtn.title = t('Already on this board');
        }
        clipBtn.hidden = !saved;
        if (!saved) clipTools.hidden = true;
        titleEl.textContent = titleText(v);
        titleEl.title = titleText(v);
        const c = clipText(v);
        clipEl.replaceChildren(...(c ? [icon('scissors'), c] : []));
        clipEl.hidden = !c;
        noteEl.textContent = v.note || '';
        noteEl.hidden = !v.note;
      }

      const startAt = () => v.start || 0;
      const timeNow = () => { try { return player?.getCurrentTime?.() || 0; } catch (err) { return 0; } };

      // ---- Covers: shown over the player so YouTube's own screens stay hidden ----
      function showCover(kind, extra) {
        stopPoll();
        cover.hidden = false;
        cover.className = `yt-cover ${kind}`;
        const big = (label, fn, ic = 'player-play') =>
          h('button', { class: 'yt-cover-play', onclick: fn, 'aria-label': label }, icon(ic), h('span', {}, label));
        const btn = (label, fn, cls = 'btn small') => h('button', { class: cls, onclick: fn }, label);
        const openYt = () => h('a', { class: 'btn small with-icon', href: yt.watchUrl(v.videoId, v.start), target: '_blank', rel: 'noopener' }, icon('external-link'), t('Open on YouTube'));
        const backBtn = () => btn(from === 'add' ? t('Back') : t('Back to list'), back);
        let content;
        if (kind === 'poster') {
          cover.style.backgroundImage = `url("${yt.thumb(v.videoId, 'hqdefault')}")`;
          content = [big(t('Play'), startPlayer), h('p', { class: 'yt-cover-title' }, titleText(v)),
            clipText(v) ? h('p', { class: 'yt-cover-sub' }, t('Clip {range}', { range: clipText(v) })) : null];
        } else if (kind === 'loading') {
          content = [h('p', { class: 'yt-cover-sub' }, icon('loader-2', { cls: 'spin' }), ' ', t('Loading…'))];
        } else if (kind === 'paused') {
          content = [big(t('Resume'), () => player?.playVideo()), h('p', { class: 'yt-cover-sub' }, t('Paused')),
            h('div', { class: 'row gap' }, btn(t('Show video'), () => { dismissed = true; hideCover(); }, 'btn small ghost'))];
        } else if (kind === 'clipEnd') {
          content = [h('p', { class: 'yt-cover-title' }, t('End of clip')),
            h('div', { class: 'row gap wrap center' },
              btn(t('Replay clip'), replay, 'btn primary'),
              btn(t('Keep watching'), () => { overrun = true; hideCover(); player?.playVideo(); }),
              backBtn())];
        } else if (kind === 'ended') {
          content = [h('p', { class: 'yt-cover-title' }, t('Finished')),
            h('div', { class: 'row gap wrap center' },
              btn(v.start ? t('Replay clip') : t('Replay'), replay, 'btn primary'),
              backBtn())];
        } else if (kind === 'error') {
          content = [h('p', { class: 'yt-cover-title' }, t('This video can’t play here')),
            h('p', { class: 'yt-cover-sub' }, PLAYER_ERRORS[extra] ? t(PLAYER_ERRORS[extra]) : t('YouTube couldn’t play this video (error {code}). It may still play on YouTube itself.', { code: extra })),
            h('div', { class: 'row gap wrap center' }, openYt(), backBtn())];
        } else if (kind === 'offline') {
          content = [h('p', { class: 'yt-cover-title' }, t('Couldn’t reach YouTube')),
            h('p', { class: 'yt-cover-sub' }, t('Check the internet connection. Some networks block YouTube.')),
            h('div', { class: 'row gap wrap center' }, btn(t('Try again'), startPlayer, 'btn primary'), openYt())];
        }
        if (kind !== 'poster') cover.style.backgroundImage = '';
        cover.replaceChildren(...content.filter(Boolean));
      }

      function hideCover() {
        cover.hidden = true;
      }

      function replay() {
        overrun = false;
        hideCover();
        player?.seekTo(startAt(), true);
        player?.playVideo();
      }

      function startPoll() {
        stopPoll();
        poll = setInterval(() => {
          const now = timeNow();
          nowEl.textContent = t('at {time}', { time: yt.fmtTime(now) });
          if (v.end != null && !overrun && now >= v.end - 0.2) {
            selfPause = true;
            player?.pauseVideo();
            showCover('clipEnd');
          }
        }, 200);
      }
      function stopPoll() { clearInterval(poll); poll = null; }

      async function startPlayer() {
        showCover('loading');
        let YT;
        try { YT = await yt.loadPlayerApi(); } catch (err) { if (alive) showCover('offline'); return; }
        if (!alive) return;
        const host = h('div');
        frame.replaceChildren(host);
        player = new YT.Player(host, {
          host: 'https://www.youtube-nocookie.com', // privacy-enhanced mode
          width: '100%', height: '100%',
          videoId: v.videoId,
          playerVars: {
            autoplay: 1, start: Math.floor(startAt()), rel: 0, playsinline: 1,
            iv_load_policy: 3, origin: location.origin,
          },
          events: {
            onReady: (e) => {
              if (!alive) return;
              hideCover();
              e.target.playVideo();
              // Fill in a title that couldn't be looked up when the link was pasted.
              const found = e.target.getVideoData?.()?.title;
              if (found && v.title === yt.UNTITLED) {
                v = { ...v, title: found };
                if (v.id) updateVideo(v.id, { title: found });
                renderBar();
              }
            },
            onStateChange: (e) => {
              if (!alive) return;
              if (e.data === PLAYING) { dismissed = false; hideCover(); startPoll(); nowEl.textContent = t('at {time}', { time: yt.fmtTime(timeNow()) }); }
              else if (e.data === PAUSED) {
                stopPoll();
                nowEl.textContent = t('at {time}', { time: yt.fmtTime(timeNow()) });
                if (selfPause) { selfPause = false; return; }
                if (ctx.boardData.coverPaused && !dismissed) showCover('paused');
              } else if (e.data === ENDED) showCover('ended');
            },
            onError: (e) => { if (alive) showCover('error', e.data); },
          },
        });
      }

      function setClip(which) {
        if (!v.id) return;
        const now = Math.floor(timeNow());
        let patch;
        if (which === 'clear') patch = { start: null, end: null };
        else if (which === 'start') patch = { start: now || null, end: v.end != null && v.end <= now ? null : v.end };
        else {
          if (now <= startAt()) { ctx.toast(t('Stop time must be after the start')); return; }
          patch = { end: Math.round(timeNow()) };
          overrun = true; // don't stop right here, while setting it
        }
        updateVideo(v.id, patch);
        v = find(v.id) || { ...v, ...patch };
        renderBar();
        ctx.toast(which === 'clear' ? t('Plays the whole video') : t('Clip: {range}', { range: clipText(v) }));
      }

      renderBar();
      show(view);
      showCover('poster');
      leavePlayer = () => {
        alive = false;
        stopPoll();
        try { player?.destroy(); } catch (err) { /* ignore */ }
        player = null;
      };
    }

    // ================= Settings: search key and covers =================
    function openSettings() {
      const dlg = document.getElementById('modal');
      openModal(t('YouTube settings'), (mb) => {
        const keySection = h('section', { class: 'panel' });
        const renderKey = () => {
          const key = yt.getKey();
          keySection.replaceChildren(h('h3', {}, t('Keyword search')));
          if (key) {
            keySection.append(
              h('p', { class: 'yt-status ok' }, icon('check'), t('Search is on. Key ending …{end}, kept only in this browser.', { end: key.slice(-4) })),
              h('p', { class: 'muted small' }, t('Each key allows about 100 searches a day. Searches today on this computer: {n}. The count restarts at about {time}.', { n: yt.searchesToday(), time: yt.quotaResetTime() })),
              h('div', { class: 'row gap wrap' },
                h('button', { class: 'btn small', onclick: () => { if (!keySection.querySelector('form')) keySection.append(keyForm()); } }, t('Change key')),
                confirmButton(t('Remove key'), t('Click again to remove'), () => { yt.clearKey(); renderKey(); }, 'btn small danger')),
            );
          } else {
            keySection.append(
              h('p', { class: 'small' }, t('Pasting links always works. To search YouTube by keyword from the board, add your own free YouTube key. It takes about 5 minutes, once.')),
              h('ol', { class: 'yt-steps' },
                h('li', {}, t('Open '), h('a', { href: 'https://console.cloud.google.com/projectcreate', target: '_blank', rel: 'noopener' }, 'Google Cloud'),
                  t(' and sign in. A personal Google account works best: school accounts are often blocked from Google Cloud.')),
                h('li', {}, t('Create a project, for example “ClassroomBoard”. No billing or payment details are needed.')),
                h('li', {}, t('Turn on '), h('a', { href: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com', target: '_blank', rel: 'noopener' }, 'YouTube Data API v3'),
                  t(' for that project (press Enable).')),
                h('li', {}, t('Go to '), h('a', { href: 'https://console.cloud.google.com/apis/credentials', target: '_blank', rel: 'noopener' }, 'Credentials'),
                  t(' → Create credentials → API key, and copy the key.')),
                h('li', {}, t('Recommended: edit the key. Under Website restrictions add '), h('code', {}, `${location.origin}/*`),
                  t(', and under API restrictions choose YouTube Data API v3. Then the key is useless anywhere else.')),
                h('li', {}, t('Paste the key below and press Test and save.')),
              ),
              keyForm(),
            );
          }
        };
        const keyForm = () => {
          const keyInput = h('input', { class: 'input', placeholder: t('Paste your YouTube API key'), autocomplete: 'off', spellcheck: 'false', 'aria-label': t('YouTube API key') });
          const status = h('p', { class: 'yt-status', role: 'status' });
          const f = h('form', { class: 'yt-key-form' },
            h('div', { class: 'row gap' }, keyInput, h('button', { class: 'btn primary', type: 'submit' }, t('Test and save'))), status);
          f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const k = keyInput.value.trim();
            if (!k) return;
            status.className = 'yt-status';
            status.replaceChildren(icon('loader-2', { cls: 'spin' }), ' ', t('Checking with YouTube…'));
            try {
              await yt.testKey(k);
              yt.setKey(k);
              renderKey();
              ctx.toast(t('Search is on'));
            } catch (err) {
              status.className = 'yt-status bad';
              status.replaceChildren(icon('alert-triangle'), ' ', SEARCH_ERRORS[err.kind]?.() || t('YouTube said: {error}', { error: err.message }));
            }
          });
          setTimeout(() => keyInput.focus(), 30);
          return f;
        };
        renderKey();

        const coverBox = h('input', { type: 'checkbox' });
        coverBox.checked = !!ctx.boardData.coverPaused;
        coverBox.addEventListener('change', () => ctx.saveBoardData({ coverPaused: coverBox.checked }));

        mb.append(
          keySection,
          h('section', { class: 'panel' },
            h('h3', {}, t('While a video plays')),
            h('label', { class: 'yt-check' }, coverBox, h('span', {}, t('Cover the video when it’s paused on this board'))),
            h('p', { class: 'muted small' }, t('Hides YouTube’s paused screen and its suggestions. Leave it off if you pause on a frame to discuss it. YouTube’s end-of-video suggestions are always covered, and a clip stops at its stop time.')),
          ),
          h('section', { class: 'panel' },
            h('h3', {}, t('Privacy')),
            h('p', { class: 'muted small' }, t('Videos play in YouTube’s privacy-enhanced player (youtube-nocookie.com), and YouTube’s own ads may still appear. The saved list is part of this board: it stays when this tool is closed, and is copied, shared and backed up with the board. The search key stays in this browser only: it is never put in backups or shared board files.')),
          ),
        );
      });
      dlg.addEventListener('close', () => { if (root.contains(addView)) refreshHint(); }, { once: true });
    }

    // The board opens to the saved list; nothing plays by itself.
    // Another YouTube tool on this board changed the list.
    const unsub = ctx.onBoardDataChange(() => { if (root.contains(listView)) renderList(); });

    showList();
    return { destroy() { unsub(); leavePlayer?.(); leavePlayer = null; } };
  },
};
