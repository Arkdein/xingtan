// The user guide page (guide.html). Draws everything from js/guide/index.js and
// js/guide/sections.js in the app's language, which the 中文 / EN button switches
// (for the app too, as they share the setting).
import { h } from '../ui.js';
import { getLang, setLang, onLangChange } from '../i18n.js';
import { icon } from '../icons.js';
import { widgets, widgetByType } from '../widgets/index.js';
import { GROUPS, LABELS, renderCard, renderSection, inline, toolTitle } from './index.js';
import * as S from './sections.js';

const root = document.getElementById('guide');

function fmtDate(iso, lang) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === 'zh' ? 'zh-SG' : 'en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function render() {
  const lang = getLang();
  const L = LABELS[lang];
  document.title = `${L.guide} · 杏坛 · ClassroomBoard`;

  const toolLink = (type) => {
    const def = widgetByType[type];
    return def ? h('a', { href: `#tool-${type}` }, toolTitle(def)) : type;
  };

  // Contents (left) and the guide (right).
  const navItem = (id, label) => h('li', {}, h('a', { href: `#${id}` }, label));
  const toolNav = h('ul', { class: 'g-nav-tools' });
  const toolsSec = h('section', { class: 'g-section', id: 'tools' }, h('h2', {}, L.tools));

  GROUPS.forEach((g) => {
    const defs = widgets.filter((w) => (w.tone || 'content') === g.tone);
    if (!defs.length) return;
    toolsSec.append(h('h3', { class: 'g-group' }, h('span', { class: `g-dot tone-${g.tone}` }), g[lang]));
    defs.forEach((def) => {
      toolsSec.append(renderCard(def, lang));
      toolNav.append(h('li', {}, h('a', { href: `#tool-${def.type}` },
        h('span', { class: `tool-tile mini tone-${def.tone || 'content'}` }, icon(def.icon)), toolTitle(def))));
    });
  });

  const news = h('section', { class: 'g-section', id: 'whats-new' }, h('h2', {}, L.newest),
    h('ul', { class: 'g-news' }, ...S.whatsnew.map((n) => h('li', {},
      h('time', { datetime: n.date }, fmtDate(n.date, lang)), ' ',
      h('span', {}, inline(n[lang] || n.en)),
      n.tool && widgetByType[n.tool] ? h('span', {}, ' → ', toolLink(n.tool)) : null))));

  const dataSec = renderSection('data', S.data[lang], lang);
  dataSec.append(h('p', {}, h('a', { href: 'privacy.html', target: '_blank', rel: 'noopener' }, `${L.privacy} ↗`)));

  const nav = h('nav', { class: 'g-nav', 'aria-label': L.contents },
    h('h2', {}, L.contents),
    h('ul', {},
      navItem('quick-start', S.quickstart[lang].title),
      navItem('in-the-classroom', S.recipes[lang].title),
      h('li', {}, h('a', { href: '#tools' }, L.tools), toolNav),
      navItem('boards', S.boards[lang].title),
      navItem('data', S.data[lang].title),
      navItem('help', S.faq[lang].title),
      navItem('whats-new', L.newest)));

  const langBtn = h('button', {
    class: 'g-lang', lang: lang === 'zh' ? 'en' : 'zh',
    title: lang === 'zh' ? 'Switch to English' : '切换到中文',
    onclick: () => setLang(lang === 'zh' ? 'en' : 'zh'),
  }, lang === 'zh' ? 'EN' : '中文');

  root.replaceChildren(
    h('header', { class: 'g-top' },
      h('a', { class: 'g-brand', href: './' },
        h('img', { src: 'icons/icon.svg', alt: '' }),
        h('span', { class: 'brand-zh' }, '杏坛'), h('span', { class: 'g-brand-dot' }, '·'), h('span', { class: 'g-brand-en' }, 'ClassroomBoard')),
      h('span', { class: 'g-top-title' }, L.guide),
      h('span', { class: 'g-grow' }),
      langBtn,
      h('a', { class: 'g-open', href: './' }, L.openApp)),
    h('div', { class: 'g-layout' },
      nav,
      h('main', { class: 'g-main' },
        renderSection('quick-start', S.quickstart[lang], lang),
        renderSection('in-the-classroom', S.recipes[lang], lang, { toolLink }),
        toolsSec,
        renderSection('boards', S.boards[lang], lang),
        dataSec,
        renderSection('help', S.faq[lang], lang),
        news,
        h('p', { class: 'g-foot' }, h('a', { href: '#top' }, `↑ ${L.back}`), ' · ',
          `© ${new Date().getFullYear()} arkdein · 杏坛 · ClassroomBoard`))));
}

render();
onLangChange(() => {
  const y = window.scrollY;
  const id = location.hash.slice(1);
  render();
  if (id) showTarget();
  else window.scrollTo(0, y);
});

// Open at the card or section in the address (the "?" panels link to #tool-<type>),
// and mark it, since it was drawn after the page loaded.
function showTarget() {
  document.querySelectorAll('.g-hit').forEach((el) => el.classList.remove('g-hit'));
  const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!el) return;
  if (el.classList.contains('g-card')) el.classList.add('g-hit');
  el.scrollIntoView();
}
window.addEventListener('hashchange', showTarget);
if (location.hash) requestAnimationFrame(showTarget);
