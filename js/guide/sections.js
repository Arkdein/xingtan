// Guide sections other than the tool cards: quick start, recipes, boards and
// the dock, data, troubleshooting and what's new. English and Chinese.
// Markup in strings: **bold** (on-screen labels), *italic*, `code`. See js/guide/README.md.
//
// A section can hold, in this order: intro, steps (numbered), recipes, table,
// groups (subheading + points), qa (question and answer) and outro.
// `tools` on a recipe lists the tool types it uses, so the page can link to their cards.

export const quickstart = {
  en: {
    title: 'Quick start',
    intro: 'Five minutes to your first board. Everything saves by itself, in this browser on this computer.',
    steps: [
      'On the boards screen, type a name for the board (one per class or per lesson works well) and press **New board**.',
      'Add your class: open **Class lists** from the corner menu (top right) and paste the names, one per line. Every board shares your class lists.',
      'Add tools from the **dock** at the bottom of the screen. Drag a tool by its title bar, and resize it from its bottom-right corner.',
      'Tidy up as you go: **−** in a tool’s title bar minimises it to a chip on the shelf, and **×** closes it (with **Undo** for 8 seconds).',
      'Press **?** in any tool’s title bar to see what it can do. The **?** in the corner menu opens this whole guide.',
      'Before you leave, open **Backup and settings** (the gear in the corner menu) and press **Download backup**. Keep the file somewhere safe, such as your school OneDrive or Google Drive.',
    ],
    outro: '**Boards** (top left) takes you back to the boards screen. **Continue where you left off** reopens your last board in one tap.',
  },
  zh: {
    title: '快速上手',
    intro: '五分钟做好第一块白板。所有内容都会自动保存在这台电脑的这个浏览器里。',
    steps: [
      '在白板列表输入白板名称（每个班级或每节课一块都可以），然后按**新建白板**。',
      '添加班级：点右上角菜单里的**班级名单**，把学生名字贴进去，每行一个。所有白板共用班级名单。',
      '从屏幕底部的**工具栏**添加工具。按住工具的标题栏可以拖动，拖右下角可以调整大小。',
      '随时整理：按标题栏的 **−** 把工具最小化成小标签，收到左边的工具架上；按 **×** 关闭工具（8 秒内可以按**撤销**）。',
      '想知道工具有哪些功能，按它标题栏上的 **?**。右上角菜单里的 **?** 会打开整份使用指南。',
      '离开前，打开**备份与设置**（右上角的齿轮），按**下载备份**。把文件存放在安全的地方，例如学校的 OneDrive 或 Google Drive。',
    ],
    outro: '按左上角的**白板**可以回到白板列表；按**继续上次的白板**，一键打开上次用的白板。',
  },
};

