// Register tools here. Each tool is a small module with:
//   type, title, icon, size {w,h}, minSize {w,h}, mount(bodyEl, ctx) -> { destroy() }
import timer from './timer.js';
import clock from './clock.js';
import picker from './picker.js';
import groups from './groups.js';
import points from './points.js';
import noise from './noise.js';
import traffic from './traffic.js';
import text from './text.js';
import symbols from './symbols.js';
import routine from './routine.js';

export const widgets = [timer, clock, picker, groups, points, routine, noise, traffic, symbols, text];
export const widgetByType = Object.fromEntries(widgets.map((w) => [w.type, w]));
