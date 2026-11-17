import * as store from './store.js';
import { h, openModal, confirmButton, toast } from './ui.js';
import { removeClassPoints } from './points.js';
import { forget as forgetPolls } from './polls.js';
import { t } from './i18n.js';
import * as roster from './roster.js';

function parseNames(text) {
  // One name per line. Also accepts rows pasted from Excel/Sheets (first column).
  // A name typed twice is kept once.
  return [...new Set(text
    .split(/\r?\n/)
    .map((line) => roster.cleanName(line.split('\t')[0]))
    .filter(Boolean))];
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

// draft: { name, text } when coming back from the check screen, so nothing typed is lost.
function renderEditor(body, id, draft = null) {
  body.replaceChildren();
  const existing = id ? store.getClass(id) : null;
  const nameInput = h('input', {
    type: 'text', class: 'input', placeholder: t('e.g. 25S01 or J1 H2 Translation'),
    value: draft ? draft.name : existing ? existing.name : '', maxlength: 60,
  });
  const namesInput = h('textarea', {
    class: 'input names', rows: 12,
    placeholder: t('One name per line.\nYou can paste a column from Excel or Google Sheets.\n\nTan Wei Ling\nMuhammad Irfan\n李明轩'),
  });
  namesInput.value = draft ? draft.text : existing ? existing.students.join('\n') : '';
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
    const current = existing && store.getClass(existing.id);
    if (current) {
      // Names gone from the list: check what happens to their points first.
      const diff = roster.compare(current.id, current.students, students);
      if (diff.removed.length) {
        renderCheck(body, current, name, students, diff, { name: nameInput.value, text: namesInput.value });
        return;
      }
      roster.saveClass(current.id, name, students);
    } else {
      store.update((st) => {
        const newId = store.uid();
        st.classes.push({ id: newId, name, students });
        if (!st.activeClassId) st.activeClassId = newId;
      });
    }
    toast(t('Class saved'));
    renderList(body);
  };

  body.append(
    h('label', { class: 'field' }, h('span', {}, t('Class name')), nameInput),
    h('label', { class: 'field' }, h('span', {}, t('Students')), namesInput),
    existing ? h('p', { class: 'muted small' }, t('Taking a name off the list keeps that student’s points, in case they come back. To fix the spelling of a name, just change it: you’ll be asked whether the points go with it.')) : null,
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

// Before saving an edited list that drops names: who joins, who leaves, and
// whether a student's points go to a new spelling of their name.
function renderCheck(body, cls, className, students, diff, draft) {
  body.replaceChildren();
  const KEEP = '';
  const choice = {}; // removed name -> added name, or KEEP
  const withPoints = diff.removed.filter((r) => r.kept);
  const without = diff.removed.filter((r) => !r.kept);
  withPoints.forEach((r) => { choice[r.name] = diff.guesses[r.name] || KEEP; });
  const fmt = (n) => (n < 0 ? `−${-n}` : String(n));

  const rows = withPoints.map((r) => {
    const sel = h('select', { class: 'input small', 'aria-label': t('Points for {name}', { name: r.name }) },
      h('option', { value: KEEP }, t('Keep them under Past students')),
      ...diff.added.map((a) => h('option', { value: a }, t('Move them to {name}', { name: a }))));
    sel.value = choice[r.name];
    sel.addEventListener('change', () => { choice[r.name] = sel.value; });
    return h('div', { class: 'class-check-row' },
      h('div', {}, h('strong', {}, r.name), ' ', h('span', { class: 'muted' }, t('{n} points', { n: fmt(r.total) }))),
      sel);
  });

  const confirm = () => {
    const targets = Object.values(choice).filter(Boolean);
    if (new Set(targets).size !== targets.length) {
      toast(t('Two students’ points can’t both move to the same name.'));
      return;
    }
    roster.saveClass(cls.id, className, students, Object.entries(choice).filter(([, to]) => to).map(([from, to]) => [from, to]));
    toast(t('Class saved'));
    renderList(body);
  };

  body.append(
    h('h3', { class: 'class-check-title' }, t('Check the changes to {name}', { name: className })),
    diff.added.length ? h('p', {}, h('strong', {}, t('Joining ({n}):', { n: diff.added.length })), ' ', diff.added.join(', ')) : null,
    without.length ? h('p', {}, h('strong', {}, t('Leaving ({n}):', { n: without.length })), ' ', without.map((r) => r.name).join(', ')) : null,
    withPoints.length ? h('div', { class: 'class-check' },
      h('p', {}, h('strong', {}, t('Leaving, with points ({n}):', { n: withPoints.length })), ' ',
        diff.added.length
          ? t('If a name was only spelt differently, move the points to the new spelling.')
          : t('Their points are kept under Past students in the Points tool, and come back if the name is added again.')),
      diff.added.length ? h('div', { class: 'class-check-list' }, ...rows) : null,
    ) : null,
    h('div', { class: 'row gap space-between' },
      h('span', {}),
      h('div', { class: 'row gap' },
        h('button', { class: 'btn', onclick: () => renderEditor(body, cls.id, draft) }, t('Back')),
        h('button', { class: 'btn primary', onclick: confirm }, t('Save')),
      ),
    ),
  );
}