export const recipes = {
  en: {
    title: 'In the classroom',
    intro: 'Short recipes for common lesson moments. Each one names the tools it uses; open a tool’s card for the details.',
    recipes: [
      {
        title: 'See · Think · Wonder with answers from student devices',
        tools: ['images', 'routine'],
        steps: [
          'Put the picture up with **Images/ PDF**, and add a **Thinking routine** beside it.',
          'Choose See · Think · Wonder, the language of the prompts and whether names show on screen.',
          'Press **Start with student devices** (the first time, connect Google). Students scan the QR code.',
          'Answers arrive on the **Wall** every few seconds. Drag them into groups and star the ones to discuss.',
          'Press **End** while still connected to Google. The answers are saved to the class’s Google Sheet.',
        ],
        note: 'No devices? Use the Wall with a student scribe typing what the class says.',
      },
      {
        title: 'A Chinese 听写 lesson',
        tools: ['dictation', 'hanzi'],
        steps: [
          'In **Dictation**, make a word list or pick one you made before. Word lists are shared by all your boards.',
          'Go through the word cards: pinyin, meaning and example sentences, with 🔊 to hear them.',
          'Press **Start dictation**. The computer reads each word while the screen shows only its number.',
          'Press **Show answers** for marking.',
          'Open the **Character grid** for characters the class got wrong: watch the stroke order, then let students trace it.',
        ],
      },
      {
        title: 'Reading a new 课文 with weaker readers',
        tools: ['readaloud', 'hanzi'],
        steps: [
          'Paste the 课文 into **Read aloud**. In **Check the pinyin**, fix any character with the wrong reading.',
          '**Model reading** with pinyin on **All**: students follow the highlight with a finger.',
          '**Echo reading**, a phrase at a time: the class repeats each phrase after the computer.',
          'Switch pinyin to **Chosen** and pick only the new characters, then read it together with **Choral pacing**.',
          'Students tap words they still can’t read in **Tap to hear**; open the **Character grid** for their stroke order.',
        ],
      },
      {
        title: 'Settling a lower-primary class',
        tools: ['symbols', 'timer', 'music', 'points'],
        steps: [
          'Put up a **Work mode** sign, such as *Work silently* (安静作业).',
          'Start a **Timer** for the task. With **Play with the Timer** turned on in **Music**, calm music starts with it and fades out at zero.',
          'Give **Points** as the class settles: **+** for one student, **+ All** for everyone present.',
          'Set a class goal in Points so the whole class works towards one reward.',
        ],
      },
      {
        title: 'Going through a worksheet on the visualiser',
        tools: ['images'],
        steps: [
          'In **Images/ PDF**, upload the worksheet PDF, or press **Take a photo** to capture a student’s work under the visualiser.',
          'Zoom in, then use the highlighter and **Type text** to mark it up with the class.',
          'Use **Reveal** to uncover answers one part at a time.',
        ],
        note: 'The marks stay on the page until you clear them, so the next class can see the same worked example.',
      },
      {
        title: 'A quick exit check',
        tools: ['poll', 'sharelink'],
        steps: [
          'Add a **Poll** and choose Scale 1–5 (*How confident are you about today’s learning intention?*) or the Mood meter.',
          'Collect on devices with the QR code, or use **Count hands** for fist-to-five.',
          'On devices, keep results hidden until most have answered, then press **Show results**.',
          'For a longer exit ticket on another site, such as a Padlet or a Google Form, put its link up with **Share link**.',
        ],
        note: 'Past results keeps every poll for the class, so you can see how confidence changes over a unit.',
      },
      {
        title: 'Setting out the lesson',
        tools: ['lessonflow', 'timer'],
        steps: [
          'Add a **Lesson flow**. Type the learning intentions, the success criteria and the steps of the lesson, one per line.',
          'Switch to **Now / Next** to show the current step large, with the next one under it.',
          'Tick off each step as the lesson moves on. Add a **Timer** for the timed parts.',
          'At the plenary, students tick the success criteria they have met.',
        ],
      },
    ],
  },
  zh: {
    title: '课堂情境',
    intro: '常见教学环节的简短做法。每个做法都列出要用的工具，详细用法见各工具说明。',
    recipes: [
      {
        title: '看·想·疑：学生用设备作答',
        tools: ['images', 'routine'],
        steps: [
          '用**图片 / PDF** 展示图片，旁边加一个**思维常规**工具。',
          '选“看·想·疑”，设定引导性问题的语言，以及屏幕上是否显示名字。',
          '按**用学生设备开始**（第一次需要连接 Google）。学生扫 QR 码作答。',
          '答案每隔几秒就会出现在**讨论空间**。拖动答案归类，给值得讨论的标星。',
          '在仍连接 Google 的情况下按**结束**，答案会保存到这个班级的 Google 表格。',
        ],
        note: '没有设备？可以请一位学生当记录员，把全班的发言输入讨论空间。',
      },
      {
        title: '华文听写课',
        tools: ['dictation', 'hanzi'],
        steps: [
          '在**听写**工具里新建词语表，或选用以前做好的。所有白板共用词语表。',
          '逐一看词语卡：拼音、词义和例句，按 🔊 可以听读音。',
          '按**开始听写**。电脑逐一读出词语，屏幕上只显示题号。',
          '按**对答案**，一起批改。',
          '学生写错的字，打开**田字格**：先看笔顺演示，再让学生描写。',
        ],
      },
      {
        title: '和能力较弱的学生读新课文',
        tools: ['readaloud', 'hanzi'],
        steps: [
          '把课文粘贴到**朗读**工具里。在**检查拼音**中改正读音不对的字。',
          '拼音选**全部**，用**范读**：学生用手指跟着亮起的词语。',
          '用**跟读**，一个短句一个短句地读：电脑读一句，全班跟一句。',
          '拼音改选**选定**，只选生字，再用**齐读**全班一起读。',
          '还不会读的词语，让学生用**点读**点一点；生字的笔顺可以打开**田字格**看。',
        ],
      },
      {
        title: '让低年级学生安静下来',
        tools: ['symbols', 'timer', 'music', 'points'],
        steps: [
          '用**交流模式**展示提示，例如“安静作业”。',
          '为活动开**计时器**。在**音乐**工具里打开**随计时器播放**，计时开始时轻音乐跟着响起，时间到就渐渐停下。',
          '学生安静下来时用**积分**奖励：给个别学生按 **+**，给全班出席的学生按 **+ 全班**。',
          '在积分工具里设定全班目标，让全班一起朝同一个奖励努力。',
        ],
      },
      {
        title: '用实物投影仪讲解工作纸',
        tools: ['images'],
        steps: [
          '在**图片 / PDF** 上传工作纸 PDF，或按**拍照**，用实物投影仪拍下学生的作品。',
          '放大后，和全班一起用荧光笔和输入文字功能做批注。',
          '用**揭开**一部分一部分地显示答案。',
        ],
        note: '批注会一直留在那一页，直到你清除，下一个班也能看到同一份示范。',
      },
      {
        title: '课末快速检查',
        tools: ['poll', 'sharelink'],
        steps: [
          '加一个**投票**工具，选“量表 1–5”（例：*你对今天的学习目标有多大把握？*）或“情绪象限”。',
          '让学生扫 QR 码用设备作答，或用**举手计数**（举一到五根手指）。',
          '用设备作答时，先隐藏结果，等大部分学生答完，再按**显示结果**。',
          '如果要用其他网站做较长的课后反思（例如 Padlet 或 Google Forms），用**分享链接**展示它的链接。',
        ],
        note: '**历史记录**保存这个班级的每次投票，方便你看到一个单元里学生信心的变化。',
      },
      {
        title: '展示本节课的流程',
        tools: ['lessonflow', 'timer'],
        steps: [
          '加一个**课堂流程**工具，输入学习目标、成功标准和课堂步骤，每行一项。',
          '切换到**现在 / 接下来**，用大字显示当前步骤，下面是下一步。',
          '每完成一步就打勾。需要计时的环节，加一个**计时器**。',
          '总结时，让学生勾选自己达到的成功标准。',
        ],
      },
    ],
  },
};

