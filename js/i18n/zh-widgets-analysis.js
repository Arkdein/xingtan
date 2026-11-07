// Chinese for the Sentence analysis tool (层次分析). See GLOSSARY.md.
// The relation names (主谓, 述宾…) and roles (主｜谓) are Chinese in both languages.
export default {
  // Views and buttons
  'Analyse': '分析',
  'Present': '演示',
  'Sentence': '句子',
  'Change the sentence': '修改句子',
  'Start cutting': '开始切分',
  'Clear cuts': '清除切分',
  'Remove this cut': '删除这一刀',
  'Take away this cut and every cut inside it': '删除这一刀，以及它下面的所有切分',
  'Undo the last change': '撤销上一步',
  'Show all': '全部显示',
  'Back (←)': '返回（←）',
  'Next (→ or space)': '下一步（→ 或空格键）',
  '{k} of {n}': '{k} / {n}',
  'Nothing cut yet': '还没有切分',
  'As cut': '按切分顺序',
  'Layer by layer': '逐层',
  'Order of the cuts': '切分的顺序',
  'Pause before labels': '先切后标',
  'Show each cut with ? first; the next click shows its label': '每一刀先显示“?”，再按一下才显示关系',
  'Show the label': '显示关系',
  'Relation': '关系',

  // The diagram
  'Cut between “{a}” and “{b}”': '在“{a}”和“{b}”之间切一刀',
  'Cut here': '在这里切',
  'Take this cut away': '取消这一刀',
  'Cut this part next': '接下来切这一部分',
  'Change or remove this cut ({name})': '修改或删除这一刀（{name}）',

  // Hints
  'Tap the gap where this part divides (two or more gaps for 并列 or 连动).': '点击这一部分该切开的空隙（并列、连动可以切两刀以上）。',
  'Now choose the relation between the parts.': '再选出各部分之间的关系。',
  'This part can’t be cut any further. Tap another word.': '这一部分不能再切了。点别的词语。',
  'Every part is cut. Tap a bracket to change a label, or present it cut by cut.': '全部切分完毕。点括线可以修改关系，也可以一刀一刀地演示。',
  'Tap a word to choose a part to cut.': '点一个词语，选出要切的部分。',

  // Setting up the sentence
  'Sentence or phrase (Chinese or English)': '句子或短语（华文或英文）',
  'Type or paste a sentence, e.g. 王平是一位优秀的园艺家 or The boy beside you raised his hand.': '输入或粘贴句子，例如：王平是一位优秀的园艺家 / The boy beside you raised his hand.',
  'Language of the sentence': '句子的语言',
  'Tap a word to grey it out or back. Greyed Chinese particles stay with the word before them.': '点一个字或词，可以把它变灰或恢复。变灰的华文虚词随前，不单独切。',
  'Grey out (a particle such as 的、地、得)': '变灰（虚词，例如 的、地、得）',
  'Show in black': '恢复黑色',
  'The sentence will appear here.': '句子会显示在这里。',
  'Changing the sentence clears its cuts.': '修改句子会清除已有的切分。',

  // Labels
  'My labels': '我的标签',
  'Add your own labels': '添加自己的标签',
  'Label name': '标签名称',
  'Names of the parts': '各部分的名称',
  'e.g. 同位': '例如：同位',
  'e.g. 同 位': '例如：同 位',
  'No labels of your own yet.': '还没有自己的标签。',
  'Type a name for the label.': '输入标签的名称。',
  'There is already a label called “{name}”.': '已经有一个叫“{name}”的标签。',
  'Your labels appear after the 庖丁 labels in every Sentence analysis tool, on all boards.': '你的标签会排在庖丁标签之后，所有白板上的层次分析工具都能用。',
  'If you leave the parts blank, the label’s own characters are used (同位 → 同｜位).': '各部分的名称不填，就用标签本身的字（同位 → 同｜位）。',

  // Relation names in the palette (English interface only; Chinese shows 主｜谓)
  'Subject–predicate': '主语–谓语',
  'Verb–object': '述语–宾语',
  'Verb–complement': '述语–补语',
  'Attributive': '偏正（定中）',
  'Adverbial': '偏正（状中）',
  'Head + modifier after': '中心语 + 后置定语',
  'Head + adverbial after': '中心语 + 后置状语',
  'Coordinate': '并列',
  'Serial verbs': '连动',
  'Preposition–object': '介词–宾语',
  'Noun + localiser': '名词 + 方位词',
  'Numeral + measure': '数词 + 量词',

  // Saved on this board
  '1 cut': '1 刀',
  '{n} cuts': '{n} 刀',
};
