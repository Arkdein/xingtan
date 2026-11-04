// Google Forms and Sheets for thinking routines and polls: make a form for one
// routine run (or reuse the class's poll form), read its answers, close it,
// and save the answers to the class's Sheet.
// Everything lives in a "杏坛 ClassroomBoard" folder in the teacher's Drive.
import * as google from './google.js';
import * as store from './store.js';
import { tr, EXTRA } from './routines.js';
import { locale } from './i18n.js';

const FORMS = 'https://forms.googleapis.com/v1/forms';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_NAME = '杏坛 ClassroomBoard';

// Per Google account, so switching accounts never reuses another account's files.
function acct() {
  const email = google.status().email || 'unknown';
  const g = store.get().google || {};
  return { email, data: g[email] || { folderId: null, sheets: {} } };
}
function saveAcct(patch) {
  const { email, data } = acct();
  store.update((m) => {
    m.google = m.google || {};
    m.google[email] = { ...data, ...patch, sheets: { ...data.sheets, ...(patch.sheets || {}) },
      polls: { ...(data.polls || {}), ...(patch.polls || {}) } };
  }, { notify: false });
}

async function folderId() {
  const { data } = acct();
  if (data.folderId) {
    try {
      const f = await google.api('GET', `${DRIVE}/${data.folderId}?fields=id,trashed`);
      if (!f.trashed) return f.id;
    } catch (e) { if (e.status !== 404 && e.status !== 403) throw e; }
  }
  const f = await google.api('POST', `${DRIVE}?fields=id`, { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' });
  saveAcct({ folderId: f.id });
  return f.id;
}

// Moving into the folder is tidy-up only: a failure here never stops a lesson.
async function intoFolder(fileId) {
  try {
    const fid = await folderId();
    const f = await google.api('GET', `${DRIVE}/${fileId}?fields=parents`);
    const remove = (f.parents || []).filter((p) => p !== fid).join(',');
    await google.api('PATCH', `${DRIVE}/${fileId}?addParents=${fid}${remove ? '&removeParents=' + remove : ''}&fields=id`, {});
  } catch (e) { console.warn('Could not move file into folder', e); }
}

const stamp = () => new Date().toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// run: { routine, lang, names, topic, viewpoints, sides }
// Returns { formId, url, qmap } where qmap maps questionId -> 'name' | 'vp' | 'pos' | step id.
export async function createForm(run) {
  const { routine, lang } = run;
  const keys = [];
  const items = [];
  const text = (title, paragraph, required) => ({ title, questionItem: { question: { required, textQuestion: { paragraph } } } });
  if (run.names !== 'none') { keys.push('name'); items.push(text(tr(EXTRA.name, lang, ' '), false, true)); }
  if (routine.kind === 'viewpoints') {
    keys.push('vp');
    items.push({ title: tr(EXTRA.viewpoint, lang, ' '), questionItem: { question: { required: true,
      choiceQuestion: { type: 'RADIO', options: run.viewpoints.map((v) => ({ value: v })) } } } });
  }
  if (routine.kind === 'tug') {
    keys.push('pos');
    items.push({ title: tr(EXTRA.position, lang, ' '), questionItem: { question: { required: true,
      scaleQuestion: { low: 1, high: 5, lowLabel: run.sides[0], highLabel: run.sides[1] } } } });
  }
  routine.steps.forEach((st) => {
    keys.push(st.id);
    items.push(text(tr(st.stem, lang, ' '), true, routine.steps.length === 1));
  });

  const title = tr(routine.name, lang);
  const created = await google.api('POST', FORMS, { info: { title, documentTitle: `杏坛 · ${routine.name.en || routine.name.zh} · ${stamp()}` } });
  const description = [run.topic, lang === 'zh' ? '你的回答会显示在老师的白板上。' : lang === 'en' ? 'Your answers appear on your teacher’s board.' : 'Your answers appear on your teacher’s board. 你的回答会显示在老师的白板上。']
    .filter(Boolean).join('\n\n');
  await google.api('POST', `${FORMS}/${created.formId}:batchUpdate`, {
    requests: [
      { updateFormInfo: { info: { description }, updateMask: 'description' } },
      ...items.map((item, i) => ({ createItem: { item, location: { index: i } } })),
    ],
  });
  const full = await google.api('GET', `${FORMS}/${created.formId}`);
  const qmap = {};
  (full.items || []).forEach((it, i) => { const q = it.questionItem?.question?.questionId; if (q && keys[i]) qmap[q] = keys[i]; });
  await setAccepting(created.formId, true);
  intoFolder(created.formId);
  return { formId: created.formId, url: full.responderUri, qmap };
}

export function setAccepting(formId, accepting) {
  return google.api('POST', `${FORMS}/${formId}:setPublishSettings`, {
    publishSettings: { publishState: { isPublished: true, isAcceptingResponses: accepting } }, updateMask: 'publishState',
  });
}

// All responses as [{ id, time, answers: { key: text } }], oldest first.
// `since` (ISO time) skips responses submitted before it.
export async function responses(formId, qmap, since = null) {
  const out = [];
  let token = '';
  do {
    const q = [since ? 'filter=' + encodeURIComponent(`timestamp >= ${since.replace(/\.\d+Z$/, 'Z')}`) : '', token ? 'pageToken=' + encodeURIComponent(token) : ''].filter(Boolean).join('&');
    const data = await google.api('GET', `${FORMS}/${formId}/responses${q ? '?' + q : ''}`);
    (data.responses || []).forEach((r) => {
      const answers = {};
      Object.entries(r.answers || {}).forEach(([qid, a]) => {
        const key = qmap[qid];
        const v = (a.textAnswers?.answers || []).map((x) => x.value).join(', ').trim();
        if (key && v) answers[key] = v;
      });
      out.push({ id: r.responseId, time: r.lastSubmittedTime || r.createTime, answers });
    });
    token = data.nextPageToken || '';
  } while (token);
  return out.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

// Writes rows to a new tab in the class's running Sheet. Returns its URL.
export async function saveToClassSheet(classKey, className, tabTitle, rows) {
  const { data } = acct();
  let sheet = data.sheets?.[classKey] || null;
  let tab = tabTitle.replace(/[[\]*?:/\\']/g, ' ').slice(0, 90);
  if (sheet) {
    try {
      const s = await google.api('GET', `${SHEETS}/${sheet.id}?fields=sheets.properties.title`);
      const taken = new Set((s.sheets || []).map((x) => x.properties.title));
      let n = 2; const base = tab;
      while (taken.has(tab)) tab = `${base} (${n++})`;
      await google.api('POST', `${SHEETS}/${sheet.id}:batchUpdate`, { requests: [{ addSheet: { properties: { title: tab } } }] });
    } catch (e) {
      if (e.status !== 404 && e.status !== 403) throw e;
      sheet = null; // deleted or no longer ours: start a new one
    }
  }
  if (!sheet) {
    const s = await google.api('POST', SHEETS, {
      properties: { title: `杏坛 · ${className} · Thinking routines & polls 思维常规与投票` },
      sheets: [{ properties: { title: tab } }],
    });
    sheet = { id: s.spreadsheetId, url: s.spreadsheetUrl };
    saveAcct({ sheets: { [classKey]: sheet } });
    intoFolder(sheet.id);
  }
  const range = encodeURIComponent(`'${tab}'!A1`);
  await google.api('PUT', `${SHEETS}/${sheet.id}/values/${range}?valueInputOption=RAW`, { values: rows });
  return sheet.url;
}

// ---------- Polls ----------
// Each class has one poll form that is reused: every poll rewrites its
// questions, so the link (and a printed QR code) never changes. Answers to
// earlier polls belong to questions that no longer exist, so they never mix.
//
// items: [{ key, item }] where item is a Forms API item.
// Returns { formId, url, qmap }.
export async function preparePollForm(classKey, className, { title, description, items }) {
  const { data } = acct();
  let saved = data.polls?.[classKey] || null;
  let existing = null;
  if (saved) {
    try {
      existing = await google.api('GET', `${FORMS}/${saved.formId}`);
    } catch (e) {
      if (e.status !== 404 && e.status !== 403) throw e;
      saved = null; // deleted or no longer ours: make a new one
    }
  }
  let formId = saved?.formId;
  if (!formId) {
    const created = await google.api('POST', FORMS, { info: { title, documentTitle: `杏坛 · ${className} · Class poll 课堂投票` } });
    formId = created.formId;
    existing = { items: [] };
  }
  const old = existing.items || [];
  await google.api('POST', `${FORMS}/${formId}:batchUpdate`, {
    requests: [
      { updateFormInfo: { info: { title, description }, updateMask: 'title,description' } },
      ...old.map((_, i) => ({ deleteItem: { location: { index: old.length - 1 - i } } })),
      ...items.map((it, i) => ({ createItem: { item: it.item, location: { index: i } } })),
    ],
  });
  const full = await google.api('GET', `${FORMS}/${formId}`);
  const qmap = {};
  (full.items || []).forEach((it, i) => { const q = it.questionItem?.question?.questionId; if (q && items[i]) qmap[q] = items[i].key; });
  await setAccepting(formId, true);
  if (!saved) {
    saveAcct({ polls: { [classKey]: { formId, url: full.responderUri } } });
    intoFolder(formId);
  }
  return { formId, url: full.responderUri, qmap };
}

// The class's poll link, if a poll form has been made with this account.
export function pollLink(classKey) {
  return acct().data.polls?.[classKey]?.url || null;
}
