// Guide cards: timer, clock, lessonflow, picker, groups, points, poll. English and Chinese. See js/guide/README.md for the format.
export default {
  timer: {
    en: {
      for: 'Counts down the time for a task, or counts up with the Stopwatch, in numbers large enough for the back of the classroom.',
      start: [
        'Choose **Timer** or **Stopwatch** at the top of the tool.',
        'For a countdown, tap a preset (**1m**, **3m**, **5m**, **10m**). Or click the time and type one in: `5` is 5 minutes, `1:30` is 90 seconds.',
        'Press **Start**. **Pause** stops it for a moment and **Resume** carries on. **Reset** goes back to the time you set.',
      ],
      know: [
        { heading: 'Timer', items: [
          '**+1m** adds a minute, even while the timer is running, when a task needs a little longer.',
          'The ring turns red in the last 10 seconds. At zero the timer chimes three times and the tool flashes.',
          'It keeps going if the page reloads. A timer that ran out more than a minute earlier comes back reset, so an old board doesn’t chime when you open it.',
          'With **Play with the Timer** on in the Music tool, the music starts with the timer and fades out at zero.',
        ] },
        { heading: 'Stopwatch', items: [
          'Click the time itself to start or pause: an easy target when you are moving round the room.',
          '**Lap** notes the time now. Each lap also shows the time since the one before, with the newest at the top.',
          'Minimised, it shows its time on its chip, with a start / pause button.',
        ] },
      ],
      tip: 'Before a timed pair task, minimise the Timer and drag its chip next to the question on the board. Students see the question and the time left together, and you start it from the chip.',
      data: 'The time you set and any laps are kept in the tool, in this browser. Closing the tool loses them once the 8-second **Undo** has gone, so minimise it instead. Copies and shared files of the board keep the timer as it was set.',
    },
    zh: {
      for: '为活动倒计时，或用秒表正向计时；数字够大，课室后排也看得清。',
      start: [
        '在工具顶部选择**计时器**或**秒表**。',
        '倒计时可以点预设时间（**1分**、**3分**、**5分**、**10分**），也可以点时间直接输入：`5` 是 5 分钟，`1:30` 是一分半钟。',
        '按**开始**。按**暂停**可以先停一下，再按**继续**。按**重置**回到设定的时间。',
      ],
      know: [
        { heading: '计时器', items: [
          '活动需要多一点时间时，按 **+1分** 加一分钟，计时中也可以加。',
          '最后 10 秒，圆环变成红色。时间到时会响三声，工具也会闪动。',
          '页面重新载入后，计时器会继续走。如果时间已经到了超过一分钟，计时器会自动重置，打开旧白板时就不会突然响起来。',
          '在音乐工具里打开**随计时器播放**，音乐就会跟着计时器开始，时间到时慢慢淡出。',
        ] },
        { heading: '秒表', items: [
          '直接点时间就能开始或暂停，在课室里走动时也容易点到。',
          '按**分段**记下此刻的时间。每一段还会显示和上一段相差多少，最新的排在最上面。',
          '最小化后，小标签上仍会显示时间，并有开始 / 暂停按钮。',
        ] },
      ],
      tip: '做限时的两人活动前，先把计时器最小化，再把小标签拖到白板上的题目旁边。学生同时看到题目和剩下的时间，你在小标签上就能开始计时。',
      data: '设定的时间和分段记录都保存在工具里，只存在这个浏览器中。关掉工具后，8 秒内可以按**撤销**找回；过后就没有了，所以不用时最好最小化。复制或分享白板时，计时器会保留原来的设定。',
    },
  },

  clock: {
    en: {
      for: 'Shows the time and today’s date in large type, so students can keep track of the lesson themselves.',
      start: [
        'Add the Clock from the dock. It shows the hour and minutes, with the day and date underneath.',
        'Click the time to switch between 12-hour and 24-hour time.',
      ],
      know: [
        { heading: null, items: [
          'The time and date follow the app’s language: in Chinese the day and date are written in Chinese too.',
          'Minimised, the Clock still shows the time on its chip, so it can sit on the shelf all lesson without taking up room.',
          'It starts in 12-hour time. Once you switch, the Clock on this board remembers your choice.',
                  ] },
      ],
      tip: 'During timed essay practice, keep the Clock in a corner with the finishing time beside it, such as *Pens down at 10:45*. Students learn to pace themselves as in the exam.',
      data: 'The Clock keeps only one setting, 12-hour or 24-hour, in the tool in this browser. Closing the tool loses it once the 8-second **Undo** has gone; one click on the time sets it again.',
    },
    zh: {
      for: '用大字显示时间和日期，让学生自己掌握上课的进度。',
      start: [
        '从工具栏添加时钟。它显示几点几分，下面是星期和日期。',
        '点时间可以在 12 小时制和 24 小时制之间切换。',
      ],
      know: [
        { heading: null, items: [
          '时间和日期跟着界面语言走：用中文界面时，星期和日期也会用中文显示。',
          '最小化后，小标签上仍会显示时间，整节课放在工具架上也不占地方。',
          '一开始是 12 小时制。切换之后，这块白板上的时钟会记住你的选择。',
                  ] },
      ],
      tip: '限时写作练习时，把时钟放在角落，旁边写上结束时间，例如*10:45 停笔*，让学生学会像考试时一样分配时间。',
      data: '时钟只保存一个设定（12 小时制或 24 小时制），存在工具里，只在这个浏览器中。关掉工具并过了 8 秒的**撤销**时间后，这个设定就没有了；再点一下时间就能改回来。',
    },
  },

  lessonflow: {
    en: {
      for: 'Puts the lesson’s learning intentions, success criteria and steps on the board, and shows students which step is **Now** and which is **Next**.',
      start: [
        'Add Lesson flow. It opens ready to type in: an optional title, the learning intentions, the success criteria and the steps, one per line.',
        'Press **Done** to show it on the board. The ✎ button edits it again.',
        'Press **Next** as the lesson moves on: it ticks off the current step and goes to the next one still to do. **Back** goes back a step.',
      ],
      know: [
        { heading: 'Setting up', items: [
          'The headings students see (*We are learning to…*, *I can…*, **Now**, **Next**) can be in **EN**, **中文** or **Both**, whatever language the app is in.',
          'Editing keeps the ticks on lines you haven’t changed. Untick **Show the intentions and criteria on the board** to show only the steps.',
        ] },
        { heading: 'During the lesson', items: [
          'Click a step to make it the current one, or click its number to tick it on or off without moving.',
          '**List** shows every step. **Now / Next** shows just the current step in large type, with the next one under it and the learning intentions at the top.',
          'Students can tick the success criteria in the list view during the plenary. ↺ unticks everything and goes back to step 1 for the next class.',
          'Minimised, its chip shows the step the lesson is on, such as *2/5 · Pair work*, with a **Next** button.',
        ] },
        { heading: 'Saved on this board', items: [
          '**Saved on this board** (📚 in the title bar) lists what this tool has held on this board, newest first, with **+ New**. Your work is saved as you go, and closing the tool keeps it.',
          'Each item can be renamed (✎), copied or deleted (🗑, click twice, with **Undo**). One left blank isn’t kept. An item open in another tool of this kind on the board can’t be opened or deleted here.',
          '**Make a copy** gives a fresh copy with nothing ticked, ready for the next class.',
        ] },
      ],
      tip: 'Show **Now / Next** during group work so groups that finish early can see what is coming. In the plenary, switch to **List** and ask students which success criteria they can tick, and why.',
      data: 'Each lesson flow is saved on this board, in this browser, and stays there when the tool is closed. Full backups, copies and shared files of the board include them all.',
    },
    zh: {
      for: '把这节课的学习目标、成功标准和各个步骤放在白板上，并标出**现在**和**接下来**的步骤。',
      start: [
        '添加课堂流程。工具一打开就可以输入：课题（可选）、学习目标、成功标准和步骤，每行一项。',
        '按**完成**，内容就显示在白板上。按 ✎ 按钮可以再修改。',
        '课堂往下进行时按**下一个**：当前步骤会打勾，并进入下一个还没完成的步骤。按**返回**退回一步。',
      ],
      know: [
        { heading: '设置', items: [
          '学生看到的标题（*我们要学习……*、*我能够……*、**现在**、**接下来**）可以选 **EN**、**中文**或**双语**，和界面语言无关。',
          '修改时，没改动的行会保留原来的勾。取消勾选**在白板上显示学习目标和成功标准**，白板上就只显示步骤。',
        ] },
        { heading: '上课时', items: [
          '点某个步骤，就把它设为当前步骤；点步骤前的编号，可以直接打勾或取消，不会跳过去。',
          '**列表**显示所有步骤。**现在 / 接下来**只用大字显示当前步骤，下面是下一步，最上面是学习目标。',
          '总结时，学生可以在列表视图里勾选成功标准。按 ↺ 会取消所有勾选并回到第一步，方便下一个班使用。',
          '最小化后，小标签会显示课堂进行到哪一步（例如*2/5 · 两人活动*），并有**下一个**按钮。',
        ] },
        { heading: '本白板已存', items: [
          '标题栏的**本白板已存**（📚）列出这个工具在这块白板上保存过的内容，最新的在前，也可以按**+ 新建**。内容会随时自动保存，关闭工具也会保留。',
          '每一项都可以重命名（✎）、复制或删除（🗑，按两次，可以**撤销**）。空白的不会保留。在这块白板的另一个同类工具中打开的项目，这里不能打开或删除。',
          '**复制一份**会得到一份全新的副本，什么都没打勾，下一个班可以直接用。',
        ] },
      ],
      tip: '小组活动时切换到**现在 / 接下来**，先完成的小组就知道下一步做什么。总结时切换到**列表**，请学生说说自己能勾选哪几项成功标准，为什么。',
      data: '每个课堂流程都保存在这块白板上，只存在这个浏览器中，关闭工具也会保留。完整备份、复制或分享白板时都会全部带走。',
    },
  },

  picker: {
    en: {
      for: 'Picks a student, or anything else, at random, shown on a name card or a spinning wheel.',
      start: [
        'Choose the class at the top of the tool. (No class yet? Add a class list from the class-list button in the corner menu.)',
        'Press **Pick a name** (**Pick** for My list), or **Spin** on the wheel.',
      ],
      know: [
        { heading: null, items: [
          '**No repeats** is on to start with: everyone comes up once before anyone comes up again. The tool shows how many are left, and **Reset** starts a new round. On the wheel, names already picked are greyed out.',
          '**My list** picks from anything you type: questions, roles, topics, groups or index numbers, up to 100 items. Quick fill gives 1–10, 1–40, Groups 1–6 or Yes / No.',
          'Switch between **Card** and **Wheel** at the top of the tool at any time.',
        ] },
      ],
      tip: 'Put the discussion questions in My list and let the wheel choose which one each group takes. With No repeats on, every question gets its turn.',
      data: 'Class names stay in this browser and never go into shared board files. My list goes with the board when you copy or share it, and it stays on the board when the tool is closed.',
    },
    zh: {
      for: '随机抽取学生或任何内容，以卡片或转盘显示。',
      start: [
        '在工具顶部选择班级。（还没有班级？先点角落菜单里的班级名单按钮，添加班级名单。）',
        '按**点名**（用另起名单时按**抽取**）；用转盘时按**转一转**。',
      ],
      know: [
        { heading: null, items: [
          '**不重复**一开始就已打开：每个人都抽到一次后，才会有人再被抽到。工具会显示还剩多少人，按**重置**就重新开始一轮。转盘上已抽到的名字会变灰。',
          '**另起名单**可以抽取你输入的任何内容：问题、角色、话题、小组或学号，最多 100 项。“快速填入”可一键填入 1–10、1–40、第1–6组或“是 / 否”。',
          '工具顶部可随时在**卡片**和**转盘**之间切换。',
        ] },
      ],
      tip: '把讨论问题输入另起名单，让转盘决定每组回答哪一题。打开“不重复”，每个问题都会轮到。',
      data: '学生名字只保存在这个浏览器里，不会放进分享的白板文件。复制或分享白板时，另起名单会一起带走；关掉工具后，另起名单仍会保留在白板上。',
    },
  },

  groups: {
    en: {
      for: 'Sorts a class into random groups in one click, by the number in each group or by the number of groups.',
      start: [
        'Choose the class at the top of the tool. (No class yet? Press **Add class list**.)',
        'Type a number and choose **per group** or **groups**: *4 per group*, or *6 groups*.',
        'Press **Make groups**. Press it again for a fresh mix.',
      ],
      know: [
        { heading: null, items: [
          'Groups don’t always come out even. With *4 per group*, a class of 30 makes 8 groups: six of 4 and two of 3. Sizes never differ by more than one.',
          'Students marked absent today in the Points tool are left out, so mark absences first. If the class list changes later, the tool lists anyone not yet in a group.',
          'Choosing another class clears the groups on screen.',
        ] },
      ],
      tip: 'For a jigsaw reading, make *6 groups* for the home groups and note them down. Then make groups again for the expert groups, so students mix with classmates they don’t usually sit with.',
      data: 'The groups are kept in the tool, in this browser. Closing the tool loses them once the 8-second **Undo** has gone, so minimise it instead. Shared board files keep the group size but never the groups, because they hold students’ names.',
    },
    zh: {
      for: '一键把全班随机分组，可以按每组人数分，也可以按组数分。',
      start: [
        '在工具顶部选择班级。（还没有班级？按**添加班级名单**。）',
        '输入数字，再选**人一组**或**组**：例如*4 人一组*，或*6 组*。',
        '按**开始分组**。想重新打乱，再按一次。',
      ],
      know: [
        { heading: null, items: [
          '每组人数不一定完全一样。选*4 人一组*时，30 人的班会分成 8 组：六组 4 人，两组 3 人。各组人数最多只差一个。',
          '在积分工具里标为今天缺席的学生不会分进组里，所以先标好缺席再分组。之后如果班级名单有变动，工具会列出还没分组的学生。',
          '换成另一个班级，屏幕上的分组就会清空。',
        ] },
      ],
      tip: '做拼图式阅读（jigsaw）时，先分*6 组*作为原始小组，记下组员；再分一次作为专家小组，让学生和平时不常坐在一起的同学合作。',
      data: '分组结果保存在工具里，只存在这个浏览器中。关掉工具后，8 秒内可以按**撤销**找回；过后就没有了，所以不用时最好最小化。分享的白板文件只保留每组人数的设定，不会带走分组结果，因为里面有学生的名字。',
    },
  },

  points: {
    en: {
      for: 'Keeps a running tally of behaviour points for each student, with **+** and **−** beside every name.',
      start: [
        'Choose the class at the top of the tool. (No class yet? Press **Add class list**.)',
        'Tap **+** or **−** beside a name, or **+ All** / **− All** for everyone present.',
        'Made a mistake? **Undo** reverses the latest change, even a whole-class one.',
      ],
      know: [
        { heading: 'Giving points', items: [
          'Tap a student’s name to mark them absent for today. They are greyed out and **+ All** / **− All** skip them. The marks clear the next day.',
          '**Undo** goes back through up to 20 of today’s changes. Points can go below zero.',
          'Sort by **Class order**, **A–Z** or **Top**. Rows never move while you tap; tap **Top** again to re-sort. The tool always opens in class order.',
        ] },
        { heading: 'Goal bar (⋯ menu)', items: [
          '**Class goal**: one track for the whole class. **Student goal**: a track in every student’s row. Counting starts from zero when you save.',
          'Choose a **Marker** and the finish it travels to (rocket → moon, ship → island, dragon → pearl…), a **Chime at the finish** (tap one to hear it), short sounds at ¼, ½ and ¾ of the way, and an optional **Reward**. With student goals, any student can have their own marker.',
          'At a class goal the chime plays once; press **Next round** when you are ready. A student who reaches their goal collects a badge (the finish picture, ×2, ×3…) and starts the next round straight away.',
          'The 🔊 button mutes the sounds. With a class goal, the ⤢ button shows just the bar, large enough for the back row. Undo moves markers back without replaying the chime.',
          '**If points go below zero**, choose a rule. **Count points from before the goal** (the usual choice): lost points must be earned back, and anyone already below zero starts that far behind. **Fresh start at the goal**: lost points must be earned back, but everyone starts from zero. **Total must be 0 or more**: the marker waits at the finish until the total is back to 0. With the first two rules, zero is in the middle of the track: points earned fill blue to the right, points owed fill red to the left.',
        ] },
        { heading: 'Log and new term', items: [
          '**Download log (CSV)** gives one row per student and one column per day, plus the running total. **Reset points to 0** starts a new term (click twice) and puts the goal bar back to the start; the log is kept.',
        ] },
        { heading: 'Classes, not boards', items: [
          'Points belong to the class, not the board. Every board that shows 3A shows 3A’s running totals, so a new or copied lesson board carries on from the last lesson.',
          'Points are matched by name. Changing a student’s name in the class list starts them at 0. Deleting a class deletes its points.',
        ] },
      ],
      tip: 'For a lower primary class, set a class goal of *50 points* with the rocket and the reward *Story time on Friday*. Give **+ All** when the whole class lives out a CCE value such as respect, and let the class count down to the moon together instead of competing with each other.',
      data: 'Points are saved with the class lists in this browser, not with the board, so closing the tool never touches them. They go into full backups (⚙️ → **Download backup**) but never into shared board files.',
    },
    zh: {
      for: '为每个学生累计行为积分，每个名字旁都有 **+** 和 **−**。',
      start: [
        '在工具顶部选择班级。（还没有班级？按**添加班级名单**。）',
        '点名字旁的 **+** 或 **−**；要给所有出席的学生加减分，就按 **+ 全班** / **− 全班**。',
        '点错了？按**撤销**就能取消上一次更改，全班加减分也可以撤销。',
      ],
      know: [
        { heading: '给积分', items: [
          '点学生的名字，就把他标为今天缺席：名字变灰，**+ 全班** / **− 全班**会跳过他。第二天会自动清除。',
          '**撤销**最多可以倒回今天的 20 次更改。积分可以是负数。',
          '可按**名单顺序**、**A–Z** 或**计分排名**排序。点按时名字不会移动；再按一次**计分排名**才会重新排序。工具每次打开都按名单顺序显示。',
        ] },
        { heading: '目标进度条（⋯ 菜单）', items: [
          '**全班目标**：全班共用一条跑道。**个人目标**：每个学生的名字旁都有一条跑道。保存后从零开始计算。',
          '选一个**图标**和它要前往的终点（火箭 → 月亮、帆船 → 小岛、龙 → 龙珠……），选**终点提示音**（点按就能试听），可以在走到¼、½和¾时发出短促的提示音，也可以写上**奖励**。设个人目标时，可以让学生选自己的图标。',
          '全班达到目标时，提示音只响一次；准备好了再按**下一轮**。学生达到个人目标时会得到一枚奖章（终点的图案，×2、×3……），然后马上开始下一轮。',
          '🔊 按钮可以关掉声音。设全班目标时，按 ⤢ 只显示进度条，坐在后排的学生也看得清楚。按撤销，图标会退回去，但提示音不会再响。',
          '**积分低于零时**有三种规则可选。**设定目标前的负分也算**（一般选这个）：被扣掉的分要先赚回来，设定目标时已是负分的学生会从起点后方出发。**设定目标时从零开始**：被扣掉的分要先赚回来，但大家都从零开始。**总积分须不低于零**：图标会在终点等着，直到总积分回到零或以上。选前两种规则时，跑道中间是零：赚到的分向右以蓝色显示，欠下的分向左以红色显示。',
        ] },
        { heading: '记录和新学期', items: [
          '**下载记录（CSV）**：每个学生一行，每天一列，最后是累计总分。新学期按**积分归零**（要按两次），目标进度条也会回到起点；每天的记录会保留。',
        ] },
        { heading: '积分跟着班级走', items: [
          '积分属于班级，不属于白板。只要白板显示的是 3A，就会显示 3A 的累计积分，所以新建或复制的白板会接着上一节课继续算。',
          '积分按名字对应。在班级名单里改了学生的名字，他的积分会从 0 开始。删除班级，这个班的积分也会一起删除。',
        ] },
      ],
      tip: '低年级的班级可以设一个 *50 分*的全班目标，选火箭，奖励写*星期五听故事*。全班都做到互相尊重等核心价值时就按 **+ 全班**，大家一起看着火箭飞向月亮，而不是互相比较。',
      data: '积分和班级名单一起保存在这个浏览器里，不在白板上，所以关掉工具不会影响积分。完整备份（⚙️ → **下载备份**）会包括积分，分享的白板文件则从不包括。',
    },
  },

  poll: {
    en: {
      for: 'Checks the whole class in a minute: confidence, mood or one word each. Answers from devices stay hidden until you show them.',
      start: [
        'Choose **Scale 1–5**, **Mood meter** or **Word cloud**, and type a **Question** (or leave it empty for a ready-made one).',
        'Choose the class. Press **Collect on devices** for answers from students’ phones, or **Count hands** to count without devices.',
        'On devices, press **Show results** when you are ready (counted hands show as you tap). Press **End** (click twice) to finish.',
      ],
      know: [
        { heading: 'Modes', items: [
          '**Scale 1–5** uses your own **End labels**, such as *1 = Not at all*. It shows the share for each number and the average.',
          '**Mood meter** has four zones by energy and pleasantness. On devices, students can add one word for how they feel.',
          '**Word cloud** counts **Whole answers**, or single words with **Split into words**. **Language** sets what students see: **English**, **中文** or **Both**.',
        ] },
        { heading: 'Collecting answers', items: [
          '**Collect on devices** needs the Google connection. Students scan the QR code and answer a Google Form without signing in. If your hour-long sign-in runs out, press **Reconnect Google**.',
          'Each class reuses one poll form, so a code from **QR** → **Print the QR code** works for every poll.',
          '**Count hands** needs no devices and no Google. Students show 1–5 fingers or point to a zone, and you tap a bar or zone to add one. For a Word cloud, **Type answers in** as students call them out.',
          '**Anonymous** is the default. With **Ask names (Sheet only)**, names go to the Google Sheet and never show on the board.',
        ] },
        { heading: 'During and after', items: [
          'Click a word in the cloud to hide it. Common rude words in English, Singlish and Chinese are hidden by themselves.',
          '**End** keeps the result in the class’s **Past results**, and in its Google Sheet if you are connected. **Download all (CSV)** gives one row per poll, to track a class over a unit.',
        ] },
      ],
      tip: 'End a lecture or tutorial with **Scale 1–5** on *How confident are you with today’s key concept?* as an exit ticket. A week later, open **Past results** to see whether the reteach worked.',
      data: 'Past results stay with the class in this browser, as totals and words only, and go into full backups. Closing the tool doesn’t touch them, but a poll still running is lost, so **End** it first. (Closing it still stops the form taking answers once **Undo** has gone.) Device polls keep the form, answers and Sheet in your own Google Drive; shared board files keep only the poll’s set-up.',
    },
    zh: {
      for: '一分钟了解全班：有多大把握、心情如何，或每人一个词。用设备作答时，结果在你显示之前不会出现。',
      start: [
        '选择**量表 1–5**、**情绪象限**或**词云**，再输入**问题**（不填就用预设的问题）。',
        '选择班级。要学生用手机作答，按**用设备收集**；不用设备，就按**举手计数**。',
        '用设备收集时，准备好了再按**显示结果**（举手计数的结果边点边显示）。最后按**结束**（要按两次）。',
      ],
      know: [
        { heading: '三种模式', items: [
          '**量表 1–5** 的**两端说明**由你来写，例如*1 = 完全没有*。结果显示每个分数所占的比例和平均分。',
          '**情绪象限**按精力和愉快程度分成四个区。用设备作答时，学生还可以写一个词形容自己的感受。',
          '**词云**默认按**整个回答**统计，选**拆成词语**就按单个词语统计。**语言**决定学生看到什么：**English**、**中文**或**双语**。',
        ] },
        { heading: '收集回答', items: [
          '**用设备收集**需要连接 Google。学生扫描 QR 码，填写 Google 表单，不需要登录。Google 登录大约维持一小时，失效时按**重新连接 Google**。',
          '每个班级都重复使用同一份投票表单，所以用 **QR** → **打印 QR 码**印出来的码，每次投票都能用。',
          '**举手计数**不需要设备，也不需要 Google。学生伸出 1–5 根手指或指向一个区，你每点一下长条或区就加一。词云则按**输入回答**，把学生说的答案打进去。',
          '默认是**匿名**。选**填写姓名（只记录在表格）**，名字只会记在 Google 表格里，不会显示在白板上。',
        ] },
        { heading: '投票中和投票后', items: [
          '在词云里点一个词就能把它隐藏。常见的英语、新加坡式英语和华语粗话会自动隐藏。',
          '按**结束**后，结果会保存在本班的**历史记录**里；连接了 Google 的话，也会存进本班的 Google 表格。**全部下载（CSV）**每次投票一行，方便追踪一个单元里全班的变化。',
        ] },
      ],
      tip: '讲座或辅导课结束前，用**量表 1–5** 问*你对今天的重点概念有多大把握？*，当作课后反思。一周后打开**历史记录**，看看重新讲解有没有效果。',
      data: '历史记录跟着班级保存在这个浏览器里，只有统计数字和词语，完整备份也会包括它。关掉工具不会影响历史记录，但还在进行的投票会丢失，所以先按**结束**。（**撤销**消失后，表单也会自动停止接受回答。）用设备收集时，表单、回答和本班的表格都在你自己的 Google Drive 里；分享的白板文件只保留投票的设定。',
    },
  },
};
