// Markers for the Points goal bar: a picture that moves along the track, and
// the finish it travels to (rocket → moon, ship → island…). All drawn for 杏坛
// (no outside artwork), in a bright, friendly style that reads from the back
// of the classroom. Each is a 48 × 48 SVG facing right, the way it travels.
//
// Labels are English source strings, translated with t() where shown.

const O = 'stroke="#3a4060" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

const svg = (body) => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;

// ---------- Markers ----------
const STAR = svg(`
  <path d="M24 6.5 L29.1 18.5 L42.1 19.6 L32.2 28.2 L35.2 40.9 L24 34.1 L12.8 40.9 L15.8 28.2 L5.9 19.6 L18.9 18.5Z" fill="#ffd23f" ${O} stroke-width="2.4"/>
  <circle cx="20.5" cy="24" r="1.7" fill="#3a4060"/><circle cx="27.5" cy="24" r="1.7" fill="#3a4060"/>
  <path d="M20.5 28.5 q3.5 3 7 0" fill="none" ${O}/>
  <circle cx="17.5" cy="28" r="1.6" fill="#ff9f8a"/><circle cx="30.5" cy="28" r="1.6" fill="#ff9f8a"/>`);

const ROCKET = svg(`
  <path d="M3 24 L11 18.5 L11 29.5Z" fill="#ffa51f"/>
  <path d="M6 24 L11 21.2 L11 26.8Z" fill="#ffe27a"/>
  <path d="M14 17.5 L9 10 L21 15.5Z" fill="#ef4b4b" ${O}/>
  <path d="M14 30.5 L9 38 L21 32.5Z" fill="#ef4b4b" ${O}/>
  <path d="M10 17 C20 13 33 15 43 24 C33 33 20 35 10 31Z" fill="#eef2f7" ${O}/>
  <path d="M34 18 C38 19.5 40.5 21.5 43 24 C40.5 26.5 38 28.5 34 30 C35.6 26.4 35.6 21.6 34 18Z" fill="#ef4b4b" ${O}/>
  <circle cx="24" cy="24" r="4.6" fill="#5bc0f8" ${O}/>
  <circle cx="22.6" cy="22.6" r="1.2" fill="#fff"/>`);

const SHIP = svg(`
  <path d="M24 5 V31" ${O}/>
  <path d="M24 5 L31 7.8 L24 10.6Z" fill="#ef4b4b" ${O}/>
  <path d="M26 11 L39 29 H26Z" fill="#ffffff" ${O}/>
  <path d="M22 14 L11 29 H22Z" fill="#ffd23f" ${O}/>
  <path d="M5 31 H43 L37 39 H12Z" fill="#e8673c" ${O}/>
  <circle cx="19" cy="35" r="1.3" fill="#fff"/><circle cx="25" cy="35" r="1.3" fill="#fff"/><circle cx="31" cy="35" r="1.3" fill="#fff"/>
  <path d="M3 43 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0" fill="none" stroke="#3aa0e8" stroke-width="2.2" stroke-linecap="round"/>`);

const PLANE = svg(`
  <path d="M9 19 L5.5 9.5 H11 L18 19Z" fill="#3b82f6" ${O}/>
  <path d="M8 19 H36 C41 19 44.5 21.5 44.5 24 C44.5 26.5 41 28 36 28 H10 C7.5 28 5.5 26.5 5.5 23.5 C5.5 21 6.5 19 8 19Z" fill="#ffffff" ${O}/>
  <path d="M38 20.6 C40.6 21 42.4 22.2 43 23.6 H38Z" fill="#5bc0f8"/>
  <circle cx="22" cy="23" r="1.4" fill="#5bc0f8"/><circle cx="27" cy="23" r="1.4" fill="#5bc0f8"/><circle cx="32" cy="23" r="1.4" fill="#5bc0f8"/>
  <path d="M19 25 H28 L22 39 H16.5Z" fill="#3b82f6" ${O}/>
  <path d="M6 24.5 H2" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>`);

