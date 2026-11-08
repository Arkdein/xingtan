// Formatted text for the Text tool.
//
// The Text tool keeps its content as a small piece of HTML. Anything that
// reaches the screen (a saved board, an imported board file, a backup, a paste)
// passes through cleanHtml() first. It rebuilds the content from scratch and
// lets through only:
//   bold, italic, underline, bullet and numbered lists, line breaks,
//   text colour and highlight colour, and simple tables (rows of cells, with
//   an optional header row; no merged cells, widths or tables inside tables).
// Everything else (scripts, links, images, fonts, sizes, classes, other
// attributes) is dropped, so a board file can never carry hidden code.

// Removed together with everything inside them.
const DROP = new Set([
  'script', 'style', 'template', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'svg', 'math', 'canvas', 'noscript', 'noembed', 'noframes', 'head', 'title', 'meta', 'link', 'base',
  'img', 'picture', 'video', 'audio', 'source', 'track', 'map', 'area',
  'input', 'textarea', 'select', 'option', 'button', 'datalist', 'output', 'dialog',
]);

// Kept as they are.
const KEEP = new Set(['b', 'i', 'u', 'br', 'div', 'ul', 'ol', 'li']);

// Renamed to an allowed tag.
const RENAME = {
  strong: 'b', em: 'i', ins: 'u', cite: 'i', dfn: 'i', var: 'i',
  p: 'div', h1: 'div', h2: 'div', h3: 'div', h4: 'div', h5: 'div', h6: 'div',
  blockquote: 'div', section: 'div', article: 'div', header: 'div', footer: 'div', aside: 'div',
  nav: 'div', main: 'div', figure: 'div', figcaption: 'div', address: 'div', pre: 'div', center: 'div',
  tr: 'div', dt: 'div', dd: 'div', caption: 'div', summary: 'div', details: 'div', hr: 'br',
};

// Tables are rebuilt as <table><tbody><tr><th|td>, every row the same length.
const MAX_ROWS = 40;
const MAX_COLS = 12;

// Headings stay bold after they become plain lines.
const BOLD_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'dt']);

// A colour is kept only if it is a plain hex, rgb() or named value.
const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\)|[a-z]{3,20})$/i;

export function safeColour(v) {
  v = (v || '').trim().toLowerCase();
  if (!v || !COLOUR.test(v)) return '';
  if (['transparent', 'inherit', 'initial', 'unset', 'currentcolor', 'revert', 'windowtext', 'none'].includes(v)) return '';
  if (/^rgba\(/.test(v) && /,\s*0(\.0*)?\s*\)$/.test(v)) return ''; // fully transparent
  return v;
}

function formatOf(el, tag, colours) {
  const s = el.style || {};
  const weight = String(s.fontWeight || '');
  const deco = `${s.textDecoration || ''} ${s.textDecorationLine || ''}`;
  return {
    bold: tag !== 'b' && (BOLD_TAGS.has(tag) || /^(bold|bolder|[6-9]00)$/.test(weight)),
    italic: tag !== 'i' && /italic|oblique/.test(s.fontStyle || ''),
    underline: tag !== 'u' && /underline/.test(deco),
    color: colours ? safeColour(tag === 'font' ? el.getAttribute('color') : s.color) : '',
    bg: colours ? safeColour(s.backgroundColor) : '',
  };
}

// Wraps `inner` in b / i / u / a colour span for the formatting `fmt` asks for;
// returns the innermost element.
function wrapFormat(inner, fmt, out) {
  const wrap = (t) => { const w = out.createElement(t); inner.appendChild(w); inner = w; };
  if (fmt.bold) wrap('b');
  if (fmt.italic) wrap('i');
  if (fmt.underline) wrap('u');
  if (fmt.color || fmt.bg) {
    const span = out.createElement('span');
    if (fmt.color) span.style.color = fmt.color;
    if (fmt.bg) span.style.backgroundColor = fmt.bg;
    if (span.getAttribute('style')) { inner.appendChild(span); inner = span; }
  }
  return inner;
}

