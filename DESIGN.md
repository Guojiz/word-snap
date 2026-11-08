---
name: Word Snap
description: Vocabulary matching on one quiet neutral ground, where practice earns colour — each set draws a seven-colour route, every miss takes one away, and the colours earned fill the whole screen.
colors:
  bg-day: "#f9f9fa"
  panel-day: "#ffffff"
  panel-2-day: "#eeeeef"
  line-day: "#e2e2e3"
  line-strong-day: "#c2c7ca"
  track-day: "#e8e8e9"
  text-day: "#35393b"
  muted-day: "#42484a"
  dim-day: "#5f6568"
  bg-night: "#121415"
  panel-night: "#1e2021"
  panel-2-night: "#282a2b"
  line-night: "#333536"
  line-strong-night: "#4a5052"
  track-night: "#282a2b"
  text-night: "#e2e2e3"
  muted-night: "#c2c7ca"
  dim-night: "#a2a7aa"
  button: "rgba(255, 255, 255, .92)"
  on-button: "#1d1f20"
  wrong-ink-day: "#9b4052"
  wrong-ink-night: "#ffb2bc"
  ok-ink-day: "#285d2a"
  ok-ink-night: "#9bd595"
  link-ink-day: "#2f657b"
  link-ink-night: "#9acee7"
  route-card-day: "oklch(0.90 0.085 h)"
  route-card-night: "oklch(0.40 0.085 h)"
  route-bar-day: "oklch(0.74 0.20 h)"
  route-bar-night: "oklch(0.78 0.17 h)"
  route-text-day: "oklch(0.55 0.16 h)"
  route-text-night: "oklch(0.82 0.12 h)"
  route-sky-day: "oklch(0.86 0.13 h)"
  route-sky-night: "oklch(0.42 0.10 h)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", Roboto, \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "96px"
    fontWeight: 200
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", Roboto, \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", Roboto, \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", Roboto, \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  tag: "6px"
  small: "10px"
  logo: "14px"
  button: "16px"
  card: "18px"
  dialog: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  board-gap: "10px"
  md: "14px"
  lg: "18px"
  section: "20px"
  xl: "24px"
  board-column-gap: "30px"
  page-desktop: "36px"
components:
  match-card:
    backgroundColor: "{colors.paper-panel}"
    textColor: "{colors.paper-text}"
    typography: "{typography.card-word}"
    rounded: "{rounded.card}"
    height: "60px"
    padding: "0 16px 0 12px"
  match-card-night:
    backgroundColor: "{colors.night-panel}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.card}"
  match-card-selected:
    backgroundColor: "{colors.selected-bg-day}"
    textColor: "{colors.selected-ink-day}"
    rounded: "{rounded.card}"
  match-card-correct:
    backgroundColor: "{colors.confetti-peach}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  match-card-wrong:
    backgroundColor: "{colors.wrong-bg-day}"
    textColor: "{colors.wrong-ink-day}"
    rounded: "{rounded.card}"
  judge-chip:
    backgroundColor: "{colors.confetti-lemon}"
    textColor: "{colors.ink}"
    typography: "{typography.judgement}"
    rounded: "{rounded.pill}"
    padding: "2px 14px 3px"
  lane-track:
    backgroundColor: "{colors.paper-track}"
    rounded: "{rounded.pill}"
    height: "16px"
  button-primary:
    backgroundColor: "{colors.lemon-button-day}"
    textColor: "{colors.on-lemon-button-day}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "54px"
    padding: "12px 20px"
  button-primary-night:
    backgroundColor: "{colors.lemon-button-night}"
    textColor: "{colors.on-lemon-button-night}"
    rounded: "{rounded.button}"
    height: "54px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.sky-ink-day}"
    rounded: "{rounded.button}"
    height: "54px"
  button-danger:
    backgroundColor: "{colors.coral-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    height: "54px"
  button-disabled:
    backgroundColor: "{colors.paper-track}"
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.button}"
  chip-selected:
    backgroundColor: "{colors.selected-bg-day}"
    textColor: "{colors.selected-ink-day}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  input:
    backgroundColor: "{colors.paper-bg}"
    textColor: "{colors.paper-text}"
    rounded: "{rounded.card}"
    padding: "12px 13px"
  dialog:
    backgroundColor: "{colors.paper-panel}"
    textColor: "{colors.paper-text}"
    rounded: "{rounded.dialog}"
    padding: "20px"
  bottom-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.paper-muted}"
    rounded: "{rounded.card}"
    height: "52px"