const CAR = svg(`
  <path d="M5 32 V26 C5 24 6.4 22.8 8 22.6 L14.5 21.6 L20 14 H31 L37.5 21.4 L41 22.2 C43 22.7 44 24.2 44 26.2 V32Z" fill="#ef4444" ${O}/>
  <path d="M21 16.5 H25 V21.5 H17Z" fill="#bfe6fb"/>
  <path d="M27.4 16.5 H30.2 L34.4 21.5 H27.4Z" fill="#bfe6fb"/>
  <circle cx="14" cy="32.5" r="5.2" fill="#3a4060"/><circle cx="14" cy="32.5" r="2" fill="#cbd5e1"/>
  <circle cx="35" cy="32.5" r="5.2" fill="#3a4060"/><circle cx="35" cy="32.5" r="2" fill="#cbd5e1"/>
  <circle cx="42" cy="25.4" r="1.4" fill="#ffe27a"/>
  <path d="M2 25 H0.5 M3 29 H1" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>`);

const TRAIN = svg(`
  <circle cx="37" cy="7" r="3.2" fill="#e2e8f0"/><circle cx="42.5" cy="4.5" r="2.2" fill="#e2e8f0"/>
  <path d="M33 10 H39 V19 H33Z" fill="#3a4060"/>
  <path d="M20 18 H39 C41 18 42 19.4 42 21 V33 H20Z" fill="#34c38f" ${O}/>
  <path d="M6 12 H21 V33 H6Z" fill="#2f80ed" ${O}/>
  <path d="M4 10.5 H23" stroke="#1f5fbf" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M9.5 15.5 H17.5 V22 H9.5Z" fill="#bfe6fb"/>
  <path d="M42 28 L46 35 H42Z" fill="#ffa51f" ${O}/>
  <circle cx="12.5" cy="36" r="4.4" fill="#3a4060"/><circle cx="12.5" cy="36" r="1.6" fill="#cbd5e1"/>
  <circle cx="25.5" cy="36.5" r="3.8" fill="#3a4060"/><circle cx="35" cy="36.5" r="3.8" fill="#3a4060"/>
  <path d="M25.5 36.5 H35" stroke="#cbd5e1" stroke-width="1.6"/>`);

const RABBIT = svg(`
  <ellipse cx="29.5" cy="10.5" rx="3.2" ry="8.5" transform="rotate(-14 29.5 10.5)" fill="#ffffff" ${O}/>
  <ellipse cx="29.5" cy="11" rx="1.4" ry="5.6" transform="rotate(-14 29.5 11)" fill="#fbb6ce"/>
  <ellipse cx="36" cy="11" rx="3.2" ry="8.5" transform="rotate(12 36 11)" fill="#ffffff" ${O}/>
  <ellipse cx="36" cy="11.5" rx="1.4" ry="5.6" transform="rotate(12 36 11.5)" fill="#fbb6ce"/>
  <circle cx="7.5" cy="28" r="3.6" fill="#ffffff" ${O}/>
  <ellipse cx="20" cy="31" rx="13" ry="9" fill="#ffffff" ${O}/>
  <circle cx="33.5" cy="23" r="7.8" fill="#ffffff" ${O}/>
  <ellipse cx="27" cy="39.5" rx="5.2" ry="2.4" fill="#ffffff" ${O}/>
  <circle cx="35.6" cy="21.6" r="1.5" fill="#3a4060"/>
  <circle cx="40.6" cy="24.4" r="1.3" fill="#f472b6"/>
  <circle cx="35.6" cy="26.2" r="1.7" fill="#fbcfe8"/>`);

const BEE = svg(`
  <ellipse cx="19" cy="13" rx="6" ry="8" transform="rotate(-18 19 13)" fill="#e0f2fe" ${O}/>
  <ellipse cx="27" cy="12.5" rx="5" ry="7" transform="rotate(14 27 12.5)" fill="#e0f2fe" ${O}/>
  <path d="M10 25.5 L4 28 L10 30.5Z" fill="#3a4060"/>
  <ellipse cx="23" cy="28" rx="14" ry="10" fill="#ffd23f" ${O}/>
  <path d="M17.5 18.6 C15.6 22.6 15.6 33.4 17.5 37.4" fill="none" stroke="#3a4060" stroke-width="3.6"/>
  <path d="M24.5 18 C22.6 22.6 22.6 33.4 24.5 38" fill="none" stroke="#3a4060" stroke-width="3.6"/>
  <circle cx="31.5" cy="25" r="1.8" fill="#3a4060"/>
  <path d="M31 31 q2.6 2 5 0" fill="none" ${O}/>
  <path d="M32.5 19 q1 -6 6 -8" fill="none" ${O}/><circle cx="39" cy="10.5" r="1.8" fill="#3a4060"/>`);

