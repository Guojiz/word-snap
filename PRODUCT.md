# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

The same site is also shipped as an Android APK (Capacitor wrapper, no Google Play). The design language is the web one; the app adds native capabilities (on-device model, local notifications, vibration), not a native look.

## Users
Primary: Chinese middle-school students preparing for 中考 / 高考, practising vocabulary on a phone in short sessions (after school, on the way home, before bed), often one-handed. They need the practice to feel like a game and a reason to come back tomorrow.

Also served, not designed for first: university students and adults preparing for CET-4/6, 考研, IELTS, TOEFL and GRE; learners of other languages (Japanese, Korean, Spanish…) using their own lists; parents or teachers who print weak-word sheets.

## Product Purpose
Learn and keep vocabulary by matching meanings to words on a board that never runs out. A personal review engine decides which word comes next, practice cards (spelling, sentences) turn recognition into use, and a daily goal with a day streak keeps the habit. Success: the learner comes back every day and the words they import stay remembered.

## Positioning
- Free, open source (MIT), no account, works offline; data stays on the device.
- The schedule is fitted to each learner on their own device (FSRS-family model with personal parameters, automatic grading from right/wrong and reaction time) instead of one global setting.
- Matching board signals that other apps lack: reaction time and which words get mixed up; mixed-up pairs come back side by side.
- Any language pair; built-in exam word books (中考 to GRE, from ECDICT); AI is optional (own API key, or Qwen3.5 4B on phones with 12 GB+).

## Operating Context
- Phone first (375–430 px wide), desktop browser second; light and dark.
- Sessions of a few minutes: a set of 25 matches, then a summary with optional spelling / sentence cards.
- Keyboard 1–0 selects cards on desktop.
- Exam word lists, dictation (默写) on paper: the app prints weak-word sheets with a blank column to fill in.
- The day changes at 4 am; a daily reminder exists in the Android app.

## Capabilities and Constraints
- Single-file web app (vocabulary-match.html) plus plain JS modules in js/; no build step; must work offline (service worker on the web, assets inside the APK).
- UI languages: 中文 (default) and English; every string goes through the i18n table.
- On-device grammar check (Harper + compromise) is English-only; meaning checks need AI.
- Terminology: 组 (a set of 25 in endless practice), 关 (a timed level), 词库 (library), 词书 (built-in word book), 今日目标 (daily goal), 连续天数 (day streak), 免断签 (streak freeze).

## Brand Commitments
None binding. The user confirmed (2026-10-10) that name, logo and visual identity may all change; keep the functions and content. The incumbent look borrows Duolingo's palette and 3D buttons and must be replaced with an identity of Word Snap's own while keeping a game feel.

## Evidence on Hand
- Open-source repository and its docs (README.md, GUIDE.md, CHANGELOG.md).
- No user testimonials, usage numbers or press; do not invent any. Comparisons with 词灵 / Duolingo are not yet approved for marketing copy.

## Product Principles
1. The board is the product: nothing may get in the way of the next match.
2. Every mistake teaches: show the right answer and bring the word back.
3. Honest feedback: never praise what was not checked.
4. Tomorrow matters more than today: the goal, the streak and the schedule are always visible and truthful.
5. Free and private by default; AI and accounts are optional extras.

## Accessibility & Inclusion
WCAG 2.1 AA contrast for all text in light and dark; full keyboard use on desktop; screen-reader announcements for selection and results; touch targets ≥ 44 px on phones; respect reduced motion.
