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
  ink-button-day: "#2f3132"
  on-ink-button-day: "#f1f0f1"
  ink-button-night: "#e2e2e3"
  on-ink-button-night: "#2f3132"
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
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  judgement:
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    letterSpacing: "0.02em"
  numeral-result:
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.05
    fontFeature: "\"tnum\""
  numeral-today:
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 0.9
  numeral-combo:
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1
  numeral-count:
    fontFamily: "\"Fredoka\", \"Nunito\", \"Varela Round\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.18
  title:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  card-word:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 800
  button:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "\"Fredoka\", \"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 900
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
- Ink controls: the primary action is an ink pill (`--primary` = inverse surface); secondary is a hairline pill. No lemon, no 3D edges.
- Colour is earned: route colours appear only on what practice made — matched cards, the lane, the combo number, the end ring, the sky. Everything else is grey and ink.
- Meaning without hue rotation: ink ring = chosen; wine ring (`--red-ink`) = wrong; a matched pair wears its route colour with ink text.
- Zero wait: Home's first frame is complete (no drop-ins, no fade-in); the sky's slow drift is decoration only.
- System faces only (Roboto / SF on Latin, PingFang / HarmonyOS Sans / MiSans on Chinese), weights 500–700, tabular figures. The rounded Fredoka face is gone (2026-11-08: "字体灾难").
- Home is one sentence of structure: date and greeting, the streak; one goal card holding the only button; then quiet rows (rank, library, add words, settings) on one translucent sheet. No tile grid, no drop-in, no colour flood on tap.
- Cards print no key numbers; keys 1–0 still pick them (2026-11-08).
- The board shows no heading (screen readers still get it) and judgements are small ink tags; the end screen is the ring and its one line, no stat tiles.

## Colors

The CSS custom properties keep their legacy names; at runtime `applyTheme()` writes them from `STAGE` (light and dark neutrals, plus marks). The set colour rotation (`COLOR_THEMES`, `themeIndex`) still advances but no longer tints anything.

### Neutral ground
- **bg / panel / panel-2 / line / line-strong / track** (frontmatter `*-day`, `*-night`): page, cards and dialogs, quiet fills, hairlines (cards use a 1px inset hairline instead of a border), the empty lane (`text` at 12%).
- **text / muted / dim**: primary text, secondary text, card number keys. Dim is at least 4.5:1 on the page in both modes.

### Ink button
- **ink-button** (`--primary`, `--on-primary`): every primary action — Home's go button, Continue, Save. A full pill, 54–56px tall, no shadow.

### Marks
- **wrong-ink** (`--red-ink`): a wrong pick's 2px ring and text, weak-word counts, destructive text. Destructive buttons fill `--red-deep` with white text.
- **ok-ink / link-ink** (`--green-ink`, `--blue-ink`): success text and link-like controls.

### Colour routes (js/routes.js)
- Each hue is drawn at a fixed OKLCH lightness per role, so the mix stays even: **card** (matched card fill; ink text ≥ 4.5:1 at every hue, tested), **bar** (lane, end ring; marks only), **text** (combo number, the "七色全齐" line; large text), **sky** (the full-screen mesh). Night uses the `*Dark` roles.
- `available(miss)` = max(2, 7 − miss); `shown(got, total, miss)` = how many have arrived; `stops()` eases gradients through OKLCH so the in-betweens stay bright.

### The sky (全屏彩)
- A fixed layer behind the app (`#sky`), soft radial blobs of the colours earned, sized to the screen and drifting slowly (18 s; still under reduced motion).
- Home: today's colours (`word_snap_today_colours_v1`, only today's sets), stronger as today's goal fills. Board: the set's earned colours, from 30% to 80% as the set goes on. End of set: full strength. Library and Settings: none.
- Blocks on Home sit on it as 84–94% white sheets so text stays clear; no backdrop blur (it would repaint every frame behind a moving sky).

### Named Rules
**The Earned Colour Rule.** Colour is only ever what practice earned today or in this set. A screen with nothing earned is grey and ink, and that is correct.

## Typography

