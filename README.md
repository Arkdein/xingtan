# 杏坛 · ClassroomBoard

**杏坛 (Xìngtán)**, the "apricot altar", is where Confucius is said to have taught his students (《庄子·渔父》). Ever since, it has stood for the classroom and for teaching.

A classroom display board in the spirit of Classroomscreen. It runs entirely in the browser and is hosted on GitHub Pages.
**All class lists and layouts stay in the teacher's own browser.** Nothing is uploaded, and there are no accounts or servers.

## Tools

| Tool | What it does |
|---|---|
| ⏱️ Timer | Countdown with presets. Click the time to type one in (`5` = 5 min, `1:30`). Chimes at zero and keeps running across a page reload or a quick switch to another board. A timer that ran out more than a minute earlier comes back reset. |
| 🕒 Clock | Time and date. Click to switch between 12 and 24 hours. |
| 🎯 Name picker | Picks a random student from the current class, with an optional no-repeat mode. |
| 🧩 Groups | Random groups, by group size or by number of groups. |
| 🔊 Noise meter | Live microphone level with an adjustable limit. Audio is analysed in the browser and never recorded. |
| 🚦 Traffic light | Click a light to show it. |
| 🪧 Work mode | Bilingual (English / 中文) signs: silent work, whisper, partner, group, raise hand, eyes on me. |
| 📝 Text | Large-type instructions board. |

Drag tools by their title bar and resize them from the bottom-right corner.

## Boards

Each lesson or class can have its own **board**: its tools, text, timer settings and background.

- When the app opens, the **boards screen** asks which board to open. A reload reopens the board that window had open.
- **🗂 Boards** (top left) goes back to the boards screen. Click the board name to rename it.
- Boards **save automatically** as you work. The *Saved ✓* label next to the name shows the status. Closing the window never loses work, so there is no “Save?” prompt. The browser shows its own warning only if a save failed (for example, if storage is full).
- On the boards screen: **New board**, **Rename**, **Copy** (to reuse a lesson layout), **Share** and **Delete**.
- **⬇ Share** downloads one board as a file for a colleague to **⬆ Import**. Student names (picked names, groups) are left out, and class lists are never included.
- Class lists are shared by all boards.
- Opening one board in two windows keeps them in step. Different boards in different windows don't affect each other.
- A timer that ran out more than a minute earlier comes back reset, so an old board doesn't chime when it opens.

## Privacy and data

- Data is saved in the browser's `localStorage` on the device in use: one entry for class lists and settings (`xingtan:v2:meta`) and one per board (`xingtan:v2:board:<id>`). It is not shared between browsers or computers.
- Data from the earlier single-layout version is moved into a board called “My board” the first time the new version opens. The old entry is kept as a fallback.
- **⚙️ → Download backup** saves every board and class list to a `.json` file. **Restore from backup** loads it on another computer.
- Clearing browser data removes everything, so keep a backup.

## Offline / install

After the first visit, a service worker keeps a copy of the app, so it works without internet.
In Chrome or Edge, use **Install app** to open it in its own window.

## Running it

**GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

**Locally:** any static server works, for example `python3 -m http.server` and then open http://localhost:8000.
(Opening `index.html` directly from disk won't work, because browsers block JavaScript modules on `file://`.)

## Adding a tool

1. Create `js/widgets/yourtool.js` exporting `{ type, title, icon, size, minSize, mount(body, ctx) }`.
2. Register it in `js/widgets/index.js`.
3. Add the file to the `FILES` list in `sw.js` and bump `VERSION`.

`ctx` gives each tool `ctx.state` (its saved state), `ctx.save(patch)`, `ctx.store` (class lists), `ctx.onClassesChange(fn)`, `ctx.openClasses()` and `ctx.toast(msg)`.
`mount` can return `{ destroy() }` to clean up timers or the microphone.
If a tool's state can hold student names, give it `share(state)` returning a copy without them. Shared board files use it.

## Structure

```
index.html            app shell
css/styles.css        all styles
js/app.js             window manager, dock, backgrounds, settings
js/store.js           local storage, boards, autosave, backup/restore
js/boards.js          boards screen (open, new, rename, copy, share, import, delete)
js/backgrounds.js     background presets
js/classes.js         class list manager
js/ui.js              helpers (DOM, toast, modal, chime)
js/widgets/*.js       one file per tool
sw.js                 offline cache
manifest.webmanifest  install metadata
```

No build step and no external libraries.
