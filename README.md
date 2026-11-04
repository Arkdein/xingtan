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
| ⭐ Points | Behaviour points (积分) for each student, with **+** / **−** per name and **+ All** / **− All** for everyone present. Totals carry over from lesson to lesson. See [Points](#points) below. |
| 🔊 Noise meter | Live microphone level with an adjustable limit. Audio is analysed in the browser and never recorded. |
| 🚦 Traffic light | Click a light to show it. |
| 🪧 Work mode | Bilingual (English / 中文) signs: silent work, whisper, partner, group, raise hand, eyes on me. |
| 📝 Text | Large-type instructions board. |

Drag tools by their title bar and resize them from the bottom-right corner.

### Customising the dock

Tap **Edit** at the right end of the dock to:
- **Reorder** tools by dragging them (or focus a tool and use the ← → keys).
- **Hide** a tool with **−**. Hidden tools stay one tap away under **More**.
- **Add a tool back** with **+**.
- Switch to **Icons only (compact)**, or **Reset** to the original dock.

Tap **Done** or press Esc to finish. The dock layout is the same on every board in this browser and is included in backups.

Tool tiles are colour-coded by purpose: **blue** for time (Timer, Clock), **apricot** for students (Name picker, Groups, Points), **green** for class signals (Noise meter, Traffic light, Work mode) and **grey** for content (Text).

## Boards

Each lesson or class can have its own **board**: its tools, text, timer settings and background.

- When the app opens, the **boards screen** greets the teacher (time of day and date, in English and 中文) and asks which board to open. The large **Continue where you left off** button reopens the last board in one tap. A reload reopens the board that window had open.
- **🗂 Boards** (top left) goes back to the boards screen. Click the board name to rename it.
- Boards **save automatically** as you work. The *Saved ✓* label next to the name shows the status. Closing the window never loses work, so there is no “Save?” prompt. The browser shows its own warning only if a save failed (for example, if storage is full).
- On the boards screen: **New board**, **Rename**, **Copy** (to reuse a lesson layout), **Share** and **Delete**.
- **⬇ Share** downloads one board as a file for a colleague to **⬆ Import**. Student names (picked names, groups) are left out, and class lists and points are never included.
- Class lists are shared by all boards.
- Opening one board in two windows keeps them in step. Different boards in different windows don't affect each other.
- A timer that ran out more than a minute earlier comes back reset, so an old board doesn't chime when it opens.

## Points

- **Points belong to the class, not the board.** Every board showing 2E1 shows 2E1's running totals, so a new or copied lesson board picks up where the last lesson left off.
- **Tap a name** to mark that student absent for today. Absent students are greyed out and skipped by **+ All** / **− All**. The marks clear the next day.
- **↶ Undo** reverses the latest change, including a whole-class one (up to 20 of today's changes).
- **Sort:** *Class order* (the default every time the tool opens), *A–Z*, or *Top*. Rows never move while you tap; tap *Top* again to re-sort.
- Points can go below zero.
- **⋯ menu:** set a **class goal** (a progress bar for the class total, which adds up everyone's points), **download the log** as a CSV (one row per student, one column per day, plus the running total) and **reset points to 0** for a new term (the log is kept).
- Points are matched by name. Editing a student's name in the class list starts them at 0; removing a name and adding it back brings its points back. Deleting a class deletes its points.

## Privacy and data

- Data is saved in the browser's `localStorage` on the device in use: one entry for class lists, points and settings (`xingtan:v2:meta`) and one per board (`xingtan:v2:board:<id>`). It is not shared between browsers or computers.
- Data from the earlier single-layout version is moved into a board called “My board” the first time the new version opens. The old entry is kept as a fallback.
- **⚙️ → Download backup** saves every board, class list and points log to a `.json` file. **Restore from backup** loads it on another computer.
- Clearing browser data removes everything, so keep a backup.

## Offline / install

After the first visit, a service worker keeps a copy of the app, so it works without internet.
In Chrome or Edge, use **Install app** to open it in its own window.

## Running it

**GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

**Locally:** any static server works, for example `python3 -m http.server` and then open http://localhost:8000.
(Opening `index.html` directly from disk won't work, because browsers block JavaScript modules on `file://`.)

## Adding a tool

1. Create `js/widgets/yourtool.js` exporting `{ type, title, icon, tone, size, minSize, mount(body, ctx) }`.
   `icon` is a name from `js/icons.js` (add its path data there from [Tabler Icons](https://tabler.io/icons) if it is new).
   `tone` is the tile colour: `time`, `people`, `signal` or `content`. New tools appear at the end of everyone's dock.
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
js/dock.js            tool dock: reorder, hide, More menu, compact mode
js/icons.js           built-in line icons (Tabler Icons, MIT)
icons/                app icon (apricot blossom 杏花) in every size
js/classes.js         class list manager
js/points.js          behaviour points per class (totals, daily log, absences, undo, CSV)
js/ui.js              helpers (DOM, toast, modal, chime)
js/widgets/*.js       one file per tool
sw.js                 offline cache
manifest.webmanifest  install metadata
```

No build step and no external libraries.

## Credits

Interface icons: [Tabler Icons](https://tabler.io/icons) by Paweł Kuna, MIT licence. A copy of the icons the app uses is built into `js/icons.js`.

App icon: an apricot blossom (杏花), after 杏坛, the apricot altar where Confucius taught.