**Display Font:** Fredoka 500–700, bundled (SIL OFL, `vendor/fonts/fredoka-latin.woff2`, one variable file, Latin subset), with "Nunito", "Varela Round", system-ui, sans-serif
**Body Font:** Fredoka for Latin, then the system Chinese stack: PingFang SC, HarmonyOS Sans SC, MiSans, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif

**Character:** one round, friendly face for every English word, number and judgement, beside the plain system Chinese face for every Chinese string. Fredoka's `unicode-range` covers Latin only, so Chinese characters fall through to the system face automatically; the two sit on one line without any per-language markup. `font-synthesis-weight: none` keeps browsers from faking weights beyond the file's 700, so CSS weights of 800 and above render as Fredoka 700 for Latin text.

### Hierarchy
- **Display** (Fredoka 700, 64px, line-height 1, +0.02em, rotated -4deg; `clamp(44px, 13vw, 64px)` on narrow screens): the result word, CLEAR / FULL COMBO / TIME UP.
- **Judgement** (Fredoka 700, 26px, +0.02em, rotated -4deg): PERFECT / GREAT / GOOD / MISS over a matched pair, with the reaction time as a 15px suffix ("0.8s").
- **Numerals** (Fredoka 700): result counts 38px tabular; today's remaining number 34px at line-height 0.9; combo count 30px with a 13px +0.08em word; trial count and streak 22px (16px count on phones). Card number keys use Fredoka 700 at 16px (14px on phones). Result line figures 20px.
- **Headline** (700, 36px, 1.18; 30px on phones): the board's instruction ("把意思和单词配成对"); 32px for the completion title.
- **Title** (700, 22px, 1.2): dialog and panel headings, drill titles.
- **Card word** (800, 21px; 18px on phones; 16px / 15px two-line clamp for long items).
- **Button** (800, 17px, 1.2).
- **Body** (400, 15px, 1.45, muted): dialog and panel copy. Today line text is 15px 800 muted.
- **Label** (900, 14px): form labels and small buttons; 12–13px 800 for stat captions, nav and tags.

### Named Rules
**The Two Faces Rule.** Fredoka sets Latin text, numerals and the judgement and result words; Chinese is always the system face. Never force Chinese into a Latin face or add a second Latin display face.

