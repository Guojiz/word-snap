# Changelog

## Unreleased

### Changed

- **New look: the rhythm-game stage** (replaces the borrowed Duolingo palette and 3D buttons; see DESIGN.md). Indigo stage at night, lavender by day; one fixed palette (no per-set skin rotation) where each colour has one meaning — violet selected, teal correct / GREAT, gold PERFECT only, rose wrong / MISS, indigo-ink buttons; text colours meet 4.5:1; Saira Condensed (OFL, bundled) for numbers and judgements; drawn SVG icons instead of emoji; new app icon.
- **Every match is judged** PERFECT / GREAT / GOOD / MISS from the engine's reaction-time grade; the progress bar is a lane filled with each match's judgement colour; the set ends with CLEAR / FULL COMBO / TIME UP and the judgement counts, max combo, accuracy and time.
- **Phones**: navigation moved to the bottom (thumb zone); today's remaining words as the big number.
- **Settings** grouped into Learning plan / Pace / Feedback and look (+ AI); colliding and technical names rewritten; GitHub link moved into Settings.

### Fixed

- From an /impeccable critique (25/40) and simulated-learner tests: dialogs move focus in, keep the page behind inert and return focus; visible keyboard focus; screen-reader announcements and `aria-pressed` on cards; Enter no longer hijacked on the summary and intro; a wrong match highlights the right partner; deleting a word can be undone; rules-only sentence checks no longer praise; the last practice card says "Done"; 44 px close buttons; reduced motion covers every animation.

## 2026-10-07

### Added

- **Endless practice is the default.** The board keeps refilling from the review engine; a summary appears every 25 pairs (× ends a set early). Timed levels moved to *Settings → How to practice*.
- **Personal review engine** (`js/engine.js`): FSRS-6 memory model with three multipliers fitted to each learner's own answer log on the device; automatic grades from right/wrong and reaction-time percentiles (no self-rating); short learning steps counted in pairs; a Thompson-sampling bandit tunes target retention and new-word pace per learner. `tools/simulate.js` compares it with the old boxes and fixed FSRS weights.
- **Mixed-up pairs**: confused pairs and look-alike words from your list share the board; the set summary lists them and can drill just those pairs.
- **7-day review forecast** and "Due now / Tomorrow / In n days" labels in *My words*.
- **Example sentences**: import as `word,meaning | example | translation` or as 3rd/4th spreadsheet columns; re-importing an existing word adds the example and keeps progress; the AI prompt asks for examples; examples appear in the library and the backup.
- **Spelling and sentence cards** after each set (0–3, default 2). The sentence check runs on the device (Harper WebAssembly + compromise): any grammatical word order and any word form passes, suggestions apply in one tap, only the first submission sets the grade, and passed sentences are saved. *I have no idea* gives the translated example or sentence frames. Spelling blanks the example, accepts synonyms from your list, asks you to copy the answer on a miss, and updates the schedule.
- **On-device AI (optional, off by default)**: on WebGPU devices, *Settings → On-device AI* downloads Qwen2.5 1.5B (~870 MB, once) via WebLLM. It suggests a Chinese situation for *I have no idea* and writes example sentences for words without one (each must pass the grammar check). It does not judge meaning: no model up to 1.7B was reliable on `tools/ai-eval.html`. 8-second limit; any failure falls back to the rules.

- **AI with your own API key (optional)**: *Settings → AI → Your own API key* (`js/ai-api.js`) supports DeepSeek, Qwen, Kimi, GLM, SiliconFlow, OpenAI, Claude, OpenRouter and any OpenAI-compatible server. Sentence cards then also check meaning and explain mistakes in three parts (where / why / fix, fix applies in one tap; a wrong meaning counts as Again), mixed-up pairs get an *AI* explanation, and up to 10 examples per set are written. The key is stored apart from the word library and never exported; CORS failures say to try another provider or the app.
- **AI in any language pair**: prompts take the app's pair (study A, explanations in B); with a key, sentence cards also work for non-English words (the model checks grammar and meaning). **Make a list with AI** in *Add words* writes a list with examples in the import format, switching the language pair when asked. A **Use AI features** switch turns all AI off; devices under 8 GB do not offer the on-device model.

