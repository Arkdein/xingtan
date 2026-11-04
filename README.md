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
| 💡 Thinking routine | Making Thinking Visible routines (思维常规) with large bilingual prompts and a sticky-note wall. Students can answer on their own devices through a Google Form (QR code), and the answers are saved to the class's Google Sheet. See [Thinking routines](#thinking-routines-思维常规). |
| 🔊 Noise meter | Live microphone level with an adjustable limit. Audio is analysed in the browser and never recorded. |
| 🚦 Traffic light | Click a light to show it. |
| 🪧 Work mode | Bilingual (English / 中文) signs: silent work, whisper, partner, group, raise hand, eyes on me. |
| 📝 Text | Large-type instructions board with **bold**, *italic*, underline, bullet and numbered lists, five text colours, four highlights, Clear formatting, and a background colour for each Text box (white or six soft tints). The formatting bar appears when you hover over or type in the tool. Pasted text keeps bold, italic, underline and lists only. |
| ▶️ YouTube | Paste a YouTube link (or search by keyword, with a free key) and **play now** or **save** it to the board. Each board keeps its own list of saved videos, with optional clip times and teacher notes. See [YouTube](#youtube) below. |
| 🖼️ Images/ PDF | Pictures and PDFs for the lesson: upload, drag in, paste (Ctrl+V), a web link or a camera / visualiser photo. Show one at a time with zoom, a pen, highlighter and typed text, uncover-bit-by-bit tiles and next / back. Each PDF page becomes a picture. Each board keeps its own pictures. See [Images/ PDF](#images-pdf) below. |

Drag tools by their title bar and resize them from the bottom-right corner.

### Customising the dock

Tap **Edit** at the right end of the dock to:
- **Reorder** tools by dragging them (or focus a tool and use the ← → keys).
- **Hide** a tool with **−**. Hidden tools stay one tap away under **More**.
- **Add a tool back** with **+**.
- Switch to **Icons only (compact)**, or **Reset** to the original dock.

Tap **Done** or press Esc to finish. The dock layout is the same on every board in this browser and is included in backups.

Tool tiles are colour-coded by purpose: **blue** for time (Timer, Clock), **apricot** for students (Name picker, Groups, Points), **green** for class signals (Noise meter, Traffic light, Work mode) and **grey** for content (Text, YouTube, Images/ PDF).

## Boards

Each lesson or class can have its own **board**: its tools, text, timer settings and background.

- When the app opens, the **boards screen** greets the teacher (time of day and date, in English and 中文) and asks which board to open. The large **Continue where you left off** button reopens the last board in one tap. A reload reopens the board that window had open.
- **Boards** (top left) goes back to the boards screen. Click the board name for **board settings**: its name and background. The palette button (top right) opens the background settings directly.
- Boards **save automatically** as you work. The *Saved ✓* label next to the name shows the status. Closing the window never loses work, so there is no “Save?” prompt. The browser shows its own warning only if a save failed (for example, if storage is full).
- On the boards screen: **New board**, **Rename**, **Copy** (to reuse a lesson layout), **Share** and **Delete**.
- **⬇ Share** downloads one board as a file for a colleague to **⬆ Import**. Student names (picked names, groups) are left out, and class lists and points are never included.
- Class lists are shared by all boards.
- Opening one board in two windows keeps them in step. Different boards in different windows don't affect each other.
- A timer that ran out more than a minute earlier comes back reset, so an old board doesn't chime when it opens.

## Backgrounds

Each board has its own background, set in **board settings** (click the board name, or the palette button):

- **Colours:** eight presets or any custom colour.
- **Library:** images bundled with the app, in four sets: Chinese paintings (中国画), Nature (自然), Singapore (新加坡) and Festive (节庆). Every one is public domain or CC0; credits are listed under [Image credits](#image-credits) and shown in the picker. They work offline once viewed.
- **Upload:** any JPG, PNG or WebP. It is resized to screen size (about 1920 px) and kept in this browser's IndexedDB. Uploaded images can be reused on other boards and deleted from the Upload tab. Deleting the last board that uses one frees its space.
- **Image brightness** lightens or darkens an image so tools and the top bar stay easy to read. The corner controls switch between light and dark automatically.
- A full backup includes uploaded images in use. **Share** files never do: a shared board with an uploaded image arrives with a plain colour instead. Library images are kept, because every copy of the app has them.

## Thinking routines 思维常规

Routines from Project Zero's *Making Thinking Visible* (Ritchhart, Church & Morrison):

- **Core 核心:** See · Think · Wonder 看·想·疑, Think · Puzzle · Explore 想·疑·探, Claim · Support · Question 主张·支持·质疑
- **Connections 联系:** Connect · Extend · Challenge 联系·拓展·挑战, Headlines 新闻标题, I used to think… Now I think… 以前我认为……现在我认为……
- **Perspectives 视角:** Compass Points 指南针, Circle of Viewpoints 观点圈 (students pick from the teacher's viewpoints), Tug of War 拔河 (students place themselves on a 5-point line between two sides)
- **Custom 自定义:** teachers write their own steps and sentence starters. Custom routines are shared by all boards and included in backups.

Each run chooses its language (English, 中文 or both) and whether students' names are **hidden on screen** (kept in the Sheet), **shown**, or **not asked**.

- **Prompt** view shows the routine's steps and sentence starters in large type, with a QR code when students answer on devices.
- **Wall** view collects answers as sticky notes, one column per step. Drag notes to regroup them, **star** the ones to discuss, and **hide** any that shouldn't be on screen. The teacher or a scribe can type notes too, so the routine also works with no devices.
- **Start with student devices** (needs Google, below) makes and publishes a Google Form for this run and shows its QR code. Answers arrive about every 5 seconds.
- **End** stops the form taking answers and saves everything to the class's Google Sheet, *杏坛 · class · Thinking routines 思维常规*, one tab per run. Shared board files keep the routine set-up but never students' answers.

The stems are in `js/routines.js`.

### Google connection

Optional, and only when the teacher clicks **Connect Google** (also in ⚙️ Settings). The browser signs in with Google directly; there is still no server.

- The app asks only for Google's `drive.file` permission (the files it creates itself) and the account's email. It cannot see anything else in the teacher's Drive.
- Forms and Sheets are made in a **杏坛 ClassroomBoard** folder in the teacher's Drive and stay there.
- The sign-in lasts about an hour and is kept in the open tab only. **Reconnect** renews it.
- Students never sign in to 杏坛. The forms are open to anyone with the link.
- See [privacy.html](privacy.html).

## Points

- **Points belong to the class, not the board.** Every board showing 2E1 shows 2E1's running totals, so a new or copied lesson board picks up where the last lesson left off.
- **Tap a name** to mark that student absent for today. Absent students are greyed out and skipped by **+ All** / **− All**. The marks clear the next day.
- **↶ Undo** reverses the latest change, including a whole-class one (up to 20 of today's changes).
- **Sort:** *Class order* (the default every time the tool opens), *A–Z*, or *Top*. Rows never move while you tap; tap *Top* again to re-sort.
- Points can go below zero.
- **⋯ menu:** set a **class goal** (a progress bar for the class total, which adds up everyone's points), **download the log** as a CSV (one row per student, one column per day, plus the running total) and **reset points to 0** for a new term (the log is kept).
- Points are matched by name. Editing a student's name in the class list starts them at 0; removing a name and adding it back brings its points back. Deleting a class deletes its points.

## YouTube

- **Adding a video:** tap **Add video** and paste a link from YouTube (youtube.com, youtu.be, Shorts and links with a start time all work). Then **Play now**, or **Save** it to this board for later.
- **Keyword search** (optional) needs a free YouTube Data API key. Each teacher adds their own under **⋯ → YouTube settings**, which has a step-by-step guide (about 5 minutes, once). A key allows about 100 searches a day; the count restarts at midnight California time. Results use YouTube's SafeSearch (strict) and only show videos that are allowed to play on other websites. Without a key, typing keywords offers **Search on YouTube** in a new tab, so the teacher can copy a link back.
- **Saved videos belong to the board, not the tool.** Closing the YouTube tool keeps the list, and adding the tool again brings it back. Copying, sharing or backing up the board includes the list. The tool opens to its list, and nothing plays until the teacher picks a video. Drag the ⠿ handle to put videos in lesson order (or focus it and use ↑ ↓).
- **✎ Edit** sets a **clip** (start and stop times, such as 1:20 to 3:45), a **teacher note** (for example “Pause at 2:10 for See–Think–Wonder”, shown in the list only) and the title. While watching a saved video, **✂ Clip → Start here / Stop here** sets the times from the video itself.
- **Fewer distractions:** a cover hides the player until **Play** is pressed. At the clip's stop time, or the end of the video, the video is covered with **Replay** and **Back to list**, so YouTube's suggested videos don't show. **YouTube settings → Cover the video when it's paused** also hides YouTube's paused screen (off by default, so a paused frame can be discussed).
- If an uploader doesn't allow their video on other websites, the tool says so and offers **Open on YouTube**.
- Videos need the internet, and play in YouTube's privacy-enhanced player (`youtube-nocookie.com`). YouTube's own ads may still appear.

## Images/ PDF

- **Adding pictures:** **Upload pictures or PDFs** (several at once), drag pictures or PDFs onto the tool (from the computer or from a web page), copy a picture or screenshot and press **Ctrl+V** (⌘V on a Mac), paste a picture's web address, or **Take a photo** with the laptop camera or a visualiser (pick the camera if there is more than one).
- **PDFs:** each page becomes a picture (2400 px on the long side, so text stays sharp when zoomed), grouped under the PDF's name in the list. For a PDF of more than one page the teacher picks **All pages** or types some, such as `1-3, 7`. Next / back steps through the pages, then on to the next item. Pages can't be searched and links in the PDF don't work, because they are pictures. A page takes about 0.2–0.4 MB. Password-protected PDFs need saving without the password first.
- Pictures are shrunk to screen size (at most 1920 px) and kept in this browser. Screenshots and diagrams stay sharp as PNG; photos are stored as JPEG.
- If a website doesn't allow its picture to be copied, it is saved as a **web link** instead: it shows from the web, so it needs the internet and isn't in backups.
- **Pictures belong to the board, not the tool.** Closing the Images tool keeps them. The tool opens to its list, and nothing shows until the teacher picks a picture. Drag the ⠿ handle to put them in lesson order (or focus it and use ↑ ↓).
- **✎** adds a **caption**, shown under the picture for the class, and a **teacher note**, shown in the list only.
- **Showing a picture:**
  - **Move and zoom:** scroll, pinch, double-click or use − / fit / fit width / +. Once zoomed in, scrolling moves around the picture (hold Ctrl or ⌘ to keep zooming), and so does dragging. **Fit width** suits tall PDF pages: it fills the width from the top.
  - **Pen** and **highlighter** in a few colours, **rub out** one line, **undo** and **clear**.
  - **Type text** (Aa): click where the text should go and type, for example answers on a worksheet. Enter starts a new line, A− / A+ change the size, the colours change its colour, the ⠿ handle moves it and × deletes it. Click away or press Esc to finish.
  - Drawings and text are saved with each picture or page until cleared.
  - **Reveal:** covers the picture with 2×2, 3×3 or 4×4 numbered tiles; tap a tile to uncover it (tap again to cover it), or **Show all** / **Cover all**.
  - **Next / back** with the side arrows, the ← → keys, or a presentation clicker (Page Up / Page Down). **Slideshow** starts from the first picture.
  - **Full screen** for the picture, its caption and the tools.
- **Sharing:** a shared board file includes the board's pictures (so it can be a few MB). Copying a board shares the same stored pictures; a picture is deleted from the browser only when no board uses it any more.

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

- Data is saved in the browser's **IndexedDB** (database `xingtan`) on the device in use: one record per board (store `boards`, pen and highlighter marks included) and one for class lists, points and settings (store `kv`, key `meta`). It is not shared between browsers or computers. IndexedDB can use a large share of the computer's free disk space, so heavily annotated boards don't run into the ~5 MB limit that `localStorage` has.
- **⚙️ → Storage on this computer** shows how much space the app uses and roughly how much the browser allows, split into boards and drawings, pictures and PDF pages, and class lists and points.
- **Moving from earlier versions:** versions before November 2026 saved boards in `localStorage` (`xingtan:v2:meta`, `xingtan:v2:board:<id>`, and before that `xingtan:v1`). The first time the new version opens, it copies everything into IndexedDB, checks the copy, and keeps the old entries for 30 days as a fallback before removing them. If a tab still running the older version saves a change in that time, the new version picks it up. If another tab is holding the database open while the update arrives, the app asks the teacher to close it and then carries on by itself.
- Changes are saved a moment after they're made. If a window closes before a save has finished, the app keeps an emergency copy in `localStorage` (`xingtan:v3:unsaved:<window>`) and saves it properly the next time it opens.
- If a browser won't open IndexedDB, the app keeps working with the older `localStorage` layout, and the storage panel says so.
- **⚙️ → Download backup** saves every board, class list and points log to a `.json` file. **Restore from backup** loads it on another computer. Before it replaces anything, it shows what the backup holds and what is in the browser now. It warns if work here is newer than the backup, offers to back that up first, and needs a second click to go ahead.
- **Backup reminder:** once a week's work hasn't been backed up (or a week after first use, if there has never been a backup), the boards screen shows a reminder with **Download backup** and **Later** (hides it for three days). There is no reminder when nothing has changed since the last backup.
- Uploaded background images and Images-tool pictures are kept in the same IndexedDB database (store `images`). Full backups include every picture in use; shared board files include Images-tool pictures but not uploaded backgrounds.
- A YouTube search key, if one is added, is kept in its own entry (`xingtan:youtube`) in this browser only. It is never included in backups or shared board files. Searches and video playback go directly from the browser to YouTube.
- Clearing browser data removes everything, so keep a backup. In Chrome's *Delete browsing data*, **Cookies and other site data** (ticked by default) deletes the app's data; **Cached images and files** on its own is safe. Incognito and Guest windows forget everything when they close.
- Browsers may clear site data by themselves when the computer runs very low on disk space. The app asks the browser to keep its data (`navigator.storage.persist()`) once there is something to keep. Chrome and Edge decide quietly, and usually agree for installed apps and bookmarked sites; **⚙️** shows whether the browser has agreed.
- The one exception to “nothing leaves the browser” is the optional [Google connection](#google-connection): when a teacher uses it, the thinking-routine forms, students' answers and Sheets are kept in that teacher's own Google Drive.

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

`ctx` gives each tool `ctx.state` (its saved state, removed when the tool is closed), `ctx.save(patch)`, `ctx.boardData` / `ctx.saveBoardData(patch)` (kept on the board for that type of tool, so it survives closing the tool; never put student names here), `ctx.onBoardDataChange(fn)`, `ctx.store` (class lists), `ctx.onClassesChange(fn)`, `ctx.openClasses()` and `ctx.toast(msg)`.
`mount` can return `{ destroy() }` to clean up timers or the microphone.
If a tool's state can hold student names, give it `share(state)` returning a copy without them. Shared board files use it.

## Structure

```
index.html            app shell
css/styles.css        all styles
js/app.js             window manager, dock, backgrounds, settings
js/store.js           boards, class lists, autosave, backup/restore, moving old data across
js/db.js              opens the IndexedDB database shared by store.js and images.js
js/boards.js          boards screen (open, new, rename, copy, share, import, delete)
js/backgrounds.js     background presets and image backgrounds
js/boardsettings.js   board settings panel (name, background)
js/library.js         bundled background images and their credits
backgrounds/          bundled images (1920×1080 WebP) and thumbs/
js/dock.js            tool dock: reorder, hide, More menu, compact mode
js/icons.js           built-in line icons (Tabler Icons, MIT)
icons/                app icon (apricot blossom 杏花) in every size
fonts/                title calligraphy for 杏坛 (two characters only)
js/classes.js         class list manager
js/points.js          behaviour points per class (totals, daily log, absences, undo, CSV)
js/youtube.js         YouTube links, titles, keyword search (teacher's own key), player loader
js/images.js          uploaded pictures (IndexedDB): backgrounds and Images-tool pictures
js/pdf.js             PDF pages to pictures for the Images tool (loads js/vendor/pdfjs on demand)
js/routines.js        thinking routines (built-in and custom), with their bilingual stems
js/google.js          optional Google sign-in (drive.file only) and API calls
js/gforms.js          Google Forms and Sheets for thinking routines
js/ui.js              helpers (DOM, toast, modal, chime)
js/widgets/*.js       one file per tool
sw.js                 offline cache
privacy.html          privacy notice (also used for Google's consent screen)
labs/google-test.html stand-alone test of the Google Forms connection
js/vendor/qrcode.js   QR code generator (Kazuhiko Arase, MIT)
manifest.webmanifest  install metadata
```

No build step. The only outside library is PDF.js, bundled in `js/vendor/pdfjs` and loaded only when a PDF is added.

## Credits

PDF pages: [PDF.js](https://github.com/mozilla/pdf.js) by Mozilla, Apache License 2.0. A copy is bundled in `js/vendor/pdfjs` (licence included) and loads only when a PDF is added; it is the app's only outside library.

Interface icons: [Tabler Icons](https://tabler.io/icons) by Paweł Kuna, MIT licence. A copy of the icons the app uses is built into `js/icons.js`.

App icon: an apricot blossom (杏花), after 杏坛, the apricot altar where Confucius taught.

Title calligraphy: 杏坛 is set in [Ma Shan Zheng](https://github.com/googlefonts/mashanzheng) (SIL Open Font License 1.1). The app carries a copy cut down to just those two characters (`fonts/mashanzheng-xingtan.woff2`, about 1 KB); the licence is in `fonts/MaShanZheng-OFL.txt`.