export const boards = {
  en: {
    title: 'Boards, classes and the dock',
    groups: [
      { heading: 'Boards', items: [
        'Each board keeps its own tools, text, layout and background. Make one per class or per lesson.',
        'The boards screen has **New board**, **Rename**, **Copy** (to reuse a lesson layout), **Share**, and a bin button to delete a board (tap twice).',
        '**Share** downloads one board as a file for a colleague to **Import board**. Student names, class lists and points never go with it.',
        'Boards save themselves as you work. *Saved ✓* next to the board name shows it. There is no “Save?” prompt.',
        'Click the board name for **Board settings**: its name and background (colours, the picture library, or your own picture).',
      ] },
      { heading: 'Class lists', items: [
        'Class lists are shared by all boards. Open them from the corner menu.',
        'Points belong to the class, so every board showing that class shows the same totals.',
      ] },
      { heading: 'Tools on the board', items: [
        '**−** minimises a tool to a chip on the **shelf** down the left edge. The tool keeps working: a Timer chip shows the time left, and Music keeps playing.',
        'Click a chip to open the tool again. Drag a chip off the shelf to put it anywhere on the board, or up and down the shelf to reorder it.',
        'The buttons beside the board name minimise every tool, or open them all again.',
        '**×** closes a tool. **Undo** stays up for 8 seconds and brings it back with everything in it. To keep a tool out of the way for later, minimise it instead.',
      ] },
      { heading: 'The dock', items: [
        'Tap **Edit** at the end of the dock to reorder tools, hide the ones you don’t use (they stay under **More**), choose up to 3 rows, or show icons only.',
        'Tiles are coloured by purpose: blue for time, apricot for students, green for class signals, grey for content and thinking, plum for language.',
        'The small tab on top of the dock hides it for a clean board. Press **D** to hide or show it. Each board remembers whether its dock is hidden.',
      ] },
      { heading: 'Language and screen', items: [
        'The **中文** / **EN** button in the corner menu switches the app’s language. Student-facing tools (Work mode signs, polls, routines) have their own English / 中文 / both setting.',
        'The full-screen button in the corner menu hides the browser’s bars. In Chrome or Edge you can install 杏坛 as an app, so it opens in its own window. It works offline after the first visit.',
      ] },
    ],
  },
  zh: {
    title: '白板、班级与工具栏',
    groups: [
      { heading: '白板', items: [
        '每块白板都有自己的工具、文字、布局和背景。可以每个班级或每节课各用一块。',
        '白板列表上有**新建白板**、**重命名**、**复制**（重复使用一节课的布局）、**分享**，以及删除白板的垃圾桶按钮（要按两次）。',
        '**分享**会把一块白板下载成文件，同事可以用**导入白板**打开。学生名字、班级名单和积分不会一起带走。',
        '白板会边用边自动保存，白板名称旁的“已保存 ✓”显示保存状态，不会弹出“是否保存？”。',
        '点白板名称可以打开**白板设置**：修改名称和背景（颜色、图像库或自己的图片）。',
      ] },
      { heading: '班级名单', items: [
        '所有白板共用班级名单，从右上角菜单打开。',
        '积分属于班级，所以显示同一个班级的每块白板，总积分都一样。',
      ] },
      { heading: '白板上的工具', items: [
        '按 **−** 把工具最小化，变成左边**工具架**上的小标签。工具会继续运作：计时器的小标签显示剩余时间，音乐也会继续播放。',
        '点小标签就能重新打开工具。把小标签拖离工具架，可以放在白板上任何位置；在工具架上下拖动，可以调整次序。',
        '白板名称旁的按钮可以一次把所有工具最小化，或全部重新打开。',
        '按 **×** 关闭工具。**撤销**会显示 8 秒，按下就能把工具连同内容一起找回。想暂时收起、稍后再用的工具，请改用最小化。',
      ] },
      { heading: '工具栏', items: [
        '点工具栏末端的**编辑**，可以调整工具次序、隐藏不常用的工具（它们会放在**更多**里）、设定最多 3 行，或只显示图标。',
        '工具图标按用途分颜色：蓝色是时间，杏色是学生，绿色是课堂信号，灰色是内容与思维，紫红色是语文。',
        '工具栏上方的小按钮可以把工具栏收起，让白板更干净。按键盘上的 **D** 也可以收起或显示。每块白板会记住工具栏是否收起。',
      ] },
      { heading: '语言与屏幕', items: [
        '右上角菜单的 **中文** / **EN** 按钮切换应用的语言。给学生看的内容（交流模式提示、投票、思维常规）另有英文 / 中文 / 双语的设定。',
        '右上角菜单的全屏按钮可以隐藏浏览器的地址栏和分页。在 Chrome 或 Edge 里把杏坛安装成应用，它就会在独立窗口打开。第一次打开后，没有网络也能用。',
      ] },
    ],
  },
};