- **Daily goal and day streak** (`js/habit.js`): today's goal is the due words plus *New words per day* (Settings, default 10); a bar above the board shows what is left and about how many minutes, then **✓ Today's goal done**. The day streak (4 am cutoff) sits in the side panel; one missed day per week is bridged by a streak freeze. The old *Streak* stat is now *Combo*.

- **Word books**: *Add words → From a word book* imports the next 20–all words of zhongkao, gaokao, CET-4, CET-6, kaoyan, TOEFL, IELTS or GRE (from ECDICT, MIT; most frequent first; short meanings). Built by `tools/build-wordbooks.mjs`, loaded on demand.

- **Android app (Capacitor)**: `package.json`, `capacitor.config.json` and the generated `android/` project; `npm run build:www` copies the site into `www/`, `npm run apk:debug` builds a debug APK. API calls go through CapacitorHttp (no CORS limits). **Daily reminder** (Settings, app only) schedules a week of local notifications and drops today's once the goal is done.

- **On-device Qwen3.5 4B in the Android app**: a Capacitor plugin (`LlmPlugin.java` + JNI `llm_jni.cpp`) runs MNN's prebuilt LLM engine (3.6.1, arm64); the model downloads once from ModelScope with resume and progress. `js/ai-native.js` wraps it as the same engine as the API key, so sentence feedback, contrast, examples and word lists all work offline in any language pair. Only offered on phones with 12 GB of memory or more.

- **Focus mode** (automatic): after three answers in a row the navigation, today bar and title go away and the board glides to the centre of the screen, with a soft vignette; it returns after 10 s idle, at the end of a set, on any window, Esc, the *Exit focus* button or pointing at the edges.
- **Motion** (`js/fx.js`, Duolingo-style): progress bar with a highlight band, springy growth and a glint per match; a streak label above it from 3 in a row, with the bar turning gold / fire / violet at 5 / 10 / 20 and a star burst on milestones; a pop and a soft ripple on matched cards; set summary tiles (accuracy, time, best streak) that pop in and count up; confetti for today's goal; vibration on answers. Off in Settings or with reduced motion.

