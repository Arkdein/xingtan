// Board backgrounds, shared by the board and the boards screen thumbnails.
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

export function backgroundCss(bg = 'navy') {
  if (bg.startsWith('custom:')) return bg.slice(7);
  return (BACKGROUNDS.find((b) => b.id === bg) || BACKGROUNDS[0]).css;
}

export function isLightBackground(bg = 'navy') {
  if (['paper', 'sunset'].includes(bg)) return true;
  if (!bg.startsWith('custom:#')) return false;
  const hex = bg.slice(8);
  const n = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}
