// Chinese (Singapore usage) for the common group. Keys are the exact English source strings.
// Shared modules: store, db, class lists, dock, board settings, backgrounds,
// points export, pictures, PDF, Google sign-in, YouTube and word lists.
export default {
  // Start-up (db.js)
  '杏坛 · ClassroomBoard is updating': '杏坛 · ClassroomBoard 正在更新',
  'Please close the app in your other tabs or windows. This page will carry on by itself.': '请关闭其他标签页或窗口中的杏坛，本页会自动继续。',

  // Boards and files (store.js)
  'Untitled board': '未命名白板',
  'My board': '我的白板',
  'Imported board': '导入的白板',
  '{name} (copy)': '{name}（副本）',
  'This file could not be read.': '无法读取这个文件。',
  'That is a full backup. Use Settings → Restore from backup instead.': '这是完整备份。请改用“设置 → 从备份恢复”。',
  'This file is not a 杏坛 board.': '这个文件不是杏坛白板。',
  'That is a single board. Use “Import board” on the boards screen.': '这是单个白板。请在白板列表中使用“导入白板”。',
  'This file is not a 杏坛 · ClassroomBoard backup.': '这个文件不是杏坛 · ClassroomBoard 的备份。',

  // Class lists (classes.js)
  'Names are saved only in this browser. Pickers and group makers use the current class.': '名单只保存在这个浏览器里。随机点名和分组会使用当前班级。',
  'No classes yet.': '还没有班级。',
  '{n} student': '{n} 名学生',
  '{n} students': '{n} 名学生',
  '+ New class': '+ 新建班级',
  'e.g. 25S01 or J1 H2 Translation': '例如：25S01 或 J1 H2 翻译',
  'One name per line.\nYou can paste a column from Excel or Google Sheets.\n\nTan Wei Ling\nMuhammad Irfan\n李明轩': '每行一个名字。\n可以从 Excel 或 Google 表格粘贴一整列。\n\nTan Wei Ling\nMuhammad Irfan\n李明轩',
  '{n} name': '{n} 个名字',
  '{n} names': '{n} 个名字',
  'Give the class a name': '给班级取个名字',
  'Class saved': '班级已保存',
  'Class name': '班级名称',

  // Dock (dock.js)
  'Add {tool}': '添加{tool}',
  'More tools ({n})': '更多工具（{n}）',
  'Edit dock: reorder, hide or add tools': '编辑工具栏：调整顺序、隐藏或添加工具',
  'Edit dock': '编辑工具栏',
  'Tools in the dock': '工具栏中的工具',
  'No tools in the dock. Add some from below.': '工具栏里没有工具。可以从下方添加。',
  'Hidden:': '已隐藏：',
  'All tools are in the dock.': '所有工具都在工具栏中。',
  'Add {tool} back to the dock': '把{tool}放回工具栏',
  'Icons only (compact)': '只显示图标（紧凑）',
  'Put every tool back in the original order': '把所有工具恢复到原来的顺序',
  'Dock reset': '工具栏已重置',
  'Drag tools to reorder. Tap − to hide a tool, or + to add it back.': '拖动工具可调整顺序。点 − 隐藏工具，点 + 重新添加。',
  'Hide {tool}': '隐藏{tool}',
  'Drag to move. Arrow keys also move it.': '拖动可移动，也可以用方向键移动。',
  '{tool}. Use left and right arrow keys to move.': '{tool}。用左右方向键移动。',

  // Board settings (boardsettings.js)
  'Board settings': '白板设置',
  'Board name': '白板名称',
  'Name saved': '名称已保存',
  'Colours': '颜色',
  'Library': '图库',
  'Custom colour': '自定义颜色',
  'No library images yet.': '图库里还没有图片。',
  'All': '全部',
  'Upload an image': '上传图片',
  'Preparing image…': '正在处理图片…',
  'Background set': '背景已设置',
  'Could not use that image': '无法使用这张图片',
  'Images you upload appear here, so you can use them on other boards too.': '上传的图片会显示在这里，其他白板也可以使用。',
  'In use on {n} board. Delete?': '{n} 个白板正在使用。删除？',
  'In use on {n} boards. Delete?': '{n} 个白板正在使用。删除？',
  'Delete this image from this computer': '从这台电脑删除这张图片',
  'This browser’s image storage is not available.': '这个浏览器的图片存储不可用。',
  'Uploaded images stay on this computer. They are included in a full backup (Settings), but not in shared board files, where the board falls back to a plain colour.': '上传的图片只保存在这台电脑上。完整备份（设置）会包含这些图片，但分享的白板文件不会，白板会改用纯色背景。',
  'Image brightness': '图片亮度',
  'Lighter': '较亮',
  'Darker': '较暗',
  'Source': '来源',

  // Background colours (backgrounds.js)
  'Navy': '藏青',
  'Forest': '森林',
  'Sunset': '晚霞',
  'Ocean': '海洋',
  'Plum': '梅紫',
  'Paper': '纸张',
  'Slate': '石板灰',
  'Chalkboard': '黑板',

  // Library categories (library.js)
  'Chinese paintings': '中国画',
  'Nature': '自然',
  'Singapore': '新加坡',
  'Festive': '节庆',

  // Points export (points.js, CSV headings)
  'Total now': '目前总分',

  // Pictures (images.js)
  'Choose an image file (JPG, PNG or WebP).': '请选择图片文件（JPG、PNG 或 WebP）。',
  'This browser can’t open that image. Try a JPG or PNG (iPhone HEIC photos need converting first).': '这个浏览器打不开这张图片。试试 JPG 或 PNG（iPhone 的 HEIC 照片需要先转换）。',
  'The image could not be saved. This browser’s storage may be full.': '无法保存图片。这个浏览器的存储空间可能已满。',

  // PDF (pdf.js)
  'The PDF reader couldn’t load. Check the internet connection and try again.': 'PDF 阅读器无法加载。请检查网络连接，然后再试一次。',
  'This PDF is password-protected. Save a copy without a password, then add that.': '这个 PDF 有密码保护。请另存一份没有密码的副本，再添加那一份。',
  'This PDF couldn’t be opened. It may be damaged.': '无法打开这个 PDF，文件可能已损坏。',

  // Google sign-in (google.js)
  'Could not reach Google. Check the internet connection.': '无法连接 Google。请检查网络连接。',
  'Google Drive access was not allowed. Click Connect again and tick the box to allow it.': '没有获得 Google 云端硬盘的访问权限。请再按一次“连接 Google”，并勾选允许访问。',
  'The Google window was closed before finishing.': 'Google 窗口在完成前被关闭了。',
  'The browser blocked the Google window. Allow pop-ups for this site and try again.': '浏览器拦截了 Google 窗口。请允许这个网站弹出窗口，然后再试一次。',
  'Google sign-in did not finish.': 'Google 登录没有完成。',
  'Access was not allowed.': '没有获得访问权限。',
  'Your organisation’s Google admin does not allow this app.': '你所在机构的 Google 管理员不允许使用这个应用。',
  'Your organisation’s Google admin does not allow this.': '你所在机构的 Google 管理员不允许这项操作。',
  'The Google sign-in has expired. Click Reconnect.': 'Google 登录已过期。请按“重新连接 Google”。',
  'That Google file no longer exists.': '这个 Google 文件已不存在。',
  'Google is busy. Trying again shortly.': 'Google 正忙，稍后会再试。',
  'Google said: {msg}': 'Google 回复：{msg}',
  'Not connected to Google.': '尚未连接 Google。',

  // YouTube (youtube.js): default title, for the YouTube tool to show with t(yt.UNTITLED)
  'YouTube video': 'YouTube 视频',

  // Word lists (wordlists.js)
  '{name} (shared)': '{name}（分享）',
};
