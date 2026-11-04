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

## Boards

Each lesson or class can have its own **board**: its tools, text, timer settings and background.

- When the app opens, the **boards screen** asks which board to open. A reload reopens the board that window had open.
- **🗂 Boards** (top left) goes back to the boards screen. Click the board name for **board settings**: its name and background. 🎨 (top right) opens the background settings directly.
- Boards **save automatically** as you work. The *Saved ✓* label next to the name shows the status. Closing the window never loses work, so there is no “Save?” prompt. The browser shows its own warning only if a save failed (for example, if storage is full).
- On the boards screen: **New board**, **Rename**, **Copy** (to reuse a lesson layout), **Share** and **Delete**.
- **⬇ Share** downloads one board as a file for a colleague to **⬆ Import**. Student names (picked names, groups) are left out, and class lists and points are never included.
- Class lists are shared by all boards.
- Opening one board in two windows keeps them in step. Different boards in different windows don't affect each other.
- A timer that ran out more than a minute earlier comes back reset, so an old board doesn't chime when it opens.

## Backgrounds

Each board has its own background, set in **board settings** (click the board name, or 🎨):

- **Colours:** eight presets or any custom colour.
- **Library:** images bundled with the app, in four sets: Chinese paintings (中国画), Nature (自然), Singapore (新加坡) and Festive (节庆). Every one is public domain or CC0; credits are listed under [Image credits](#image-credits) and shown in the picker. They work offline once viewed.
- **Upload:** any JPG, PNG or WebP. It is resized to screen size (about 1920 px) and kept in this browser's IndexedDB. Uploaded images can be reused on other boards and deleted from the Upload tab. Deleting the last board that uses one frees its space.
- **Image brightness** lightens or darkens an image so tools and the top bar stay easy to read. The corner controls switch between light and dark automatically.
- A full backup includes uploaded images in use. **⬇ Share** files never do: a shared board with an uploaded image arrives with a plain colour instead. Library images are kept, because every copy of the app has them.

## Points

- **Points belong to the class, not the board.** Every board showing 2E1 shows 2E1's running totals, so a new or copied lesson board picks up where the last lesson left off.
- **Tap a name** to mark that student absent for today. Absent students are greyed out and skipped by **+ All** / **− All**. The marks clear the next day.
- **↶ Undo** reverses the latest change, including a whole-class one (up to 20 of today's changes).
- **Sort:** *Class order* (the default every time the tool opens), *A–Z*, or *Top*. Rows never move while you tap; tap *Top* again to re-sort.
- Points can go below zero.
- **⋯ menu:** set a **class goal** (a progress bar for the class total, which adds up everyone's points), **download the log** as a CSV (one row per student, one column per day, plus the running total) and **reset points to 0** for a new term (the log is kept).
- Points are matched by name. Editing a student's name in the class list starts them at 0; removing a name and adding it back brings its points back. Deleting a class deletes its points.

## Image credits

Every bundled background is public domain or released under CC0, so no permission or attribution is required. They are credited here anyway, and in the background picker.

**Chinese paintings (中国画)**

- [Streams and Mountains without End (detail)](https://commons.wikimedia.org/w/index.php?curid=76240240), Unidentified artist, Northern Song–Jin dynasty. Cleveland Museum of Art, via Wikimedia Commons. CC0.
- [Chinese Bulbuls and Flowering Cherry-Apple](https://commons.wikimedia.org/wiki/File:MET_DP202773_CRD.jpg), Unidentified artist. The Met, via Wikimedia Commons. CC0.
- [Finches and Bamboo](https://commons.wikimedia.org/wiki/File:%E5%8C%97%E5%AE%8B_%E5%BE%BD%E5%AE%97_%E7%AB%B9%E7%A6%BD%E5%9C%96_%E5%8D%B7-Finches_and_bamboo_MET_DP151504_CRD.jpg), Emperor Huizong of Song. The Met, via Wikimedia Commons. CC0.
- [A Thousand Li of Rivers and Mountains (detail)](https://commons.wikimedia.org/wiki/File:Wang_Ximeng_-_A_Thousand_Li_of_River_(Bridge).jpg), Wang Ximeng. Palace Museum, Beijing, via Wikimedia Commons. Public domain.
- [Orchids and Bamboo (detail)](https://commons.wikimedia.org/wiki/File:%E6%B8%85_%E9%84%AD%E7%87%AE_%E8%98%AD%E7%AB%B9%E5%9C%96_%E5%8D%B7-Orchids_and_Bamboo_MET_DP204894.jpg), Zheng Xie. The Met, via Wikimedia Commons. CC0.

**Nature (自然)**

- [Misty mountains](https://commons.wikimedia.org/wiki/File:Misty_Mountains_(Unsplash_zR40wedS1aQ).jpg), James Bloedel. Wikimedia Commons. CC0.
- [Hills in morning haze](https://commons.wikimedia.org/wiki/File:Janov_20260919_Aussichtsturm_Aussicht_30.jpg), NutzerAusBerlin. Wikimedia Commons. CC0.
- [Calm waters](https://commons.wikimedia.org/wiki/File:Calm_Waters_(34595165103).jpg), U.S. Fish and Wildlife Service. Wikimedia Commons. Public domain.
- [Cumulus clouds](https://commons.wikimedia.org/wiki/File:Cumulus_clouds_in_the_sky.jpg), desilia. Wikimedia Commons. CC0.
- [Sea, sky and clouds](https://commons.wikimedia.org/wiki/File:Sea_sky_and_clouds,_Ibiza,_Spain.jpg), Joselodos. Wikimedia Commons. CC0.
- [Choui Fong tea plantation, Thailand](https://commons.wikimedia.org/w/index.php?curid=71046579), Denchai (Pixabay). Wikimedia Commons. CC0.

**Singapore (新加坡)**

- [Singapore skyline](https://commons.wikimedia.org/wiki/File:Skyline_of_Singapore_Central_Business_District_20250903.jpg), DvTor8303. Wikimedia Commons. CC0.
- [Marina Bay at night](https://commons.wikimedia.org/wiki/File:Singapore_Skyline_(Unsplash).jpg), Sven Scheuermeier. Wikimedia Commons. CC0.
- [Marina Bay Sands and the ArtScience Museum](https://commons.wikimedia.org/wiki/File:Downtown_Singapore,_1_November_2024_(54212697906).jpg), Mustang Joe. Wikimedia Commons. CC0.
- [Supertree Grove, Gardens by the Bay](https://commons.wikimedia.org/w/index.php?curid=123864846), Balon Greyjoy. Wikimedia Commons. CC0.
- [HDB flats](https://commons.wikimedia.org/w/index.php?curid=105178287), Bernard Spragg. Wikimedia Commons. CC0.

**Festive (节庆)**

- [Red lanterns for Chinese New Year](https://commons.wikimedia.org/w/index.php?curid=75924834), Silentpilot. Wikimedia Commons. CC0.
- [Lanterns, Nagasaki Lantern Festival](https://commons.wikimedia.org/wiki/File:20190202_Nagasaki_Chinese_New_Year_lantern-4.jpg), Balon Greyjoy. Wikimedia Commons. CC0.
- [Oil lamp for Deepavali](https://www.rawpixel.com/image/5925541/photo-image-lights-public-domain-fire). rawpixel. CC0.
- [Fireworks](https://stocksnap.io/photo/fireworks-lights-11JGOISGC7), Mike Enerio. StockSnap. CC0.
- [Christmas lights](https://stocksnap.io/photo/christmas-lights-QAO7TLCIYC), Joanna Kosinska. StockSnap. CC0.

## Privacy and data

- Data is saved in the browser's `localStorage` on the device in use: one entry for class lists, points and settings (`xingtan:v2:meta`) and one per board (`xingtan:v2:board:<id>`). It is not shared between browsers or computers.
- Data from the earlier single-layout version is moved into a board called “My board” the first time the new version opens. The old entry is kept as a fallback.
- **⚙️ → Download backup** saves every board, class list and points log to a `.json` file. **Restore from backup** loads it on another computer.
- Uploaded background images are kept in the browser's IndexedDB (database `xingtan`).
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
js/backgrounds.js     background presets and image backgrounds
js/boardsettings.js   board settings panel (name, background)
js/images.js          uploaded background images (IndexedDB)
js/library.js         bundled background images and their credits
backgrounds/          bundled images (1920×1080 WebP) and thumbs/
js/classes.js         class list manager
js/points.js          behaviour points per class (totals, daily log, absences, undo, CSV)
js/ui.js              helpers (DOM, toast, modal, chime)
js/widgets/*.js       one file per tool
sw.js                 offline cache
manifest.webmanifest  install metadata
```

No build step and no external libraries.
