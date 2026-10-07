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
- **Endless practice by default**: the board keeps refilling and a short summary comes every 25 pairs (× ends a set early). Timed levels are still there under **Settings → How to practice**.
- **Personal review engine**: a memory model that learns how fast *you* forget, grades every answer automatically from right/wrong and your reaction time, and picks the next word (see *Review logic*).
- **Mixed-up pairs**: words you confuse, and look-alike words from your own list, are put on the board together; the set summary lists the pairs and can drill just them.
- **Spelling and sentence cards** after each set (Settings → *Cards after each set*, 0–3, default 2). The grammar check runs on your device: any grammatical word order passes.
- **Example sentences** per word (optional), from import, your own passed sentences, or the optional on-device AI.
- **On-device AI (optional, off by default)**: a small language model in the browser suggests an idea when you are stuck and writes missing example sentences. Free, no account, nothing leaves the device.
- **7-day review forecast** at the top of *My words*.
- **Library** in three tabs: **My words** (stage filters with counts, search, sort, grouped by learning stage), **Add words** (single, bulk, AI prompt), **Print / export**.
- **Trial level**: first-time visitors play one 10-word level with the built-in sample words, then get **Import my words**. On import, the sample words are replaced by your list (a ticked-by-default option); untick it to keep them, or skip the trial from the intro with **I have a list — import it**.
- If you keep the samples, **your own words are introduced first**, in the order you added them.
- **Settings** (side rail / bottom nav) hold the practice options, save automatically, and keep the rarely needed ones under **Advanced**. Resetting learning progress lives here too, behind a confirmation — it is no longer a main navigation button.
- **My words → Danger zone → Clear all words.** The library is designed to keep growing: practice mixes reviewing old words with learning new ones, and mastered words simply come up less often, so you normally never clear it. Clearing is only for switching to a completely different set (new textbook, term, or language). Use **Copy word list backup** first; pasting the backup into Bulk input restores the words (not their progress).
- Empty-library prompt when there is nothing to practice.
- Settings: how to practice (endless / timed levels), cards after each set, on-device AI, language pair, practice mode (adaptive / weak only / all in order), appearance, max words per round, level time, adaptive time, piano notes; Advanced: time tolerance, refill delay, pause refill while selected, keep practicing after everything is mastered.
- Synonyms count: if two entries share a meaning (e.g. `big` / `large` = 大的), either English card matches it.
- End-of-set review: words you mixed up are listed with their meaning.
- The level timer (timed levels) pauses while the Library is open or the app is in the background.
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

## Review logic

The scheduler lives in `js/engine.js` (plain JavaScript, no server). It is in the FSRS family, but fitted **to each learner on their own device**.

- **Memory model.** Every word has a difficulty *D*, a stability *S* (days until recall drops to 90%) and the time of the last answer. Recall probability follows the FSRS power forgetting curve. Starting weights are the published FSRS-6 defaults.
- **Automatic grades — nothing to rate.** A wrong pair (or picking the wrong partner) is *Again*; a right pair is *Hard*, *Good* or *Easy* depending on how fast you were compared with **your own** typical reaction time. A passed sentence or a correct spelling counts as a strong recall.
- **Fitted to you.** Every answer is logged on the device (the latest 2,000). From time to time, while the page is idle, three multipliers (how fast stability grows, how much a miss costs, how hard words are) are fitted to your log. With little data they stay close to the defaults.
- **Short-term steps.** A missed or brand-new word comes back after a few pairs, then a few more, before it leaves the learning stage — counted in pairs, so it works within one sitting.
- **Which word next.** Due words are picked by how close they are to being forgotten; new words only come in while the number of words still being learned is below a capacity. The target retention (80/85/90%) and the new-word pace are tuned per learner by a small bandit that rewards *memory gained per minute*, minus a penalty for strings of misses.
- **Mixed-up pairs.** When you match A with B's meaning, the pair is remembered; confused pairs and look-alike words (by spelling) are often put on the board together, so the distractors are real, not obviously wrong.
- A "day" starts at 4 am, so a late-night session still counts as today. A word can only become *mastered* across at least three separate days.
- Synonyms (same meaning or same word) are accepted as correct.
- Progress saved by older versions (boxes) is migrated once, keeping each word's due date.

