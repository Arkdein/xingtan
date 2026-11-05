// Small DOM helpers shared by the app and widgets.
import { t } from './i18n.js';

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
let toastExpire = null; // called when a toast with an action goes away without being used
// `action` = { label, run, onExpire? } adds a button (such as Undo) to the toast.
export function toast(msg, ms = 2400, action = null) {
  const el = document.getElementById('toast');
  const expire = toastExpire;
  toastExpire = null;
  expire?.(); // a new toast replaces the old one, so its action is no longer offered
  clearTimeout(toastTimer);
  if (action) {
    const btn = h('button', { class: 'toast-action' }, action.label);
    btn.addEventListener('click', () => {
      toastExpire = null;
      clearTimeout(toastTimer);
      el.classList.remove('show', 'has-action');
      action.run();
    });
    el.replaceChildren(h('span', {}, msg), btn);
    toastExpire = action.onExpire || null;
  } else {
    el.textContent = msg;
  }
  el.classList.toggle('has-action', !!action);
  el.classList.add('show');
  toastTimer = setTimeout(() => {
    el.classList.remove('show', 'has-action');
    const done = toastExpire;
    toastExpire = null;
    done?.();
  }, ms);
}

const modal = () => document.getElementById('modal');

// `wide` gives the dialog more room (for editors with tables).
export function openModal(title, build, { wide = false } = {}) {
  const dlg = modal();
  dlg.classList.toggle('wide', wide);
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
// `label` may be text or an element (such as an icon).
export function confirmButton(label, confirmLabel, onConfirm, cls = 'btn danger', attrs = {}) {
  let armed = false;
  let timer;
  const show = (x) => btn.replaceChildren(typeof x === 'string' ? x : x.cloneNode(true));
  const btn = h('button', { class: cls, ...attrs });
  show(label);
  btn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      show(confirmLabel);
      btn.classList.add('armed');
      timer = setTimeout(() => {
        armed = false;
        show(label);
        btn.classList.remove('armed');
      }, 3000);
      return;
    }
    clearTimeout(timer);
    onConfirm();
  });
  return btn;
}

// replaceChildren that skips null / false (for optional parts of a view).
export function put(el, ...kids) {
  el?.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));
}

// A row of joined buttons, one of them active. options: [[value, label], …]
export function segmented(options, value, onPick, label) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label },
    ...options.map(([v, text]) => h('button', {
      class: 'seg-btn' + (v === value ? ' active' : ''), 'aria-pressed': String(v === value), onclick: () => onPick(v),
    }, text)));
}

// Labels in English, Chinese or both: lang is 'en', 'zh' or 'both'.
export function bi(en, zh, lang, sep = ' · ') {
  if (lang === 'en') return en || zh;
  if (lang === 'zh') return zh || en;
  return en && zh && en !== zh ? `${en}${sep}${zh}` : en || zh;
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
  const sel = h('select', { class: 'class-select', 'aria-label': t('Class') });
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