---

# Design System: Word Snap

## Overview

**Creative North Star: "Earned Colour" (颜色是挣来的)** — the v9 redesign, 2026-11-08.

The app is one quiet neutral ground (iPhone 15 greys, white cards, ink text); the only colour is what practice earns. Each set draws a **colour route** of seven hues (晚霞, 极光, 糖果, 果园, 海湾, 彩虹; random direction, a small hue nudge, never the same route twice in a row). A clean set keeps all seven; every miss takes one away, never below two. The colours arrive as the set goes on: matched cards, the lane, the combo number and the end ring only ever show the colours earned so far. Home's goal card gathers today's sets, and since 2026-11-08 the maintainer's call **全屏彩** applies: the colours earned fill the whole screen behind Home and the board (the "sky"), so a day of practice literally colours the app. Library and Settings stay plain.

It replaces "Confetti Cards" (paper, five rotating confetti colours, lemon buttons, a set colour tinting the paper), whose rules no longer apply. Matching is still judged on the spot from the review engine's reaction-time grade; the combo still counts at the lane's right end.

**Key Characteristics:**
- One neutral ground, both modes (`data-color-mode`): grey page, white (night: graphite) cards, ink text.
- **The squint test**: on every screen exactly one thing is brightest, and it is the next thing to press. The button is near-white (`rgba(255,255,255,.92)`, text `#1d1f20`, 60px, no gradient, no ink or colour fill); everything else is clear glass or plain text.
- Colour is earned: route colours appear only on what practice made — matched cards, the lane, the combo number, the end ring, the sky. Everything else is grey and ink.
- Meaning without hue rotation: ink ring = chosen; wine ring (`--red-ink`) = wrong; a matched pair wears its route colour with ink text.
- Zero wait: Home's first frame is complete (no drop-ins, no fade-in); the sky's slow drift is decoration only.
- System faces only (Roboto / SF on Latin, PingFang / HarmonyOS Sans / MiSans on Chinese), tabular figures. **举重若轻** — four steps and no others: display 96/200, title 22/400, body 17/400, label 15/500 (CSS `--t-display`, `--t-title`, `--t-body`, `--t-label`). Nothing is bold; no 13–14px grey text. Fredoka is gone (2026-11-08: "字体灾难").
- Phone only (Android). Home = the settings icon and the streak, then **one glass card whose pages you swipe** (今天 · 词库 · 段位), dots below; each page has one button, at the bottom in the thumb zone. No greeting, no date, no dock.
- **Glass (`.glass`)**: panel at 40%, `backdrop-filter: blur(30px) saturate(1.15)` (no colour cast), a 1px inner highlight at 35%, a long soft shadow. Used for the Home card, the ritual cards and the folded review; never for the cards you match.
- **One thing at a time**: the end of a set is the ring (pairs in the middle), the points (34/300, claimed automatically — no claim card), one line («错 1 次 · 6/7 种颜色» or «七色全齐 · 晚霞») and one button. After it, only steps that matter come as glass cards: a rank that changed, lighting the day, the one-time reminder. The trial ends in one choice.
- Cards print no key numbers; keys 1–0 still pick them (2026-11-08).
- The board shows no heading (screen readers still get it) and judgements are small ink tags; the end screen is the ring and its one line, no stat tiles.

## Colors

The CSS custom properties keep their legacy names; at runtime `applyTheme()` writes them from `STAGE` (light and dark neutrals, plus marks). The set colour rotation (`COLOR_THEMES`, `themeIndex`) still advances but no longer tints anything.

