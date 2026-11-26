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
    intro: 'Five minutes to your first board. Everything saves by itself, in this browser on this computer. Prefer to look around first? **Take the tour** on the boards screen shows you a sample board in about a minute.',
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
    intro: '五分钟做好第一块白板。所有内容都会自动保存在这台电脑的这个浏览器里。想先看看？在白板列表按**开始导览**，大约一分钟就能在示例白板上认识杏坛。',
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
          'Set a goal bar in Points so the whole class works towards one reward, or give each student a track of their own.',
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
        '**Copy for another class**: with class lists set up, **Copy** asks which classes the copy is for. Tick one or several (25S03, 25S04…) to make a board for each. Points, Name picker, Groups, Poll and Thinking routine switch to that class, and the lesson starts afresh: steps unticked, organiser notes and old groups left behind. Posts, pictures, videos and whiteboard pages stay. **Just copy (same class)** makes a plain copy.',
        'A copy is named after its class: *25S01 · H2 Translation · L12* becomes *25S03 · H2 Translation · L12*. If the board name has no class in it, the class goes in front.',
        '**Share** downloads one board as a file for a colleague to **Import board**. Student names, class lists and points never go with it.',
        'Boards save themselves as you work. *Saved ✓* next to the board name shows it. There is no “Save?” prompt.',
        'Click the board name for **Board settings**: its name and background (colours, the picture library, or your own picture).',
        'New features are announced at the top of the boards screen. **Dismiss** hides them once you have read them; the **🔔** in the corner menu lists recent updates any time, with a red dot while there is something unread.',
      ] },
      { heading: 'Folders', items: [
        '**New folder** (above the boards) groups boards by class, subject or term, with a name and a colour. The folder chips show one folder at a time; **All boards** shows them all, and **No folder** shows the boards not in one.',
        'Put a board in a folder with **Move** (📁) on it, or drag the board onto a folder chip. A board is in one folder at a time.',
        'A new board made while a folder is showing goes into it. Copies stay in the same folder as the board they came from.',
        '**Edit folders** renames, recolours and reorders folders. Deleting a folder keeps its boards: they move to **No folder**.',
        'Searching looks in every folder. Pinned boards stay at the top of the folder they are in.',
        'Folders go into full backups. A shared board file carries its folder’s name, so it lands in a folder of that name on a colleague’s computer (made for them if they don’t have one).',
        '**Shared by all boards** (above the folders) opens **Class lists** and **My backgrounds**: the pictures you uploaded as backgrounds, with how many boards use each. Upload more there and pick one for a board in its **Board settings**.',
      ] },
      { heading: 'Class lists', items: [
        'Class lists are shared by all boards. Open them from the corner menu.',
        'Points belong to the class, so every board showing that class shows the same totals.',
        'Students who join or leave later can be added, renamed or removed in the Points tool (👥), or with the ✎ beside the class in Name picker and Groups. A student taken off the list keeps their points.',
        'To rename a class, press **Rename** beside it in Class lists, or use the **Class name** box in the Points tool (👥). Its points and poll results stay with it, and if you are connected to Google, the class’s Google Sheet and poll form are renamed to match.',
      ] },
      { heading: 'My classes', items: [
        '**My classes** on the boards screen opens a page in a new tab with every class at a glance, away from the board the class can see.',
        'Each class shows its total, its lessons with points, badges, absences today and when it last had groups. Click a class to see only its students.',
        'The student table shows each student’s total, points this lesson, badges, top praise and needs-work 行为表现, and their latest group and role. Sort by any column, find a name, or tick **Only those to check in with**. **Show levels** adds the levels set in Groups.',
        '**Check in** flags students below zero, with the same needs-work reason 3 times in the last 5 lessons, with 3 lessons in a row below zero, or with no praise in the last 5 lessons. They are a prompt to talk, not a judgement.',
        'Click a name for a one-page report (points by lesson, praise, needs work, groups), or **Reports for the class** for every student. **Print or save as PDF** puts one student on each page. **Download (CSV)** saves the table.',
        'The page only shows what is kept in this browser; changes are made in Points and Groups, and it updates as you teach.',
      ] },
      { heading: 'Tools on the board', items: [
        '**−** minimises a tool to a chip on the **shelf** down the left edge. The tool keeps working: a Timer chip shows the time left, and Music keeps playing.',
        'Click a chip to open the tool again. Drag a chip off the shelf to put it anywhere on the board, or up and down the shelf to reorder it.',
        'The buttons beside the board name minimise every tool, or open them all again.',
        '**×** closes a tool. **Undo** stays up for 8 seconds and brings it back with everything in it. To keep a tool out of the way for later, minimise it instead.',
        '**Blank screen** (the eye button beside the board name, or **B**) hides every tool, the dock and the corner buttons, so only the background shows and the class looks at you. **B** again, **Esc** or **Show board** in the bottom corner brings the board back exactly as it was. A presentation clicker’s blank-screen button works too.',
        'While the board is blank, Music, YouTube, Read aloud and Dictation pause and then carry on. Timers keep counting, unless you tick **Pause timers and stopwatches too** in **Backup and settings**.',
        '**Pointer** (the arrow button beside the board name, or **L**) puts a big glowing dot on the screen, which shows on a panel or TV where a real laser pointer barely does. The bar on the right edge switches between **Laser dot**, **Fading ink** (circle or underline something; the marks fade a moment later) and **Spotlight** (dims everything except a circle round the pointer), and sets the colour and size. **1**, **2** and **3** switch modes; **L**, **Esc** or **Done** puts it away.',
        'With the laser dot or the spotlight, clicks still reach the tools. With fading ink, dragging draws: a quick tap still presses the button under it, but to move a tool, switch back to the laser dot. On a touch screen the dot shows while a finger touches the screen, so fading ink is the handier mode there. Over a YouTube video or a Spotify player the dot waits at the edge (the player takes the mouse); fading ink still draws over them.',
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
        '**为其他班级复制**：设好班级名单后，按**复制**会问要复制给哪些班级。勾选一个或几个班级（25S03、25S04……），每个班级各得一块白板。积分、随机点名、分组、投票和思维常规会换成那个班级，课堂也从头开始：步骤取消勾选，思维导图的便利贴和旧的分组留在原白板。文稿、图片、视频和画板页面都会保留。按**直接复制（同一班级）**就是普通的复制。',
        '副本会按班级命名：*25S01 · H2 Translation · L12* 会变成 *25S03 · H2 Translation · L12*。白板名称里没有班级的话，班级名称会加在前面。',
        '**分享**会把一块白板下载成文件，同事可以用**导入白板**打开。学生名字、班级名单和积分不会一起带走。',
        '白板会边用边自动保存，白板名称旁的“已保存 ✓”显示保存状态，不会弹出“是否保存？”。',
        '点白板名称可以打开**白板设置**：修改名称和背景（颜色、图像库或自己的图片）。',
        '新功能会显示在白板列表的顶部。看完后按**知道了**就会隐藏；随时也可以按右上角菜单里的 **🔔** 查看最近的更新，有未读的更新时会出现红点。',
      ] },
      { heading: '文件夹', items: [
        '按白板上方的**新建文件夹**，可以按班级、科目或学期整理白板，每个文件夹都有名称和颜色。点文件夹标签就只显示那个文件夹的白板；**所有白板**显示全部，**不在文件夹里**显示还没放进文件夹的白板。',
        '要把白板放进文件夹，按白板上的**移动**（📁），或把白板拖到文件夹标签上。一块白板只能放在一个文件夹里。',
        '打开某个文件夹时新建的白板，会直接放进那个文件夹。复制出来的白板会留在原白板所在的文件夹。',
        '**编辑文件夹**可以重命名、换颜色和调整顺序。删除文件夹时，里面的白板会保留，移到**不在文件夹里**。',
        '搜索时会找遍所有文件夹。置顶的白板会显示在所在文件夹的最上面。',
        '完整备份会包括文件夹。分享出去的白板文件会带上文件夹名称，同事导入时会放进同名的文件夹（没有的话会自动建立）。',
        '文件夹上方的**所有白板共用**可以打开**班级名单**和**我的背景**：你上传作背景的图片，以及每张图有几块白板在用。可以在那里上传更多图片，再到白板的**白板设置**里选用。',
      ] },
      { heading: '班级名单', items: [
        '所有白板共用班级名单，从右上角菜单打开。',
        '积分属于班级，所以显示同一个班级的每块白板，总积分都一样。',
        '之后有学生加入或离开，可以在积分工具（👥）里添加、改名或移除，也可以按点名和分组工具里班级旁的 ✎。从名单上移除的学生，积分会保留。',
        '要给班级改名，可在班级名单里按班级旁的**重命名**，或用积分工具（👥）里的**班级名称**栏。积分和投票结果都会跟着班级；如果已连接 Google，这个班的 Google 表格和投票表单也会一起改名。',
      ] },
      { heading: '我的班级', items: [
        '在白板列表按**我的班级**，会在新分页打开一个页面，一眼看完所有班级，不会出现在学生看得见的白板上。',
        '每个班会显示总分、有积分的课次、奖章、今天缺席的人数和最近一次分组的时间。点一个班，就只看这个班的学生。',
        '学生表格列出每个学生的总积分、本节课积分、奖章、最常获得的表扬和需要改进的行为表现，以及最近的分组和角色。可以按任何一栏排序、查找名字，或勾选**只看需要关注的学生**。勾选**显示程度**会加上在分组工具里设定的程度。',
        '**需要关注**会标出这些学生：总分低于零；最近 5 节课同一个需要改进的理由出现 3 次；连续 3 节课都是负分；或最近 5 节课没得到表扬。标记是提醒老师找学生谈谈，而不是给学生下定论。',
        '点学生名字可以看一页的报告（每节课的积分、表扬、需要改进、分组）；按**全班报告**就有全班每个学生的报告。按**打印或存成 PDF**，每个学生占一页。按**下载（CSV）**可以保存表格。',
        '这个页面只显示这个浏览器里保存的资料；要修改，请用积分和分组工具，页面会随着上课即时更新。',
      ] },
      { heading: '白板上的工具', items: [
        '按 **−** 把工具最小化，变成左边**工具架**上的小标签。工具会继续运作：计时器的小标签显示剩余时间，音乐也会继续播放。',
        '点小标签就能重新打开工具。把小标签拖离工具架，可以放在白板上任何位置；在工具架上下拖动，可以调整次序。',
        '白板名称旁的按钮可以一次把所有工具最小化，或全部重新打开。',
        '按 **×** 关闭工具。**撤销**会显示 8 秒，按下就能把工具连同内容一起找回。想暂时收起、稍后再用的工具，请改用最小化。',
        '**空白屏**（白板名称旁的眼睛按钮，或按 **B**）会隐藏所有工具、工具栏和角落的按钮，只显示背景，让学生把注意力放回老师身上。再按 **B** 或 **Esc**，或点右下角的**显示白板**，白板就会恢复原样。演示翻页笔上的黑屏键也可以用。',
        '空白屏时，音乐、YouTube、朗读和听写会暂停，恢复后接着进行。计时器会继续计时；如果要它一起暂停，可以在**备份与设置**里勾选**计时器和秒表也一起暂停**。',
        '**激光笔**（白板名称旁的箭头按钮，或按 **L**）会在屏幕上显示一个醒目的光点。在课室的互动显示屏或电视上，真正的激光笔几乎看不见，这个光点却看得清清楚楚。右边的工具条可以切换**激光点**、**渐隐笔迹**（圈出或画线强调，笔迹过一会儿就会消失）和**聚光灯**（除了指针周围的一圈，其他地方都变暗），也可以选颜色和大小。按 **1**、**2**、**3** 切换模式；按 **L**、**Esc** 或**完成**收起。',
        '用激光点或聚光灯时，照样可以点按工具。用渐隐笔迹时，拖动就是画线：轻点一下仍然可以按下面的按钮，但要移动工具，得先换回激光点。在触控屏上，手指碰着屏幕时才会显示激光点，所以那里用渐隐笔迹更顺手。指针移到 YouTube 视频或 Spotify 播放器上时，激光点会停在边上（播放器接管了鼠标）；渐隐笔迹照样可以画在上面。',
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
        ['Class lists, group settings and points', 'Yes', 'No'],
        ['Pictures and PDF pages (Images/ PDF)', 'Yes', 'Yes'],
        ['Your own background pictures', 'Yes', 'No: a plain colour instead'],
        ['Your own music files', 'Yes', 'No: library tracks and Spotify links only'],
        ['Text posts, Dictation word lists, quote collections, Read-aloud passages', 'Yes', 'A copy of the ones that board uses'],
        ['Custom thinking routines, past poll results', 'Yes', 'No'],
        ['Folders', 'Yes', 'The folder’s name and colour'],
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
        ['班级名单、分组设置和积分', '有', '没有'],
        ['图片和 PDF 页面（图片 / PDF）', '有', '有'],
        ['自己上传的背景图片', '有', '没有，改用纯色背景'],
        ['自己的音乐文件', '有', '没有，只带音乐库曲目和 Spotify 链接'],
        ['文字工具的文稿、听写词语表、名言集、朗读文章', '有', '带上这块白板用到的那几份'],
        ['自定义思维常规、投票历史记录', '有', '没有'],
        ['文件夹', '有', '文件夹的名称和颜色'],
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

// What's new lives in news.js, which the app also reads for its update banner.
export { whatsnew } from './news.js';