const DRAGON = svg(`
  <path d="M5 33 C11 24 17 40 25 31" fill="none" stroke="#3a4060" stroke-width="11" stroke-linecap="round"/>
  <path d="M5 33 C11 24 17 40 25 31" fill="none" stroke="#e53e3e" stroke-width="7" stroke-linecap="round"/>
  <path d="M5 33 C11 24 17 40 25 31" fill="none" stroke="#ffd23f" stroke-width="2" stroke-linecap="round" stroke-dasharray="1.5 4"/>
  <path d="M3 33 L-0.5 29 L1.5 35.5Z" fill="#ffa51f"/>
  <path d="M27.5 15.5 L25 8 L31 13.5Z" fill="#ffd23f" ${O}/>
  <path d="M33 14 L34.5 6.5 L37.5 13.5Z" fill="#ffd23f" ${O}/>
  <circle cx="31.5" cy="23" r="9" fill="#e53e3e" ${O}/>
  <ellipse cx="39.5" cy="26" rx="6" ry="4.6" fill="#ff8a7a" ${O}/>
  <circle cx="42" cy="24.6" r="1" fill="#3a4060"/>
  <circle cx="32.5" cy="20" r="3.2" fill="#ffffff" ${O} stroke-width="1.5"/><circle cx="33.4" cy="20.2" r="1.5" fill="#3a4060"/>
  <path d="M44 29 q3 1.5 3.5 6 M42 30.5 q1 3 -0.5 6.5" fill="none" stroke="#ffd23f" stroke-width="1.8" stroke-linecap="round"/>`);

const PANDA = svg(`
  <circle cx="12.5" cy="11.5" r="5.5" fill="#3a4060"/><circle cx="35.5" cy="11.5" r="5.5" fill="#3a4060"/>
  <circle cx="24" cy="25" r="16" fill="#ffffff" ${O}/>
  <ellipse cx="17.5" cy="24" rx="4.2" ry="5.4" transform="rotate(28 17.5 24)" fill="#3a4060"/>
  <ellipse cx="30.5" cy="24" rx="4.2" ry="5.4" transform="rotate(-28 30.5 24)" fill="#3a4060"/>
  <circle cx="18.2" cy="23.2" r="1.5" fill="#fff"/><circle cx="29.8" cy="23.2" r="1.5" fill="#fff"/>
  <ellipse cx="24" cy="30.5" rx="2.6" ry="1.8" fill="#3a4060"/>
  <path d="M21 34 q3 2.4 6 0" fill="none" ${O}/>
  <circle cx="13.5" cy="31" r="2" fill="#fbcfe8"/><circle cx="34.5" cy="31" r="2" fill="#fbcfe8"/>`);

// ---------- Finishes ----------
const TROPHY = svg(`
  <path d="M15 11 H7 C7 19 10.5 22.5 16 22.5" fill="none" ${O} stroke-width="2.6"/>
  <path d="M33 11 H41 C41 19 37.5 22.5 32 22.5" fill="none" ${O} stroke-width="2.6"/>
  <path d="M14 7 H34 V16 C34 23.5 29.5 28 24 28 C18.5 28 14 23.5 14 16Z" fill="#ffc531" ${O}/>
  <path d="M21 28 H27 L28 34 H20Z" fill="#f2a516" ${O}/>
  <path d="M14 34 H34 V41 H14Z" fill="#b7791f" ${O}/>
  <path d="M19.5 37.5 H28.5" stroke="#ffe27a" stroke-width="2" stroke-linecap="round"/>
  <path d="M18.5 11 V16 C18.5 19 20 21.5 22 22.5" fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round"/>`);

const MOON = svg(`
  <circle cx="24" cy="24" r="17" fill="#fde68a" ${O}/>
  <circle cx="17" cy="18" r="4" fill="#f6c94c"/><circle cx="29" cy="30" r="5.5" fill="#f6c94c"/><circle cx="30" cy="15.5" r="2.4" fill="#f6c94c"/><circle cx="15.5" cy="30" r="2" fill="#f6c94c"/>
  <path d="M43 7 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1z" fill="#ffd23f"/>
  <path d="M6 38 l.8 1.8 l1.8 .8 l-1.8 .8 l-.8 1.8 l-.8 -1.8 l-1.8 -.8 l1.8 -.8z" fill="#ffd23f"/>`);