`node tools/simulate.js` compares the engine with the old box system and with fixed FSRS weights on simulated fast and slow forgetters.

In **timed levels**, the same engine picks each round's words (“Max words per round” is the cap); “Weak only” takes the words you are most likely to forget, and “All in order” keeps library order.

A word counts as **new** until you have answered it once (right or wrong); just appearing on the board keeps it new. New words are introduced **your own words first** (in the order you added them, e.g. textbook order), then the built-in sample words — so an import never waits behind the demo list.

The library is meant to keep growing; you don't need to clear it. Mastered words simply come up rarely.

## Spelling and sentence cards

After each set of 25 pairs, the summary can show up to three short cards (Settings → *Cards after each set*):

- **Spelling**: type the word for its meaning; if the word has an example sentence, the word is blanked in it. Another word from your list with the same meaning also counts. On a miss you type the answer once to remember it. The result goes back into the schedule.
- **Make a sentence** (English words only): write any sentence using the word — any word order and any form (*ran*, *tubers*, *took part in*) is fine. The grammar and spelling check runs on your device (Harper, compiled to WebAssembly, plus compromise for word forms): mistakes are underlined and a suggestion applies in one tap. Only the **first** submission sets the grade, so fixing it afterwards still counts as a miss. Passed sentences are saved as *My sentences* for the word.
- **I have no idea** shows the Chinese translation of the example sentence, or sentence frames for the word's part of speech (or, with on-device AI on, a Chinese situation to write about).
- The checker downloads about 8 MB the first time and then works offline.

## On-device AI (optional)

The **On-device model** part of *Settings → AI (optional)* appears only on devices with WebGPU (recent desktop Chrome/Edge, Android Chrome, Safari on iOS 26+). It is off by default.

- **Download and turn on** fetches a small model (Qwen2.5 1.5B, about 870 MB) once from Hugging Face through WebLLM; progress is shown, an interrupted download can be continued, and **Delete** frees the storage. Afterwards it works offline.
- What it does: suggests a Chinese situation when you press *I have no idea* on a sentence card, and writes example sentences for words in the current set that have none. Each AI example must pass the grammar check and contain the word before it is saved; the library marks it as AI-generated.
- What it does **not** do: judge whether a sentence uses the word with the right meaning. We tested models up to 1.7B on 60 labelled sentences (`tools/ai-eval.html`) and none was reliable enough, so the sentence card asks you to check the meaning yourself.
- Every request has an 8-second limit; on any failure the app falls back silently to the rule-based check.

## AI with your own API key (optional)

**Settings → AI (optional) → Your own API key** works on every device (no WebGPU needed) for English–Chinese words.

- Pick a provider (DeepSeek, Qwen, Kimi, GLM, SiliconFlow, OpenAI, Claude, OpenRouter, or any OpenAI-compatible server such as a local Ollama), paste a key, and press **Save and test**. Model and base URL can stay empty to use the provider's defaults.
- With a key on, **sentence cards get a full check**: grammar still comes from the on-device checker, and the model adds whether the meaning is right — *where* the mistake is, *why* (in Chinese) and *how to fix it* (one tap to use the fix). A grammatical sentence with the wrong meaning (e.g. *water* where the word means particles in the air) stays open and counts as Again; a correct one shows a more natural version if there is one.
- **Mixed-up pairs** in the set summary get an *AI* button that explains the difference with an example for each word.
- Example sentences are filled for up to 10 words per set (instead of 3), each still checked by the grammar checker.
- The key is stored only on this device, under its own storage key: it is never in backups or exports. What you write on sentence cards is sent to the provider you chose, billed to your key. **Pause** keeps the key; **Remove key** deletes it.
- Browsers block some providers (CORS); the message says so. In the Android app every provider works.
- If both are on, the API key is used first and the on-device model is the fallback.

## Library word list