**The Roll Rule.** A number that changes in place (today's remaining, the combo, the trial count, the streak) rolls only its changed digits upward; summary figures count up instead. Numbers never jump.

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
The instrument. Every state is a colour of the world, never a new shape.
- **Shape:** 18px corners, 2px outline, 60px tall (58px on phones), card lift.
- **Layout:** a 40px key column (28px on phones) with the number key in muted Fredoka, then the word centred.
- **Default:** panel fill, line outline. **Hover:** line-strong outline, panel-soft fill. **Pressed:** 3px down, shorter shadow.
- **Selected:** sky outline, selected-bg fill, selected-ink text; `aria-pressed` mirrors it.
- **Correct:** both cards take the pair's confetti colour (`--confetti`, the next in peach → sky → lemon → mint → lilac) with ink text and its edge colour as the outline (`--confetti-edge`), a 420ms spring pulse (1.045 scale, brighter) and a ripple ring in the edge colour; then the pair fades out and the new card enters (900ms rise). Without a confetti colour the card falls back to the mint pastel and mint outline.
- **Wrong:** coral outline, wrong-bg fill, a 220ms ±7px shake, the MISS chip and a double-buzz haptic.
- **Hint:** after a miss the right partner flashes a 4px mint ring (900ms).

### Lane (progress)
- **Track:** 16px pill in track colour with five beat ticks every 20%: 3px gaps in the page background colour, so the lane reads as cut paper.
- **Fill:** springs to its width (650ms) and is painted one segment per correct match in that pair's confetti colour, in the same sequence as the cards, so a finished set is a strip of confetti. Before the first match it is peach.
- **Combo count:** from three in a row it appears above the lane's right end: Fredoka 30px number plus a 13px word ("连击"), always in text colour; milestones (5 / 10 / 20 / 50) pop and throw a few stars in the deep confetti tones (mint and sky from the start, coral added at 5, lilac at 10).
- **Beside it:** the trial count ("7/25", Fredoka 22px muted, coral ink when time is low) and the streak chip.

### Judgement Chip
A pastel sticker (pill radius, chip lift, rotated -4deg) that pops above the matched pair, centred between the two cards: Fredoka 26px word in ink plus the reaction time in `#4a4960`. Lemon for PERFECT, mint for GREAT, sky for GOOD, peach for MISS; the text is ink in both modes (at least 7:1 on each). It rises, overshoots to 1.12, holds and floats off in 520ms. It is information, so it still appears (static, 700ms) when effects are off or motion is reduced.

### Today Line and Streak Chip
- **Today line:** today's remaining words as a big rolling Fredoka number followed by a 15px muted sentence ("个词今天要练 · 约 1 分钟"); when the goal is met it turns mint ink with a check icon and pops once, with confetti and a banner pill.
- **Streak chip:** flame icon plus Fredoka number, greyscale and 75% opacity until today's goal is done, then ember.

### Result Screen
- **Result word:** CLEAR (button ink: ink by day, lemon at night), FULL COMBO (a left-to-right gradient of the wordmark colours, `#ff7a59 → #f5b800 → #2ec27e → #3b82f6 → #9b7bff`, decorative and `aria-hidden`) or TIME UP (coral ink), Fredoka 64px tilted -4deg, popping in.
- **Judgement counts:** four columns PERFECT / GREAT / GOOD / MISS, each a 15px Fredoka label on its judgement sticker colour over a 38px tabular count in text colour; the tiles rise in 90ms apart and count up.
- **Result line:** best combo, accuracy and time in one muted sentence with Fredoka 20px figures.
- **Then:** a full-width primary Continue, an optional secondary "practise the mixed-up pairs", and spelling / sentence drill cards (panel-soft, 2px line, 18px).

### Buttons
- **Shape:** 16px corners, 54px tall, min 150px wide (full width on phones).
- **Primary:** lemon fill with ink text in both modes; 17px 800, button lift. Hover brightens 3%; pressed moves 2px down and the edge flattens.
- **Secondary:** transparent with a 2px line outline and sky-ink text.
- **Danger:** coral-deep fill, white text, only inside the danger zone (a coral-outlined box).
- **Disabled:** track fill, dim text, no movement.
- **Small buttons:** 42px tall, 18px corners, line outline, sky-ink text on the ground colour.
- **Icon buttons:** 44px circles, dim icon, panel-2 on hover.

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
- **Do** keep the page near-white paper and let colour arrive as confetti: matched pairs and the lane take the next pastel in peach → sky → lemon → mint → lilac.
- **Do** give every state the same hue everywhere: sky chosen, mint correct, lemon PERFECT, coral wrong/MISS, ember lit streak.
- **Do** set text on any pastel in ink `#2b2a3d`, in day and night alike.
- **Do** use the `-ink` variant of a hue for any other text in it, and check it at 4.5:1 against the surface it sits on in both modes.
- **Do** set every numeral and every judgement or result word in Fredoka, and roll changed digits rather than replacing the number.
- **Do** make the primary action a lemon fill with ink text, with 16px corners and button lift.
- **Do** keep cards and controls at 18px corners with 2px outlines and the soft lift.
- **Do** keep touch targets at 44px or more and show the 3px sky focus ring (2px offset) for keyboard focus.
- **Do** keep the judgement word visible when motion is reduced or effects are off; drop only its motion.

### Don't:
- **Don't** use lemon or gold for anything but PERFECT among judgements and rewards: not the combo, the streak, a result word, a warning or milestone stars.
- **Don't** spread the pastels over chrome (navigation, panels, headings); confetti belongs to what the learner has matched.
- **Don't** put white or light text on a pastel, even at night.
- **Don't** use sky as a primary-action fill or for success; its only fill is a pressed state (the listen button while it speaks).
- **Don't** bring back the indigo stage or the borrowed Duolingo look: green as brand colour, 3D block buttons with hard bottom edges, a mascot cheering.
- **Don't** set Chinese text in Fredoka or any other Latin face; it has no Chinese glyphs and the system face is the design.
- **Don't** add `text-transform: uppercase` to new components; capitals belong to the judgement and result words, which are written in capitals.
- **Don't** hard-code new hex values in components; add a token with both a day and a night value first.
