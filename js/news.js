// Update announcements: the What's new banner on the boards screen, the 🔔 in
// the corner menu (with a dot while there is something unread) and its panel.
//
// The notes themselves are the guide's What's new entries (js/guide/news.js);
// an entry with an `id` is an announcement. Which ones a teacher has dismissed
// is kept in this browser (meta.newsSeen), like everything else, and goes into
// full backups. Nothing is fetched or sent anywhere.
import * as store from './store.js';
import { h, inline, openModal, closeModal } from './ui.js';
import { icon } from './icons.js';
import { t, getLang, locale } from './i18n.js';
import { whatsnew } from './guide/news.js';

// Announcements began with this update. Teachers who used the app before it
// see announcements from this day on; older notes stay in the guide only.
const LAUNCH = '2026-11-17';
const PANEL_MAX = 12; // notes listed in the 🔔 panel; the guide has them all

const listeners = new Set();
// fn() after something is dismissed, here or in the 🔔 panel.
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function changed() {
  refreshDot();
  listeners.forEach((fn) => fn());
}

const announcements = () => whatsnew.filter((n) => n.id);

// The first time this runs in a browser: a teacher with no boards or classes yet
// is new, starts with every note read, and gets a welcome instead. A teacher who
// already used the app sees the announcements from LAUNCH on.
function ensure() {
  const m = store.get();
  if (Array.isArray(m.newsSeen)) return;
  const fresh = (m.classes || []).length === 0 && store.listBoards().length === 0;
  const seen = announcements().filter((n) => fresh || n.date < LAUNCH).map((n) => n.id);
  store.update((mm) => { mm.newsSeen = seen; mm.newsWelcome = fresh; }, { notify: false });
}

export function unread() {
  ensure();
  const seen = new Set(store.get().newsSeen || []);
  return announcements().filter((n) => !seen.has(n.id));
}

function markRead(ids) {
  store.update((m) => {
    m.newsSeen = [...new Set([...(Array.isArray(m.newsSeen) ? m.newsSeen : []), ...ids])];
  }, { notify: false });
  changed();
}

// The welcome tour's card (boards.js) takes the place of this welcome for a new teacher.
export function dismissWelcome() {
  store.update((m) => { m.newsWelcome = false; }, { notify: false });
  changed();
}

// ---------- Drawing a note ----------
const text = (n) => n[getLang()] || n.en;
const guideLink = (n) => (n.tool ? `guide.html#tool-${n.tool}` : n.more ? `guide.html#${n.more}` : null);

function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

function note(n, { isNew = false } = {}) {
  const href = guideLink(n);
  return h('li', { class: 'news-item' + (isNew ? ' new' : '') },
    h('time', { datetime: n.date }, fmtDate(n.date)),
    h('span', { class: 'news-text' },
      isNew ? h('span', { class: 'news-badge' }, t('Unread')) : null,
      inline(text(n)),
      href ? h('a', { href, target: '_blank', rel: 'noopener', class: 'news-more' }, t('Read more'), ' ↗') : null));
}

// ---------- Boards screen ----------
// The welcome (for a new teacher) or the unread announcements, or null.
export function banner() {
  ensure();
  if (store.get().newsWelcome) {
    return h('div', { class: 'news-banner welcome', role: 'status' },
      h('img', { src: 'icons/icon.svg', alt: '', class: 'news-logo' }),
      h('div', { class: 'news-body' },
        h('strong', {}, t('Welcome to 杏坛 · ClassroomBoard')),
        h('span', {}, t('The Quick start in the user guide takes five minutes and gets your first board ready. New features will be announced here.'))),
      h('div', { class: 'row gap' },
        h('a', { class: 'btn primary with-icon', href: 'guide.html#quick-start', target: '_blank', rel: 'noopener' }, icon('help'), t('Quick start')),
        h('button', { class: 'btn', onclick: dismissWelcome }, t('Dismiss'))));
  }
  const list = unread();
  if (!list.length) return null;
  return h('section', { class: 'news-banner', 'aria-label': t('What’s new') },
    icon('bell'),
    h('div', { class: 'news-body' },
      h('strong', {}, list.length === 1 ? t('What’s new') : t('What’s new ({n} updates)', { n: list.length })),
      h('ul', { class: 'news-list' }, ...list.map((n) => note(n)))),
    h('div', { class: 'news-actions' },
      h('button', { class: 'btn primary', onclick: () => markRead(list.map((n) => n.id)) }, t('Dismiss')),
      h('a', { class: 'link-btn', href: 'guide.html#whats-new', target: '_blank', rel: 'noopener' }, t('All updates'))));
}

// ---------- 🔔 in the corner menu ----------
export function refreshDot() {
  const btn = document.getElementById('btn-news');
  if (!btn) return;
  const n = unread().length;
  btn.classList.toggle('has-new', n > 0);
  const label = n ? t('What’s new ({n} unread)', { n }) : t('What’s new');
  btn.title = label;
  btn.setAttribute('aria-label', label);
}

export function openPanel() {
  const fresh = new Set(unread().map((n) => n.id));
  openModal(t('What’s new'), (body) => {
    const notes = whatsnew.slice(0, PANEL_MAX);
    // Unread ones first if any are further down.
    notes.sort((a, b) => Number(fresh.has(b.id)) - Number(fresh.has(a.id)));
    body.append(
      h('ul', { class: 'news-list panel-list' }, ...notes.map((n) => note(n, { isNew: fresh.has(n.id) }))),
      h('div', { class: 'row gap space-between news-panel-foot' },
        h('a', { href: 'guide.html#whats-new', target: '_blank', rel: 'noopener' }, t('All updates in the user guide'), ' ↗'),
        fresh.size
          ? h('button', { class: 'btn primary', onclick: () => { markRead([...fresh]); closeModal(); } }, t('Mark as read'))
          : h('button', { class: 'btn', onclick: closeModal }, t('Close'))));
  }, { wide: true });
}
