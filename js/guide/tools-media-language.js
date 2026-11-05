// Guide cards: youtube, music, images, sharelink, quotes, dictation, hanzi. English and Chinese. See js/guide/README.md for the format.
export default {
  youtube: {
    en: {
      for: 'Plays YouTube videos on the board. Each board keeps its own list of videos, saved and ready for the lesson.',
      start: [
        'Press **Add video** and paste a link copied from YouTube. Shorts and links with a start time work too.',
        'Press **Play now** to watch it, or **Save** to keep it in this board’s list.',
        'Next time, the tool opens to the saved list. Nothing plays until you press **Play**.',
      ],
      know: [
        { heading: 'Clips and notes', items: [
          'The ✎ button (**Edit clip, note and title**) sets **Start at** and **Stop at** times, such as `1:20` to `3:45`. Its **Teacher note** shows in the list only.',
          'While a saved video plays, **Clip** → **Start here** / **Stop here** sets the times from the video itself. **Whole video** clears them.',
          'Drag the ⠿ handle to put the videos in lesson order.',
        ] },
        { heading: 'Fewer distractions', items: [
          'A cover hides the player until you press **Play**. At a clip’s stop time the video pauses under a cover with **Replay clip**, **Keep watching** and **Back to list**.',
          'At the end of a video, the cover hides YouTube’s suggested videos.',
          'Under ⋯ (**YouTube settings**), tick **Cover the video when it’s paused on this board** to hide the paused screen too. It is off to start with, so you can pause on a frame to discuss it.',
          'Minimising the tool pauses the video.',
        ] },
        { heading: 'Searching', items: [
          'Pasting links always works. To search by keyword in the tool, add your own free YouTube key in **YouTube settings** (about 5 minutes, once, with steps shown).',
          'A key gives about 100 searches a day, with YouTube’s strict SafeSearch. Without one, typing keywords offers **Search on YouTube** in a new tab.',
        ] },
      ],
      tip: 'Before a See–Think–Wonder starter, save a short clip and set it to stop where you want to ask. Add a teacher note such as *Pause at 2:10* as a reminder.',
      data: 'The video list belongs to the board, so it stays when the tool is closed and goes with copies, shared files and backups. A search key stays in this browser only, never in backups or shared files. Videos need the internet.',
    },
    zh: {
      for: '在白板上播放 YouTube 视频。每个白板都有自己的视频列表，课前存好，上课直接播。',
      start: [
        '按**添加视频**，粘贴从 YouTube 复制的链接。Shorts 和带开始时间的链接也可以。',
        '按**立即播放**马上看，或按**保存**存进这个白板的列表。',
        '下次打开时，工具会先显示已保存的列表。按**播放**之前，什么都不会播。',
      ],
      know: [
        { heading: '片段和备注', items: [
          '按 ✎（**编辑片段、备注和标题**）可以设定**开始于**和**停止于**的时间，例如 `1:20` 到 `3:45`。**老师备注**只在列表里显示。',
          '播放已保存的视频时，按**片段** → **从这里开始** / **在这里停止**，直接从视频里定下时间。按**整个视频**就取消片段。',
          '拖动 ⠿ 可以按上课顺序排列视频。',
        ] },
        { heading: '少些干扰', items: [
          '按**播放**之前，播放器是遮住的。片段播到停止时间会自动暂停并遮住画面，显示**重播片段**、**继续观看**和**返回列表**。',
          '视频播完时，YouTube 推荐的其他视频也会被遮住。',
          '在 ⋯（**YouTube 设置**）里勾选**在这个白板上暂停时遮盖视频**，暂停时也会遮住画面。这一项一开始是关闭的，方便你停在某个画面和学生讨论。',
          '把工具最小化，视频就会自动暂停。',
        ] },
        { heading: '搜索', items: [
          '粘贴链接随时都能用。想在工具里用关键词搜索，可以在 **YouTube 设置**里加上你自己的免费密钥（只需设置一次，约 5 分钟，有步骤说明）。',
          '一个密钥每天约可搜索 100 次，并使用 YouTube 的严格安全搜索。没有密钥时，输入关键词会出现**在 YouTube 搜索**，在新标签页打开。',
        ] },
      ],
      tip: '用“看·想·疑”导入前，先存一段短片，把停止时间设在你要提问的地方，再在老师备注写上 *2:10 暂停提问*，上课时一看就知道。',
      data: '视频列表属于白板，所以关掉工具后仍会保留，复制、分享或备份白板时也会一起带走。搜索密钥只保存在这个浏览器，不会放进备份或分享的文件。视频需要上网才能播放。',
    },
  },

  music: {
    en: {
      for: 'Plays background music during the lesson: tracks from the app’s own library, your own music files or Spotify.',
      start: [
        'Press **Add music** and choose **Music library**, **Your files** or **Spotify**.',
        'In the library, tap a track’s tile to listen, then press **Add**.',
        'Back in the list, press **Play**. The bar at the bottom has pause, **Fade out** and the volume.',
      ],
      know: [
        { heading: 'Adding', items: [
          'The **Music library** has six pieces made for the app, in **Calm**, **Focus** and **Festive** sets. Each works offline once it has played.',
          '**Your files** takes MP3, M4A, WAV or OGG files up to 40 MB each, or drag them onto the tool. **Already on this computer** lists files added on other boards.',
          'For **Spotify**, paste a playlist, album or song link and press play in Spotify’s own player. Whole songs need Spotify Premium signed in on this browser; otherwise you get 30-second previews.',
        ] },
        { heading: 'Playing', items: [
          'Tick **Play with the Timer**: when a Timer on this board starts, the music rises gently. Pausing the Timer pauses it, and at zero it fades out.',
          'The app can’t start Spotify by itself, so with Spotify you press play in its player. The Timer still pauses and stops it.',
          'Minimise the tool and the music keeps playing. The chip has play / pause.',
          'The repeat button switches between the whole list and one track. ✎ adds a title and a teacher note, shown in the list only.',
        ] },
      ],
      tip: 'For a 10-minute silent writing task, tick Play with the Timer and add a Focus track. Start the Timer and the music fades in; when it fades out at zero, pens go down.',
      data: 'The music list belongs to the board and stays when the tool is closed. Your own music files stay in this browser and go into full backups, but shared board files leave them out. Library tracks and Spotify links do go with shared files.',
    },
    zh: {
      for: '上课时播放背景音乐：可选应用自带的音乐库、你自己的音乐文件或 Spotify。',
      start: [
        '按**添加音乐**，选择**音乐库**、**自己的文件**或 **Spotify**。',
        '在音乐库里，点曲目的方块可以先试听，满意就按**添加**。',
        '回到列表，按**播放**。下方的播放条有暂停、**渐弱**和音量。',
      ],
      know: [
        { heading: '添加', items: [
          '**音乐库**有六首专为这个应用创作的乐曲，分**安静**、**专注**和**节庆**三组。每首播放过一次后，没有网络也能播。',
          '**自己的文件**支持 MP3、M4A、WAV 或 OGG，每个最大 40 MB，也可以直接拖进工具。**这台电脑上已有的文件**会列出你在其他白板加过的音乐。',
          '用 **Spotify** 时，粘贴歌单、专辑或歌曲的链接，再在 Spotify 自己的播放器里按播放。要在这个浏览器登录 Spotify Premium 才能播完整首歌，否则只有 30 秒试听。',
        ] },
        { heading: '播放', items: [
          '勾选**随计时器播放**：这个白板上的计时器一开始，音乐就轻轻响起；暂停计时器，音乐也暂停；时间到了，音乐慢慢减弱。',
          '应用不能自己开始播放 Spotify，所以用 Spotify 时要你在播放器里按播放。计时器仍能让它暂停和停止。',
          '把工具最小化，音乐会继续播放，小标签上也有播放 / 暂停。',
          '循环按钮可在整个列表和单曲循环之间切换。按 ✎ 可以改标题、写老师备注，备注只在列表里显示。',
        ] },
      ],
      tip: '安排十分钟安静写作时，勾选“随计时器播放”，加一首“专注”的乐曲。按下计时器，音乐渐渐响起；时间到，音乐渐弱，学生就知道该放下笔了。',
      data: '音乐列表属于白板，关掉工具后仍会保留。你自己的音乐文件保存在这个浏览器里，会放进完整备份，但分享的白板文件不包括它们。音乐库的曲目和 Spotify 链接会随分享的文件一起带走。',
    },
  },

  images: {
    en: {
      for: 'Shows pictures and PDF pages to the class, one at a time, with zoom, a pen and typed text on top.',
      start: [
        'Press **Upload pictures or PDFs**, or drag files onto the tool. For a PDF, you can choose **Only pages** and type some, such as `1-3, 7`.',
        'Press **Show** beside an item to put it up. The arrows at the sides go to the next picture or page.',
        'Press **List** to go back and pick another.',
      ],
      know: [
        { heading: 'Adding', items: [
          'Copy a picture or screenshot, click the tool and press Ctrl+V (⌘V on a Mac).',
          '**Take a photo** uses the laptop camera or a visualiser (pick one at the top if there are several). Press **Take photo**, then **Use this photo** or **Retake**.',
          'If a website won’t let its picture be copied, it is kept as a web link, marked *web* in the list. It needs the internet to show.',
        ] },
        { heading: 'Showing', items: [
          'Scroll, pinch or double-click to zoom; drag to move. **Fit the width** suits tall PDF pages: it fills the width from the top.',
          '**Reveal** covers the picture with 2×2, 3×3 or 4×4 numbered tiles. With the hand tool (**Move and zoom**) on, tap a tile to uncover it, or use **Show all** / **Cover all**.',
          'A presentation clicker, the ← → keys or the side arrows step through every picture and PDF page. **Slideshow** starts from the first one.',
        ] },
        { heading: 'Drawing and typing', items: [
          '**Pen** and **Highlighter** come in a few colours. You can rub out one line, undo, or clear the page.',
          '**Type text** (Aa): click where the text should go and type, for example answers on a worksheet. A− / A+ change the size, ⠿ moves it, × deletes it.',
          'Drawings and text stay on each picture or page until you clear them.',
          'With ✎, the **Caption** shows under the picture for the class; the **Teacher note** shows only in your list.',
        ] },
      ],
      tip: 'During pair work, photograph one group’s worksheet under the visualiser. Annotate it with the pen while the class gives feedback against the success criteria.',
      data: 'Pictures belong to the board: they stay when the tool is closed, and are kept in this browser, not uploaded. Full backups and shared board files include them, so a shared file can be a few MB.',
    },
    zh: {
      for: '向全班展示图片和 PDF 页面，一次一张，可以放大，也可以在上面画画和打字。',
      start: [
        '按**上传图片或 PDF**，或把文件拖进工具。添加 PDF 时，可以选**只添加这些页**并输入页码，例如 `1-3, 7`。',
        '在项目旁按**显示**，就会放大展示。两侧的箭头可以翻到下一张图片或下一页。',
        '按**列表**回去选另一张。',
      ],
      know: [
        { heading: '添加', items: [
          '复制图片或截图后，点一下工具，按 Ctrl+V（Mac 按 ⌘V）就能贴上。',
          '**拍照**可以用电脑摄像头或实物投影仪（有多个摄像头时，在顶部选择）。按**拍照**，再选**使用这张照片**或**重拍**。',
          '有些网站不让复制图片，图片就会存成网络链接，列表里标着“网络”。这类图片要上网才能显示。',
        ] },
        { heading: '展示', items: [
          '滚动、双指缩放或双击都能放大，拖动可移动画面。**适应宽度**适合长长的 PDF 页面：从页顶开始，铺满整个宽度。',
          '**揭开**会用 2×2、3×3 或 4×4 的编号方块盖住图片。用手形工具（**移动和缩放**）时，点一个方块就揭开一块，也可以按**全部揭开**或**全部遮住**。',
          '用翻页笔、← → 键或两侧的箭头，可以按顺序翻过每张图片和每一页 PDF。**幻灯片**从第一张开始播放。',
        ] },
        { heading: '画画和打字', items: [
          '**画笔**和**荧光笔**有几种颜色可选。可以擦掉一条线、撤销，或清除整页。',
          '**输入文字**（Aa）：点击要放文字的位置就能打字，例如在作业单上写答案。A− / A+ 调大小，拖 ⠿ 移动，按 × 删除。',
          '画的线和打的字会跟着每张图片或每一页保存，直到你清除为止。',
          '按 ✎ 可以写**图片说明**和**老师备注**：图片说明显示在图片下方，给全班看；老师备注只在你的列表里显示。',
        ] },
      ],
      tip: '小组活动时，把其中一组的作业单放在实物投影仪下拍下来。全班对照成功标准给反馈时，你就用画笔在上面圈画批注。',
      data: '图片属于白板：关掉工具后仍会保留，而且只存在这个浏览器里，不会上传。完整备份和分享的白板文件都会包括这些图片，所以分享的文件可能有几 MB。',
    },
  },

  sharelink: {
    en: {
      for: 'Shows a web page as a big QR code, so students can open it on their own devices.',
      start: [
        'Press **Add a link** and paste the address of a Padlet, Google Form, Slido or reading.',
        'Add a **Label** if you like, such as *Exit ticket*, then press **Add**.',
        'Students scan the QR code, or type the address shown under it.',
      ],
      know: [
        { heading: null, items: [
          'Click the QR code to show it even larger, for students at the back.',
          'Long addresses make dense codes that are hard to scan from far away. A short link (such as bit.ly) scans more easily.',
          '+ adds another link. With more than one, choose which one shows from the list at the top. ✎ edits a link; the bin removes it (click twice).',
          '**Copy** puts the address on the clipboard. **Open** opens the page in a new tab.',
        ] },
      ],
      tip: 'Before the lesson, put your exit-ticket Google Form in Share link and minimise the tool. In the plenary, open it again and students scan and answer before they leave.',
      data: 'Links belong to the board: they stay when the tool is closed, and go with the board when you copy, share or back it up. The QR code is made in the browser; nothing is sent anywhere.',
    },
    zh: {
      for: '把网页变成大大的 QR 码，学生用自己的设备一扫就能打开。',
      start: [
        '按**添加链接**，粘贴网址：Padlet、Google Forms、Slido 或阅读材料都可以。',
        '想的话可以加个**标题**，例如 *课后反思*，再按**添加**。',
        '学生扫 QR 码，或输入下方显示的网址。',
      ],
      know: [
        { heading: null, items: [
          '点 QR 码可以放得更大，坐在后排的学生也扫得到。',
          '网址太长，QR 码会很密，远处不容易扫。用短链接（例如 bit.ly）会好扫得多。',
          '按 + 可以再加一个链接。有多个链接时，在顶部的列表选要显示哪一个。按 ✎ 编辑，按垃圾桶移除（按两次）。',
          '**复制**会把网址复制下来；**打开**会在新标签页打开网页。',
        ] },
      ],
      tip: '课前把课后反思用的 Google Forms 链接放进来，再把工具最小化。总结时重新打开，学生扫码填写后才下课。',
      data: '链接属于白板：关掉工具后仍会保留；复制、分享或备份白板时也会一起带走。QR 码在浏览器里生成，不会把任何资料传出去。',
    },
  },

  quotes: {
    en: {
      for: 'Puts up sayings on life, work and learning, in Chinese and English, as a holding screen or a start to a values discussion.',
      start: [
        'Add the tool. It starts changing quotes by itself, from the 杏坛 library.',
        'Hover over the tool for its bar: ‹ › change the quote. For a Chinese quote, **Pinyin**, **白话** and **EN** turn each layer on or off.',
        'The sliders button (**Quote settings**) holds everything else.',
      ],
      know: [
        { heading: 'Holding screen', items: [
          '**Set up a holding screen**, in **Quote settings**, puts the quote on the left and a 3-minute Timer and Music on the right. The dock hides.',
          'Press **Start** on the Timer as students come in: the music starts with it and fades out at zero.',
          'A calm library track is added if the board has no music yet. Tools already on the board are moved, not added again.',
        ] },
        { heading: 'Choosing quotes', items: [
          'The library has 163 quotes (109 Chinese, 54 English), each with its source and R³ICH value tags. Filter by **Values (R³ICH)** and language.',
          '**Changing quotes**: **Change by themselves**, **Stay on one**, or **Quote of the day**: one quote all day, the same wherever the settings match.',
          'The crossed-out eye skips a quote in this tool; **Bring them back** in the settings restores them.',
        ] },
        { heading: 'On screen', items: [
          'With **Chinese quotes in vertical columns (竖排)**, a quote runs right to left, one clause to a column.',
          '**Look**: **Paper**, **Ink**, or **On the background**, with the board’s picture behind the words.',
          'A **Thinking prompt** adds a question under the quote, such as *Which of our core values does this show?*, or **My own question…**.',
        ] },
        { heading: 'Your own quotes', items: [
          '**My quote collections** holds your own quotes: paste one per line, or columns from a spreadsheet. Chinese quotes get pinyin automatically; check characters with two readings.',
        ] },
      ],
      tip: 'For a CCE starter, filter by one value, such as Resilience, and set the prompt to *What would this look like in our class?*. Take two or three answers once students settle.',
      data: 'The tool’s settings reset when it is closed (after the 8-second **Undo**), so minimise it instead to keep them. Your collections are shared by all boards in this browser and go into full backups. A shared board file carries a copy of the collections the tool shows.',
    },
    zh: {
      for: '展示关于人生、做事和学习的中英文名言，可作课前画面，也可用来引出价值观讨论。',
      start: [
        '添加工具后，它会从杏坛名言库里自动换句。',
        '鼠标移到工具上会出现工具条：按 ‹ › 换句。遇到中文名言，可用**拼音**、**白话**和 **EN** 打开或关掉每一层。',
        '其他选项都在调节按钮（**名言设置**）里。',
      ],
      know: [
        { heading: '课前画面', items: [
          '在**名言设置**里按**设置课前画面**，名言会排在左边，右边是三分钟的计时器和音乐工具，工具栏也会收起来。',
          '学生进课室时，按计时器的**开始**：音乐会一起响起，时间到了就渐弱。',
          '白板上还没有音乐的话，会自动加入音乐库里一首安静的曲子。白板上已有的工具只会移位，不会重复添加。',
        ] },
        { heading: '选择名言', items: [
          '名言库有 163 句（中文 109 句、英文 54 句），每句都注明出处，并标上核心价值观。可以按**核心价值观（R³ICH）**和语言筛选。',
          '**换句方式**：**自动换句**、**固定一句**，或**今日名言**：整天只显示一句，设置相同的白板会显示同一句。',
          '按划掉的眼睛图标，可以让这个工具跳过某一句；在设置里按**全部恢复**就能找回来。',
        ] },
        { heading: '显示', items: [
          '勾选**中文名言竖排显示**，名言会从右到左竖着排，一个分句占一列。',
          '**外观**：**纸张**、**墨色**，或**透明（显示白板背景）**，让白板的背景图衬在文字后面。',
          '**思考问题**会在名言下方加一个问题，例如 *这句话体现了哪一个核心价值观？*，也可以选**自己出问题…**。',
        ] },
        { heading: '自己的名言', items: [
          '**我的名言集**用来存你自己的名言：每行一句，也可以直接从电子表格整列贴上。中文名言会自动加上拼音，多音字记得检查。',
        ] },
      ],
      tip: '品格与公民教育课开始时，筛选一项价值观，例如坚毅不屈，思考问题选 *在我们班上，做到这句话会是什么样子？*。学生坐定后，请两三位同学分享。',
      data: '这个工具的设置在关掉工具（8 秒内没按**撤销**）后就会重置，想保留就把工具最小化。你的名言集由这个浏览器里的所有白板共用，也会放进完整备份。分享白板文件时，会附上工具正在显示的名言集。',
    },
  },

  dictation: {
    en: {
      for: 'Reads words aloud for dictation (听写) while the screen shows only their numbers, and shows word cards with pinyin, meanings and examples.',
      start: [
        'Press **New word list**, name it and choose its language: 中文, English, Melayu or தமிழ்.',
        'Type or paste the words under **Add words**, one per line or separated by commas or 、, then press **Add words**.',
        'Press **Done**, then **Start dictation**.',
      ],
      know: [
        { heading: 'Word lists', items: [
          'Word lists are shared by all your boards, so one list can serve several classes. Pick a list at the top of the tool.',
          'Chinese words get their pinyin straight away, even offline. 一 and 不 are given in their dictionary tones; edit any pinyin that needs it.',
          '**Look up** fills in meanings and examples: English from the Free Dictionary API, Chinese from 萌典 (in traditional characters, as the dictionary has them).',
          'Malay and Tamil meanings are typed in by hand. Click any word for its card, with buttons to hear the word and each example.',
        ] },
        { heading: 'During dictation', items: [
          'The screen shows *Listen · 听* while a word is read, then *Write · 写*. **Again** (or R) reads it again.',
          '**Back** and **Next**, the ← → keys or a presentation clicker move between words.',
          'At the end, **Show answers** lists the words with their pinyin for marking. Click one to hear it again.',
        ] },
        { heading: 'Settings', items: [
          'The gear (**Dictation settings**) sets the voice for each language, **Reading speed** and how many times to **Say each word**.',
          '**Then** waits for **Next**, or moves on by itself after 5–20 seconds. **Order** is **As listed** or **Shuffled**.',
          'Voices come with the computer. If a language has none, the tool says so, and **How to add one** shows the free steps.',
        ] },
      ],
      tip: 'For the weekly 听写, set Order to Shuffled and Then to 10 s, so you can walk the room. After Show answers, students swap papers to mark.',
      data: 'Word lists are shared by all boards and go into full backups; shared board files carry a copy of the list shown. Closing the tool keeps the lists but resets its settings, so minimise it instead. Look-ups send only the word, and only when you click **Look up**.',
    },
    zh: {
      for: '电脑朗读词语，屏幕只显示题号，方便进行听写；也能显示词卡，附拼音、释义和例句。',
      start: [
        '按**新建词语表**，取个名称，选好语言：中文、English、Melayu 或 தமிழ்。',
        '在**添加词语**下输入或粘贴词语，每行一个，或用逗号、顿号隔开，再按**添加词语**。',
        '按**完成**，再按**开始听写**。',
      ],
      know: [
        { heading: '词语表', items: [
          '词语表由所有白板共用，一份词语表可以给几个班用。在工具顶部选择要用的词语表。',
          '华文词语会马上加上拼音，没有网络也行。“一”和“不”标的是本调，拼音不对的地方可以直接改。',
          '按**查词典**可以自动填入释义和例句：英文来自 Free Dictionary API，华文来自萌典（按词典原样以繁体字显示）。',
          '马来文和淡米尔文的释义要自己输入。点任何一个词语就能打开词卡，词语和每个例句都能按喇叭图标朗读。',
        ] },
        { heading: '听写时', items: [
          '朗读时屏幕显示 *Listen · 听*，读完显示 *Write · 写*。按**再读**（或 R 键）再读一遍。',
          '按**返回**、**下一个**，或用 ← → 键、翻页笔，就能前后切换词语。',
          '读完后按**对答案**，屏幕会列出所有词语和拼音，方便批改；点任何一个词语都能再听一次。',
        ] },
        { heading: '设置', items: [
          '齿轮按钮（**听写设置**）可以为每种语言选语音，也可以设**语速**和**每个词读**几遍。',
          '**读完后**可以等你按**下一个**，或过 5 到 20 秒自动读下一个。**顺序**可选**按顺序**或**打乱**。',
          '语音是电脑自带的。哪种语言没有语音，工具会提醒你；按**如何添加**就能看到免费添加的步骤。',
        ] },
      ],
      tip: '每周听写时，把“顺序”设为“打乱”，“读完后”设为 10 秒，你就能在课室里走动巡视。按“对答案”后，让学生交换批改。',
      data: '词语表由这个浏览器里的所有白板共用，会放进完整备份；分享白板文件时，也会附上工具正在用的那份。关掉工具不会删掉词语表，但语速、顺序等设置会重置，想保留就把工具最小化。查词典时只传送那个词语，而且只在你按**查词典**时才传送。',
    },
  },

  hanzi: {
    en: {
      for: 'Shows the stroke order of Chinese characters on a 田字格 or 米字格, for the class to watch, follow stroke by stroke, or trace.',
      start: [
        'Type one or more characters at the top, up to 12. With more than one, tap a character above the grid to show it.',
        'Choose **Watch**, **Step** or **Trace** at the bottom.',
        'In Watch, press **Play** to draw the character stroke by stroke.',
      ],
      know: [
        { heading: 'Watch and Step', items: [
          '**Loop** plays the character again and again until you press **Stop**.',
          'In **Step**, each **Next stroke** adds one stroke, in red over a pale outline. The → key or the space bar works too; **Back** takes a stroke away.',
          'The strip under the grid shows every stroke in order. Click a box to jump to that stroke.',
        ] },
        { heading: 'Trace', items: [
          'Students write each stroke in order with a finger, stylus or mouse. A hint appears after two misses, and the tool says how many slips they made.',
          'Untick **Outline** to make it harder: students write without the pale guide.',
        ] },
        { heading: 'Options', items: [
          'Switch between **田字格**, **米字格** and **Plain**, set the **Speed**, and turn **Pinyin** and **Radical** on or off. In Watch, the radical shows in orange.',
          'Stroke order covers about 9,500 characters, simplified and traditional. Each character downloads the first time it is shown, then works offline.',
        ] },
      ],
      tip: 'For new 生字 in a P2 lesson, use Step: the class writes each stroke in the air (书空) as you press Next stroke. Then invite a few pupils to Trace it on the touch screen.',
      data: 'The characters you typed and the options live in the tool, so they reset when it is closed (after the 8-second **Undo**). Minimise it instead to keep them. Stroke data is part of the app and is kept in its own offline store on this computer, not in your boards.',
    },
    zh: {
      for: '在田字格或米字格里展示汉字的笔顺：可以看演示、一笔一笔跟着写，也可以让学生描写。',
      start: [
        '在顶部输入一个或几个汉字，最多 12 个。输入多个字时，点格子上方的字就能切换。',
        '在底部选择**演示**、**分步**或**描写**。',
        '在“演示”里按**播放**，汉字会一笔一笔写出来。',
      ],
      know: [
        { heading: '演示和分步', items: [
          '按**循环**会反复播放，直到你按**停止**。',
          '**分步**时，每按一次**下一笔**就多写一笔：新的一笔是红色，下面衬着浅色的字形。也可以用 → 键或空格键；按**返回**退回一笔。',
          '格子下方的笔顺条按顺序列出每一笔，点任何一格就能跳到那一笔。',
        ] },
        { heading: '描写', items: [
          '学生用手指、触控笔或鼠标，按笔顺一笔一笔写。写错两次会出现提示，写完后工具会告诉他们错了几次。',
          '想提高难度，就取消勾选**显示笔画轮廓**，学生要在没有浅色字形的格子里写。',
        ] },
        { heading: '选项', items: [
          '可以在**田字格**、**米字格**和**方格**之间切换，调整**速度**，也可以打开或关掉**拼音**和**部首**。打开“部首”后，演示时部首会显示成橙色。',
          '笔顺资料约有 9,500 个字，简体和繁体都有。每个字第一次显示时会下载，之后没有网络也能用。',
        ] },
      ],
      tip: '小二教生字时，用“分步”模式，每按一次“下一笔”，全班跟着书空。然后请几位学生到触屏前，用“描写”模式写一遍。',
      data: '你输入的字和选项都存在工具里，关掉工具（8 秒内没按**撤销**）就会重置；想保留，就把工具最小化。笔顺资料属于应用本身，另外存在这台电脑的离线缓存里，不占白板的空间。',
    },
  },
};
