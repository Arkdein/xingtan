// Guide cards: routine, organiser, noise, traffic, symbols, text, whiteboard. English and Chinese. See js/guide/README.md for the format.
export default {
  routine: {
    en: {
      for: 'Runs a Making Thinking Visible routine, such as See · Think · Wonder, with large bilingual prompts and a wall of sticky notes.',
      start: [
        'Choose a routine from the **Routine** list and, if you like, add a **Topic**.',
        'Set the **Language for students** and **Students’ names**.',
        'Press **Start without devices** to type ideas in yourself, or **Start with student devices** for students to answer on their own.',
        'To finish, press **End**. It changes to **End and save?**, so press it again.',
      ],
      know: [
        { heading: 'Routines', items: [
          'Nine are built in, under **Core**, **Connections** and **Perspectives**. **Circle of Viewpoints** needs two or more viewpoints; **Tug of War** needs both sides named.',
          '**+ New custom routine…** lets you write your own, with up to 6 bilingual steps. It appears on every board.',
        ] },
        { heading: 'Running it', items: [
          '**Prompt** shows the steps and sentence starters large; **Wall** shows the notes, one column per step.',
          'Hover over a note to **Star** or hide it; drag notes between columns to regroup them.',
          'With no devices, the wall opens straight away. Type in **+ Add a note** under a column and press Enter. Typed notes can be deleted; students’ answers can only be hidden.',
        ] },
        { heading: 'Student devices and Google', items: [
          'Only student devices need Google; everything else works without it. Until you connect, the button reads **Connect Google and start**.',
          'Starting with devices makes a Google Form and shows its QR code. Students answer without signing in; notes arrive about every 5 seconds.',
          '**Hidden on screen** asks for names but keeps them in the Sheet only. **Shown** puts them on the notes. **Don’t ask** leaves them out.',
          'The sign-in lasts about an hour, in this browser tab only. If answers stop arriving, press **Reconnect Google**.',
          '**End** closes the form, asking you to sign in to Google again if the hour has run out. Choose the class under **Class (for the Sheet)** before you start. Ended without Google? Connect, then press **Save to Google Sheets**.',
        ] },
        { heading: 'Saved on this board', items: [
          '**Saved on this board** (📚 in the title bar) lists what this tool has held on this board, newest first, with **+ New**. Your work is saved as you go, and closing the tool keeps it.',
          'Each item can be renamed (✎), copied or deleted (🗑, click twice, with **Undo**). One left blank isn’t kept. An item open in another tool of this kind on the board can’t be opened or deleted here.',
          '**Use again with no notes** starts the same routine and topic with an empty wall. After **End**, **New routine** does the same and keeps the ended wall in the list.',
        ] },
      ],
      tip: 'After reading 《背影》, run **Circle of Viewpoints** with *The father*, *The son* and *A passer-by*, one viewpoint per pair. In the plenary, star two notes that disagree.',
      data: 'Each wall is saved on this board, typed and hidden notes included, and stays there when the tool is closed or you press **New routine**. With Google, **End** also saves the wall to a new tab in the class’s Google Sheet in your Drive. Full backups include the walls; shared board files keep the set-up only: no answers, names or custom routines.',
    },
    zh: {
      for: '进行“让思维可见”的思维常规（如看·想·疑），用大字显示双语引导性问题，并用便签收集想法。',
      start: [
        '在**思维常规**列表里选一个常规，需要的话写上**主题**。',
        '设定**学生看到的语言**和**学生姓名**。',
        '按**不用设备开始**，由你自己输入想法；或按**用学生设备开始**，让学生用自己的设备作答。',
        '要结束时按**结束**，按钮变成**结束并保存？**后再按一次。',
      ],
      know: [
        { heading: '常规', items: [
          '内置九个常规，分为**核心**、**联系**、**视角**三组。**观点圈**要写两个或更多角度；**拔河**要写出双方立场。',
          '**+ 新建思维常规…**可以自己设计常规，最多 6 步，中英双语。设计好的常规在每个白板上都能用。',
        ] },
        { heading: '进行中', items: [
          '**引导性问题**用大字显示步骤和句子开头；**讨论空间**按步骤分栏显示便签。',
          '把鼠标移到便签上，可以**标星**或隐藏；拖动便签可以重新归类。',
          '不用设备时，讨论空间会直接打开。在某一栏的**+ 添加便签**里输入，按 Enter 就贴上。自己输入的便签可以删除，学生的回答只能隐藏。',
        ] },
        { heading: '学生设备与 Google', items: [
          '只有学生用设备作答才需要 Google，其他功能都不需要。还没连接时，按钮显示为**连接 Google 并开始**。',
          '用设备开始时，会制作一份 Google 表单并显示 QR 码。学生不必登录就能作答，回答约每 5 秒出现一次。',
          '**屏幕上不显示**会请学生填写姓名，但姓名只出现在 Google 表格里；**显示**会把姓名写在便签上；**不填写**则不问姓名。',
          'Google 登录约一小时后过期，而且只在这个浏览器分页有效。收不到新回答时，按**重新连接 Google**。',
          '**结束**会关闭表单；如果 Google 登录已经过了一小时，会先请你重新登录。开始前，在**班级（用于 Google 表格）**里选好班级。结束时没连接 Google？连接后按**保存到 Google 表格**。',
        ] },
        { heading: '本白板已存', items: [
          '标题栏的**本白板已存**（📚）列出这个工具在这块白板上保存过的内容，最新的在前，也可以按**+ 新建**。内容会随时自动保存，关闭工具也会保留。',
          '每一项都可以重命名（✎）、复制或删除（🗑，按两次，可以**撤销**）。空白的不会保留。在这块白板的另一个同类工具中打开的项目，这里不能打开或删除。',
          '**再用一次（不带便签）**会用同一个思维常规和题目，开一个空的讨论空间。按**结束**后，**换一个思维常规**也一样，结束的讨论空间仍留在列表里。',
        ] },
      ],
      tip: '读完《背影》后进行**观点圈**，角度写“父亲”“儿子”“路人”，每对学生负责一个角度。课堂总结时，挑两张看法相反的便签标星。',
      data: '每个讨论空间（包括自己输入的和隐藏的便签）都保存在这块白板上，关闭工具或按**换一个思维常规**后仍会保留。连接了 Google 时，按**结束**还会把讨论空间保存到班级 Google 表格的一张新工作表，放在你的 Google Drive 里。完整备份会包括讨论空间；分享的白板文件只带设置，不带回答、姓名或自定义常规。',
    },
  },

  organiser: {
    en: {
      for: 'Puts up a graphic organiser, such as a T-chart, Venn diagram or story mountain, and fills it with sticky notes as the class gives ideas.',
      start: [
        'Choose a layout: **T-chart**, **Venn diagram**, **Frayer model**, **KWL chart**, **5W1H**, **Cause and effect**, **Sequence**, **Story mountain**, **Concept web** or **My own columns**.',
        'Type a topic or question in the box at the top, if you like.',
        'Type into **+ Add a note** in any part and press Enter.',
      ],
      know: [
        { heading: 'Notes', items: [
          'After Enter, the box stays ready for the next note. Shift+Enter starts a new line. Clicking away also adds what you typed.',
          'Drag notes between parts. Hover over a note to **Star**, **Edit**, **Hide** or **Delete** it; double-click also edits. A link under the organiser shows hidden notes again.',
          'You or a student scribe types the notes. Students can’t send notes from their own devices.',
        ] },
        { heading: 'Layouts', items: [
          'The Frayer model and concept web show the topic in the middle.',
          'The pencil button (**Rename the parts**) gives each part an English and a Chinese name; **EN**, **中文** and **Both** choose which show. With **My own columns**, you name 2 to 6 columns.',
          'The grid button (**Choose another organiser**) changes the layout and keeps the notes. Notes in parts that no longer exist move to the first part, and part names go back to the originals.',
          'The bin button removes every note. Click it twice.',
        ] },
        { heading: 'Saved on this board', items: [
          '**Saved on this board** (📚 in the title bar) lists what this tool has held on this board, newest first, with **+ New**. Your work is saved as you go, and closing the tool keeps it.',
          'Each item can be renamed (✎), copied or deleted (🗑, click twice, with **Undo**). One left blank isn’t kept. An item open in another tool of this kind on the board can’t be opened or deleted here.',
          '**Use again with no notes** gives the same organiser, topic and part names with no notes, for the next class.',
        ] },
      ],
      tip: 'Before a composition, build a **Story mountain** together: pairs suggest ideas and a scribe types them under Opening, Build-up, Climax, Resolution and Ending. Star the strongest climax and use it to model the writing.',
      data: 'Each organiser is saved on this board with its notes, and stays there when the tool is closed. Full backups, copies and shared files of the board include them all.',
    },
    zh: {
      for: '在白板上展示思维导图，如 T 型图、韦恩图或故事山，把全班的想法以便签贴上去。',
      start: [
        '选择一种版式：**T 型图**、**韦恩图**、**弗雷尔模型**、**KWL 表**、**六何法**、**因果关系**、**顺序图**、**故事山**、**概念图**或**自定义**。',
        '需要的话，在顶部的框里写上主题或问题。',
        '在任何一部分的**+ 添加便签**里输入，按 Enter。',
      ],
      know: [
        { heading: '便签', items: [
          '按 Enter 后，输入框会留着让你接着写下一张。按 Shift+Enter 换行。点击别处也会把写好的内容贴上。',
          '拖动便签，就能移到别的部分。把鼠标移到便签上，可以**标星**、**编辑**、**隐藏**或**删除**；双击也能编辑。思维导图下方的链接可以重新显示隐藏的便签。',
          '便签由你或一名学生记录员输入，学生不能用自己的设备发送便签。',
        ] },
        { heading: '版式', items: [
          '弗雷尔模型和概念图会把主题放在中间。',
          '铅笔按钮（**重命名各部分**）可以给每个部分取中英文名称；用 **EN**、**中文**、**双语**选择显示哪一种。选**自定义**时，可以自己命名 2 到 6 栏。',
          '格子按钮（**换一个思维导图**）可以换版式，便签都会保留。原来那部分不存在了，便签就移到第一部分；各部分的名称也会恢复原样。',
          '垃圾桶按钮会移除所有便签，要按两次。',
        ] },
        { heading: '本白板已存', items: [
          '标题栏的**本白板已存**（📚）列出这个工具在这块白板上保存过的内容，最新的在前，也可以按**+ 新建**。内容会随时自动保存，关闭工具也会保留。',
          '每一项都可以重命名（✎）、复制或删除（🗑，按两次，可以**撤销**）。空白的不会保留。在这块白板的另一个同类工具中打开的项目，这里不能打开或删除。',
          '**再用一次（不带便签）**会得到同样的思维导图、题目和各部分名称，但没有便签，下一个班可以用。',
        ] },
      ],
      tip: '写作文前，全班一起搭**故事山**：两人一组提出想法，由记录员输入到开端、发展、高潮、解决、结局各部分。把最精彩的高潮标星，用来示范写作。',
      data: '每个思维导图连同便签都保存在这块白板上，关闭工具也会保留。完整备份、复制或分享白板时都会全部带走。',
    },
  },

  noise: {
    en: {
      for: 'Shows how loud the classroom is, using the computer’s microphone, against a limit you set.',
      start: [
        'Press **Start listening** and allow the microphone when the browser asks.',
        'Move **Limit** to the loudest level you will accept. The line on the meter shows it.',
      ],
      know: [
        { heading: null, items: [
          'The bar turns amber near the limit. After almost a second above it, the bar turns red, the face looks sad and the tool glows red.',
          'If the bar hardly moves, raise **Sensitivity**. It helps with a quiet microphone or a large room.',
          'Minimised, the chip shows the face, a level bar and a start / stop button. It still glows red when it is too loud.',
          'Listening stops when you leave the board or reload the page. Press **Start listening** again.',
          'Microphone blocked? Allow it in the address bar and try again.',
        ] },
      ],
      tip: 'Before group work, agree with the class what *working voices* sound like and set the limit together. When the tool glows red, groups bring their voices down without you stopping the lesson.',
      data: 'Sound is measured live in the browser and is never recorded or sent anywhere. Only the limit and sensitivity are kept, in this tool on this board.',
    },
    zh: {
      for: '用电脑的麦克风显示课室里的音量，并和你设定的上限比较。',
      start: [
        '按**开始监听**，浏览器询问时允许使用麦克风。',
        '拖动**上限**，设定你能接受的最大音量。音量计上的线就是上限。',
      ],
      know: [
        { heading: null, items: [
          '接近上限时，音量条变成黄色。超过上限将近一秒，音量条变红，表情变成难过，整个工具亮起红框。',
          '如果音量条几乎不动，就调高**灵敏度**。麦克风较弱或课室较大时特别有用。',
          '最小化后，小标签会显示表情、音量条和开始 / 停止按钮。太吵时，小标签同样会亮红框。',
          '离开这个白板或重新载入网页后，监听就会停止，需要再按**开始监听**。',
          '麦克风被阻止了？在地址栏允许使用麦克风，再试一次。',
        ] },
      ],
      tip: '小组活动前，先和学生约定讨论时该用多大的声音，一起设定上限。工具亮红框时，各组自己把声音放低，你不必停下课堂来提醒。',
      data: '声音只在浏览器里即时测量，不会录音，也不会传到任何地方。只有上限和灵敏度会保存在这个白板的这个工具里。',
    },
  },

  traffic: {
    en: {
      for: 'Shows a red, amber or green light so the class can see at a glance what is expected.',
      start: [
        'Click a light to switch it on. It starts on green.',
        'Click the light that is on to switch all three off.',
      ],
      know: [
        { heading: null, items: [
          'Agree with the class what each colour means before you rely on it, and keep it the same every lesson.',
          'Minimised, the chip shows the three lights, and you can tap one to change it. The signal stays visible but takes almost no room.',
          'Make the tool bigger from its bottom-right corner so the back row can see it.',
        ] },
      ],
      tip: 'In a timed pair task, show green while pairs discuss and amber two minutes before the end. Switch to red when it is time to write silently.',
      data: 'Only which light is on is kept, in this tool on this board. Nothing leaves the browser.',
    },
    zh: {
      for: '显示红灯、黄灯或绿灯，让全班一眼看出现在该做什么。',
      start: [
        '点击一盏灯就会亮起，一开始是绿灯。',
        '再点击亮着的灯，三盏灯就会全部熄灭。',
      ],
      know: [
        { heading: null, items: [
          '先和学生约定每种颜色的意思，并且每节课都保持一致。',
          '最小化后，小标签会显示三盏灯，点一下就能换灯。信号一直看得见，却几乎不占地方。',
          '从工具右下角把它拉大，坐在后排的学生也看得清楚。',
        ] },
      ],
      tip: '两人限时活动时，讨论期间亮绿灯，结束前两分钟亮黄灯提醒，要安静写作时换成红灯。',
      data: '只保存哪盏灯亮着，存放在这个白板的这个工具里，不会离开浏览器。',
    },
  },

  symbols: {
    en: {
      for: 'Shows one large bilingual sign that tells the class how to work right now, from silent work to group discussion.',
      start: [
        'Click a sign to show it large.',
        'Click the large sign to go back and choose another.',
      ],
      know: [
        { heading: null, items: [
          'There are six signs: **Work silently**, **Whisper voices**, **Work with a partner**, **Group discussion**, **Raise your hand** and **Eyes on me**. Each has its own colour and picture, so students can tell them apart from the back.',
          'The list at the bottom shows the signs in **EN + 中文**, **English** or **中文**.',
          'Minimised, the chip still shows the sign that is up, in one language, so it stays visible beside other tools.',
        ] },
      ],
      tip: 'Change the sign as the lesson moves: **Work with a partner** for think-pair-share, **Group discussion** for the task, **Eyes on me** for the plenary.',
      data: 'Only the sign on show and the language are kept, in this tool on this board. Nothing leaves the browser.',
    },
    zh: {
      for: '用一个大的双语标志告诉全班现在该怎样学习，从安静作业到小组讨论都有。',
      start: [
        '点击一个标志，就会放大显示。',
        '点击放大的标志，可以回去换一个。',
      ],
      know: [
        { heading: null, items: [
          '共有六个标志：**安静作业**、**小声交谈**、**两人合作**、**小组讨论**、**先举手**和**请看前面**。每个都有自己的颜色和图案，坐在后排也分得清。',
          '底部的列表可以选择标志显示 **EN + 中文**、**English** 或**中文**。',
          '最小化后，小标签仍会显示当前的标志（只显示一种语言），放在其他工具旁也看得见。',
        ] },
      ],
      tip: '随着课堂进展换标志：思考—配对—分享时用**两人合作**，小组任务时用**小组讨论**，课堂总结时换成**请看前面**。',
      data: '只保存当前的标志和语言，存放在这个白板的这个工具里，不会离开浏览器。',
    },
  },

  text: {
    en: {
      for: 'Puts instructions, the learning intention or homework on the board in large type, as saved posts you can use again in any lesson.',
      start: [
        'Add a Text tool. It opens to your saved posts; press **New post** to start one (with no posts yet, it goes straight to a new one).',
        'Type. The post saves itself as you type, with its first line as the title in the list.',
        'Hover over the tool to see the formatting bar. **A−** and **A+** make all the text smaller or bigger.',
      ],
      know: [
        { heading: 'Saved posts', items: [
          'Posts are shared by every board in this browser, so *Homework* or *Success criteria* can go up in any lesson. **All posts**, the first button on the formatting bar, goes back to the list. With seven or more posts, **Find a post** filters it.',
          '**Make a copy** starts a new post from an old one, such as last week’s homework to change. A post open on two boards is the same post, so a change on one shows on the other: make a copy to adapt it.',
          'Delete a post with the bin button (click twice), with **Undo** for 8 seconds. A post with no text is not kept.',
        ] },
        { heading: 'Formatting', items: [
          'The bar has bold, italic, underline, bullet and numbered lists, **Text colour**, **Highlight** and **Clear formatting**. Ctrl+B, Ctrl+I and Ctrl+U work too, and Tab indents a list item.',
          '**Background colour** tints the post: white or six soft colours. Each post keeps its own colour, formatting and text size, so you can colour-code tasks and homework.',
          'Pasted text keeps bold, italic, underline and lists only. Minimised, the chip shows the post’s first line.',
        ] },
      ],
      tip: 'Keep a post for each routine you use often, such as *Pair work steps* or *Finished? Try question 5*. Put it up in a few clicks in any lesson, then make a copy when a class needs a different version.',
      data: 'Posts are saved in this browser, shared by all boards, and stay when the tool is closed. They go into full backups. A shared board file carries the posts its Text tools show, and they are added to your colleague’s list.',
    },
    zh: {
      for: '用大字在白板上显示课堂指示、学习目标或功课。内容存成文稿，每节课都可以再用。',
      start: [
        '添加文字工具，会先看到已存文稿；按**新文稿**开始写（还没有文稿时，会直接开一篇新的）。',
        '直接输入。文稿会边写边自动保存，第一行就是列表里的标题。',
        '把鼠标移到工具上，就会出现格式栏。**A−** 和 **A+** 可以把全部文字缩小或放大。',
      ],
      know: [
        { heading: '已存文稿', items: [
          '这个浏览器里的所有白板共用文稿，“功课”“成功标准”之类的内容，任何一节课都能拿出来用。格式栏的第一个按钮**所有文稿**可以回到列表；文稿有七篇以上时，可以用**查找文稿**筛选。',
          '**复制一份**会以旧文稿为基础开一篇新的，例如修改上星期的功课。同一篇文稿在两个白板上打开，其实是同一篇：一边改了，另一边也会变，所以要改编时先复制一份。',
          '按垃圾桶按钮（按两次）删除文稿，8 秒内可以按**撤销**。没有文字的文稿不会保留。',
        ] },
        { heading: '格式', items: [
          '格式栏有粗体、斜体、下划线、项目符号列表、编号列表、**文字颜色**、**涂亮**和**清除格式**。也可以按 Ctrl+B、Ctrl+I、Ctrl+U；在列表里按 Tab 可以缩进。',
          '**背景颜色**可以给文稿上色：白色或六种浅色。每篇文稿各自保留颜色、格式和字号，可以用颜色区分任务和功课。',
          '粘贴的文字只保留粗体、斜体、下划线和列表。最小化后，小标签会显示文稿的第一行。',
        ] },
      ],
      tip: '常用的课堂常规各存一篇文稿，例如“两人活动步骤”或“做完了？试试第 5 题”，每节课点几下就能展示；某个班需要不同版本时，再复制一份来改。',
      data: '文稿保存在这个浏览器里，所有白板共用，关掉工具也会保留。完整备份会包括文稿。分享的白板文件会带上它的文字工具所显示的文稿，并加进同事的文稿列表。',
    },
  },

  whiteboard: {
    en: {
      for: 'Gives you pages to write on with a pen, highlighter or typed text, on blank paper or a writing grid such as 田字格.',
      start: [
        'Choose the paper from the list at the top. For grids and lines, choose a size: **S**, **M** or **L**.',
        'Write with the **Pen**, or choose the **Highlighter** or the text button in the toolbar at the bottom.',
        'Use the new-page button at the top for another page.',
      ],
      know: [
        { heading: 'Paper and pages', items: [
          'The papers are **Blank**, **田字格**, **米字格**, **拼音田字格** (a pinyin band over each row of boxes), **Four lines** (四线三格, with a red base line), **Lined**, **Squares** and **Dots**. Each page keeps its own paper.',
          'A new page goes after this one, with the same paper, up to 30 pages. Move between pages with ‹ ›, the arrow keys or a presentation clicker.',
          '**Full screen** shows just the page and its tools.',
        ] },
        { heading: 'Writing', items: [
          'The pen has four colours and **Thin** or **Thick**; the highlighter has three colours.',
          'To type, choose the text button and click where the words should go. **A−** and **A+** change the size; drag the handle to move the text.',
          'The rubber removes one whole line or piece of text at a time. Undo (or Ctrl+Z) takes back the last line drawn, not typed text. The bin clears the page: click it twice.',
        ] },
        { heading: 'Saved on this board', items: [
          '**Saved on this board** (📚 in the title bar) lists what this tool has held on this board, newest first, with **+ New**. Your work is saved as you go, and closing the tool keeps it.',
          'Each item can be renamed (✎), copied or deleted (🗑, click twice, with **Undo**). One left blank isn’t kept. An item open in another tool of this kind on the board can’t be opened or deleted here.',
          'In the list, a whiteboard is named after its first typed text, if it has any. Rename it (✎) to find it again, such as *3A 听写 corrections*.',
        ] },
      ],
      tip: 'After 听写, put up 田字格 and write the characters most students got wrong, stroke by stroke, while they copy them. Add a 拼音田字格 page for the words with their pinyin.',
      data: 'Each whiteboard (its pages, writing and paper) is saved on this board, and stays there when the tool is closed. Full backups, copies and shared files of the board include them all.',
    },
    zh: {
      for: '提供可以书写的页面，用画笔、荧光笔或输入文字，纸张有空白，也有田字格、四线三格等书写格。',
      start: [
        '在顶部的列表里选纸张。格子和横线可以选大小：**小**、**中**、**大**。',
        '用**画笔**书写，或在底部的工具条选**荧光笔**或输入文字按钮。',
        '要多一页，按顶部的新增一页按钮。',
      ],
      know: [
        { heading: '纸张和页面', items: [
          '纸张有**空白**、**田字格**、**米字格**、**拼音田字格**（每行格子上方有拼音格）、**四线三格**（有红色基线）、**横线**、**方格**和**点阵**。每一页可以用不同的纸张。',
          '新的一页会加在这一页后面，纸张相同，最多 30 页。用 ‹ ›、方向键或翻页笔切换页面。',
          '**全屏**只显示页面和工具。',
        ] },
        { heading: '书写', items: [
          '画笔有四种颜色，可选**细**或**粗**；荧光笔有三种颜色。',
          '要输入文字，先选输入文字按钮，再点击要放文字的位置。**A−** 和 **A+** 调整大小，拖动把手可以移动文字。',
          '橡皮擦每次擦掉一整笔或一段文字。撤销（或 Ctrl+Z）只撤销上一笔，不撤销输入的文字。垃圾桶按钮清除本页，要按两次。',
        ] },
        { heading: '本白板已存', items: [
          '标题栏的**本白板已存**（📚）列出这个工具在这块白板上保存过的内容，最新的在前，也可以按**+ 新建**。内容会随时自动保存，关闭工具也会保留。',
          '每一项都可以重命名（✎）、复制或删除（🗑，按两次，可以**撤销**）。空白的不会保留。在这块白板的另一个同类工具中打开的项目，这里不能打开或删除。',
          '在列表里，画板会用第一段输入的文字作为名称（如果有）。可以重命名（✎），方便以后找，例如“3A 听写订正”。',
        ] },
      ],
      tip: '听写后，换上田字格，把多数学生写错的字一笔一笔写出来，让学生跟着抄。再加一页拼音田字格，写出词语和拼音。',
      data: '每个画板（页面、笔迹和纸张）都保存在这块白板上，关闭工具也会保留。完整备份、复制或分享白板时都会全部带走。',
    },
  },
};