**My words** groups the list by stage, in the order that matters for practice:

1. **Learning** — just missed or still in the short steps (stability under a day); shakiest first.
2. **In review** — in spaced review, soonest due first; each row says when (*Due now*, *Tomorrow*, …).
3. **New** — in the exact order they will be introduced.
4. **Mastered** — stability of 21 days or more, reached over at least three days; occasional spot checks.

Above the list, a small chart shows how many reviews fall due in each of the next 7 days. Opening a word shows its example sentence and *My sentences*.

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

An example sentence and its translation are optional, after `|`, or as the 3rd and 4th columns of a spreadsheet paste:

```text
furor,骚动 | The decision caused a furor. | 这个决定引起了轩然大波。
```

Importing a word that is already in the library adds the example and keeps its progress. The AI prompt in *Add words* asks for examples too, and the word-list backup includes them.

## Data

No account, no server upload. Words, settings, and progress stay in the current browser.

Clearing site data, switching device/browser, or private mode can wipe local state. Back up your word list if you need it long-term.

## Known limits

- Board orientation is fixed: left = `zh` content, right = `en` content; language-pair presets only rename labels.
- Starter vocabulary is English ↔ Chinese.
- Language preference is per-device / per-browser.
- Sentence cards check grammar and spelling, not meaning: a grammatical sentence that uses the word in the wrong sense still passes. They need English on side A.
- The grammar checker can occasionally flag a correct sentence or miss a mistake; you can skip any card.
- On-device AI needs WebGPU and a one-time download of about 870 MB.

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
- **默认无限练习**：棋盘一直补词，每 25 对弹出一次小结（点 × 可以提前结束这一组）。限时关卡仍在 **设置 → 练习方式** 里。
- **个人复习引擎**：记忆模型会学习**你自己**遗忘的快慢，根据对错和反应时间自动评级，并决定下一个词（见「复习逻辑」）。
- **混淆对**：你配错过的词、词库里拼写相近的词，会被放到同一屏；每组小结列出混淆对，可以只练这几对。
- 每组结束后有**拼写卡和造句卡**（设置 →「每组后的练习卡」，0–3 张，默认 2 张）。语法检查在本机运行，任何语法正确的语序都算对。
- 每个词可以有**例句**（可选）：来自导入、你自己通过的造句，或可选的端侧 AI。
- **端侧 AI（可选，默认关闭）**：浏览器里的小模型在你没思路时给出情景，并为没有例句的词补例句。免费、不用账号、内容不出设备。
- 「我的词库」顶部显示**未来 7 天复习量**。
- **词库**分三个标签页：**我的词库**（按阶段筛选并显示数量、搜索、排序、按学习阶段分组）、**添加单词**（单个、批量、AI 提示词）、**打印导出**。
- **体验关**：第一次打开先用内置示例词玩一关（10 个词），结束后点「导入我的单词」。导入时默认勾选「移除示例词」，词库里就只剩你自己的词；取消勾选可以保留示例词。也可以在介绍卡上点「我有词表，直接导入」跳过体验关。
- 如果保留示例词，新词**先学你自己的词**（按添加顺序），示例词排在后面。
- **设置**（侧栏 / 底栏）放练习选项，改完自动保存，不常用的收在「高级选项」里。重置学习进度也在这里，需要确认，不再是主导航按钮。
- **我的词库 → 危险操作 → 清空全部词。** 词库的设计是越积越多：练习会自动混合复习旧词和学习新词，掌握的词只是出现得更少，所以平时不需要清空。只有彻底换一套词（换教材、换学期、换语言）时才用。清空前先点「复制词表备份」，之后粘贴回「批量录入」即可恢复单词（学习进度不恢复）。
- 设置：练习方式（无限练习 / 限时关卡）、每组后的练习卡、端侧 AI、语言对、练习模式（自适应 / 只练弱项 / 全量顺序）、外观、每局最多单词数、每关时间、按速度自动调时、钢琴音阶；高级：时间容错、补词延迟、选中暂停补词、全部掌握后继续循环。
- 同义词都算对：两个词条释义相同时（如 `big` / `large` = 大的），任一英文卡都能配上。
- 每组结束列出这一组混淆过的词及释义，方便回顾。
- （限时关卡）打开词库或切到后台时，本关计时自动暂停。
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