- **Fixes from simulated-learner testing** (three personas: a first-time high-school student on a phone, a Japanese learner with an API key, a long-time IELTS learner):
  - Word books open with words new at their level (IELTS no longer starts with *in, on, as*); hand-checked meanings for common polysemous words (*can* = 能；可以；罐头); no stray `\r`; place names dropped.
  - Focus mode: leaves after 60 s idle (was 10 s, testers mis-tapped when the board moved) and enters after the match ripple; no "Esc" hint on touch screens.
  - Day streak: a 🔥 badge next to the progress (grey until today's goal is done), a notice when a streak breaks (with the best streak), the streak-freeze notice survives reloads, and a "Today's goal done" banner that shows even in focus mode. Words learned today no longer count as due, so the goal does not grow while you meet it.
  - Readings: `食べる（たべる）` keeps the reading (cards, library, backup); AI word lists return kana / pinyin. A word in another script is read with its own voice; switching the language pair says how many words do not fit.
  - The trial has no countdown; the summary no longer says "goal done" and "n due" at once; the best streak counts this set only; copy no longer assumes English; the install hint never covers the board and "Got it" is remembered; contrast of the streak label and summary tiles; 日本語 / 한국어 → 中文 presets; the hint no longer wipes an AI correction.

### Changed

- Progress from the box system is migrated once, keeping each word's due date. Library stages now come from the engine (Learning: in steps or stability under a day; Mastered: stability ≥ 21 days across at least three days).

### Fixed

- Fewer false subject–verb agreement errors in sentence cards (contractions, modals, mis-tagged words such as *particulate*).
- Service worker cache bumped to `word-snap-v52`; the downloaded AI model is kept across updates.

## 2026-10-06

### Added

- **Trial level for first-time visitors.** The built-in words are a demo, not a study list: after the intro, new visitors play one 10-word trial level (“Trial level · n/10”, generous timer, not used as a pace sample). Its completion screen says the words were samples and offers **Import my words** (opens Library → Add words) or *keep practicing with the sample words for now*. The trial only ends when words are actually imported or *keep the samples* is chosen: closing the import window, ×, reloading or editing the library all return to this choice (with a reminder), so the demo words never silently become the study list. The intro also has **I have a list — import it** to skip the trial. Existing users never see it; re-opening the intro later only shows *Got it*.
- **Replace the sample words on import.** While sample words are in the library, Add words shows “Remove the N sample words when importing”, ticked by default — so the first import gives you a library of only your own words. Untick it to keep them. *My words* also has a one-click *Remove all sample words*.

### Changed

- **Library reorganised into tabs**: *My words*, *Add words*, *Print / export*. It used to be one ~7,000 px scroll in which the word list started below 900 px of practice options and the print section sat under the whole list.
- **Word list order**: grouped by learning stage — Learning (shakiest first) → In review (soonest due first) → New (in the exact order they will be introduced) → Mastered — with stage filter chips and counts, a search box, and *Newest first* / *A → Z* sorting. A newly added word was previously appended to the bottom of the list.
- **Your own words are introduced before the built-in samples** if you keep both. An imported textbook list used to wait behind ~60 untouched demo words.
- A word stays **new** until it has been answered once. Words that only appeared on the board (level left or timed out) no longer count as “learning” or jump the queue as if they had been missed.
- **Settings** is its own window (side rail / bottom nav): changes save automatically (no more “Save options” to forget — the appearance menu already behaved that way), rarely used options are under *Advanced*, and *Reset learning progress* moved here behind a confirmation instead of being a main navigation button. “Practice” in the navigation now closes any open window.

### Fixed

- The custom language-pair inputs (“Side A / Side B”) were always visible: `label { display: grid }` overrode the `hidden` attribute.
- Print / export “Most mistakes first” actually sorted by review stage first.
- The “Add to Home Screen” prompt could cover the Library on phones; it no longer appears while a window is open.
- Service worker cache bumped to `word-snap-v40`.

## 2026-10-05

### Added

- **Print / export weak words** (Library → “Print / export weak words”), with every option adjustable and remembered on this device:
  - **Which words**: weak words (seen, not mastered), words you got wrong, everything not yet mastered, all words, or pick by hand.
  - **Order**: most mistakes first, review stage, library order, A → Z, or shuffled.
  - **How many**: an optional maximum count.
  - **Sheet style**: word + meaning, hide meanings, or hide words; the hidden side becomes a blank line to write on.
  - **Columns**: number, word, meaning, mistakes, review stage, and an extra blank column.
  - **Layout**: 1 or 2 columns per page, three text sizes, an editable title, and an optional date.
  - A live preview shows the sheet as you change things. “Print / save as PDF” uses the browser’s own print dialog (works offline, on phones too); “Copy as table” copies tab-separated rows for spreadsheets or documents.
- **Listen to words** (browser text-to-speech): a speaker button on every row of the end-of-level review list (“Review the words you mixed up”) and of the Library word list reads the word aloud. The voice language follows the first side of the language pair (English, 中文, 日本語, Español, … or the script of the word itself for custom pairs); natural system voices are preferred over novelty ones. The buttons are hidden when the browser has no speech support.

### Changed

- Larger type throughout: card words 18 → 21 px (phones 15 → 18 px) with taller cards, level label, heading, timer, buttons, review list, word list, modal text, option labels and the side rail all one step bigger. Long labels on phones wrap to two lines a little earlier so they are not cut off.

## 2026-10-04

### Added

- First-visit intro: a short “how to play” card (meanings ↔ words, timed levels, missed words come back, Library / AI import). Shown once for new users; reopen it from Library → How to play. The level timer is paused while it is open.
- Library **Danger zone**: “Clear all words” moved out of the import section into a red section at the bottom, with its design purpose written next to it (the library is meant to grow; clearing is only for switching to a completely different set). The confirm dialog states the word count and that it cannot be undone. A new “Copy word list backup” button copies the list in Bulk-input format (tab-separated + `@lang`), so pasting it back restores the words.

### Fixed

- The completion / time-up screen could not be scrolled on phones (the page is locked against bounce), so a long review list was cut off. The main column now scrolls, and each new level starts scrolled to the top.

- Word text is now HTML-escaped everywhere (cards, word list, weak list, language-pair names). Imported entries like `x < y` or `<b>` no longer break the board or inject markup.
- The `×` button in the lesson bar wiped **all** learning progress without asking. It now restarts the current level; Reset / Clear progress ask for confirmation first.
- “Add one” with empty fields added a blank card. It now asks for both fields and reports duplicates.
- The level timer kept running while the Library was open or the tab/app was in the background, so editing words or switching apps cost time. It now pauses and resumes; paused time is excluded from pace and reaction-time samples.
- The library list was rebuilt four times a second by the timer tick, which could swallow clicks on Delete.
- “All in order” mode sorted by id string (`base-10` before `base-2`); it now follows library order.
- Practice mode was only switchable from a hidden side panel; it is now in Practice options.
- Removed the “Refill after N clears” option, which had no effect. “Pause refill while a card is selected” is now actually honored.
- Long words and meanings wrap to two lines instead of being cut off with “…”.
- Removed dead duplicate copies of the board functions left over from the old fixed-board version.

### Changed (learning logic)

- Synonyms count as correct: when two entries share the same meaning (or the same English word), matching either one is accepted. Previously `大的` ↔ `large` was marked wrong if the card belonged to `big`.
- **Review logic replaced with a box system (Leitner).** The old scheduler stacked six layers (weakness score, weighted random, draw balancing, recent-history down-weighting, time-based intervals, a separate mastered flag) and could not explain why a word appeared. Now each word is in box 0–5: wrong → box 0 and back next round; right *when due* → one box up. Boxes 0–2 count rounds played (1, 2, 4 rounds — a web page cannot send reminders); boxes 3–5 count calendar days (next day, 3 days, 14-day spot check; 4 am day cutoff), so a word cannot be mastered in one sitting.
- Each round's words are chosen by priority: missed words → other due words → new words (5–15, only while the “learning” pile is small) → top-up with not-due words only to reach two boards. Rounds are no longer padded to the maximum (that showed not-due words every round and undid the spacing); “Words per round” is now “Max words per round”. The chosen words are shuffled, so position never hints which words you missed; unplayed words stay due if time runs out.
- Only finishing a level advances the round counter (adding words or switching modes no longer does).
- On a wrong pair, the word being answered goes to box 0; the wrongly picked word only drops one box, at most once per level.
- Removed the “Adaptive recent history” and “Adaptive anti-repeat strength” options. Library rows show each word's stage (New / Box n/5 / Mastered) instead of draw statistics.
- Existing progress is migrated (old review level → box; old “mastered” → box 5).
- The completion screen shows pairs matched and mistakes for the level, and lists the words you mixed up with their meanings.
- Bulk import also accepts tab-separated rows and `word - meaning`, and splits only on the first separator so meanings can contain commas.
- Enter / Space continues from the completion screen.
- Service worker cache bumped to `word-snap-v34`.

## 2026-07-20

### Added

- Streak scale tones: piano-informed broken-chord ladder — each correct pair jumps up two scale degrees (thirds), five notes per group, and each new group starts one degree higher (C E G B D → D F A C E → …), starting from middle C (C4) and covering the full diatonic cycle in exactly 40 streaks before wrapping. Timbre is additive piano synthesis (8 sine partials with inharmonicity + hammer noise + natural decay); a miss plays two soft low piano notes.

### Changed

- Refill logic rewritten to copy Duolingo Match Madness exactly (verified against screen recording): each cleared pair's two holes refill fast (~0.45–0.75s) and independently — each hole takes the partner of the oldest unmatched half on the opposite column, or the next fresh word from a single deck. A left card can temporarily have no match on the right until its other half arrives at a later right hole, which makes fixed-seat tapping impossible by design and keeps the board nearly full.
- Theme palettes now derive card hover, selected, correct, wrong, track, shadow, and scrim colors from the active skin instead of stacking fixed forest-colored surfaces, so each level rotation reads as one palette.
- Wrong answers no longer queue a replay word; the pair simply stays on the board (Duo behavior).
- Background surface stays fixed on the default forest palette (`#131f24`); only accent colors (green/blue/red/yellow) rotate after each level.
- Streak piano tones are optional (Practice options → “连对时播放钢琴音阶”, default on); groups stay at 5 notes, and the last note of each group plays a same-timbre piano flourish (root + octave + soft higher partial) instead of a separate coin SFX.
- Service worker cache bumped to `word-snap-v32`.

## 2026-07-19

### Added

- Adaptive level timer: next level duration is projected from **actual clear pace** (time from level start to the last correct pair) × this queue size, with a configurable tolerance (default `0.2` / +20%). Base time is used for the first level or when adaptive is off.
- Practice options: “Adaptive level time” checkbox and “Time tolerance”.
- Progress persistence: score, mistakes, streak, round, and last-level pace are saved with words/settings under `localStorage` (`duo_like_word_match_v1`), including when installed as a PWA on the same origin.
- **Color skins:** finishes a level → rotates through 8 soft palettes (bg + accents); preference stored as `themeIndex` / `word_snap_theme_index`.

### Fixed

- Adaptive timer no longer confuses the **countdown allotment** with **actual completion time**. Pace uses `levelStartedAt` → `lastPairAt` and **completed pair count** (not the prescribed queue size when unfinished/timeout).
- Incomplete levels still update throughput (`actualWorkMs / completedPairs`); next budget = pace × next queue × (1+tol), with a small extra margin when unfinished.
- Selection no longer drops when new words refill mid-choice: refill paints **only the two new cells** (no full-grid rebuild), holds the refill timer without releasing its reservation while a card is selected/locked, and resumes after deselect/match.
- Early clear now stops the countdown: when board and queues are empty, pending refills are cancelled and completion opens instead of ticking out the allotment.
- **Duo-like refill:** after a match, only the two empty seats wait ~2s then one new word appears on both sides with a slow enter animation. Other cards stay put and stay tappable; multiple holes may refill independently. No full-column reshuffle.
- Fixed a bug where per-pair reaction resets of `roundStartedAt` corrupted level duration samples.
- English rail / panel button labels overflowing their boxes (wrap + smaller type).
- Bulk-input placeholder newlines when set via `t()`.

### Changed

- Service worker cache bumped to `word-snap-v18`.
- Default refill delay ~1.9–2.3s; board stays full while the queue has words.

## 2026-07-07

### Added

- Bilingual UI (English / 中文) with `data-en` / `data-zh` static attributes, `t()` for dynamic copy, and an **EN / 中** toggle in the rail and mobile nav.
- Locale preference key `word_snap_lang` (browser detect on first visit; not shared with main-site `guojiz.lang`).
- English metadata: `html lang="en"`, meta description, manifest `"lang": "en"`.
- Configurable **language-pair labels** in practice options (presets + custom); renames column labels and bulk placeholder only — matching fields stay `en` / `zh`.

### Changed

- Service worker cache bumped to `word-snap-v9` so installed PWAs pick up the bilingual shell.
- README rewritten with English primary section and a Chinese section; documents language toggle and language-pair usage.

## 2026-07-06

### Added

- Added full vocabulary clearing: default words can now be deleted or cleared just like custom words.
- Added an empty-library state that prompts the user to add words before practicing.
- Added practice options in the vocabulary modal:
  - level duration
  - refill batch size
  - refill delay range
  - recent-history window for adaptive selection
  - anti-repeat strength
  - pause refill while a card is selected
  - recycle mastered words after the list is stable
- Added per-word draw tracking with `draws`, `lastDrawRound`, and `drawProbability`.
- Added a visible draw count in the vocabulary list.

### Changed

- Reworked adaptive word selection using an InkCanvas-style draw history model:
  - recent words are down-weighted to avoid immediate repetition
  - under-practiced words are boosted
  - over-selected words are reduced
  - due review, weak, slow, and mistaken words still get priority
- Changed the progress bar to show current level progress instead of long-term mastery percentage.
- Changed refill behavior so new words wait while the user has a card selected, preventing selection interruptions.
- Changed completion detection so a finished level always transitions to the completion screen instead of leaving an empty board.
- Updated vocabulary management copy from "custom vocabulary" to "vocabulary" because all words are editable.

### Fixed

- Fixed default words being restored after clearing the vocabulary.
- Fixed empty word lists being treated as completed practice.
- Fixed card selection being interrupted by asynchronous refills.
- Fixed the board getting stuck empty at `8/8` after the last match.
- Fixed several two-character Chinese labels and buttons not being visually centered.
