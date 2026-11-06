# User guide content · 使用指南内容

The guide page (`guide.html`) and each tool's **?** panel are drawn from the files in
this folder, so one edit updates both. There is no build step: edit a file, bump
`VERSION` in `sw.js`, and reload.

| File | Holds |
|---|---|
| `tools-time-people.js` | Cards: Timer, Clock, Lesson flow, Name picker, Groups, Points, Poll |
| `tools-thinking-signals.js` | Cards: Thinking routine, Organiser, Noise meter, Traffic light, Work mode, Text, Whiteboard |
| `tools-media-language.js` | Cards: YouTube, Music, Images/ PDF, Share link, Quotes, Dictation, Character grid, Read aloud |
| `sections.js` | Quick start, recipes, boards and the dock, data, troubleshooting, what's new |
| `index.js` | Puts the cards together and draws cards and sections |
| `panel.js` | The **?** panel in a tool's title bar |
| `page.js` | The guide page |

## Tool cards

One entry per tool, keyed by the tool's `type`, with the same five parts in English
(`en`) and Chinese (`zh`):

```js
picker: {
  en: {
    for: 'One sentence: what the tool is for.',
    start: ['Two to four steps to first use.'],
    know: [{ heading: null, items: ['Three to five things teachers miss.'] }],
    tip: 'One classroom tip.',
    data: 'Where its data goes: this browser, backups, shared board files, Google.',
  },
  zh: { /* the same in Chinese */ },
},
```

- `know` is a list of groups. A simple tool has one group with `heading: null`; a
  feature-rich tool has two to four, each with a short heading.
- Strings may use `**bold**` (on-screen labels, exactly as the app shows them in that
  language), `*italic*` and `` `code` ``. Nothing else is interpreted, so no HTML.
- Chinese follows `js/i18n/GLOSSARY.md` (白板, 画板, 工具栏, 课室…).
- About 150 words a language for a simple tool, up to about 350 for a rich one.

## When you add or change a tool

1. Add or update its card in one of the `tools-*.js` files. A tool with no card shows
   "This tool's card is still being written" in its **?** panel.
2. Add a line to `whatsnew` in `sections.js` (newest first; `tool` links to the card).
3. Check the recipes and the data table in `sections.js` if the change affects them.
