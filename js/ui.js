// Small DOM helpers shared by the app and widgets.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  if (el.tagName === 'BUTTON' && !el.hasAttribute('type')) el.type = 'button';
  return el;
}

let toastTimer;
export function toast(msg, ms = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const modal = () => document.getElementById('modal');

export function openModal(title, build) {
  const dlg = modal();
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.replaceChildren();
  build(body);
  if (!dlg.open) dlg.showModal();
}

export function closeModal() {
  const dlg = modal();
  if (dlg.open) dlg.close();
}

// A button that needs a second click to confirm (no browser pop-ups).
export function confirmButton(label, confirmLabel, onConfirm, cls = 'btn danger') {
  let armed = false;
  let timer;
  const btn = h('button', { class: cls }, label);
  btn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      btn.textContent = confirmLabel;
      btn.classList.add('armed');
      timer = setTimeout(() => {
        armed = false;
        btn.textContent = label;
        btn.classList.remove('armed');
      }, 3000);
      return;
    }
    clearTimeout(timer);
    onConfirm();
  });
  return btn;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Short chime using the Web Audio API (no sound files needed).
let audioCtx;
export function chime(times = 3) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    for (let i = 0; i < times; i++) {
      [880, 1318.5].forEach((freq, j) => {
        const t = now + i * 0.6 + j * 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    }
  } catch (err) {
    console.warn('Sound unavailable', err);
  }
}

// Class selector used by widgets that need a class list.
export function classSelect(ctx, selectedId, onChange) {
  const sel = h('select', { class: 'class-select', 'aria-label': 'Class' });
  const fill = () => {
    const classes = ctx.store.getClasses();
    sel.replaceChildren(...classes.map((c) => h('option', { value: c.id }, `${c.name} (${c.students.length})`)));
    const current = ctx.store.getClass(selectedId()) || ctx.store.getActiveClass();
    if (current) sel.value = current.id;
    sel.hidden = classes.length === 0;
  };
  sel.addEventListener('change', () => onChange(sel.value));
  fill();
  return { el: sel, refresh: fill };
}
