// The sample board (示例白板): a ready-made 课堂白板 set up like a real lesson,
// for trying things out. The welcome tour (tour.js) runs over it.
//
// It is an ordinary board (marked `sample: true`), so teachers can change it,
// copy it or delete it. Nothing on it touches what is shared by every board:
// no class list, no Text posts, no Dictation word lists. Its words are in the
// interface language at the time it is made.
import * as store from './store.js';
import { getLang } from './i18n.js';

const BACKGROUND = 'lib:na-misty-mountains';

const CONTENT = {
  en: {
    name: 'Sample board · try anything here',
    lesson: {
      title: 'Sample lesson · Reading a short story',
      li: ['identify how the writer builds suspense'],
      sc: ['point out two details that build suspense', 'explain in my own words what one detail does'],
      steps: ['Warm-up: talk about the picture', 'Read the story together', 'Pair work: find the details', 'Share and discuss', 'Exit ticket'],
    },
    groups: (n) => `Group ${n}`,
  },
  zh: {
    name: '示例白板 · 随便试试',
    lesson: {
      title: '示例课 · 阅读短篇故事',
      li: ['了解作者怎样制造悬念'],
      sc: ['找出两个制造悬念的细节', '用自己的话说明一个细节的作用'],
      steps: ['热身：看图说话', '一起朗读故事', '两人合作：找出细节', '分享与讨论', '出门条'],
    },
    groups: (n) => `第${n}组`,
  },
};

export function findSampleBoard() {
  return store.listBoards().find((b) => b.sample === true) || null;
}

// `stage` is the board's size on screen ({ w, h }), so the tools fit it;
// `bottom` is the room to leave for the dock.
export function createSampleBoard(stage = {}, { bottom = 112 } = {}) {
  const lang = getLang() === 'zh' ? 'zh' : 'en';
  const C = CONTENT[lang];
  const W = Math.max(960, stage.w || 1280);
  const H = Math.max(600, stage.h || 720);
  const now = new Date().toISOString();
  const uid = store.uid;

  // Keep clear of the board bar (top), the shelf (left edge) and the dock (bottom).
  const top = 64, left = 150, gap = 16;
  const usableW = W - left - 20;
  const usableH = H - top - bottom;
  const lfW = Math.round(Math.min(560, usableW * 0.42));
  const colW = Math.round((usableW - lfW - gap * 2) / 2);
  const col2 = left + lfW + gap;
  const col3 = col2 + colW + gap;
  const timerH = Math.round(Math.min(330, usableH * 0.55));

  const lessonState = {
    title: C.lesson.title,
    li: C.lesson.li.map((text) => ({ id: uid(), text, done: false })),
    sc: C.lesson.sc.map((text) => ({ id: uid(), text, done: false })),
    // The warm-up is done: the class is on step 2.
    steps: C.lesson.steps.map((text, i) => ({ id: uid(), text, done: i === 0 })),
    cur: 1,
    lang,
    view: 'list',
    goals: true,
  };
  const lessonItem = { id: uid(), name: '', createdAt: now, updatedAt: now, state: lessonState };

  let z = 0;
  const widget = (type, rect, state = {}, extra = {}) => ({ id: uid(), type, ...rect, z: ++z, state, ...extra });
  const widgets = [
    widget('lessonflow', { x: left, y: top, w: lfW, h: usableH }, { ...lessonState, itemId: lessonItem.id }),
    widget('timer', { x: col2, y: top, w: colW, h: timerH },
      { duration: 300, remaining: 300, endAt: null, mode: 'countdown', swStart: null, swElapsed: 0, laps: [] }),
    widget('symbols', { x: col2, y: top + timerH + gap, w: colW, h: Math.max(200, usableH - timerH - gap) },
      { lang: 'both', current: 'partner' }),
    widget('picker', { x: col3, y: top, w: colW, h: Math.round(Math.min(460, usableH)) },
      { noRepeat: true, pool: null, last: '', source: 'list', view: 'wheel', rot: 0 }),
    // A minimised tool on the shelf, still working: the clock's chip shows the time.
    widget('clock', { x: col3, y: top + 300, w: 340, h: 180 }, { h24: false },
      { min: true, minAt: Date.now(), shelfPos: 0, mx: 10, my: top }),
  ];

  return store.createBoard(C.name, {
    sample: true,
    background: BACKGROUND,
    viewport: { w: W, h: H },
    widgets,
    toolData: {
      lessonflow: { items: [lessonItem] },
      picker: { items: [1, 2, 3, 4, 5, 6].map(C.groups) },
    },
  });
}