## 复习逻辑

调度器在 `js/engine.js`（纯 JavaScript，不用服务器），属于 FSRS 一族，但**在每个人自己的设备上按这个人拟合**。

- **记忆模型**：每个词有难度 *D*、稳定性 *S*（回忆概率降到 90% 所需的天数）和上次作答时间，回忆概率按 FSRS 的幂函数遗忘曲线计算。初始权重是公开的 FSRS-6 默认值。
- **自动评级，不用自己打分**：配错（包括错配到别的词）记为「忘记」；配对时按你比**自己平时**的反应时间快还是慢，记为「困难 / 良好 / 简单」。造句通过、拼写正确算作一次有力的回忆。
- **按你拟合**：每次作答都记在本机（保留最近 2000 条）。页面空闲时，会用你的记录拟合三个系数（稳定性增长快慢、答错的代价、词的难度）。记录少的时候接近默认值。
- **短期步长**：答错或刚学的词，几对之后再出现，再隔几对再出现，然后才离开「学习中」——按配对数计，所以一次练习之内就能起作用。
- **下一个出谁**：到期的词按「快忘了」的程度优先；新词只有在「学习中」的词少于容量时才加入。目标保留率（80/85/90%）和新词节奏由一个小 bandit 按人调整，奖励是「每分钟记忆增益」，连续出错会扣分。
- **混淆对**：把 A 配到 B 的释义时会记下这一对；混淆对和拼写相近的词常被放到同一屏，干扰项是真正容易混的，不是一眼就能排除的。
- 「一天」从凌晨 4 点开始，深夜练习仍算今天。一个词至少要跨三个不同的日子才能「已掌握」。
- 同义词（释义相同或同一个词）都算对。
- 旧版本（盒子）的进度会自动迁移一次，每个词的到期时间保持不变。

`node tools/simulate.js` 会在模拟的「忘得快 / 忘得慢」两类学习者上，把新引擎和旧盒子系统、固定 FSRS 权重做对比。

**限时关卡**里，每局的词也由同一个引擎挑选（上限是「每局最多单词数」）；「只练弱项」挑最可能忘的词，「全量顺序」按词库顺序。

一个词在你第一次作答（答对或答错）之前都算「新词」；只是出现在棋盘上不算。新词**先学你自己的词**（按添加顺序），示例词排在后面。词库是越积越多的，不需要清空；已掌握的词只是很少出现。

## 拼写卡和造句卡

每组 25 对结束后，小结里最多出 3 张小练习（设置 →「每组后的练习卡」）：

- **拼写**：根据释义拼出单词；有例句时会把例句里的这个词挖空。词库里释义相同的另一个词也算对。拼错后要照着答案输入一遍。结果会回写复习调度。
- **造句**（仅限 A 侧是英文的词）：用这个词写任意一句话，语序不限，任何词形都算（ran、tubers、took part in）。语法和拼写检查在本机运行（Harper 编译成 WebAssembly，加上 compromise 做词形还原）：错误会标出来，建议点一下即可替换。**只有第一次提交计入评级**，改对之后仍按答错记录。通过的句子会存为这个词的「我的例句」。
- **我没有思路**：给出例句的中文意思，或者按词性给出句型开头（开启端侧 AI 时，给一句中文情景）。
- 检查引擎第一次使用时下载约 8MB，之后可离线使用。

## 端侧 AI（可选）

**设置 → AI（可选）** 里的「端侧模型」只在支持 WebGPU 的设备上出现（较新的桌面 Chrome/Edge、Android Chrome、iOS 26 及以上的 Safari），默认关闭。

