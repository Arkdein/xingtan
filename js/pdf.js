// Turns PDF pages into pictures for the Images tool, with Mozilla's PDF.js
// (Apache 2.0, bundled in js/vendor/pdfjs so nothing is fetched from other sites).
// PDF.js is loaded only when a PDF is added. The Chinese/Japanese/Korean CMaps,
// standard fonts and image decoders it needs are fetched from the same folder
// only when a PDF uses them.

const BASE = new URL('./vendor/pdfjs/', import.meta.url);
const PAGE_SIDE = 2400; // long side of a page picture, so text stays sharp when zoomed

let lib = null;
async function pdfjs() {
  if (!lib) {
    lib = import('./vendor/pdfjs/pdf.min.mjs').then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', BASE).href;
      return m;
    }).catch((err) => { lib = null; throw err; });
  }
  return lib;
}

export const isPdf = (f) => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));

// Opens a PDF file. Returns { pages, name, page(n) -> Promise<File>, close() }.
export async function open(file) {
  let m;
  try { m = await pdfjs(); } catch (err) {
    throw new Error('The PDF reader couldn’t load. Check the internet connection and try again.');
  }
  let doc, task;
  try {
    task = m.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: new URL('cmaps/', BASE).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('standard_fonts/', BASE).href,
      wasmUrl: new URL('wasm/', BASE).href,
      iccUrl: new URL('iccs/', BASE).href,
      isEvalSupported: false,
      enableXfa: false,
    });
    doc = await task.promise;
  } catch (err) {
    task?.destroy();
    if (err?.name === 'PasswordException') throw new Error('This PDF is password-protected. Save a copy without a password, then add that.');
    throw new Error('This PDF couldn’t be opened. It may be damaged.');
  }
  const name = (file.name || 'PDF').replace(/\.pdf$/i, '').slice(0, 80);
  return {
    pages: doc.numPages,
    name,
    // Draws page n (1-based) on white and returns it as a PNG file.
    async page(n) {
      const page = await doc.getPage(n);
      const v1 = page.getViewport({ scale: 1 });
      const scale = Math.min(4, PAGE_SIDE / Math.max(v1.width, v1.height));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const g = canvas.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: g, canvas, viewport: vp }).promise;
      page.cleanup();
      const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/png'));
      canvas.width = canvas.height = 0;
      return new File([blob], `${name} p${n}.png`, { type: 'image/png' });
    },
    close() { task.destroy(); },
  };
}

// Reads "1-3, 7, 10-" as page numbers within 1..max. Returns null if it can't.
export function parsePages(text, max) {
  const out = new Set();
  for (const part of String(text || '').split(/[,，;；\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)?\s*[-–~至到]\s*(\d+)?$/) || part.match(/^(\d+)$/);
    if (!m) return null;
    const a = +(m[1] || 1);
    const b = m[0].match(/[-–~至到]/) ? +(m[2] || max) : a;
    if (!a || !b) return null;
    for (let i = Math.max(1, Math.min(a, b)); i <= Math.min(max, Math.max(a, b)); i++) out.add(i);
  }
  return out.size ? [...out].sort((x, y) => x - y) : null;
}
