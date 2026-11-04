import * as store from './store.js';
import { h, openModal, confirmButton, toast } from './ui.js';
import { removeClassPoints } from './points.js';
import { forget as forgetPolls } from './polls.js';
import { t } from './i18n.js';

function parseNames(text) {
  // One name per line. Also accepts rows pasted from Excel/Sheets (first column).
  return text
    .split(/\r?\n/)
    .map((line) => line.split('\t')[0].trim())
    .filter(Boolean);
}

export function openClassManager(editId = null) {
  openModal(t('Class lists'), (body) => {
    if (editId !== null) renderEditor(body, editId);
    else renderList(body);
  });
}

function renderList(body) {
  body.replaceChildren();
  const s = store.get();
  const active = store.getActiveClass();

  body.append(h('p', { class: 'muted' },
    t('Names are saved only in this browser. Pickers and group makers use the current class.')));

  if (s.classes.length === 0) {
    body.append(h('div', { class: 'empty-state' },
      h('p', {}, t('No classes yet.')),
    ));
  } else {
    const list = h('ul', { class: 'class-list' });
    s.classes.forEach((c) => {
      const isActive = active && active.id === c.id;
      list.append(h('li', { class: 'class-row' + (isActive ? ' active' : '') },
        h('label', { class: 'class-pick' },
          h('input', {
            type: 'radio', name: 'active-class', checked: isActive,
            onchange: () => { store.update((st) => { st.activeClassId = c.id; }); renderList(body); },
          }),
          h('span', { class: 'class-name' }, c.name),
          h('span', { class: 'muted' }, c.students.length === 1 ? t('{n} student', { n: 1 }) : t('{n} students', { n: c.students.length })),
        ),
        h('div', { class: 'row gap' },
          h('button', { class: 'btn small', onclick: () => renderEditor(body, c.id) }, t('Edit')),
          confirmButton(t('Delete'), t('Sure?'), () => {
            store.update((st) => {
              st.classes = st.classes.filter((x) => x.id !== c.id);
              removeClassPoints(st, c.id);
              forgetPolls(st, c.id);
              if (st.activeClassId === c.id) st.activeClassId = st.classes[0]?.id || null;
            });
            renderList(body);
          }, 'btn small danger'),
        ),
      ));
    });
    body.append(list);
  }

  body.append(h('div', { class: 'row gap' },
    h('button', { class: 'btn primary', onclick: () => renderEditor(body, '') }, t('+ New class')),
  ));
}

function renderEditor(body, id) {
  body.replaceChildren();
  const existing = id ? store.getClass(id) : null;
  const nameInput = h('input', {
    type: 'text', class: 'input', placeholder: t('e.g. 25S01 or J1 H2 Translation'),
    value: existing ? existing.name : '', maxlength: 60,
  });
  const namesInput = h('textarea', {
    class: 'input names', rows: 12,
    placeholder: t('One name per line.\nYou can paste a column from Excel or Google Sheets.\n\nTan Wei Ling\nMuhammad Irfan\n李明轩'),
  });
  namesInput.value = existing ? existing.students.join('\n') : '';
  const count = h('span', { class: 'muted' });
  const updateCount = () => {
    const n = parseNames(namesInput.value).length;
    count.textContent = n === 1 ? t('{n} name', { n }) : t('{n} names', { n });
  };
  namesInput.addEventListener('input', updateCount);
  updateCount();

  const save = () => {
    const name = nameInput.value.trim();
    const students = parseNames(namesInput.value);
    if (!name) { toast(t('Give the class a name')); nameInput.focus(); return; }
    store.update((st) => {
      if (existing) {
        const c = st.classes.find((x) => x.id === existing.id);
        c.name = name;
        c.students = students;
      } else {
        const newId = store.uid();
        st.classes.push({ id: newId, name, students });
        if (!st.activeClassId) st.activeClassId = newId;
      }
    });
    toast(t('Class saved'));
    renderList(body);
  };

  body.append(
    h('label', { class: 'field' }, h('span', {}, t('Class name')), nameInput),
    h('label', { class: 'field' }, h('span', {}, t('Students')), namesInput),
    h('div', { class: 'row gap space-between' },
      count,
      h('div', { class: 'row gap' },
        h('button', { class: 'btn', onclick: () => renderList(body) }, t('Cancel')),
        h('button', { class: 'btn primary', onclick: save }, t('Save')),
      ),
    ),
  );
  setTimeout(() => (existing ? namesInput : nameInput).focus(), 50);
}