### Neutral ground
- **bg / panel / panel-2 / line / line-strong / track** (frontmatter `*-day`, `*-night`): page, cards and dialogs, quiet fills, hairlines (cards use a 1px inset hairline instead of a border), the empty lane (`text` at 12%).
- **text / muted / dim**: primary text, secondary text, card number keys. Dim is at least 4.5:1 on the page in both modes.

### Button
- **button** (`.lg-button`, `.duo-button`): near-white `rgba(255,255,255,.92)` with `#1d1f20` text in both modes, 60px tall, full pill, a white top highlight and a soft shadow. It is the brightest thing on any screen. Secondary actions are plain text (`.lg-link`). Destructive buttons fill `--red-deep` with white text.

### Marks
- **wrong-ink** (`--red-ink`): a wrong pick's 2px ring and text, weak-word counts, destructive text. Destructive buttons fill `--red-deep` with white text.
- **ok-ink / link-ink** (`--green-ink`, `--blue-ink`): success text and link-like controls.

### Colour routes (js/routes.js)
- Each hue is drawn at a fixed OKLCH lightness per role, so the mix stays even: **card** (matched card fill; ink text ≥ 4.5:1 at every hue, tested), **bar** (lane, end ring; marks only), **text** (combo number, the "七色全齐" line; large text), **sky** (the full-screen mesh). Night uses the `*Dark` roles.
- `available(miss)` = max(2, 7 − miss); `shown(got, total, miss)` = how many have arrived; `stops()` eases gradients through OKLCH so the in-betweens stay bright.

### The sky (全屏彩)
- A fixed layer behind the app (`#sky`), soft radial blobs of the colours earned, sized to the screen and drifting slowly (18 s; still under reduced motion).
- Home: today's colours (`word_snap_today_colours_v1`, only today's sets), stronger as today's goal fills. Board: the set's earned colours, from 30% to 80% as the set goes on. End of set: full strength. Library and Settings: none.
- Glass sits on it (see Glass); the board opens at 60% and grows to 100% as the set goes on; the end screen holds it at 50%.

### Named Rules
**The Earned Colour Rule.** Colour is only ever what practice earned today or in this set. A screen with nothing earned is grey and ink, and that is correct.

## Typography

**Faces:** the system faces only — Roboto / SF on Latin, PingFang SC / HarmonyOS Sans / MiSans / Noto Sans SC on Chinese. No bundled display face.

**Scale (举重若轻):** four steps, no others.
- **Display** 96px / 200 / -0.04em — the big number on Home (words to go), the library size.
- **Title** 22px / 400 — a headline that replaces the number (goal done, setup), the book name, the rank name, ritual titles.
- **Body** 17px / 400 — every sentence, the button text (500), card words (19px / 500 on the board).
- **Label** 15px / 500 — page labels (词库, 段位), the counter, judgement tags, the ring's unit.

The end ring's number is 64/200 and the points 34/300: the only two sizes outside the scale, both inside the ring's frame.

**The No-Bold Rule.** Weight never carries hierarchy; size and colour (text vs muted) do.

## Layout

Phone first. Below 1050px the desktop rail disappears and there is no bottom bar: Home's blocks are the navigation, and the EN / 中 switch sits as a chip on Home next to the streak (appearance lives in Settings). The page gets 18px side gutters and safe-area padding top and bottom. Above 1050px a 96px left rail holds the logo tile, Home, Library, Settings, appearance and EN / 中 stacked, and the content column is centred at max 760px with 36px padding.

The practice screen is full screen and holds only two things: a top row (close icon 44px, lane, count, streak) and the board, centred in the space below with a one-line muted instruction (16px) above it. Nothing appears, hides or moves while you play; the desktop rail and today's line are not shown here. The board is a 2×5 grid filled by column: meanings on the left, words on the right, keys 1–5 and 6–0. On desktop columns are max 255px with a 10px row gap and a 30px column gap; on phones (≤640px) the columns share the width with a 10px gap and rows are 58px.

The spacing rhythm is small and even: 4 / 8 / 10 / 14 / 18 / 20 / 24px, with 54px (30px on phones) between the top row and the board.

## Elevation & Depth

