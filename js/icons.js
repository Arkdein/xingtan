// Icons from Tabler Icons v3 (https://tabler.io/icons), MIT licence,
// Copyright (c) 2020-2026 Paweł Kuna. Built in so the app works offline.
// Generated: only the icons the app uses. To add one, copy its <path> data here.
const PATHS = {
  "arrow-right": "<path d=\"M5 12l14 0\"/><path d=\"M13 18l6 -6\"/><path d=\"M13 6l6 6\"/>",
  "hourglass": "<path d=\"M6.5 7h11\"/><path d=\"M6.5 17h11\"/><path d=\"M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1\"/><path d=\"M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1\"/>",
  "clock": "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0\"/><path d=\"M12 7v5l3 3\"/>",
  "arrows-shuffle": "<path d=\"M18 4l3 3l-3 3\"/><path d=\"M18 20l3 -3l-3 -3\"/><path d=\"M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5\"/><path d=\"M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3\"/>",
  "users-group": "<path d=\"M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\"/><path d=\"M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1\"/><path d=\"M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\"/><path d=\"M17 10h2a2 2 0 0 1 2 2v1\"/><path d=\"M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\"/><path d=\"M3 13v-1a2 2 0 0 1 2 -2h2\"/>",
  "star": "<path d=\"M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245\"/>",
  "volume": "<path d=\"M15 8a5 5 0 0 1 0 8\"/><path d=\"M17.7 5a9 9 0 0 1 0 14\"/><path d=\"M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5\"/>",
  "traffic-lights": "<path d=\"M7 7a5 5 0 0 1 5 -5a5 5 0 0 1 5 5v10a5 5 0 0 1 -5 5a5 5 0 0 1 -5 -5l0 -10\"/><path d=\"M11 7a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/>",
  "hand-stop": "<path d=\"M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5\"/><path d=\"M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5\"/><path d=\"M14 5.5a1.5 1.5 0 0 1 3 0v6.5\"/><path d=\"M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47\"/>",
  "align-left": "<path d=\"M4 6l16 0\"/><path d=\"M4 12l10 0\"/><path d=\"M4 18l14 0\"/>",
  "mood-silence": "<path d=\"M12 21a9 9 0 1 1 0 -18a9 9 0 0 1 0 18\"/><path d=\"M9 10h-.01\"/><path d=\"M15 10h-.01\"/><path d=\"M8 15h8\"/><path d=\"M9 14v2\"/><path d=\"M12 14v2\"/><path d=\"M15 14v2\"/>",
  "volume-off": "<path d=\"M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464\"/><path d=\"M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615\"/><path d=\"M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664\"/><path d=\"M3 3l18 18\"/>",
  "message-circle": "<path d=\"M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1\"/>",
  "users": "<path d=\"M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\"/><path d=\"M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/><path d=\"M21 21v-2a4 4 0 0 0 -3 -3.85\"/>",
  "eye": "<path d=\"M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0\"/><path d=\"M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6\"/>",
  "layout-grid": "<path d=\"M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4\"/><path d=\"M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4\"/><path d=\"M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4\"/><path d=\"M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4\"/>",
  "palette": "<path d=\"M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25\"/><path d=\"M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/>",
  "settings": "<path d=\"M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065\"/><path d=\"M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0\"/>",
  "maximize": "<path d=\"M4 8v-2a2 2 0 0 1 2 -2h2\"/><path d=\"M4 16v2a2 2 0 0 0 2 2h2\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v2\"/><path d=\"M16 20h2a2 2 0 0 0 2 -2v-2\"/>",
  "x": "<path d=\"M18 6l-12 12\"/><path d=\"M6 6l12 12\"/>",
  "check": "<path d=\"M5 12l5 5l10 -10\"/>",
  "alert-triangle": "<path d=\"M12 9v4\"/><path d=\"M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0\"/><path d=\"M12 16h.01\"/>",
  "pencil": "<path d=\"M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4\"/><path d=\"M13.5 6.5l4 4\"/>",
  "copy": "<path d=\"M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666\"/><path d=\"M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1\"/>",
  "download": "<path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2\"/><path d=\"M7 11l5 5l5 -5\"/><path d=\"M12 4l0 12\"/>",
  "upload": "<path d=\"M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2\"/><path d=\"M7 9l5 -5l5 5\"/><path d=\"M12 4l0 12\"/>",
  "trash": "<path d=\"M4 7l16 0\"/><path d=\"M10 11l0 6\"/><path d=\"M14 11l0 6\"/><path d=\"M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12\"/><path d=\"M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3\"/>",
  "arrow-left": "<path d=\"M5 12l14 0\"/><path d=\"M5 12l6 6\"/><path d=\"M5 12l6 -6\"/>",
  "dots": "<path d=\"M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/>",
  "arrow-back-up": "<path d=\"M9 14l-4 -4l4 -4\"/><path d=\"M5 10h11a4 4 0 1 1 0 8h-1\"/>",
  "plus": "<path d=\"M12 5l0 14\"/><path d=\"M5 12l14 0\"/>",
  "minus": "<path d=\"M5 12l14 0\"/>",
  "adjustments-horizontal": "<path d=\"M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\"/><path d=\"M4 6l8 0\"/><path d=\"M16 6l4 0\"/><path d=\"M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\"/><path d=\"M4 12l2 0\"/><path d=\"M10 12l10 0\"/><path d=\"M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0\"/><path d=\"M4 18l11 0\"/><path d=\"M19 18l1 0\"/>",
  "mood-smile": "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\"/><path d=\"M9 10l.01 0\"/><path d=\"M15 10l.01 0\"/><path d=\"M9.5 15a3.5 3.5 0 0 0 5 0\"/>",
  "mood-empty": "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\"/><path d=\"M9 10l.01 0\"/><path d=\"M15 10l.01 0\"/><path d=\"M9 15l6 0\"/>",
  "mood-sad": "<path d=\"M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\"/><path d=\"M9 10l.01 0\"/><path d=\"M15 10l.01 0\"/><path d=\"M9.5 15.25a3.5 3.5 0 0 1 5 0\"/>",
  "layout-bottombar": "<path d=\"M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12\"/><path d=\"M4 15l16 0\"/>",
  "rotate": "<path d=\"M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5\"/>",
  "grip-horizontal": "<path d=\"M4 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M4 15a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M11 15a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M18 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/><path d=\"M18 15a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\"/>",
  "loader-2": "<path d=\"M12 3a9 9 0 1 0 9 9\"/>",
  "refresh": "<path d=\"M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4\"/><path d=\"M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4\"/>",
};

const NS = "http://www.w3.org/2000/svg";

// Returns an <svg> icon element. It takes the text colour and is sized in em
// unless a size is given.
export function icon(name, { size = null, cls = "" } = {}) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", ("ico " + cls).trim());
  if (size) { svg.setAttribute("width", size); svg.setAttribute("height", size); }
  svg.innerHTML = PATHS[name] || PATHS.dots;
  return svg;
}

export function hasIcon(name) { return name in PATHS; }