export const data = {
  en: {
    title: 'Your data',
    intro: 'Everything you make is saved in this browser on this computer. Nothing is uploaded, and there is no account. The only exception is the optional Google connection for Thinking routines and Polls, which keeps forms and answers in your own Google Drive.',
    table: {
      head: ['What', 'Full backup', 'Shared board file'],
      rows: [
        ['Boards: tools, text, layout and drawings', 'Yes', 'Yes, without student names'],
        ['Class lists and points', 'Yes', 'No'],
        ['Pictures and PDF pages (Images/ PDF)', 'Yes', 'Yes'],
        ['Your own background pictures', 'Yes', 'No: a plain colour instead'],
        ['Your own music files', 'Yes', 'No: library tracks and Spotify links only'],
        ['Text posts, Dictation word lists, quote collections, Read-aloud passages', 'Yes', 'A copy of the ones that board uses'],
        ['Custom thinking routines, past poll results', 'Yes', 'No'],
      ],
    },
    groups: [
      { heading: 'Backups', items: [
        '**Download backup** (in **Backup and settings**) saves everything to one file. **Restore from backup** loads it on another computer, after showing what will change.',
        'The boards screen reminds you when a week’s work hasn’t been backed up.',
      ] },
      { heading: 'What can lose your work', items: [
        'Clearing the browser’s data. In Chrome, *Cookies and other site data* deletes the app’s data; *Cached images and files* on its own is safe.',
        'Incognito and Guest windows, which forget everything when they close.',
        'Using another browser or computer: each one keeps its own copy. Move your work with a backup.',
      ] },
      { heading: 'Google connection', items: [
        'Only when you press **Connect Google**. The app can see only the files it creates itself, in a 杏坛 ClassroomBoard folder in your Drive.',
        'Students never sign in. The sign-in lasts about an hour; **Reconnect Google** in the tool renews it.',
      ] },
    ],
    outro: 'More detail is in the privacy notice.',
  },
  zh: {
    title: '数据与备份',
    intro: '你做的一切都保存在这台电脑的这个浏览器里，不会上传，也不需要账号。唯一的例外是思维常规和投票可选用的 Google 连接：表单和学生答案会保存在你自己的 Google Drive。',
    table: {
      head: ['内容', '完整备份', '分享的白板文件'],
      rows: [
        ['白板：工具、文字、布局和笔迹', '有', '有，但不含学生名字'],
        ['班级名单和积分', '有', '没有'],
        ['图片和 PDF 页面（图片 / PDF）', '有', '有'],
        ['自己上传的背景图片', '有', '没有，改用纯色背景'],
        ['自己的音乐文件', '有', '没有，只带音乐库曲目和 Spotify 链接'],
        ['文字工具的文稿、听写词语表、名言集、朗读文章', '有', '带上这块白板用到的那几份'],
        ['自定义思维常规、投票历史记录', '有', '没有'],
      ],
    },
    groups: [
      { heading: '备份', items: [
        '在**备份与设置**里按**下载备份**，一切都会存进一个文件。在另一台电脑按**从备份恢复**，会先列出将要改动的内容，再载入。',
        '一个星期的工作还没备份时，白板列表会提醒你。',
      ] },
      { heading: '哪些情况会丢失资料', items: [
        '清除浏览器数据。在 Chrome 里，“Cookie 及其他网站数据”会删除应用的数据；只清除“缓存的图片和文件”则没有影响。',
        '无痕窗口和访客窗口，一关闭就会忘记所有内容。',
        '换了浏览器或电脑：每个浏览器各有一份数据。用备份文件把资料搬过去。',
      ] },
      { heading: 'Google 连接', items: [
        '只有按了**连接 Google** 才会连接。应用只能看到它自己在你 Drive 的“杏坛 ClassroomBoard”文件夹里建立的文件。',
        '学生不需要登录。登录大约维持一小时，在工具里按**重新连接 Google** 可以延长。',
      ] },
    ],
    outro: '详情请看隐私说明。',
  },
};