- **下载并开启**：通过 WebLLM 从 Hugging Face 下载一个小模型（Qwen2.5 1.5B，约 870MB），只需一次；显示进度，中断后可以继续下载，**删除模型**可释放空间。下载完之后离线可用。
- 它做什么：造句卡点「我没有思路」时给一句中文情景；为当前这一组里没有例句的词补例句。AI 例句必须通过语法检查、并且确实用到这个词，才会保存，词库里会标明是 AI 生成。
- 它**不**做什么：判断句子里这个词的意思用得对不对。我们用 60 条标注句子（`tools/ai-eval.html`）测试了 1.7B 以内的模型，没有一个足够可靠，所以造句卡会提醒你自己对照释义。
- 每次请求限时 8 秒，出任何问题都会静默回退到规则检查。

## 用自己的 API Key（可选）

**设置 → AI（可选）→ 用自己的 API Key** 在所有设备上可用（不需要 WebGPU），适用于英语—中文词表。

- 选服务商（DeepSeek、通义千问、Kimi、智谱 GLM、硅基流动、OpenAI、Claude、OpenRouter，或任何 OpenAI 兼容接口，比如本地 Ollama），粘贴 Key，点**保存并测试**。模型和接口地址留空就用服务商的默认值。
- 开启后，**造句卡会得到完整批改**：语法仍由本机检查器判断，模型补上意思是否正确——**错在哪**、**为什么**（中文）、**怎么改**（点一下就能用改好的句子）。语法对但意思错的句子（比如把指空气中颗粒物的词用在 water 上）不会通过，记为 Again；意思也对时，如果有更地道的说法会一并给出。
- 每组小结里的**混淆对**多了一个「AI 辨析」按钮，讲清两个词的区别，并各给一个例句。
- 每组最多为 10 个词补例句（原来是 3 个），每句仍要通过语法检查。
- Key 只保存在这台设备上，单独存放，不会进备份和导出。造句卡里写的内容会发给你选的服务商，费用从你的 Key 扣。**暂停使用**会保留 Key，**清除 Key** 会删除它。
- 浏览器会拦截部分服务商（CORS），界面会提示；安卓 App 里所有服务商都能用。
- 两种都开启时，优先用 API Key，端侧模型作为备用。

## 词库列表

「我的词库」按学习阶段分组，顺序就是练习时的优先顺序：

1. **学习中**：刚答错或仍在短期步长里（稳定性不到一天），最不稳的在前；
2. **复习中**：按间隔复习，最快到期的在前，每行会写何时到期（「待复习」「明天」……）；
3. **待学新词**：就是之后加入练习的顺序；
4. **已掌握**：稳定性达到 21 天以上，且跨过至少三天；偶尔抽查。

列表上方的小图显示未来 7 天每天的复习量。点开一个词可以看到例句和「我的例句」。阶段标签可以筛选（带数量），搜索框可搜单词或释义，排序还可以选「最近添加在前」和「按字母」。

## 批量导入

在 **词库 → 添加单词 → 批量录入**，每行一对，逗号或等号均可：

```text
apple,苹果
UNESCO = 联合国教科文组织
```

也支持 Tab（从表格 / Anki 复制）和带空格的短横线（`word - 释义`）。只按第一个分隔符拆分，释义里可以有逗号。第一段写入内部 `en` 侧，第二段写入 `zh` 侧。

例句和翻译是可选的，写在 `|` 后面，或作为表格粘贴的第 3、4 列：

```text
furor,骚动 | The decision caused a furor. | 这个决定引起了轩然大波。
```

导入词库里已有的词，会补上例句并保留学习进度。「添加单词」里的 AI 提示词也会要求生成例句，词表备份会带上例句。

## 数据说明

无需登录，不上传服务器。清理站点数据或换设备可能导致丢失，请自行备份词表。

## 已知限制

- 面板方向固定（左 `zh`、右 `en`），语言对只改标签；
- 内置词库仅英↔中；
- 语言偏好按设备/浏览器存储；
- 造句卡只检查语法和拼写，不检查意思：语法正确但词义用错的句子也会通过。造句需要 A 侧是英文；
- 语法检查偶尔会误报正确的句子，或漏掉错误；任何一张卡都可以跳过；
- 端侧 AI 需要 WebGPU，并一次性下载约 870MB。