const ISLAND = svg(`
  <path d="M3 42 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0" fill="none" stroke="#3aa0e8" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M6 38 C10 30 38 30 42 38Z" fill="#f7d58b" ${O}/>
  <path d="M25 34 C25 26 24 19 21 13" fill="none" stroke="#a0662d" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M21 13 C16 9 9 10 6 15 C11 13 16 13.5 21 13Z" fill="#34c38f" ${O}/>
  <path d="M21 13 C24 7 32 6 37 9.5 C31 9.5 26 11 21 13Z" fill="#34c38f" ${O}/>
  <path d="M21 13 C26 12 33 15 35 21 C30 17 25 15 21 13Z" fill="#2aa876" ${O}/>
  <path d="M21 13 C17 15 13 20 13 25 C16 20 18 17 21 13Z" fill="#2aa876" ${O}/>
  <circle cx="22.5" cy="15" r="1.8" fill="#a0662d"/>`);

const CLOUD = svg(`
  <circle cx="33" cy="15" r="7.5" fill="#ffd23f" ${O}/>
  <path d="M33 3 V5.5 M44 15 H41.5 M40.8 7.2 L39 9 M25.2 7.2 L27 9" stroke="#ffb020" stroke-width="2" stroke-linecap="round"/>
  <path d="M11 37 C5.5 37 4 32.5 5.5 29.5 C7 26.5 10.5 26 12.5 26.8 C13 21 18.5 18 23 19.5 C26.5 16.5 33.5 18 34.5 24 C39.5 23.5 43.5 27 43 31.5 C42.6 35 40 37 36.5 37Z" fill="#ffffff" ${O}/>`);

const FLAG = svg(`
  <path d="M10 44 V5" stroke="#3a4060" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M11 6 H39 V26 H11Z" fill="#ffffff" ${O}/>
  <path d="M11 6 h7 v5 h-7z M25 6 h7 v5 h-7z M18 11 h7 v5 h-7z M32 11 h7 v5 h-7z M11 16 h7 v5 h-7z M25 16 h7 v5 h-7z M18 21 h7 v5 h-7z M32 21 h7 v5 h-7z" fill="#3a4060"/>
  <path d="M11 6 H39 V26 H11Z" fill="none" ${O}/>
  <ellipse cx="10" cy="44" rx="5" ry="1.6" fill="#cbd5e1"/>`);

const STATION = svg(`
  <path d="M5 21 L24 8 L43 21Z" fill="#ef4b4b" ${O}/>
  <path d="M9 21 H39 V40 H9Z" fill="#fff4e0" ${O}/>
  <circle cx="24" cy="17" r="3.6" fill="#ffffff" ${O} stroke-width="1.6"/>
  <path d="M24 15.2 V17 H25.4" stroke="#3a4060" stroke-width="1.3" stroke-linecap="round" fill="none"/>
  <path d="M19.5 40 V30 C19.5 27.5 21.5 25.6 24 25.6 C26.5 25.6 28.5 27.5 28.5 30 V40Z" fill="#2f80ed" ${O}/>
  <path d="M12 26 H17 V31 H12Z M31 26 H36 V31 H31Z" fill="#bfe6fb" ${O} stroke-width="1.5"/>
  <path d="M3 43 H45" stroke="#3a4060" stroke-width="2.4" stroke-linecap="round"/>`);

const CARROT = svg(`
  <path d="M24 13 C20 6 14 5 11 7 C14 9 18 11 22 15Z" fill="#34c38f" ${O}/>
  <path d="M26 13 C27 6 32 3 36 4.5 C33 7 30 10 27.5 15Z" fill="#2aa876" ${O}/>
  <path d="M25 14 C24 8 25 5 25 3" fill="none" stroke="#34c38f" stroke-width="3" stroke-linecap="round"/>
  <path d="M17 17 C20 13 30 13 33 17 C35 20 29 32 25.5 43 C24.8 44.6 23.4 44.6 22.8 43 C19.5 32 14.6 20 17 17Z" fill="#ff8c2b" ${O}/>
  <path d="M20 22 H24 M22 29 H26 M23.2 36 H25.6" stroke="#d9661a" stroke-width="2" stroke-linecap="round"/>`);

