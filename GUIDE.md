# Word Snap

Word Snap is a static single-page vocabulary matching practice app. Match pairs (default: Chinese meaning ↔ English word), review with adaptive prioritization, and keep everything offline in the browser.

- Live: [https://guojiz.github.io/word-snap/vocabulary-match.html](https://guojiz.github.io/word-snap/vocabulary-match.html)
- Source: this repository
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## Who it is for

- People who want game-like English (or bilingual) vocabulary review;
- Anyone who wants to import a custom word list and drill it repeatedly;
- Learners who want weak, missed, and slow words to appear more often;
- Users who want a login-free, open-and-play practice tool.

## Features

- 10-slot streaming match board: 5 cards on the left, 5 on the right.
- Keyboard shortcuts `1`–`0`.
- Instant match feedback (no submit step).
- Correct pairs flash and clear; new words refill from the queue.
- Wrong pairs shake and roll back into practice.
- Box-based review: missed words come back next round, correct ones after longer and longer gaps; new words arrive in small batches.
- **Library** in three tabs: **My words** (stage filters with counts, search, sort, grouped by learning stage), **Add words** (single, bulk, AI prompt), **Print / export**.
- **Trial level**: first-time visitors play one 10-word level with the built-in sample words, then get **Import my words**. On import, the sample words are replaced by your list (a ticked-by-default option); untick it to keep them, or skip the trial from the intro with **I have a list — import it**.
- If you keep the samples, **your own words are introduced first**, in the order you added them.
- **Settings** (side rail / bottom nav) hold the practice options, save automatically, and keep the rarely needed ones under **Advanced**. Resetting learning progress lives here too, behind a confirmation — it is no longer a main navigation button.
- **My words → Danger zone → Clear all words.** The library is designed to keep growing: practice mixes reviewing old words with learning new ones, and mastered words simply come up less often, so you normally never clear it. Clearing is only for switching to a completely different set (new textbook, term, or language). Use **Save backup file** first; **Settings → Restore from file** brings back the words with their progress. (**Copy word list** still gives a plain text list for Bulk input, without progress.)
- Empty-library prompt when there is nothing to practice.
- Settings: language pair, practice mode (adaptive / weak only / all in order), appearance, max words per round, level time, adaptive time, piano notes; Advanced: time tolerance, refill delay, pause refill while selected, keep practicing after everything is mastered.
- Synonyms count: if two entries share a meaning (e.g. `big` / `large` = 大的), either English card matches it.
- End-of-level review: words you mixed up are listed with their meaning.
- The level timer pauses while the Library is open or the app is in the background.
- Configurable **language-pair labels** (display only — see below).
- UI language: **English / 中文** toggle with browser detection + local preference.
- PWA basics: manifest, icons, service worker, Add to Home Screen.

## UI language

- Default: browser language (`navigator.language`). If it starts with `en`, the UI is English; otherwise Chinese.
- Preference is stored under `word_snap_lang` on this device only. It does **not** share the main site key `guojiz.lang`.
- Toggle with **EN / 中** in the side rail (desktop) or bottom nav (mobile).
- Switching language updates all visible chrome (nav, stats, library modal, options, install nudge, completion copy). It does not restart the current level.

## Language pairs (word labels)

In **Settings → Language pair** you can rename the two column labels, for example:

- English ↔ 中文 (default)
- English ↔ 日本語
- English ↔ Español
- 中文 ↔ English
- Custom names for side A and side B

**Important (Option 2):** only the **labels** change. Internal fields remain `en` / `zh`, and matching logic is unchanged. The left column always shows the `zh` field content; the right column always shows the `en` field content. Choosing “中文 → English” as labels does **not** flip the board. Built-in starter words are English ↔ Chinese only. Full field rename (`en`/`zh` → `a`/`b`) is on the roadmap (Option 1).

## Review logic (boxes)

Word Snap uses a simple box system (Leitner). It is a web page and cannot send reminders, so short-term gaps are counted in **rounds played**; long-term gaps are counted in **calendar days** (a “day” starts at 4 am, so a late-night session still counts as today).

| Box | Comes back | Fallback if you were away |
| --- | --- | --- |
| 0 — just missed | next round | 30 minutes |
| 1 | 2 rounds later | 4 hours |
| 2 | 4 rounds later | next day |
| 3 | next day | — |
| 4 | 3 days later | — |
| 5 — mastered | spot check after 14 days | — |

- Wrong pair → the word you were answering goes to box 0; the card you wrongly picked drops one box (at most once per level).
- Right pair → one box up, **only if the word was due**. Matching it again early does not count.
- Boxes 3–5 only open on a later day, so a word can never be “mastered” in a single sitting (it takes at least three separate days).
- Synonyms (same meaning or same word) are accepted as correct.

Which words go into a round is decided by priority (“Max words per round” is the cap):

1. words missed last time;
2. other due words, lowest box first;
3. new words — at most about a third of a round (5–15), and only while fewer than a round's worth of words are still in boxes 0–1, so a 200-word import never floods you. A light review day means more new words;
4. only if that adds up to less than two boards (10 words), top up with words not yet due. Rounds are not padded to the maximum, because showing not-due words every round would undo the spacing.

The chosen words are then **shuffled**. If missed words always came first, their position would give the answer away and hard words would bunch up. Nothing is lost if time runs out: words you didn't get to keep their schedule and are still due next round. Only finishing a level counts as a round; adding words or switching modes does not. (“All in order” mode keeps library order.)

A word counts as **new** until you have answered it once (right or wrong); just appearing on the board, e.g. in a level you left or that timed out, keeps it new. New words are introduced **your own words first** (in the order you added them, e.g. textbook order), then the built-in sample words — so an import never waits behind the demo list.

The library is meant to keep growing; you don't need to clear it. Mastered words simply come up rarely.

## Library word list

**My words** groups the list by stage, in the order that matters for practice:

1. **Learning** (boxes 0–1) — shakiest and most-missed first; these come up first.
2. **In review** (boxes 2–4) — in spaced review, soonest due first.
3. **New** — in the exact order they will be introduced.
4. **Mastered** — occasional spot checks.

Stage chips filter the list (each shows its count), the search box matches word or meaning, and the sort menu also offers *Newest first* (to find what you just added) and *A → Z*.

## How to use

Local:

```text
index.html
```

Online: open the [live URL](https://guojiz.github.io/word-snap/vocabulary-match.html).

On iPhone/iPad: Safari → Share → **Add to Home Screen**. The PWA name is **Word Snap**. After updates, if you still see an old Chinese-only UI, fully quit Safari and reopen so the new service worker (`word-snap-v9+`) can replace the cache.

## Bulk import format

In **Library → Add words → Bulk input**, one pair per line:

```text
apple,苹果
banana,香蕉
UNESCO = 联合国教科文组织
```

Tab (spreadsheet / Anki paste), `=`, comma (`,` or `，`) and a spaced dash (`word - meaning`) are supported. Only the first separator splits the line, so a meaning may contain commas. First field maps to the internal `en` side; second maps to `zh`.

## Data

No account, no server upload. Words, settings, and progress stay in the current browser.

Clearing site data, switching device/browser, or private mode can wipe local state, so keep a backup file:

- **Settings → Backup & restore → Save backup file** saves `word-snap-backup-YYYY-MM-DD.json`: every word with its review box and schedule, settings, practice mode, round and score, plus theme / appearance / print options. On phones it opens the share sheet (Files, chat, AirDrop…); elsewhere it downloads.
- **Restore from file** on the other device (or after data was cleared) replaces everything there with the backup, after a confirmation. **Undo the restore** stays available for 7 days.
- The UI language is not part of the backup (it is per device).
- Once you have 10+ own words with progress and no backup (or none for 14 days while progress changed), *My words* shows a one-line reminder with a save button. The app cannot sync by itself: it has no server.

## Known limits

- Board orientation is fixed: left = `zh` content, right = `en` content; language-pair presets only rename labels.
- Starter vocabulary is English ↔ Chinese.
- Language preference is per-device / per-browser.
- No automatic sync between devices: move words and progress with a backup file (Settings → Backup & restore).

---

# 中文说明

Word Snap 是一个静态单页单词配对练习网页，通过配对（默认：中文释义 ↔ 英文单词）帮助复习词汇。可部署到 GitHub Pages；单词、设置与进度保存在浏览器本地。

- 在线体验：[https://guojiz.github.io/word-snap/vocabulary-match.html](https://guojiz.github.io/word-snap/vocabulary-match.html)
- 源码：[https://github.com/Guojiz/word-snap](https://github.com/Guojiz/word-snap)
- 更新日志：[CHANGELOG.md](./CHANGELOG.md)

## 适合谁

- 想用小游戏方式复习英文/双语词汇的人；
- 想导入自己的词表并反复练习的人；
- 想让不熟、错过、反应慢的词更多出现的人；
- 想要不登录、打开即用的轻量工具的人。

## 功能特点

- 10 格流式配对：左 5、右 5；快捷键 `1`–`0`；即时判定。
- 盒子式复习（答错下一轮再来，答对隔得越来越久）、新词小批量加入。
- **词库**分三个标签页：**我的词库**（按阶段筛选并显示数量、搜索、排序、按学习阶段分组）、**添加单词**（单个、批量、AI 提示词）、**打印导出**。
- **体验关**：第一次打开先用内置示例词玩一关（10 个词），结束后点「导入我的单词」。导入时默认勾选「移除示例词」，词库里就只剩你自己的词；取消勾选可以保留示例词。也可以在介绍卡上点「我有词表，直接导入」跳过体验关。
- 如果保留示例词，新词**先学你自己的词**（按添加顺序），示例词排在后面。
- **设置**（侧栏 / 底栏）放练习选项，改完自动保存，不常用的收在「高级选项」里。重置学习进度也在这里，需要确认，不再是主导航按钮。
- **我的词库 → 危险操作 → 清空全部词。** 词库的设计是越积越多：练习会自动混合复习旧词和学习新词，掌握的词只是出现得更少，所以平时不需要清空。只有彻底换一套词（换教材、换学期、换语言）时才用。清空前先点「保存备份文件」，之后在「设置 → 从文件恢复」即可连同学习进度一起找回（「复制词表」仍可复制纯文本词表，粘贴回「批量录入」，不含进度）。
- 设置：语言对、练习模式（自适应 / 只练弱项 / 全量顺序）、外观、每局最多单词数、每关时间、按速度自动调时、钢琴音阶；高级：时间容错、补词延迟、选中暂停补词、全部掌握后继续循环。
- 同义词都算对：两个词条释义相同时（如 `big` / `large` = 大的），任一英文卡都能配上。
- 每关结束列出本关混淆过的词及释义，方便回顾。
- 打开词库或切到后台时，本关计时自动暂停。
- **界面中英切换**；**语言对标签**可配置（见下）。
- PWA：manifest、图标、service worker、添加到主屏幕。

## 语言切换

- 默认按浏览器语言：`navigator.language` 以 `en` 开头则英文，否则中文。
- 偏好存于 `word_snap_lang`，**不与**主站 `guojiz.lang` 共享。
- 侧栏 / 底栏 **EN / 中** 切换；切换会刷新可见文案，但不会重开当前关卡。

## 多语言词对用法

在 **设置 → 语言对** 可改两侧列标题，例如 English↔中文、English↔日本語、自定义等。

**注意（方案 Option 2）：** 只改显示标签，内部字段仍是 `en`/`zh`，匹配逻辑不变。左列始终显示 `zh` 字段内容，右列始终显示 `en` 字段内容；选「中文→English」只换标签、不翻边。内置词库仅英↔中。全量字段重构（Option 1）在后续路线图。

## 使用方式

本地打开 `index.html`，或使用线上地址。iPhone 用 Safari「添加到主屏幕」；若仍见旧版中文缓存，可强关 Safari 再开以激活新 SW（`word-snap-v9+`）。

## 词库列表

「我的词库」按学习阶段分组，顺序就是练习时的优先顺序：

1. **学习中**（0–1 号盒）：最不稳、错得最多的在前，会优先出现；
2. **复习中**（2–4 号盒）：按间隔复习，最快到期的在前；
3. **待学新词**：就是之后加入练习的顺序；
4. **已掌握**：偶尔抽查。

一个词在你第一次作答（答对或答错）之前都算「新词」；只是出现在棋盘上（比如中途离开或时间到）不算。阶段标签可以筛选（带数量），搜索框可搜单词或释义，排序还可以选「最近添加在前」（方便找刚加的词）和「按字母」。

## 批量导入

在 **词库 → 添加单词 → 批量录入**，每行一对，逗号或等号均可：

```text
apple,苹果
UNESCO = 联合国教科文组织
```

也支持 Tab（从表格 / Anki 复制）和带空格的短横线（`word - 释义`）。只按第一个分隔符拆分，释义里可以有逗号。第一段写入内部 `en` 侧，第二段写入 `zh` 侧。

## 数据说明

无需登录，不上传服务器。单词、设置和进度只存在当前浏览器里，清理站点数据、换设备 / 换浏览器、无痕模式都可能导致丢失，所以请保存备份文件：

- **设置 → 备份与恢复 → 保存备份文件**：生成 `word-snap-backup-年-月-日.json`，包含全部单词及复习盒子和计划、设置、练习模式、轮次和得分，以及配色 / 外观 / 打印选项。手机上会弹出分享面板（存到文件、发微信、AirDrop 等），电脑上直接下载。
- 在新设备（或数据被清理后）点 **从文件恢复**，确认后用备份替换这台设备上的全部内容。恢复后 7 天内可以 **撤销恢复**。
- 界面语言不在备份里（按设备保存）。
- 当你自己的词有 10 个以上且有学习进度、但还没备份过（或已 14 天没备份且进度有变化）时，「我的词库」顶部会出现一行提醒和保存按钮。网页没有服务器，不能自动同步。

## 已知限制

- 面板方向固定（左 `zh`、右 `en`），语言对只改标签；
- 内置词库仅英↔中；
- 语言偏好按设备/浏览器存储；
- 设备之间不会自动同步，换设备请用备份文件（设置 → 备份与恢复）。
