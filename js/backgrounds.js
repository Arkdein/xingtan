// Board backgrounds, shared by the board and the boards screen thumbnails.
//
// board.background is one of:
//   '<preset id>'      a colour preset below
//   'custom:#rrggbb'   a custom colour
//   'lib:<id>'         an image from the bundled library (js/library.js)
//   'upload:<id>'      an image the teacher uploaded (js/images.js)
// board.bgDim (-60…60) lightens (negative) or darkens (positive) an image.
// board.bgLum (0–255) is the image's average brightness, saved when it is chosen.
import { LIBRARY } from './library.js';
import * as images from './images.js';

export const BACKGROUNDS = [
  { id: 'navy', label: 'Navy', css: 'linear-gradient(135deg, #1f3a5f 0%, #2d5a87 100%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(135deg, #1e4d3a 0%, #3a7d5c 100%)' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f093a0 0%, #f7c873 100%)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #2e86ab 0%, #7fd1c7 100%)' },
  { id: 'plum', label: 'Plum', css: 'linear-gradient(135deg, #4b2c5e 0%, #8e5a9e 100%)' },
  { id: 'paper', label: 'Paper', css: '#f4efe6' },
  { id: 'slate', label: 'Slate', css: '#2f343b' },
  { id: 'chalk', label: 'Chalkboard', css: 'radial-gradient(ellipse at center, #3d5a47 0%, #24392c 100%)' },
];

const FALLBACK = '#2f343b';

export const libraryItem = (id) => LIBRARY.find((x) => x.id === id) || null;

export function imageKind(bg = '') {
  if (bg.startsWith('lib:')) return { kind: 'lib', id: bg.slice(4) };
  if (bg.startsWith('upload:')) return { kind: 'upload', id: bg.slice(7) };
  return null;
}

// Colour presets and custom colours only.
export function backgroundCss(bg = 'navy') {
  if (bg.startsWith('custom:')) return bg.slice(7);
  return (BACKGROUNDS.find((b) => b.id === bg) || BACKGROUNDS[0]).css;
}

function overlay(dim) {
  const d = Math.max(-60, Math.min(60, Number(dim) || 0)) / 100;
  if (!d) return '';
  const c = d > 0 ? `rgba(0,0,0,${d})` : `rgba(255,255,255,${-d})`;
  return `linear-gradient(${c}, ${c}), `;
}

// Image URL for a board background, or null if it is a colour (or an upload not loaded yet).
export function imageUrl(bg, { thumb = false } = {}) {
  const k = imageKind(bg);
  if (!k) return null;
  if (k.kind === 'lib') return libraryItem(k.id) ? `backgrounds/${thumb ? 'thumbs/' : ''}${k.id}.webp` : null;
  return thumb ? (images.cachedThumbUrl(k.id) || images.cachedFullUrl(k.id)) : images.cachedFullUrl(k.id);
}

// Full CSS `background` value for a board (or its thumbnail).
export function boardBackgroundCss(board, opts = {}) {
  const bg = board?.background || 'navy';
  if (!imageKind(bg)) return backgroundCss(bg);
  const url = imageUrl(bg, opts);
  if (!url) return FALLBACK;
  return `${overlay(board.bgDim)}url("${url}") center / cover no-repeat, ${FALLBACK}`;
}

// Brightness after the dim overlay, for choosing light or dark corner controls.
export function boardIsLight(board) {
  const bg = board?.background || 'navy';
  const k = imageKind(bg);
  if (!k) return isLightBackground(bg);
  let lum = board.bgLum;
  if (lum == null) lum = k.kind === 'lib' ? libraryItem(k.id)?.lum : images.cachedLum(k.id);
  if (lum == null) return false;
  const d = Math.max(-60, Math.min(60, Number(board.bgDim) || 0)) / 100;
  const after = d > 0 ? lum * (1 - d) : lum + (255 - lum) * -d;
  return after > 150;
}

export function isLightBackground(bg = 'navy') {
  if (['paper', 'sunset'].includes(bg)) return true;
  if (!bg.startsWith('custom:#')) return false;
  const hex = bg.slice(8);
  const n = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

// The fields that make up a board's background, for copies and exports.
export const bgFields = (b) => ({ background: b.background, bgDim: b.bgDim || 0, bgLum: b.bgLum ?? null });
