import { h, openModal, closeModal, confirmButton } from '../ui.js';
import { icon } from '../icons.js';
import * as audioStore from '../audio.js';
import * as lib from '../musiclibrary.js';
import * as sp from '../spotify.js';
import { t } from '../i18n.js';

// Background music for the board: tracks from the app's own library, the
// teacher's music files (kept in this browser) and Spotify links.
//
// Kept on the board itself (ctx.boardData), so closing the tool keeps the list:
//   { items: [{ id, kind: 'library' | 'file' | 'spotify', ref, title, note }],
//     current: item id, volume: 0–1, repeat: 'list' | 'one', timerLink: bool }
//   ref  library: track id · file: id in IndexedDB (audio.js) · spotify: 'playlist/<id>'
// Nothing plays until the teacher presses play (or starts a linked Timer).

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 3000;

const fmt = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return '–:––';
  sec = Math.floor(sec);
  const hr = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return hr ? `${hr}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

const SPOTIFY_KINDS = {
  playlist: 'Spotify playlist', album: 'Spotify album', track: 'Spotify song',
  episode: 'Spotify episode', show: 'Spotify podcast', artist: 'Spotify artist',
};

export default {
  type: 'music',
  title: 'Music',
  icon: 'music',
  tone: 'content', // dock tile colour: time | people | signal | content | language
  size: { w: 520, h: 440 },
  minSize: { w: 320, h: 240 },

  mount(body, ctx) {
    const data = () => ctx.boardData;
    const items = () => (Array.isArray(data().items) ? data().items : []);
    const find = (id) => items().find((it) => it.id === id) || null;
    const saveItems = (list) => ctx.saveBoardData({ items: list });
    const volume = () => (typeof data().volume === 'number' ? Math.min(1, Math.max(0, data().volume)) : 0.6);
    const repeat = () => (data().repeat === 'one' ? 'one' : 'list');

    const titleOf = (it) => {
      if (!it) return '';
      if (it.title) return it.title;
      if (it.kind === 'library') { const tr = lib.trackById(it.ref); return tr ? lib.trackTitle(tr) : t('Missing track'); }
      if (it.kind === 'spotify') return t(SPOTIFY_KINDS[sp.fromRef(it.ref)?.type] || 'Spotify');
      return t('Music file');
    };

    const root = h('div', { class: 'mu' });
    body.append(root);
    let leaveView = null; // cleans up the Spotify player when leaving it

    function show(viewEl) {
      leaveView?.();
      leaveView = null;
      root.replaceChildren(viewEl);
    }

    // ================= Player for library tracks and music files =================
    const el = new Audio();
    el.preload = 'auto';
    let playing = null;   // the item loaded into el (saved or a library preview)
    let fadeTimer = null;
    let fadingOut = false;
    let loadToken = 0;
    const missing = new Set(); // file ids not on this computer

    function stopFade() { clearInterval(fadeTimer); fadeTimer = null; fadingOut = false; }
    function fadeTo(target, ms, then) {
      stopFade();
      fadingOut = target < el.volume;
      const from = el.volume;
      const t0 = performance.now();
      fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
        if (k >= 1) { stopFade(); then?.(); }
      }, 40);
    }

    async function srcFor(it) {
      if (it.kind === 'library') return lib.trackUrl(it.ref);
      if (it.kind === 'file') {
        const u = await audioStore.url(it.ref);
        if (!u) { missing.add(it.ref); const e = new Error('missing'); e.missing = true; throw e; }
        return u;
      }
      throw new Error('not playable here');
    }

    // Loads and plays an item. fadeIn: start quietly and rise (used by the Timer).
    async function playItem(it, { fadeIn = false, remember = true } = {}) {
      if (!it) return;
      if (it.kind === 'spotify') { openSpotify(it); return; }
      const token = ++loadToken;
      stopFade();
      if (remember && it.id && find(it.id)) ctx.saveBoardData({ current: it.id });
      const same = playing && playing.kind === it.kind && playing.ref === it.ref && el.src;
      playing = it;
      renderNow();
      try {
        if (!same) {
          nowState = 'loading';
          renderNow();
          const src = await srcFor(it);
          if (token !== loadToken) return;
          el.src = src;
        }
        el.loop = repeat() === 'one' || playableItems().length <= 1;
        el.volume = fadeIn ? 0 : volume();
        nowState = '';
        await el.play();
        if (token !== loadToken) return;
        if (fadeIn) fadeTo(volume(), FADE_IN_MS);
      } catch (err) {
        if (token !== loadToken) return;
        nowState = '';
        if (err?.name === 'NotAllowedError') ctx.toast(t('The browser blocked the music. Press play.'));
        else if (err?.missing) { ctx.toast(t('That music file isn’t on this computer.')); renderList(); }
        else if (err?.offline) ctx.toast(t('This track needs the internet the first time it plays.'), 3500);
        else if (err?.name !== 'AbortError') ctx.toast(t('This music couldn’t play.'));
      }
      renderNow();
    }

    const isPlaying = () => !!playing && !el.paused && !el.ended;

    function pause({ fade = false, rewind = false } = {}) {
      if (!playing) return;
      const finish = () => {
        el.pause();
        el.volume = volume();
        if (rewind) { try { el.currentTime = 0; } catch (err) { /* ignore */ } }
        renderNow();
      };
      if (fade && isPlaying()) { fadeTo(0, FADE_OUT_MS, finish); renderNow(); }
      else { stopFade(); finish(); }
    }

    function toggle() {
      if (!playing) { playItem(currentItem()); return; }
      if (isPlaying() && !fadingOut) pause();
      else { stopFade(); el.volume = volume(); el.play().catch(() => ctx.toast(t('This music couldn’t play.'))); }
    }

    // Saved items the player can go through in order (Spotify plays in its own player).
    const playableItems = () => items().filter((it) => it.kind !== 'spotify' && !(it.kind === 'file' && missing.has(it.ref)));

    function step(dir) {
      const list = playableItems();
      if (!list.length) return;
      const i = playing?.id ? list.findIndex((it) => it.id === playing.id) : -1;
      const next = list[(i + dir + list.length) % list.length];
      playItem(next);
    }

    function currentItem() {
      return find(data().current) || playableItems()[0] || items()[0] || null;
    }

    el.addEventListener('ended', () => {
      if (playing?.id && find(playing.id) && playableItems().length > 1 && repeat() === 'list') step(1);
      else renderNow();
    });
    el.addEventListener('play', () => renderNow());
    el.addEventListener('pause', () => renderNow());
    el.addEventListener('timeupdate', () => renderProgress());
    el.addEventListener('loadedmetadata', () => renderProgress());
    el.addEventListener('error', () => { if (playing && el.src) { nowState = ''; renderNow(); } });

    // ---- Chip shown when the tool is minimised: play / pause and what is playing ----
    const miniPlay = h('button', { class: 'mu-mini-play', onclick: () => {
      if (spView) { ctx.toast(t('Open the Music tool to use the Spotify player.')); return; }
      toggle();
    } });
    const miniBars = h('span', { class: 'mu-mini-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
    const miniTitle = h('span', { class: 'mu-mini-title' });
    function renderMini() {
      // With nothing to play, the chip just shows the tool's name.
      const any = spView || !!playing || items().length > 0;
      if (any) ctx.setMiniControls?.(miniPlay, miniBars, miniTitle); else { ctx.setMiniControls?.(); return; }
      const on = isPlaying() && !fadingOut;
      const spotifyOpen = spView;
      const label = on ? t('Pause') : t('Play');
      miniPlay.replaceChildren(icon(spotifyOpen ? 'brand-spotify' : on ? 'player-pause' : 'player-play'));
      miniPlay.classList.toggle('on', on || spotifyOpen);
      miniPlay.title = spotifyOpen ? 'Spotify' : label;
      miniPlay.setAttribute('aria-label', miniPlay.title);
      miniPlay.disabled = !spotifyOpen && !playing && !items().some((it) => it.kind !== 'spotify');
      const shown = spotifyOpen ? titleOf(find(data().current)) : titleOf(playing || currentItem());
      miniTitle.textContent = shown;
      miniTitle.title = shown;
      ctx.el.querySelector('.widget-mini')?.classList.toggle('mu-on', on || (spotifyOpen && !spPaused));
    }

    // ---- Now playing bar ----
    let nowState = '';
    const playBtn = h('button', { class: 'mu-play', onclick: () => toggle() });
    const nextBtn = h('button', { class: 'icon-btn small', title: t('Next track'), 'aria-label': t('Next track'), onclick: () => step(1) }, icon('player-skip-forward'));
    const nowTitle = h('span', { class: 'mu-now-title' });
    const nowTime = h('span', { class: 'mu-now-time' });
    const progFill = h('span', { class: 'mu-prog-fill' });
    const prog = h('div', { class: 'mu-prog', role: 'slider', tabindex: '0', 'aria-label': t('Position') }, progFill);
    const vol = h('input', { class: 'mu-vol', type: 'range', min: '0', max: '1', step: '0.05', 'aria-label': t('Volume'), title: t('Volume') });
    const volIcon = h('span', { class: 'mu-vol-ico' });
    const repeatBtn = h('button', { class: 'icon-btn small', onclick: () => {
      ctx.saveBoardData({ repeat: repeat() === 'one' ? 'list' : 'one' });
      el.loop = repeat() === 'one' || playableItems().length <= 1;
      renderNow();
      ctx.toast(repeat() === 'one' ? t('Repeats this track') : t('Plays the list, then starts again'));
    } });
    const fadeBtn = h('button', { class: 'chip with-icon', title: t('Fade out over 3 seconds, then pause'), onclick: () => pause({ fade: true }) }, icon('volume-2'), h('span', { class: 'mu-fade-label' }, t('Fade out')));
    const linkBadge = h('span', { class: 'mu-link-badge', title: t('Starts and stops with the Timer on this board') }, icon('hourglass'));
    const nowBar = h('div', { class: 'mu-now', hidden: true },
      h('div', { class: 'mu-now-top' }, playBtn,
        h('div', { class: 'mu-now-meta' }, h('div', { class: 'mu-now-line' }, nowTitle, linkBadge), h('div', { class: 'mu-now-line' }, prog, nowTime))),
      h('div', { class: 'mu-now-tools' }, nextBtn, repeatBtn, fadeBtn, h('span', { class: 'mu-grow' }), volIcon, vol),
    );

    vol.addEventListener('input', () => { if (!fadeTimer) el.volume = Number(vol.value); renderVolIcon(); });
    // Volume changes while a fade is under way apply when it ends.
    vol.addEventListener('change', () => { ctx.saveBoardData({ volume: Number(vol.value) }); });
    function seekTo(clientX) {
      const r = prog.getBoundingClientRect();
      if (!Number.isFinite(el.duration) || !r.width) return;
      el.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * el.duration;
      renderProgress();
    }
    prog.addEventListener('pointerdown', (e) => {
      seekTo(e.clientX);
      prog.setPointerCapture(e.pointerId);
      const move = (ev) => seekTo(ev.clientX);
      const up = () => { prog.removeEventListener('pointermove', move); prog.removeEventListener('pointerup', up); };
      prog.addEventListener('pointermove', move);
      prog.addEventListener('pointerup', up);
    });
    prog.addEventListener('keydown', (e) => {
      if (!Number.isFinite(el.duration)) return;
      if (e.key === 'ArrowRight') el.currentTime = Math.min(el.duration, el.currentTime + 10);
      else if (e.key === 'ArrowLeft') el.currentTime = Math.max(0, el.currentTime - 10);
      else return;
      e.preventDefault();
      renderProgress();
    });

    function renderVolIcon() {
      volIcon.replaceChildren(icon(Number(vol.value) === 0 ? 'volume-off' : 'volume'));
    }

    function renderProgress() {
      const d = el.duration;
      const c = el.currentTime || 0;
      progFill.style.width = Number.isFinite(d) && d > 0 ? `${Math.min(100, c / d * 100)}%` : '0%';
      nowTime.textContent = `${fmt(c)} / ${fmt(Number.isFinite(d) ? d : null)}`;
      prog.setAttribute('aria-valuetext', nowTime.textContent);
    }

    function renderNow() {
      renderMini();
      nowBar.hidden = !playing;
      addBody.querySelectorAll('.mu-lib-card').forEach((c) => c._draw?.());
      if (!playing) { listEl.querySelectorAll('.mu-row.now').forEach((r) => r.classList.remove('now', 'on')); return; }
      const on = isPlaying() && !fadingOut;
      const label = nowState === 'loading' ? t('Loading…') : on ? t('Pause') : t('Play');
      playBtn.replaceChildren(nowState === 'loading' ? icon('loader-2', { cls: 'spin' }) : icon(on ? 'player-pause' : 'player-play'));
      playBtn.title = label;
      playBtn.setAttribute('aria-label', label);
      playBtn.classList.toggle('on', on);
      nowTitle.textContent = titleOf(playing);
      nowTitle.title = titleOf(playing);
      linkBadge.hidden = !data().timerLink;
      nextBtn.hidden = playableItems().length < 2 || !playing.id;
      const one = repeat() === 'one';
      repeatBtn.replaceChildren(icon(one ? 'repeat-once' : 'repeat'));
      repeatBtn.title = one ? t('Repeat: this track (click to play the list)') : t('Repeat: the whole list (click to repeat this track)');
      repeatBtn.setAttribute('aria-label', repeatBtn.title);
      repeatBtn.hidden = playableItems().length < 2;
      fadeBtn.disabled = !on;
      if (document.activeElement !== vol) vol.value = String(volume());
      renderVolIcon();
      renderProgress();
      listEl.querySelectorAll('.mu-row').forEach((r) => {
        const mine = r.dataset.id === playing.id;
        const was = r.classList.contains('on');
        r.classList.toggle('now', mine);
        r.classList.toggle('on', mine && on);
        if (was === (mine && on) || r.classList.contains('kind-spotify')) return;
        // The row's own buttons pause the track that is playing.
        r.querySelector('.mu-tile-play')?.replaceChildren(icon(mine && on ? 'player-pause' : 'player-play'));
        r.querySelector('.mu-row-play')?.replaceChildren(icon(mine && on ? 'player-pause' : 'player-play'),
          h('span', { class: 'mu-btn-text' }, mine && on ? t('Pause') : t('Play')));
      });
    }

    // ================= Saved list (what the tool opens to) =================
    const listEl = h('div', { class: 'mu-list', role: 'list', 'aria-label': t('Music on this board') });
    const countEl = h('span', { class: 'mu-count' });
    const linkBox = h('input', { type: 'checkbox' });
    linkBox.addEventListener('change', () => {
      ctx.saveBoardData({ timerLink: linkBox.checked });
      ctx.toast(linkBox.checked ? t('Music now starts and stops with the Timer') : t('Music no longer follows the Timer'));
      renderNow();
    });
    const linkRow = h('label', { class: 'mu-link', title: t('When a Timer on this board starts, the music starts. Pausing the Timer pauses it, and it fades out when time is up.') },
      linkBox, icon('hourglass'), h('span', {}, t('Play with the Timer')));
    const listEmpty = h('div', { class: 'empty-state' },
      h('span', { class: 'tool-tile tone-content mu-empty-tile' }, icon('music')),
      h('p', {}, t('No music on this board yet.')),
      h('button', { class: 'btn primary with-icon', onclick: () => showAdd('library') }, icon('plus'), t('Add music')),
    );
    const dropHint = h('div', { class: 'mu-drop', hidden: true }, icon('file-music'), t('Drop music files to add them'));
    const listView = h('div', { class: 'mu-view' },
      h('div', { class: 'mu-bar' },
        countEl,
        h('div', { class: 'row gap' },
          h('button', { class: 'btn small primary with-icon', onclick: () => showAdd() }, icon('plus'), t('Add music')),
        ),
      ),
      listEl, listEmpty, linkRow, nowBar, dropHint,
    );

    function showList() {
      renderList();
      show(listView);
    }

    function subtitle(it) {
      if (it.kind === 'library') {
        const tr = lib.trackById(it.ref);
        const set = lib.SETS.find((s) => s.id === tr?.set);
        return [t('Music library'), set ? lib.setTitle(set) : null, tr ? fmt(tr.duration) : null].filter(Boolean).join(' · ');
      }
      if (it.kind === 'file') return [t('Your file'), it.duration ? fmt(it.duration) : null].filter(Boolean).join(' · ');
      const link = sp.fromRef(it.ref);
      // Without a name, the title already says what it is: show the address instead.
      return it.title || !link ? t(SPOTIFY_KINDS[link?.type] || 'Spotify') : `open.spotify.com/${link.type}/${link.id.slice(0, 8)}…`;
    }

    function renderList(flashId = null) {
      const list = items();
      listEmpty.hidden = list.length > 0;
      listEl.hidden = list.length === 0;
      linkRow.hidden = list.length === 0;
      linkBox.checked = !!data().timerLink;
      countEl.textContent = !list.length ? '' : list.length === 1 ? t('{n} piece of music', { n: 1 }) : t('{n} pieces of music', { n: list.length });
      listEl.replaceChildren(...list.map(rowFor));
      if (flashId) {
        const row = listEl.querySelector(`[data-id="${flashId}"]`);
        row?.classList.add('flash');
        row?.scrollIntoView({ block: 'nearest' });
      }
      renderNow();
      // Music files from a backup or another computer may not be here.
      const files = list.filter((it) => it.kind === 'file' && !missing.has(it.ref));
      if (files.length) {
        Promise.all(files.map(async (it) => [it.ref, await audioStore.has(it.ref)])).then((res) => {
          const gone = res.filter(([, ok]) => !ok).map(([id]) => id);
          if (!gone.length) return;
          gone.forEach((id) => missing.add(id));
          renderList();
        });
      }
    }

    function rowFor(it) {
      const name = titleOf(it);
      const lost = it.kind === 'file' && missing.has(it.ref);
      const playIt = () => {
        if (lost) { ctx.toast(t('That music file isn’t on this computer.')); return; }
        if (playing?.id === it.id && it.kind !== 'spotify') toggle();
        else playItem(it);
      };
      const handle = h('button', { class: 'mu-handle', title: t('Drag to reorder (or use the ↑ ↓ keys)'), 'aria-label': t('Move “{name}”', { name }) }, icon('grip-vertical'));
      const tileIcon = it.kind === 'spotify' ? 'brand-spotify' : it.kind === 'file' ? 'file-music' : 'music';
      const row = h('div', { class: `mu-row kind-${it.kind}${lost ? ' lost' : ''}`, role: 'listitem', 'data-id': it.id },
        handle,
        h('button', { class: 'mu-tile', onclick: playIt, tabindex: '-1', 'aria-hidden': 'true' }, icon(tileIcon), h('span', { class: 'mu-tile-play' }, icon('player-play'))),
        h('div', { class: 'mu-meta' },
          h('button', { class: 'mu-title', onclick: playIt, title: name }, name),
          h('div', { class: 'mu-sub' }, subtitle(it)),
          lost ? h('p', { class: 'mu-warn' }, icon('alert-triangle'), t('This file isn’t on this computer. Add it again from “Your files”.')) : null,
          it.note ? h('p', { class: 'mu-note', title: it.note }, it.note) : null),
        h('div', { class: 'mu-actions' },
          h('button', { class: 'btn small primary with-icon mu-row-play', onclick: playIt, disabled: lost },
            icon('player-play'), h('span', { class: 'mu-btn-text' }, it.kind === 'spotify' ? t('Open') : t('Play'))),
          h('button', { class: 'icon-btn small', title: t('Edit title and note'), 'aria-label': t('Edit “{name}”', { name }), onclick: () => editItem(it.id) }, icon('pencil')),
          confirmButton(icon('trash'), icon('check'), () => removeItem(it.id), 'icon-btn small mu-del',
            { title: t('Remove from this board (click twice)'), 'aria-label': t('Remove “{name}”', { name }) }),
        ),
      );
      dragToReorder(handle, row);
      return row;
    }

    function removeItem(id) {
      const it = find(id);
      if (!it) return;
      if (playing?.id === id) { pause(); playing = null; el.removeAttribute('src'); el.load(); }
      saveItems(items().filter((x) => x.id !== id));
      if (data().current === id) ctx.saveBoardData({ current: null });
      if (it.kind === 'file') ctx.store.freeUnusedAudio([it.ref]);
      renderList();
      ctx.toast(t('Removed from this board'));
    }

    // ---- Reorder: drag the handle, or focus it and press ↑ / ↓ ----
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
          if (order.join() !== items().map((it) => it.id).join()) {
            const byId = new Map(items().map((it) => [it.id, it]));
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
        const list = [...items()];
        const i = list.findIndex((it) => it.id === row.dataset.id);
        const j = i + (e.key === 'ArrowUp' ? -1 : 1);
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        saveItems(list);
        renderList();
        listEl.querySelector(`[data-id="${row.dataset.id}"] .mu-handle`)?.focus();
      });
    }

    // ---- Edit title and note ----
    function editItem(id) {
      const it = find(id);
      if (!it) return;
      openModal(t('Edit music'), (mb) => {
        const title = h('input', { class: 'input', value: titleOf(it), 'aria-label': t('Title') });
        const note = h('textarea', { class: 'input mu-note-input', rows: 3, placeholder: t('e.g. For silent reading'), 'aria-label': t('Teacher note') });
        note.value = it.note || '';
        const form = h('form', { class: 'mu-form' },
          h('label', {}, h('span', {}, t('Title')), title),
          h('label', {}, h('span', {}, t('Teacher note')), note),
          h('p', { class: 'muted small' }, t('Shown in the list on this board only.')),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn primary', type: 'submit' }, t('Save')),
            h('button', { class: 'btn', type: 'button', onclick: closeModal }, t('Cancel')),
          ),
        );
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const typed = title.value.trim();
          // Keep library titles following the interface language unless the teacher renamed them.
          const newTitle = !typed || typed === titleOf({ ...it, title: '' }) ? '' : typed;
          saveItems(items().map((x) => (x.id === id ? { ...x, title: newTitle, note: note.value.trim() } : x)));
          if (playing?.id === id) playing = find(id);
          closeModal();
          renderList(id);
        });
        mb.append(form);
        setTimeout(() => title.focus(), 30);
      });
    }

    function addItem(item, { quiet = false } = {}) {
      const rec = { id: ctx.store.uid(), title: '', note: '', ...item };
      saveItems([...items(), rec]);
      if (!quiet) ctx.toast(t('Added to this board'));
      return rec;
    }
    const onBoard = (kind, ref) => items().some((it) => it.kind === kind && it.ref === ref);

    // ================= Add: library, your files, Spotify =================
    let addTab = 'library';
    const tabBar = h('div', { class: 'mu-tabs', role: 'tablist' });
    const addBody = h('div', { class: 'mu-add-body' });
    const addView = h('div', { class: 'mu-view' },
      h('div', { class: 'mu-bar' },
        h('button', { class: 'btn small with-icon', onclick: () => showList() }, icon('arrow-left'), t('Music on this board')),
      ),
      tabBar, addBody,
    );

    function showAdd(tab = addTab) {
      addTab = tab;
      const tabs = [['library', 'books', t('Music library')], ['files', 'file-music', t('Your files')], ['spotify', 'brand-spotify', 'Spotify']];
      tabBar.replaceChildren(...tabs.map(([id, ic, label]) => h('button', {
        class: 'mu-tab' + (id === addTab ? ' active' : ''), role: 'tab', 'aria-selected': String(id === addTab),
        onclick: () => showAdd(id),
      }, icon(ic), label)));
      if (addTab === 'library') renderLibrary();
      else if (addTab === 'files') renderFiles();
      else renderSpotify();
      if (root.firstChild !== addView) show(addView);
    }

    // ---- Library ----
    function renderLibrary() {
      const card = (tr) => {
        const added = onBoard('library', tr.id);
        const preview = { kind: 'library', ref: tr.id, title: '' };
        const previewing = () => playing && !playing.id && playing.ref === tr.id && isPlaying();
        const pv = h('button', { class: 'mu-tile', title: t('Listen'), 'aria-label': t('Listen to “{name}”', { name: lib.trackTitle(tr) }) });
        const drawPv = () => { pv.replaceChildren(icon('music'), h('span', { class: 'mu-tile-play' + (previewing() ? ' shown' : '') }, icon(previewing() ? 'player-pause' : 'player-play'))); };
        pv.addEventListener('click', async () => {
          if (previewing()) pause(); else await playItem(preview, { remember: false });
          addBody.querySelectorAll('.mu-lib-card').forEach((c) => c._draw?.());
        });
        const addBtn = h('button', { class: 'btn small with-icon', disabled: added, onclick: () => {
          const rec = addItem({ kind: 'library', ref: tr.id });
          if (playing && !playing.id && playing.ref === tr.id) playing = rec;
          renderLibrary();
        } }, icon(added ? 'check' : 'plus'), added ? t('Added') : t('Add'));
        const c = h('div', { class: 'mu-lib-card' }, pv,
          h('div', { class: 'mu-meta' },
            h('div', { class: 'mu-title static' }, lib.trackTitle(tr)),
            h('div', { class: 'mu-sub' }, [t(tr.about), fmt(tr.duration)].join(' · '))),
          addBtn);
        c._draw = drawPv;
        drawPv();
        return c;
      };
      addBody.replaceChildren(
        h('p', { class: 'mu-hint' }, t('Music made for this app, free to use in class. Each track works offline after it has played once.')),
        ...lib.SETS.map((s) => h('section', { class: 'mu-lib-set' },
          h('h4', {}, lib.setTitle(s)),
          ...lib.TRACKS.filter((tr) => tr.set === s.id).map(card))),
        h('p', { class: 'muted small mu-credit' }, t('Composed for 杏坛 · ClassroomBoard and released under CC0. Instrument sounds: FluidR3_GM soundfont by Frank Wen (CC BY 3.0).')),
      );
    }

    // ---- Your files ----
    const fileInput = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac', multiple: true, hidden: true });
    fileInput.addEventListener('change', () => {
      const files = [...fileInput.files];
      fileInput.value = '';
      addFiles(files);
    });
    body.append(fileInput); // outside root, which each view replaces

    async function addFiles(files) {
      files = files.filter(Boolean);
      if (!files.length) return;
      let added = 0; let last = null; let failed = 0;
      for (const f of files) {
        try {
          ctx.toast(t('Adding “{name}”…', { name: f.name }), 8000);
          const rec = await audioStore.add(f);
          last = addItem({ kind: 'file', ref: rec.id, title: rec.name, duration: rec.duration }, { quiet: true });
          added++;
        } catch (err) {
          failed++;
          ctx.toast(err.message || t('This music couldn’t be added.'), 5000);
        }
      }
      if (added) {
        if (!failed) ctx.toast(added === 1 ? t('Added to this board') : t('{n} music files added', { n: added }));
        showList();
        renderList(last?.id);
      }
    }

    function renderFiles() {
      const others = h('div', { class: 'mu-others' });
      addBody.replaceChildren(
        h('div', { class: 'mu-dropzone' },
          icon('file-music'),
          h('button', { class: 'btn primary with-icon', onclick: () => fileInput.click() }, icon('upload'), t('Choose music files')),
          h('p', { class: 'muted small' }, t('or drag them onto this tool. MP3 and M4A work in every browser; up to {max} MB each.', { max: audioStore.MAX_BYTES / 1048576 })),
        ),
        h('p', { class: 'mu-hint' }, t('Music files are kept in this browser on this computer. Full backups include them; shared board files don’t, so colleagues add their own.')),
        others,
      );
      audioStore.list().then((all) => {
        const mine = new Set(items().filter((it) => it.kind === 'file').map((it) => it.ref));
        const rest = all.filter((r) => !mine.has(r.id));
        if (!rest.length) return;
        others.replaceChildren(h('h4', {}, t('Already on this computer')),
          ...rest.map((r) => h('div', { class: 'mu-lib-card' },
            h('span', { class: 'mu-tile' }, icon('file-music')),
            h('div', { class: 'mu-meta' },
              h('div', { class: 'mu-title static' }, r.name),
              h('div', { class: 'mu-sub' }, [r.duration ? fmt(r.duration) : null, `${(r.size / 1048576).toFixed(1)} MB`].filter(Boolean).join(' · '))),
            h('button', { class: 'btn small with-icon', onclick: () => {
              addItem({ kind: 'file', ref: r.id, title: r.name, duration: r.duration });
              renderFiles();
            } }, icon('plus'), t('Add')))));
      }).catch(() => {});
    }

    // Drop music files anywhere on the tool.
    let dragDepth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    body.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; dragDepth++; dropHint.hidden = root.firstChild !== listView; e.preventDefault(); });
    body.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropHint.hidden = true; });
    body.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    body.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      dropHint.hidden = true;
      addFiles([...e.dataTransfer.files]);
    });

    // ---- Spotify ----
    const spInput = h('input', { class: 'input mu-sp-input', type: 'search', placeholder: t('Paste a Spotify playlist, album or song link'), 'aria-label': t('Spotify link'), autocomplete: 'off', enterkeyhint: 'go' });
    const spForm = h('form', { class: 'mu-sp-form' }, spInput, h('button', { class: 'btn primary', type: 'submit' }, t('Go')));
    const spResult = h('div', { class: 'mu-sp-result', 'aria-live': 'polite' });
    let spRequest = 0;
    spForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = spInput.value.trim();
      if (!q) return;
      const mine = ++spRequest;
      const link = sp.parse(q);
      if (link?.short) {
        spResult.replaceChildren(h('p', { class: 'mu-warn' }, icon('alert-triangle'),
          t('Short links (spotify.link) can’t be read here. Open the link, then copy the address that starts with open.spotify.com.')));
        return;
      }
      if (!link) {
        spResult.replaceChildren(h('div', { class: 'mu-message' },
          h('p', {}, t('That isn’t a Spotify link. In Spotify, use Share → Copy link on a playlist, album or song.')),
          /^https?:\/\//i.test(q) ? null : h('a', { class: 'btn small with-icon', href: sp.searchUrl(q), target: '_blank', rel: 'noopener' }, icon('external-link'), t('Search on Spotify'))));
        return;
      }
      const r = sp.ref(link);
      const card = (title) => h('div', { class: 'mu-lib-card' },
        h('span', { class: 'mu-tile kind-spotify' }, icon('brand-spotify')),
        h('div', { class: 'mu-meta' },
          h('div', { class: 'mu-title static' }, title || t(SPOTIFY_KINDS[link.type])),
          h('div', { class: 'mu-sub' }, t(SPOTIFY_KINDS[link.type]))),
        onBoard('spotify', r)
          ? h('button', { class: 'btn small with-icon', disabled: true }, icon('check'), t('Added'))
          : h('button', { class: 'btn small primary with-icon', onclick: () => {
            const rec = addItem({ kind: 'spotify', ref: r, title: title || '' });
            spInput.value = '';
            spResult.replaceChildren();
            showList();
            renderList(rec.id);
          } }, icon('plus'), t('Add to board')));
      spResult.replaceChildren(card(null));
      const title = await sp.lookupTitle(link);
      if (mine === spRequest && title) spResult.replaceChildren(card(title));
    });

    function renderSpotify() {
      addBody.replaceChildren(
        spForm, spResult,
        h('div', { class: 'mu-hint' },
          h('p', {}, t('The board shows Spotify’s own player. Press play in it to start the music.')),
          h('ul', {},
            h('li', {}, t('Whole songs play when you are signed in to Spotify Premium in this browser, on a laptop or desktop. Otherwise Spotify plays 30-second previews.')),
            h('li', {}, t('“Open in Spotify” plays it in the Spotify app instead, if it is installed.')),
            h('li', {}, t('Some school networks block Spotify.'))),
        ),
      );
      setTimeout(() => spInput.focus(), 30);
    }

    // ================= Spotify player =================
    let spController = null; // Spotify iframe API controller, when it loaded
    let spPaused = true;
    let spView = false;      // the Spotify player is showing

    function openSpotify(it) {
      const link = sp.fromRef(it.ref);
      if (!link) return;
      if (isPlaying()) pause({ fade: true });
      if (it.id && find(it.id)) ctx.saveBoardData({ current: it.id });
      let alive = true;
      const frame = h('div', { class: 'mu-sp-frame' }, h('p', { class: 'mu-loading' }, icon('loader-2', { cls: 'spin' }), t('Loading Spotify…')));
      const view = h('div', { class: 'mu-view mu-sp-view' },
        h('div', { class: 'mu-bar' },
          h('button', { class: 'btn small with-icon', onclick: () => showList(), title: t('Back to the music list') }, icon('arrow-left'), t('List')),
          h('span', { class: 'mu-sp-title', title: titleOf(it) }, titleOf(it)),
          h('a', { class: 'btn small with-icon', href: sp.openUrl(link), target: '_blank', rel: 'noopener', title: t('Open in Spotify') }, icon('external-link'), h('span', { class: 'mu-btn-text' }, t('Open in Spotify'))),
        ),
        frame,
        h('p', { class: 'muted small mu-sp-foot' },
          data().timerLink ? [icon('hourglass'), ' ', t('Press play in the Spotify player. The Timer can pause it, and stops it when time is up.')]
            : t('Press play in the Spotify player. Whole songs need Spotify Premium signed in on this browser.')),
      );
      show(view);
      spView = true; // after show(), which closes any earlier player
      renderMini();
      const plain = () => {
        frame.replaceChildren(h('iframe', {
          src: sp.embedUrl(link), title: titleOf(it), loading: 'lazy',
          allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        }));
      };
      sp.loadIframeApi().then((api) => {
        if (!alive) return;
        const host = h('div');
        frame.replaceChildren(host);
        // Sizes are in pixels; the stylesheet then stretches the player to fill the tool.
        api.createController(host, { uri: sp.uri(link), width: 300, height: 352 }, (c) => {
          if (!alive) { try { c.destroy(); } catch (err) { /* ignore */ } return; }
          spController = c;
          spPaused = true;
          c.addListener?.('playback_update', (e) => { spPaused = !!e?.data?.isPaused; renderMini(); });
        });
      }).catch(() => { if (alive) plain(); });
      leaveView = () => {
        alive = false;
        try { spController?.destroy(); } catch (err) { /* ignore */ }
        spController = null;
        spPaused = true;
        spView = false;
        renderMini();
      };
    }

    // ================= Play with the Timer =================
    // The Timer tool tells the board when it starts, pauses, resets or runs out.
    function onTimer(e) {
      if (!data().timerLink) return;
      const action = e.detail?.action;
      if (spController) { // the Spotify player is open
        if (action !== 'start' && !spPaused) { try { spController.pause(); } catch (err) { /* ignore */ } }
        return;
      }
      if (action === 'start') {
        if (isPlaying()) return;
        if (playing && el.src && (!playing.id || find(playing.id))) { stopFade(); el.volume = 0; el.play().then(() => fadeTo(volume(), FADE_IN_MS)).catch(() => {}); return; }
        const it = currentItem();
        if (!it) return;
        if (it.kind === 'spotify') { ctx.toast(t('Open the Spotify player and press play: the app can’t start Spotify.'), 4000); return; }
        playItem(it, { fadeIn: true });
      } else if (action === 'pause') pause({ fade: false });
      else if (action === 'done') pause({ fade: true, rewind: true });
      else if (action === 'reset') pause({ fade: true, rewind: true });
    }
    document.addEventListener('xingtan:timer', onTimer);

    const offBoard = ctx.onBoardDataChange(() => { if (root.firstChild === listView) renderList(); });

    showList();
    return {
      destroy() {
        document.removeEventListener('xingtan:timer', onTimer);
        offBoard?.();
        leaveView?.();
        stopFade();
        loadToken++;
        el.pause();
        el.removeAttribute('src');
        el.load();
      },
    };
  },
};