Depth is soft lift plus tonal layering. Surfaces are told apart first by tone (paper, panel, panel-soft) and by 2px outlines; shadows are blurred with a negative spread so they sit under an element rather than around it, and are tinted warm by day (`rgba(80, 60, 30, .14)`) and neutral at night (`rgba(0, 0, 0, .35)`). By day a selected card's shadow is tinted sky and a wrong card's coral (22%). Pressing a card or button moves it 3px down and shortens its shadow.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 6px 16px -6px var(--card-shadow)`): match cards in every state, secondary buttons, the hint pulse base.
- **Card pressed** (`box-shadow: 0 3px 16px -6px var(--card-shadow)`): match card `:active`.
- **Button lift**: primary buttons have a 3px deeper-lemon inner bottom edge and a soft lemon glow (`inset 0 -3px 0 var(--primary-dark), 0 6px 18px -10px var(--warn-shadow)`).
- **Chip lift** (`box-shadow: 0 10px 24px -10px var(--card-shadow)`): the judgement chip; `0 10px 24px -12px` for the logo tile.
- **Dialog** (`box-shadow: 0 24px 80px rgba(0, 0, 0, .4)`): modal cards over the scrim.

### Named Rules
**The Soft Lift Rule.** Shadows are blurred, negatively spread and softly tinted. No hard offset shadows and no 3D block bottoms under buttons.

## Shapes

Generously rounded rectangles with 2px outlines throughout. Match cards, inputs, review rows, stats, weak rows, small buttons and custom-word rows use the card radius, 18px (`--radius`); dialogs and the install card are 18px too; primary buttons and side panels 16px; the logo tile, the undo toast and the danger zone 14px; intro numbers, drill sentences and toast buttons 10px; tags and forecast bars 6px. Pills (999px) are reserved for the lane, the judgement chip, filter chips, the banner and small inline controls; icon buttons and the listen button are circles. The judgement chip and the result word tilt -4deg, and the intro's two demo cards lean -3deg and 3deg like the icon; nothing else is rotated.

## Components

### Match Cards
- 80px tall, 20px corners, 10px apart, two columns filling the width; the grid sits 24px above the bottom (thumb zone). White panel with a 1px inner hairline.
- Text: the word centred, 19px / 500. No key numbers (keys 1–0 still work).
- States: chosen = 2px ink ring; matched = the route colour (`card` role) with ink text; wrong = 2px wine ring and wine text; the right answer after a miss = 2px ink ring (no green, no lift). New cards fade in over 240ms.

### Lane (progress)
- A 4px plain ink bar on a 12% track; the counter beside it is a label. No gradients: the route colours live on the cards, the sky and the end ring.

### Judgement Tag
- A small near-white pill (label size) above the matched pair: 完美 / 很好 / 不错 / 错了 in Chinese, PERFECT / GREAT / GOOD / MISS in English, with the reaction time at 60%.

### Combo
- From three in a row, above the lane's right end: a 22/300 number and the 15px word, ink and muted. Milestones still pop.

### Home Card
- One glass card, pages swiped left/right with scroll snap (今天 · 词库 · 段位; 段位 only once the rank exists); dots below. Each page: a label, its one fact at display or title size, at most one body line, one button at the bottom. Settings is the icon top-left; the streak is top-right (body size, muted until today is lit).

### Result Screen
- The ring (200px, 10px stroke, the route's earned colours; a clean set's ring has a light running round it), the pairs inside (64/200 over the label «对»), the points under it (34/300, counted up), one body line, one button. The mixed-up words wait in a folded glass row. No stat tiles, no title, no paragraph.

### Buttons
- See Colors → Button. One button per screen; anything else is plain text.

### Chips and Tabs
- **Filter chips:** 36px pills, line outline, muted text with a bold count; pressed state is sky outline on selected-bg.
- **Dialog tabs:** sticky tab bar; the selected tab gets a line outline, panel-soft fill and ink-colour text, and is joined to the content below.

### Inputs / Fields
- **Style:** 2px line outline, 18px corners, ground-colour fill, 12px × 13px padding; labels sit above in 14px heavy muted text.
- **Focus:** sky border and caret, plus the 3px sky focus ring for keyboard focus.

### Dialogs
Library, Settings and the intro open as centred cards (max 720px wide, 18px corners, panel fill, dialog shadow) over the scrim, with 20px sections divided by 2px lines. The intro's demo shows the icon's two cards: a peach meaning and a sky word in ink, leaning towards each other.

### Undo Toast
After a delete, a 14px-cornered toast centred above the bottom edge: lemon fill with ink text, and an Undo button inverted (on-ink fill, ink text, 10px corners, 40px tall).

### Navigation
- **Screens, not one page.** Home, Practice and Onboarding are screens; Library and Settings are overlays on the current screen. `js/shell.js` keeps them in one stack backed by browser history, so the in-app back controls, the browser back button and the Android back gesture all walk the same steps (dialog, page, set, onboarding step). At the root, Android back puts the app in the background instead of closing it.
- **Phones (≤1050px):** no tab bar. Home is the menu; Library and Settings open from its blocks as full pages (30px title, a close button top right; Library's sections become a segmented control), and opened from a set they stay bottom sheets. Close, Back and the Android back gesture return to where they were opened from.
- **Desktop:** a 96px rail with the 48px logo tile and 60px-wide stacked icon-over-label buttons (Home, Library, Settings, appearance, EN / 中); active and hover get a line outline and panel-soft fill.
- **Safe areas:** the page is drawn edge to edge (`viewport-fit=cover`, Android `EdgeToEdge`); `--sat` / `--sab` take the larger of `env(safe-area-inset-*)` and Capacitor's injected `--safe-area-inset-*`, and every bar and page pads with them.

### Onboarding
Three steps, each one question with one primary button pinned at the bottom: the word book (2-column cards with word counts, skeletons while the list loads, plus "just try the sample words"), new words a day (5 / 10 / 20 / 30; a grid of 30 little cards fills with confetti colours to show the choice) and a reminder time (Android only; the web says it needs the app). Segmented progress at the top, Back from step 2, Skip always. Finishing imports the book's first words and lands on Home; Skip also lands on Home, offering the sample set. Nobody is dropped onto the board: the first set starts from Home's big button. Setup shows until it is finished or skipped.

### Home
See Components → Home Card. One card, swiped; nothing else on the screen but the settings icon and the streak.

### Dialogs
Library, Settings and the intro open as centred cards (max 720px wide, 18px corners, panel fill, dialog shadow) over the scrim, with 20px sections divided by 2px lines. The intro's demo shows the icon's two cards: a peach meaning and a sky word in ink, leaning towards each other.

### Undo Toast
After a delete, a 14px-cornered toast centred above the bottom edge: lemon fill with ink text, and an Undo button inverted (on-ink fill, ink text, 10px corners, 40px tall).

### Navigation
- **Screens, not one page.** Home, Practice and Onboarding are screens; Library and Settings are overlays on the current screen. `js/shell.js` keeps them in one stack backed by browser history, so the in-app back controls, the browser back button and the Android back gesture all walk the same steps (dialog, page, set, onboarding step). At the root, Android back puts the app in the background instead of closing it.
- **Phones (≤1050px):** no tab bar. Home is the menu; Library and Settings open from its blocks as full pages (30px title, a close button top right; Library's sections become a segmented control), and opened from a set they stay bottom sheets. Close, Back and the Android back gesture return to where they were opened from.
- **Desktop:** a 96px rail with the 48px logo tile and 60px-wide stacked icon-over-label buttons (Home, Library, Settings, appearance, EN / 中); active and hover get a line outline and panel-soft fill.
- **Safe areas:** the page is drawn edge to edge (`viewport-fit=cover`, Android `EdgeToEdge`); `--sat` / `--sab` take the larger of `env(safe-area-inset-*)` and Capacitor's injected `--safe-area-inset-*`, and every bar and page pads with them.

### Onboarding
Three steps, each one question with one primary button pinned at the bottom: the word book (2-column cards with word counts, skeletons while the list loads, plus "just try the sample words"), new words a day (5 / 10 / 20 / 30; a grid of 30 little cards fills with confetti colours to show the choice) and a reminder time (Android only; the web says it needs the app). Segmented progress at the top, Back from step 2, Skip always. Finishing imports the book's first words and lands on Home; Skip also lands on Home, offering the sample set. Nobody is dropped onto the board: the first set starts from Home's big button. Setup shows until it is finished or skipped.

### Home
Every launch opens on Home, and Home is a menu of four colour blocks, each with real content, so one tap does what you came for. Under the wordmark (and the EN / 中 and streak chips) the blocks sit in the middle of the screen in a 2-column grid, 12px apart, each 28px-cornered, ink text on a confetti colour, tilted a degree or two like cards dropped on a table:
- **Today** (full width, the set colour): a small line (today's practice / done so far), today's words still to do as a 64px Fredoka number (a check when the goal is met), what is due and how long, the start / continue / resume label with an arrow, and a progress bar along its foot that fills as the day's words get done. First run it says "Welcome to Word Snap" in 28px and opens the three setup steps instead.
- **Library** (tall, left): the word book's name, then its word count as a 44px number at the foot and how many are mastered. Opens Library.
- **Add words**: opens Library on the add tab (paste a list or import a book).
- **Settings**: goal, reminders, look.

The other three blocks take the next confetti colours after the set colour, so the menu changes colour with each set. Blocks grow with the screen height (Today 196–260px, the small ones 96–150px) so a tall phone is filled, not left with a small island. They drop in one after another with a spring; pressed they straighten and shrink to 96%. Tapping one floods its colour from where it sits to fill the screen (420ms), the destination opens underneath and the colour fades away (360ms); under reduced motion the destination just opens. Leaving a set from its close button, Back or Esc pauses it and returns here; Today resumes it.

### Dialogs
Centred cards on desktop; on phones (≤640px) bottom sheets: full width, 22px top corners, rising 40px over 320ms (none under reduced motion). The welcome sheet keeps its two choices pinned at the bottom while the steps scroll.

### Board sizing
Card labels wrap to two lines (smaller type) when they would not fit the card at the current board width, never cut off with "…". Above 1200 × 760 the board grows to 310px columns, 70px cards and 23px words.

### Motion
One easing for state (`cubic-bezier(.2, .8, .2, 1)`) and one spring for rewards (`cubic-bezier(.34, 1.56, .64, 1)`). Card and button feedback is 90ms; theme changes cross-fade over 420ms. Rewards scale with meaning: every match gets a judgement and a ripple; milestones get a pop and stars; today's goal gets confetti and a banner. Screens change with the View Transitions API: forward lifts the new screen 32px into place and fades it in while the old one sinks to 96.5% and fades out; back plays it in reverse (380ms, the state easing). Without the API the entering screen plays the same entrance. All effects run in one pointer-transparent layer and are skipped when the system asks for reduced motion or the learner turns effects off. Under `prefers-reduced-motion: reduce` a global rule also collapses every CSS animation and transition to 0.01ms; the judgement word and the banner still appear, static.

## Do's and Don'ts

### Do:
- **Do** pass the squint test on every screen: one brightest thing, and it is the next thing to press.
- **Do** keep colour to what practice earned: matched cards, the sky, the end ring.
- **Do** use the four type steps only (display 96/200, title 22/400, body 17/400, label 15/500).
- **Do** put the one button at the bottom of its glass card, in the thumb zone.
- **Do** guide one step at a time: fold or defer anything that is not this step.
- **Do** keep touch targets at 44px or more and a visible focus ring.

### Don't:
- **Don't** fill a button with ink or colour; the button is near-white glass.
- **Don't** put rainbow gradients on the lane, text or chrome.
- **Don't** say the same thing twice on one screen (a headline, a tick and a "done" unit are one message).
- **Don't** offer a second choice where one will do, or let an unfinished step be skipped.
- **Don't** add decoration that says nothing (greetings, dates, stat tiles).
- **Don't** use bold, the Fredoka face, key numbers on cards, or 13–14px grey text.