export const faq = {
  en: {
    title: 'When something doesn’t work',
    qa: [
      { q: 'Dictation says there is no voice for Chinese, Malay or Tamil.', a: 'The voices come with the computer. On Windows, add one free under Settings → Time & language → Speech → Manage voices → Add voices, then restart the browser. Microsoft Edge’s online voices sound best but need the internet.' },
      { q: 'A voice sounds odd, or makes no sound.', a: 'Read aloud and Dictation use the best voice they find: Microsoft Edge’s natural voices in Edge, Google’s voices in Chrome, otherwise the computer’s own. Both need the internet. If a voice makes no sound, the tool switches to the next good one and says so. In the tool’s settings, **Recommended** voices come first; voices marked *robotic* (Apple’s Eddy, Flo, Grandma…) are best avoided, and **Test** tells you if a voice makes no sound (it may need downloading in the computer’s settings).' },
      { q: 'The camera or visualiser won’t start.', a: 'Allow the camera from the camera icon in the browser’s address bar, then try again. If there is more than one camera, pick the visualiser from the list.' },
      { q: 'Student devices stopped sending answers.', a: 'The Google sign-in lasts about an hour. Press **Reconnect Google** in the tool and carry on.' },
      { q: 'A YouTube video won’t play.', a: 'Some uploaders don’t allow their videos on other websites. The tool says so and offers **Open on YouTube** instead.' },
      { q: 'I closed a tool by mistake.', a: 'Press **Undo** within 8 seconds. Text posts are saved anyway: add a Text tool and pick the post from the list. YouTube, Music, Images/ PDF and Share link lists, and Name picker’s My list, stay on the board too: add the tool again to get them back.' },
      { q: 'The app says storage is nearly full.', a: 'Open **Backup and settings** → **Storage on this computer** to see what takes the space. Large PDFs and photos take the most. Download a backup, then remove pictures you no longer need.' },
      { q: 'My boards aren’t on another computer.', a: 'Each browser keeps its own copy. Download a backup on the first computer and use **Restore from backup** on the second.' },
    ],
  },
  zh: {
    title: '常见问题',
    qa: [
      { q: '听写工具说没有华语、马来语或淡米尔语的语音。', a: '语音是电脑自带的。Windows 可以在“设置 → 时间和语言 → 语音 → 管理语音 → 添加语音”免费添加，然后重新打开浏览器。Microsoft Edge 的在线语音最自然，但需要联网。' },
      { q: '语音听起来怪怪的，或者没有声音。', a: '朗读和听写会自动选用最好的语音：在 Edge 用 Microsoft Edge 的自然语音，在 Chrome 用 Google 语音，否则用电脑自带的语音。前两种需要联网。如果某个语音没有声音，工具会自动改用下一个好的语音，并会提示你。工具设置里，**推荐**的语音排在最前面；标着*机械声*的（苹果电脑的 Eddy、Flo、Grandma 等）最好不用。按**试听**，就能知道某个语音有没有声音（可能需要先在电脑设置中下载）。' },
      { q: '摄像头或实物投影仪打不开。', a: '点浏览器地址栏里的摄像头图标，允许使用摄像头，然后再试一次。如果有多个摄像头，在列表里选实物投影仪。' },
      { q: '学生的设备收不到答案了。', a: 'Google 登录大约维持一小时。在工具里按**重新连接 Google**，就可以继续。' },
      { q: 'YouTube 视频不能播放。', a: '有些上传者不允许视频在其他网站播放。工具会说明原因，并提供**在 YouTube 打开**。' },
      { q: '不小心关掉了工具。', a: '8 秒内按**撤销**。文字工具的文稿本来就会保存：再加一个文字工具，从列表里选回那篇文稿。YouTube、音乐、图片 / PDF、分享链接的列表，以及随机点名的另起名单，也会保留在白板上：再加一次那个工具就能找回。' },
      { q: '应用说存储空间快满了。', a: '打开**备份与设置** → **这台电脑上的存储空间**，看看哪些内容占空间。大的 PDF 和照片最占空间。先下载备份，再删除不再需要的图片。' },
      { q: '在另一台电脑上看不到我的白板。', a: '每个浏览器各有一份数据。在第一台电脑下载备份，再到第二台电脑按**从备份恢复**。' },
    ],
  },
};