// A table, rebuilt cell by cell. Merged cells become a cell and empty ones, so
// the columns still line up. A table inside a cell becomes lines of text.
function copyTable(table, dest, out, opts) {
  const rows = [...table.rows].slice(0, MAX_ROWS).filter((r) => r.cells.length);
  if (!rows.length) return;
  const span = (c) => Math.max(1, Math.min(MAX_COLS, c.colSpan || 1));
  const width = Math.min(MAX_COLS, Math.max(...rows.map((r) => [...r.cells].reduce((n, c) => n + span(c), 0))));
  const first = rows[0];
  const head = first.parentElement?.tagName === 'THEAD' || [...first.cells].every((c) => c.tagName === 'TH');
  const empty = (tag) => { const c = out.createElement(tag); c.appendChild(out.createElement('br')); return c; };
  const tbl = out.createElement('table');
  const body = out.createElement('tbody');
  tbl.appendChild(body);
  rows.forEach((r, i) => {
    const tag = i === 0 && head ? 'th' : 'td';
    const tr = out.createElement('tr');
    let n = 0;
    for (const c of r.cells) {
      if (n >= width) break;
      const cell = out.createElement(tag);
      const inner = wrapFormat(cell, formatOf(c, 'td', opts.colours), out);
      copyChildren(c, inner, out, { ...opts, inTable: true }, null);
      // Spaces left from the page's layout at either end of the cell.
      const ends = [cell.firstChild, cell.lastChild];
      ends.forEach((x) => { if (x?.nodeType === 3) x.nodeValue = x === cell.firstChild ? x.nodeValue.replace(/^ +/, '') : x.nodeValue.replace(/ +$/, ''); });
      if (!cell.textContent.trim() && !cell.querySelector('li')) cell.replaceChildren(out.createElement('br'));
      tr.appendChild(cell);
      n += 1;
      for (let k = 1; k < span(c) && n < width; k += 1, n += 1) tr.appendChild(empty(tag));
    }
    for (; n < width; n += 1) tr.appendChild(empty(tag));
    body.appendChild(tr);
  });
  dest.appendChild(tbl);
}

function copyChildren(src, dest, out, opts, inList) {
  for (const node of src.childNodes) {
    if (node.nodeType === 3) {
      // Collapse layout whitespace the way the browser displays it.
      // Non-breaking spaces (typed double spaces) are left alone.
      const t = node.nodeValue.replace(/[\t\n\r ]+/g, ' ');
      if (t) dest.appendChild(out.createTextNode(t));
      continue;
    }
    if (node.nodeType !== 1) continue; // comments and the like
    const tag = node.tagName.toLowerCase();
    if (DROP.has(tag) || (tag.includes(':') && tag !== 'o:p')) continue; // Office/XML extras
    if (node.getAttribute && /mso-list\s*:\s*ignore/i.test(node.getAttribute('style') || '')) {
      // Word's own bullet characters in front of list paragraphs.
      continue;
    }

    if (tag === 'table' && !opts.inTable && node.rows) { copyTable(node, dest, out, opts); continue; }

    let name = KEEP.has(tag) ? tag : RENAME[tag] || null;
    if (name === 'li' && !inList) name = 'div';
    if (name === 'br') { dest.appendChild(out.createElement('br')); continue; }

    const fmt = formatOf(node, name || tag, opts.colours);
    const box = name ? out.createElement(name) : null;
    const root = box || out.createDocumentFragment();
    const inner = wrapFormat(root, fmt, out);

    const childList = name === 'ul' || name === 'ol' ? 'list' : name === 'li' ? 'item' : inList;
    copyChildren(node, inner, out, opts, childList);

    // Cells of a table inside a table sit side by side, so keep a space between them.
    if (tag === 'td' || tag === 'th') inner.appendChild(out.createTextNode(' '));
    // Text directly inside a list (not in an item) becomes an item.
    if ((name === 'ul' || name === 'ol') && box) {
      for (const c of [...box.childNodes]) {
        if (c.nodeType === 3 && !c.nodeValue.trim()) { c.remove(); continue; }
        if (c.nodeName !== 'LI' && c.nodeName !== 'UL' && c.nodeName !== 'OL') {
          const li = out.createElement('li');
          box.replaceChild(li, c);
          li.appendChild(c);
        }
      }
      if (!box.childNodes.length) continue;
    }
    dest.appendChild(root);
  }
}

// Returns safe HTML. With { colours: false } text and highlight colours are
// dropped too (used for pasting, where colours were made for another page).
export function cleanHtml(html, { colours = true } = {}) {
  if (!html) return '';
  const src = new DOMParser().parseFromString(String(html), 'text/html');
  const out = document.implementation.createHTMLDocument('');
  const holder = out.createElement('div');
  copyChildren(src.body, holder, out, { colours }, null);
  // Drop formatting tags left with nothing inside.
  let changed = true;
  while (changed) {
    changed = false;
    holder.querySelectorAll('b, i, u, span').forEach((el) => {
      if (!el.firstChild) { el.remove(); changed = true; }
    });
  }
  return holder.innerHTML.trim();
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

// Plain text (an older Text tool, or a plain-text paste) as HTML.
export function textToHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[&<>"]/g, (c) => ESC[c])
    .replace(/\t/g, '    ')
    .replace(/ {2}/g, '  ')
    .replace(/\n/g, '<br>');
}
