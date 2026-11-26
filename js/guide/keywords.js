// Everyday words teachers search with, for the guide's search (js/guide/search.js).
// Teachers look for what they want to do ("random", "抽签", "spelling"), not for a
// tool's name, so each tool card and some parts of the guide list the words that
// should find them, in English and in Chinese. Both languages are searched
// whichever language the guide is showing.
//
// Keys are tool types (for tool cards) or guide ids (sections, and their
// recipes, groups and questions: see renderSection in index.js).
// Keep the words short and plain. Separate them with spaces.

export const KEYWORDS = {
  // ---- Tools ----
  timer: {
    en: 'countdown count down stopwatch alarm minutes seconds time limit lap chime',
    zh: '倒计时 计时 定时 秒表 闹钟 分钟 时间 时限 分段',
  },
  clock: { en: 'time date day 24-hour 12-hour', zh: '时间 日期 星期 几点' },
  lessonflow: {
    en: 'agenda plan lesson plan steps learning intentions success criteria objectives now next outline LI SC',
    zh: '课堂流程 教学流程 步骤 学习目标 成功标准 议程 现在 接下来',
  },
  picker: {
    en: 'random name pick choose student lucky draw wheel spinner spin cold call who goes next roll dice',
    zh: '随机 抽签 抽人 点名 转盘 幸运 选学生 轮盘',
  },
  groups: { en: 'random groups teams pairs partners split class group work mixed ability levels balance roles leader scribe timekeeper keep apart together group points', zh: '分组 小组 组员 配对 两人 随机分组 异质分组 程度 混合 角色 组长 记录员 计时员 汇报员 分开 同组 小组加分' },
  points: {
    en: 'behaviour behavior points rewards stars merits classdojo dojo house points goal progress bar badge absent attendance reward reset zero clear new term weekly lesson counter carry over skills reasons praise needs work why helping late feedback values',
    zh: '积分 奖励 加分 扣分 表现 星星 目标 进度条 奖章 缺席 出席 点数 归零 清零 重置 新学期 课次 本节课 每课目标 行为表现 理由 表扬 需要改进 加分理由 扣分理由 价值观',
  },
  poll: {
    en: 'vote survey quiz check for understanding feedback scale rating mood meter feelings word cloud exit ticket qr hands',
    zh: '投票 调查 问卷 反馈 量表 情绪 心情 词云 举手 二维码',
  },
  routine: {
    en: 'making thinking visible mtv see think wonder thinking routine sticky notes wall padlet google form qr student devices',
    zh: '思维常规 可视化思维 看想疑 讨论空间 便利贴 二维码 学生设备',
  },
  organiser: {
    en: 'graphic organiser organizer mind map venn diagram t-chart kwl frayer fishbone cause effect compare',
    zh: '思维导图 图表 韦恩图 比较 因果 鱼骨图 T 形图',
  },
  noise: { en: 'noise level loud quiet volume microphone sound meter talking', zh: '音量 噪音 安静 吵 麦克风 声音' },
  traffic: { en: 'traffic light red amber yellow green stop go signal', zh: '红绿灯 红灯 绿灯 黄灯 信号' },
  symbols: {
    en: 'work mode signs silent whisper partner group discussion raise hand eyes on me expectations voice level',
    zh: '交流模式 安静作业 小声 两人合作 小组讨论 举手 看前面 课堂常规',
  },
  text: {
    en: 'text notes instructions type write post announcement table bullet points formatting directions steps checklist tick off',
    zh: '文字 文稿 说明 通知 打字 表格 格式 指示 步骤 活动步骤 勾选 清单',
  },
  whiteboard: { en: 'draw drawing pen sketch annotate whiteboard pages write', zh: '画板 画画 画图 笔 涂写 手写' },
  youtube: { en: 'video youtube clip film watch play', zh: '视频 影片 YouTube 播放 短片' },
  music: {
    en: 'music background music song spotify calm playlist audio mp3 sound',
    zh: '音乐 背景音乐 歌曲 Spotify 轻音乐 播放',
  },
  images: {
    en: 'picture image photo pdf worksheet visualiser visualizer document camera webcam annotate slideshow zoom reveal',
    zh: '图片 照片 PDF 工作纸 实物投影仪 摄像头 标注 幻灯片 放大 遮挡',
  },
  sharelink: { en: 'share link qr code url website padlet forms students devices', zh: '分享链接 二维码 网址 链接 学生设备' },
  dictation: {
    en: 'dictation spelling words vocabulary word list test english chinese malay tamil meaning definitions',
    zh: '听写 默写 词语 生词 词语表 拼写 解释 例句',
  },
  hanzi: {
    en: 'character grid stroke order strokes writing chinese characters tian zi ge trace handwriting radical',
    zh: '田字格 笔顺 笔画 写字 汉字 部首 描红',
  },
  quotes: {
    en: 'quotes sayings proverbs values holding screen before lesson motivation chengyu',
    zh: '名言 名言佳句 格言 谚语 成语 价值观 课前画面',
  },
  readaloud: {
    en: 'read aloud reading fluency pinyin model reading echo choral tap to hear passage text to speech voice weaker readers',
    zh: '朗读 范读 跟读 齐读 点读 拼音 文章 课文 语音 阅读',
  },
  analysis: {
    en: 'sentence analysis grammar parse cut layers structure 庖丁 phrases',
    zh: '层次分析 句子 语法 切分 结构 短语 庖丁',
  },

  // ---- Guide sections ----
  'quick-start': {
    en: 'start getting started first time new begin setup set up how to tour sample',
    zh: '开始 上手 第一次 新手 入门 怎么用 导览 示例',
  },
  'in-the-classroom': { en: 'ideas recipes lesson examples how to use', zh: '课堂 例子 点子 用法' },
  'boards-g1': {
    en: 'board new board rename copy duplicate share import delete change background wallpaper picture autosave save copy for another class same lesson other class level team',
    zh: '白板 新建 重命名 复制 分享 导入 删除 更换背景 换背景 背景图片 自动保存 为其他班级复制 另一个班 同一节课 别班 级组',
  },
  'boards-g2': { en: 'class list students names add student remove student rename class roster', zh: '班级名单 学生名字 添加学生 移除学生 改名' },
  'boards-g3': {
    en: 'my classes overview all classes dashboard students report progress report print pdf check in flags parent meeting form teacher summary',
    zh: '我的班级 总览 所有班级 学生 报告 学生报告 打印 需要关注 家长会 班主任 总结',
  },
  'boards-g4': {
    en: 'minimise minimize shelf chip close undo blank screen hide black screen dark screen laser pointer laser dot spotlight cursor point fading ink focus attention',
    zh: '最小化 工具架 小标签 关闭 撤销 空白屏 黑屏 隐藏 关掉工具 激光笔 激光点 聚光灯 指针 光标 渐隐笔迹 圈重点',
  },
  'boards-g5': { en: 'dock toolbar reorder hide tools more rows icons', zh: '工具栏 调整次序 隐藏工具 更多 图标' },
  'boards-g6': {
    en: 'language chinese english full screen fullscreen install app offline',
    zh: '语言 中文 英文 全屏 安装 离线 没有网络',
  },
  data: { en: 'data privacy where saved storage', zh: '数据 隐私 保存在哪里 存储' },
  'data-g1': { en: 'backup back up restore move another computer', zh: '备份 恢复 换电脑' },
  'data-g2': {
    en: 'lost boards deleted disappeared missing gone clear browsing data incognito',
    zh: '白板不见了 资料不见了 丢失 不见了 删除 清除浏览器数据 无痕',
  },
  'data-g3': { en: 'google sign in login connect drive sheet form', zh: 'Google 登录 连接 表单 表格' },
  help: { en: 'problem not working broken help troubleshooting', zh: '问题 不能用 故障 帮助' },
};