// Newest first. `tool` links the line to that tool's card.
export const whatsnew = [
  { date: '2026-11-08', en: '**Text** can hold tables: **Insert table** on the formatting bar, Tab between cells, and add or delete rows and columns. Pasted tables stay as tables.', zh: '**文字**工具可以放表格了：在格式栏按**插入表格**，用 Tab 在格子之间移动，也可以增删行和列。粘贴进来的表格会保留为表格。', tool: 'text' },
  { date: '2026-11-07', en: '**Sentence analysis**: tap any gap to cut that part straight away, step through the uncut parts with **Previous part** / **Next part**, and **Keep whole** a part that is one word so the tool skips it.', zh: '**层次分析**：点任何空隙就能直接切那一部分；用**上一部分**、**下一部分**在还没切的部分之间移动；某一部分是一个词，按**保留不切**，工具就会跳过它。', tool: 'analysis' },
  { date: '2026-11-07', en: 'New **Sentence analysis** tool (层次分析): cut a Chinese or English sentence layer by layer and label each cut with the 庖丁 labels or your own, then **Present** it cut by cut, with labels held back until the class has named them.', zh: '新工具**层次分析**：把华文或英文句子一层一层地切开，用庖丁的标签或自己的标签标出关系，再按**演示**一刀一刀地重现；关系可以先不显示，等学生说出来再揭晓。', tool: 'analysis' },
  { date: '2026-11-06', en: '**Read aloud** and **Dictation** pick the best voice by themselves (Edge’s natural voices, then Google’s), switch to another if a voice makes no sound, and list **Recommended** voices first in settings.', zh: '**朗读**和**听写**会自动选用最好的语音（先是 Edge 的自然语音，再是 Google 语音）；某个语音没有声音时会自动改用别的；设置里**推荐**的语音排在最前面。', tool: 'readaloud' },
  { date: '2026-11-06', en: 'Fixes: **Read aloud** keeps the highlight in step with the voice, and **Read aloud** and **Dictation** no longer pick Apple’s robotic voices (Eddy, Flo, Grandma…) when a better one is installed.', zh: '修正：**朗读**的亮光会跟上语音的速度；**朗读**和**听写**在有更好的语音时，不再选用苹果电脑上机械声的语音（Eddy、Flo、Grandma 等）。', tool: 'readaloud' },
  { date: '2026-11-06', en: 'New **Read aloud** tool: the computer reads a passage while each word lights up, with Model, Echo and Choral reading, Tap to hear, and pinyin on every character, chosen characters or none.', zh: '新工具**朗读**：电脑朗读文章，读到的词语会亮起来；有范读、跟读、齐读和点读，拼音可以全部标、只标选定的字或不标。', tool: 'readaloud' },
  { date: '2026-11-05', en: '**Lesson flow**, **Organiser**, **Thinking routine** and **Whiteboard** keep their work on the board: **Saved on this board** (📚) in the title bar lists it, and closing the tool no longer loses it.', zh: '**课堂流程**、**思维导图**、**思维常规**和**画板**的内容都保存在白板上：标题栏的**本白板已存**（📚）会列出来，关闭工具也不会丢失。' },
  { date: '2026-11-05', en: '**Text** keeps what you type as saved posts, shared by every board and kept when the tool is closed.', zh: '**文字**工具会把内容存成文稿，所有白板共用，关掉工具也会保留。', tool: 'text' },
  { date: '2026-11-05', en: 'Fixes: a poll or routine closed mid-lesson stops its Google Form taking answers; **Groups** leaves out absent students; backups keep Dictation voices and pinned boards; the radical shows in orange in the Character grid’s Step mode.', zh: '修正：上课途中关掉投票或思维常规，Google 表单会停止接受回答；**分组**不会把缺席学生分进组里；备份会保留听写语音和置顶的白板；田字格的“分步”也会把部首显示成橙色。' },
  { date: '2026-11-05', en: 'This user guide, with a **?** in every tool’s title bar.', zh: '推出这份使用指南，每个工具的标题栏都有 **?** 按钮。' },
  { date: '2026-11-05', en: 'Closing a tool shows **Undo** for 8 seconds. Name picker’s My list now stays on the board.', zh: '关闭工具后 8 秒内可以按**撤销**。随机点名的另起名单现在会保留在白板上。', tool: 'picker' },
  { date: '2026-11-05', en: 'New **Quotes** tool: sayings on life, work and learning for a holding screen before the lesson.', zh: '新工具**名言佳句**：关于生活、工作和学习的名言，适合课前画面。', tool: 'quotes' },
  { date: '2026-11-05', en: 'Every tool can be minimised to a chip on the shelf, and some chips show what the tool is doing.', zh: '每个工具都可以最小化成工具架上的小标签，部分小标签还会显示工具的状态。' },
];