const FLOWER = svg(`
  <path d="M24 30 V44" stroke="#2aa876" stroke-width="3" stroke-linecap="round"/>
  <path d="M24 39 C19 39 15.5 36 15 32 C19.5 32 23 35 24 39Z" fill="#34c38f" ${O} stroke-width="1.6"/>
  <g fill="#ff7eb6" stroke="#3a4060" stroke-width="2">
    <circle cx="24" cy="10" r="6.5"/><circle cx="33.5" cy="17" r="6.5"/><circle cx="30" cy="28" r="6.5"/><circle cx="18" cy="28" r="6.5"/><circle cx="14.5" cy="17" r="6.5"/>
  </g>
  <circle cx="24" cy="19.5" r="6" fill="#ffd23f" ${O}/>`);

const PEARL = svg(`
  <path d="M24 3 C30 8 27 11 33 13 C39 15 42 21 39 27 C44 33 38 42 31 41 C28 46 20 46 17 41 C10 42 4 33 9 27 C6 21 9 15 15 13 C21 11 18 8 24 3Z" fill="#ffb020" opacity=".9"/>
  <path d="M24 9 C28 12 26 14 30 15.5 C35 17 36.5 21.5 34.5 25.5 C37.5 30 33.5 36 28.5 35.5 C26.5 39 21.5 39 19.5 35.5 C14.5 36 10.5 30 13.5 25.5 C11.5 21.5 13 17 18 15.5 C22 14 20 12 24 9Z" fill="#ffe27a"/>
  <circle cx="24" cy="26" r="10" fill="#fdf2ff" ${O}/>
  <circle cx="24" cy="26" r="10" fill="none" stroke="#e9d5ff" stroke-width="3" transform="translate(1.5 1.5) scale(.94)"/>
  <ellipse cx="20.5" cy="22.5" rx="3" ry="2" transform="rotate(-35 20.5 22.5)" fill="#ffffff"/>`);

const BAMBOO = svg(`
  <path d="M17 44 V6 M31 44 V12" stroke="#3a4060" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M17 44 V6 M31 44 V12" stroke="#5cc26a" stroke-width="4" stroke-linecap="round"/>
  <path d="M14 16 H20 M14 28 H20 M14 39 H20 M28 22 H34 M28 33 H34" stroke="#3a4060" stroke-width="2" stroke-linecap="round"/>
  <path d="M19 15 C24 11 29 11 34 13 C29 15.5 24 16 19 15Z" fill="#34c38f" ${O} stroke-width="1.6"/>
  <path d="M15 27 C10 23 6 23 3 25 C7 27.5 11 28 15 27Z" fill="#34c38f" ${O} stroke-width="1.6"/>
  <path d="M33 21 C37 17 41 16.5 45 18 C41 21 37 22 33 21Z" fill="#2aa876" ${O} stroke-width="1.6"/>`);

// id, label, picture, and the finish it travels to.
export const MARKERS = [
  { id: 'star', label: 'Smiling star', svg: STAR, finish: { label: 'Trophy', svg: TROPHY } },
  { id: 'rocket', label: 'Rocket', svg: ROCKET, finish: { label: 'Moon', svg: MOON } },
  { id: 'ship', label: 'Ship', svg: SHIP, finish: { label: 'Island', svg: ISLAND } },
  { id: 'plane', label: 'Plane', svg: PLANE, finish: { label: 'Cloud', svg: CLOUD } },
  { id: 'car', label: 'Car', svg: CAR, finish: { label: 'Finish flag', svg: FLAG } },
  { id: 'train', label: 'Train', svg: TRAIN, finish: { label: 'Station', svg: STATION } },
  { id: 'rabbit', label: 'Rabbit', svg: RABBIT, finish: { label: 'Carrot', svg: CARROT } },
  { id: 'bee', label: 'Bee', svg: BEE, finish: { label: 'Flower', svg: FLOWER } },
  { id: 'dragon', label: 'Dragon', svg: DRAGON, finish: { label: 'Pearl', svg: PEARL } },
  { id: 'panda', label: 'Panda', svg: PANDA, finish: { label: 'Bamboo', svg: BAMBOO } },
];

export const DEFAULT_MARKER = 'star';

export function marker(id) {
  return MARKERS.find((m) => m.id === id) || MARKERS[0];
}

// A <span> holding the picture. which: 'marker' | 'finish'
export function markerEl(id, which = 'marker', cls = '') {
  const m = marker(id);
  const span = document.createElement('span');
  span.className = (`mk ${cls}`).trim();
  span.innerHTML = which === 'finish' ? m.finish.svg : m.svg;
  return span;
}
