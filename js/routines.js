// Thinking routines (思维常规) from Project Zero's Making Thinking Visible.
// English stems follow Ritchhart, Church & Morrison (2011); Chinese stems
// are the app's own and can be edited here.
//
// A routine: { id, group, kind, name: {en, zh}, steps: [step] }
//   kind  'columns'     one answer per step, one wall column per step
//         'viewpoints'  students pick a viewpoint from the teacher's list first
//         'tug'         students place themselves between two sides, then give a reason
//   step  { id, label: {en, zh}, stem: {en, zh} }
//         label is the short column heading; stem is the sentence starter.
import * as store from './store.js';

const s = (id, labelEn, labelZh, stemEn, stemZh) => ({ id, label: { en: labelEn, zh: labelZh }, stem: { en: stemEn, zh: stemZh } });

export const GROUPS = [
  { id: 'core', en: 'Core', zh: '核心' },
  { id: 'connections', en: 'Connections', zh: '联系' },
  { id: 'perspectives', en: 'Perspectives', zh: '视角' },
  { id: 'custom', en: 'Custom', zh: '自定义' },
];

export const BUILT_IN = [
  {
    id: 'see-think-wonder', group: 'core', kind: 'columns',
    name: { en: 'See · Think · Wonder', zh: '看·想·疑' },
    steps: [
      s('see', 'See', '看', 'I see…', '我看到……'),
      s('think', 'Think', '想', 'I think…', '我认为……'),
      s('wonder', 'Wonder', '疑', 'I wonder…', '我想知道……'),
    ],
  },
  {
    id: 'think-puzzle-explore', group: 'core', kind: 'columns',
    name: { en: 'Think · Puzzle · Explore', zh: '想·疑·探' },
    steps: [
      s('think', 'Think', '想', 'What do you think you know about this topic?', '关于这个主题，你认为自己已经知道什么？'),
      s('puzzle', 'Puzzle', '疑', 'What questions or puzzles do you have?', '你有哪些疑问或困惑？'),
      s('explore', 'Explore', '探', 'How might you explore these puzzles?', '你可以怎样探究这些疑问？'),
    ],
  },
  {
    id: 'claim-support-question', group: 'core', kind: 'columns',
    name: { en: 'Claim · Support · Question', zh: '主张·支持·质疑' },
    steps: [
      s('claim', 'Claim', '主张', 'Make a claim about the topic.', '就这个主题提出一个主张。'),
      s('support', 'Support', '支持', 'What do you see or know that supports your claim?', '你看到或知道什么，可以支持你的主张？'),
      s('question', 'Question', '质疑', 'What questions does your claim raise?', '你的主张引出了哪些值得追问的问题？'),
    ],
  },
  {
    id: 'connect-extend-challenge', group: 'connections', kind: 'columns',
    name: { en: 'Connect · Extend · Challenge', zh: '联系·拓展·挑战' },
    steps: [
      s('connect', 'Connect', '联系', 'How is this connected to what you already know?', '这和你已有的认识有什么联系？'),
      s('extend', 'Extend', '拓展', 'What new ideas extended or pushed your thinking?', '哪些新想法拓展了你的思考？'),
      s('challenge', 'Challenge', '挑战', 'What is still challenging or confusing?', '还有什么让你觉得困难或困惑？'),
    ],
  },
  {
    id: 'headlines', group: 'connections', kind: 'columns',
    name: { en: 'Headlines', zh: '新闻标题' },
    steps: [
      s('headline', 'Headline', '标题', 'Write a headline that captures the most important aspect.', '写一个标题，概括其中最重要的一点。'),
      s('why', 'Why', '理由', 'Why did you choose this headline?', '你为什么选择这个标题？'),
    ],
  },
  {
    id: 'used-to-think', group: 'connections', kind: 'columns',
    name: { en: 'I used to think… Now I think…', zh: '以前我认为……现在我认为……' },
    steps: [
      s('before', 'Used to think', '以前', 'I used to think…', '以前我认为……'),
      s('now', 'Now I think', '现在', 'Now I think…', '现在我认为……'),
    ],
  },
  {
    id: 'compass-points', group: 'perspectives', kind: 'columns',
    name: { en: 'Compass Points', zh: '指南针' },
    steps: [
      s('e', 'E · Excited', '东 · 兴奋', 'What excites you about this idea?', '这个想法有什么让你兴奋？'),
      s('w', 'W · Worrisome', '西 · 担忧', 'What do you find worrisome?', '有什么让你担忧？'),
      s('n', 'N · Need to know', '北 · 需要知道', 'What else do you need to know?', '你还需要知道什么？'),
      s('s', 'S · Stance', '南 · 立场', 'What is your current stance or suggestion?', '你目前的立场或建议是什么？'),
    ],
  },
  {
    id: 'circle-of-viewpoints', group: 'perspectives', kind: 'viewpoints',
    name: { en: 'Circle of Viewpoints', zh: '观点圈' },
    steps: [
      s('think', 'I think', '我认为', 'From this viewpoint, I think… because…', '从这个角度，我认为……因为……'),
      s('question', 'Question', '疑问', 'A question I have from this viewpoint is…', '从这个角度，我的疑问是……'),
    ],
  },
  {
    id: 'tug-of-war', group: 'perspectives', kind: 'tug',
    name: { en: 'Tug of War', zh: '拔河' },
    steps: [
      s('tug', 'Tug', '拉力', 'What pulls you towards your side? Give one reason.', '是什么把你拉向这一边？写出一个理由。'),
    ],
  },
];

// Wording for the extra questions the viewpoint and tug-of-war forms ask.
export const EXTRA = {
  name: { en: 'Your name', zh: '姓名' },
  viewpoint: { en: 'I am thinking from the viewpoint of…', zh: '我从这个角度思考……' },
  position: { en: 'Where do you stand?', zh: '你站在哪一边？' },
};

export const custom = () => (Array.isArray(store.get().routines) ? store.get().routines : []);
export const all = () => [...BUILT_IN, ...custom()];
export const byId = (id) => all().find((r) => r.id === id) || null;

export function saveCustom(r) {
  store.update((m) => {
    m.routines = Array.isArray(m.routines) ? m.routines : [];
    const i = m.routines.findIndex((x) => x.id === r.id);
    if (i >= 0) m.routines[i] = r; else m.routines.push(r);
  });
}

export function deleteCustom(id) {
  store.update((m) => { m.routines = (m.routines || []).filter((x) => x.id !== id); });
}

// Text in the chosen language: 'en', 'zh' or 'both'.
export function tr(obj, lang, sep = ' · ') {
  if (!obj) return '';
  const en = (obj.en || '').trim(), zh = (obj.zh || '').trim();
  if (lang === 'en') return en || zh;
  if (lang === 'zh') return zh || en;
  return en && zh && en !== zh ? `${en}${sep}${zh}` : en || zh;
}
