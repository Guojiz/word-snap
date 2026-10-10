---
name: Word Snap
description: Vocabulary matching judged like a rhythm game, on an indigo stage by night and a lavender stage by day.
colors:
  stage-bg: "#24205a"
  stage-panel: "#2f2a6e"
  stage-panel-2: "#29246a"
  stage-panel-soft: "#2b2666"
  stage-line: "#463f8f"
  stage-line-strong: "#6a62b5"
  stage-track: "#40358e"
  stage-text: "#f3f1ff"
  stage-muted: "#b8b2e8"
  stage-dim: "#9690d6"
  day-bg: "#f5f3ff"
  day-panel: "#ffffff"
  day-panel-2: "#ece8ff"
  day-panel-soft: "#fbfaff"
  day-line: "#dcd6fb"
  day-line-strong: "#b7aeef"
  day-track: "#ede8ff"
  day-text: "#1d1a4a"
  day-muted: "#514b88"
  day-dim: "#6c66a6"
  ink-button-stage: "#c9c1ff"
  ink-button-stage-deep: "#a99cff"
  on-ink-button-stage: "#24205a"
  ink-button-day: "#2b2470"
  ink-button-day-deep: "#1d1856"
  on-ink-button-day: "#ffffff"
  violet: "#7c5cff"
  violet-deep: "#6545e6"
  violet-ink-stage: "#b9a8ff"
  violet-ink-day: "#5a3fe0"
  selected-bg-stage: "#483a9c"
  selected-bg-day: "#f2efff"
  selected-ink-stage: "#f3f1ff"
  selected-ink-day: "#2b1d8f"
  teal: "#18c6b5"
  teal-deep: "#0e9c8f"
  teal-ink-stage: "#5ef0e2"
  teal-ink-day: "#0a7a70"
  correct-bg-stage: "#294f7f"
  correct-bg-day: "#e3f8f6"
  correct-ink-stage: "#dffcf8"
  correct-ink-day: "#075e56"
  gold: "#ffc933"
  gold-ink-stage: "#ffd666"
  gold-ink-day: "#8a5a00"
  leaf: "#7ad151"
  leaf-ink-stage: "#8fe36a"
  leaf-ink-day: "#2b7a2f"
  rose: "#ff5c8a"
  rose-deep: "#c9285a"
  rose-ink-stage: "#ff8fb0"
  rose-ink-day: "#c0245a"
  wrong-bg-stage: "#613675"
  wrong-bg-day: "#ffeff3"
  wrong-ink-stage: "#ffe4ec"
  wrong-ink-day: "#8c1840"
  ember-ink-stage: "#ffa45c"
  ember-ink-day: "#b4530f"
  scrim-stage: "rgba(8, 6, 32, 0.72)"
  scrim-day: "rgba(29, 26, 74, 0.45)"
typography:
  display:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  judgement:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "0.02em"
  numeral-result:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "38px"
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: "\"tnum\""
  numeral-today:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 0.9
  numeral-combo:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
  numeral-count:
    fontFamily: "\"Saira Condensed\", \"Arial Narrow\", sans-serif"
    fontSize: "22px"
    fontWeight: 800
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.18
  title:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  card-word:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 800
  button:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 1000
    lineHeight: 1.15
  body:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "\"PingFang SC\", \"HarmonyOS Sans SC\", \"MiSans\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 900
rounded:
  tag: "6px"
  small: "10px"
  judge: "12px"
  card: "14px"
  button: "16px"
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
    backgroundColor: "{colors.stage-panel}"
    textColor: "{colors.stage-text}"
    typography: "{typography.card-word}"
    rounded: "{rounded.card}"
    height: "60px"
    padding: "0 16px 0 12px"
  match-card-day:
    backgroundColor: "{colors.day-panel}"
    textColor: "{colors.day-text}"
    rounded: "{rounded.card}"
  match-card-selected:
    backgroundColor: "{colors.selected-bg-stage}"
    textColor: "{colors.selected-ink-stage}"
    rounded: "{rounded.card}"
  match-card-correct:
    backgroundColor: "{colors.correct-bg-stage}"
    textColor: "{colors.correct-ink-stage}"
    rounded: "{rounded.card}"
  match-card-wrong:
    backgroundColor: "{colors.wrong-bg-stage}"
    textColor: "{colors.wrong-ink-stage}"
    rounded: "{rounded.card}"
  judge-chip:
    backgroundColor: "{colors.stage-panel}"
    textColor: "{colors.gold-ink-stage}"
    typography: "{typography.judgement}"
    rounded: "{rounded.judge}"
    padding: "0 10px"
  lane-track:
    backgroundColor: "{colors.stage-track}"
    rounded: "{rounded.pill}"
    height: "16px"
  button-primary:
    backgroundColor: "{colors.ink-button-stage}"
    textColor: "{colors.on-ink-button-stage}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "54px"
    padding: "0 18px"
  button-primary-day:
    backgroundColor: "{colors.ink-button-day}"
    textColor: "{colors.on-ink-button-day}"
    rounded: "{rounded.button}"
    height: "54px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.violet-ink-stage}"
    rounded: "{rounded.button}"
    height: "54px"
  button-danger:
    backgroundColor: "{colors.rose-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    height: "54px"
  button-disabled:
    backgroundColor: "{colors.stage-track}"
    textColor: "{colors.stage-dim}"
    rounded: "{rounded.button}"
  stage-chip-selected:
    backgroundColor: "{colors.selected-bg-stage}"
    textColor: "{colors.selected-ink-stage}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  input:
    backgroundColor: "{colors.stage-bg}"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.card}"
    padding: "12px 13px"
  dialog:
    backgroundColor: "{colors.stage-panel}"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.dialog}"
    padding: "20px"
  bottom-nav-item:
    backgroundColor: "{colors.stage-panel-soft}"
    textColor: "{colors.stage-muted}"
    rounded: "{rounded.card}"
    height: "44px"
---

# Design System: Word Snap

## Overview

**Creative North Star: "The Rhythm Stage"**

Every match is a note landing on a rhythm-game stage. The learner taps a meaning and a word; the pair is judged on the spot (PERFECT, GREAT, GOOD or MISS) from the review engine's own reaction-time grade, the lane at the top fills one judged segment per match, the combo counts up at the lane's right end, and the number of words left today rolls down towards zero. At night the stage is a deep indigo room; by day it is lavender with white cards. The atmosphere comes from the judgement words and the lane, not from decoration.

The surface is dense and quiet so the board can be loud only when a match lands. One condensed face (Saira Condensed) carries every judgement and every numeral; all running text and every Chinese string stays in the system Chinese face. Colours are states, not decoration: each hue has one meaning everywhere in the app. The look deliberately replaces a borrowed Duolingo arrangement (green, 3D block buttons, mascot cheer): there are no block buttons, no mascot and no green-as-brand.

**Key Characteristics:**
- Two stages, one world: indigo stage (dark) and lavender day (light), switched by `data-color-mode`, same roles in both.
- Hue = meaning: violet chosen, teal correct/GREAT, gold PERFECT, leaf GOOD, rose wrong/MISS, ember a lit day streak.
- Indigo-ink buttons, not coloured buttons: the primary action is the stage's own ink (lavender on indigo, indigo on lavender).
- Saira Condensed for scoreboard material only (numerals, judgements, result words), rolling digit by digit.
- Soft lifted cards, 14px corners, 2px outlines; no hard offset shadows.

## Colors

A violet-indigo neutral family carries the whole surface; five saturated state hues sit on it, each with an `-ink` variant tuned for text in each mode.

The CSS custom properties keep legacy names from the previous look. The mapping is fixed: `--blue*` is **violet**, `--green*` is **teal**, `--yellow*` is **gold**, `--red*` is **rose**, `--primary*` is **ink-button**, `--good` / `--good-ink` is **leaf**, `--ember-ink` is **ember**. The `:root` blocks hold pre-JS fallbacks; at runtime `applyTheme()` writes the tokens onto `<html>` from the `STAGE` object and mixes the derived surfaces (panel-soft, track, selected/correct/wrong backgrounds, hover) from the base hues. Those runtime values are the ones recorded in the frontmatter. Leaf and ember are not in `STAGE`; their stage and day values come straight from the `:root` blocks.

### Primary
- **Stage Ink Button** (ink-button-stage / ink-button-day): the fill of every primary action (Continue, Save, Start), the desktop logo tile, the intro step numbers, the banner pill, the empty lane and the CLEAR result word. On the indigo stage it is a pale lavender with indigo text; on the lavender day it is deep indigo with white text. It is also the active colour of navigation, of the selected library tab and of the chosen language in the EN / 中 toggle, and the fill of the undo toast (on-ink text, with an inverted Undo button).

### Secondary
- **Chosen Violet** (violet, violet-deep, violet-ink-*): the selected card's 2px outline, the pressed state of filter chips, the keyboard focus ring, the focused-input border and caret, checkbox accents, text selection (28% violet). Violet ink is the text colour of secondary buttons, small buttons and link-like controls.

### Tertiary (state hues)
- **Correct Teal** (teal, teal-deep, teal-ink-*, correct-*): a correct match's outline and tinted background, the GREAT judgement, the FULL COMBO result word, the ripple around a GREAT pair, "today done", mastered tags, forecast bars, and with ember and rose the milestone stars and confetti.
- **Perfect Gold** (gold, gold-ink-*): the PERFECT judgement word, PERFECT segments of the lane and the ripple around a PERFECT pair. Nothing else.
- **Good Leaf** (leaf, leaf-ink-*): the GOOD judgement word, GOOD segments of the lane and the ripple around a GOOD pair; leaf also appears in confetti.
- **Miss Rose** (rose, rose-deep, rose-ink-*, wrong-*): a wrong match's outline, tint and shake, the MISS judgement, TIME UP, the low-time countdown, weak-word counts, review headings, sentence errors, the danger zone and destructive buttons (rose-deep fill, white text).
- **Ember** (ember-ink-*): the day-streak flame and number once today's goal is done. Before that the chip is greyscale at 75% opacity.

### Neutral
- **Stage Indigo** (stage-bg) and **Lavender Day** (day-bg): the page ground, the bottom navigation bar, inputs and the browser `theme-color`.
- **Panel** (stage-panel / day-panel): cards, dialogs and the judgement chip. White in day, raised indigo on stage.
- **Panel Soft / Panel 2** (stage-panel-soft, stage-panel-2 and day equivalents): side panels, review rows, drills, hovered cards, icon-button hover.
- **Line / Line Strong** (stage-line, stage-line-strong and day equivalents): every 2px outline and divider; line-strong on hover and for the scrollbar.
- **Track** (stage-track / day-track): the empty part of the lane and disabled buttons.
- **Text / Muted / Dim** (stage-text, stage-muted, stage-dim and day equivalents): primary text, secondary text, and tertiary marks such as card number keys and the quit icon.
- **Scrim** (scrim-stage / scrim-day): behind dialogs.

### Named Rules
**The One Gold Rule.** Gold means PERFECT and nothing else. Result words, the combo count, the streak, milestone stars and confetti never turn gold; CLEAR is ink, FULL COMBO is teal, TIME UP is rose, the lit streak is ember.

**The Chosen Violet Rule.** Violet marks what the learner has chosen or where the keyboard is: the selected card, a pressed filter, the focus ring. It is never a fill for a primary action and never a success colour.

**The Ink Variant Rule.** Base hues are for outlines, fills and segments; anything read as text uses the matching `-ink` variant for the current mode, which is what holds the 4.5:1 contrast.

## Typography

**Display Font:** Saira Condensed 700 / 800, bundled (OFL, `vendor/fonts`), with "Arial Narrow", sans-serif
**Body Font:** system Chinese stack: PingFang SC, HarmonyOS Sans SC, MiSans, Noto Sans SC, Microsoft YaHei, system-ui, sans-serif

**Character:** a tall, narrow scoreboard face for numbers and judgements beside a plain, heavy system Chinese face for everything a student reads. The contrast is the game: words are read, numbers are scored.

### Hierarchy
- **Display** (Saira 800, 64px, line-height 1, +0.02em, rotated -4deg): the result word, CLEAR / FULL COMBO / TIME UP.
- **Judgement** (Saira 800, 26px, +0.02em, rotated -4deg): PERFECT / GREAT / GOOD / MISS over a matched pair, with the reaction time as a 15px muted suffix ("0.8s").
- **Numerals** (Saira 800): result counts 38px tabular; today's remaining number 34px at line-height 0.9; combo count 30px with a 13px +0.08em word; trial count and streak 22px (16px count on phones). Card number keys use Saira 700 at 16px (14px on phones). Result line figures 20px.
- **Headline** (system 700, 36px, 1.18; 30px on phones): the board's instruction ("把意思和单词配成对"); 32px for the completion title.
- **Title** (system 700, 22px, 1.2): dialog and panel headings, drill titles.
- **Card word** (system 800, 21px; 18px on phones; 16px / 15px two-line clamp for long items).
- **Button** (system 1000, 17px, 1.15).
- **Body** (system 400, 15px, 1.45, muted): dialog and panel copy. Today line text is 15px 800 muted.
- **Label** (system 900, 14px): form labels and small buttons; 12–13px 800 for stat captions, nav and tags.

### Named Rules
**The Scoreboard Rule.** Saira Condensed is for numerals and the English judgement and result words only. Chinese text, sentences and buttons are never set in it.

**The Roll Rule.** A number that changes in place (today's remaining, the combo, the trial count, the streak) rolls only its changed digits upward; summary figures count up instead. Numbers never jump.

## Layout

Phone first. Below 1050px the desktop rail disappears and navigation becomes a fixed bottom bar of five equal buttons (Practice, Library, Settings, Appearance, EN / 中) with a 1px top line, 8px gap and safe-area padding; the page gets 18px side gutters and 96px of bottom room for the bar. Above 1050px a 96px left rail holds the logo tile and the same controls stacked, and the content column is centred at max 760px with 36px padding.

The practice view is one column: a top row (quit icon 44px, lane, count, streak), today's line beneath it, the instruction headline, then the board. The board is a 2×5 grid filled by column: meanings on the left, words on the right, keys 1–5 and 6–0. On desktop columns are max 255px with a 10px row gap and a 30px column gap; on phones (≤640px) the columns share the width with a 10px gap and rows are 58px. In focus mode (after three answers in a row) everything but the lane and board is hidden and the board glides to the vertical centre.

The spacing rhythm is small and even: 4 / 8 / 10 / 14 / 18 / 20 / 24px, with 54px (30px on phones) between the top row and the board.

## Elevation & Depth

Depth is soft lift plus tonal layering. Surfaces are told apart first by tone (ground, panel, panel-soft) and by 2px outlines; shadows are blurred with a negative spread so they sit under an element rather than around it, and are tinted with the stage's indigo (`rgba(5, 3, 30, .55)` on stage, `rgba(36, 32, 90, .16)` by day). Pressing a card or button moves it 3px down and shortens its shadow. In focus mode a faint radial vignette (20% indigo at the edges) closes in around the board.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 6px 16px -6px var(--card-shadow)`): match cards in every state, secondary buttons, the hint pulse base.
- **Card pressed** (`box-shadow: 0 3px 16px -6px var(--card-shadow)`): match card `:active`.
- **Button lift** (`box-shadow: 0 4px 18px -8px var(--card-shadow)`): primary buttons and small primary actions.
- **Chip lift** (`box-shadow: 0 10px 24px -8px var(--card-shadow)`): the judgement chip; `0 10px 24px -10px` for the logo tile.
- **Dialog** (`box-shadow: 0 24px 80px rgba(0, 0, 0, .4)`): modal cards over the scrim.

### Named Rules
**The Soft Lift Rule.** Shadows are blurred, negatively spread and indigo-tinted. No hard offset shadows and no 3D block bottoms under buttons.

## Shapes

Gently rounded rectangles with 2px outlines throughout. Match cards, inputs, review rows, stats and small buttons use 14px; primary buttons and side panels 16px; dialogs and the install card 18px; the judgement chip 12px; intro numbers, drill sentences and toast buttons 10px; tags and forecast bars 6px. Pills (999px) are reserved for the lane, filter chips, the banner and small inline controls; icon buttons and the listen button are circles. The judgement chip and the result word tilt -4deg, the only rotated elements.

## Components

### Match Cards
The instrument. Every state is a colour of the world, never a new shape.
- **Shape:** 14px corners, 2px outline, 60px tall (58px on phones), card lift.
- **Layout:** a 40px key column (28px on phones) with the number key in muted Saira, then the word centred.
- **Default:** panel fill, line outline. **Hover:** line-strong outline, panel-soft fill. **Pressed:** 3px down, shorter shadow.
- **Selected:** violet outline, selected-bg fill, selected-ink text; `aria-pressed` mirrors it.
- **Correct:** teal outline, correct-bg fill, a 420ms spring pulse (1.045 scale, brighter), a ripple ring in the match's judgement colour (gold, teal or leaf); then the pair fades out and the new card enters (900ms rise).
- **Wrong:** rose outline, wrong-bg fill, a 220ms ±7px shake, the MISS chip and a double-buzz haptic.
- **Hint:** after a miss the right partner flashes a 4px teal ring (900ms).

### Lane (progress)
- **Track:** 16px pill in track colour with five beat ticks (white 55%, every 20%).
- **Fill:** springs to its width (650ms) and is painted one segment per correct match in its judgement colour: gold PERFECT, teal GREAT, leaf GOOD. Before the first match it is ink.
- **Combo count:** from three in a row it appears above the lane's right end: Saira 30px number plus a 13px word ("连击"), always in text colour; milestones (5 / 10 / 20 / 50) pop and throw a few stars in teal, ember and rose.
- **Beside it:** the trial count ("7/25", Saira 22px muted, rose when time is low) and the streak chip.

### Judgement Chip
A panel-coloured chip (12px corners, chip lift) that pops above the matched pair, centred between the two cards: Saira 26px word in its ink colour plus the reaction time. It rises, overshoots to 1.12, holds and floats off in 520ms. It is information, so it still appears (static, 700ms) when effects are off or motion is reduced.

### Today Line and Streak Chip
- **Today line:** today's remaining words as a big rolling Saira number followed by a 15px muted sentence ("个词今天要练 · 约 1 分钟"); when the goal is met it turns teal with a check icon and pops once, with confetti and a banner pill.
- **Streak chip:** flame icon plus Saira number, greyscale and 75% opacity until today's goal is done, then ember.

### Result Screen
- **Result word:** CLEAR (ink), FULL COMBO (teal) or TIME UP (rose), Saira 64px tilted -4deg, popping in.
- **Judgement counts:** four columns PERFECT / GREAT / GOOD / MISS, each a 15px judgement-coloured Saira label over a 38px tabular count in text colour; the tiles rise in 90ms apart and count up.
- **Result line:** best combo, accuracy and time in one muted sentence with Saira 20px figures.
- **Then:** a full-width primary Continue, an optional secondary "practise the mixed-up pairs", and spelling / sentence drill cards (panel-soft, 2px line, 14px).

### Buttons
- **Shape:** 16px corners, 54px tall, min 150px wide (full width on phones).
- **Primary:** ink-button fill, on-ink text, 17px heavy system face, button lift. Hover brightens 3%; pressed moves 3px down.
- **Secondary:** transparent with a 2px line outline and violet-ink text.
- **Danger:** rose-deep fill, white text, only inside the danger zone (a rose-outlined box).
- **Disabled:** track fill, dim text, no movement.
- **Small buttons:** 42px tall, 14px corners, line outline, violet-ink text on the ground colour.
- **Icon buttons:** 44px circles, dim icon, panel-2 on hover.

### Chips and Tabs
- **Filter chips:** 36px pills, line outline, muted text with a bold count; pressed state is violet outline on selected-bg.
- **Dialog tabs:** sticky tab bar; the selected tab gets a line outline, panel-soft fill and ink-colour text, and is joined to the content below.

### Inputs / Fields
- **Style:** 2px line outline, 14px corners, ground-colour fill, 12px × 13px padding; labels sit above in 14px heavy muted text.
- **Focus:** violet border and caret, plus the 3px violet focus ring for keyboard focus.

### Dialogs
Library, Settings and the intro open as centred cards (max 720px wide, 18px corners, panel fill, dialog shadow) over the scrim, with 20px sections divided by 2px lines.

### Undo Toast
After a delete, a 14px-cornered toast centred above the bottom edge: ink-button fill with on-ink text, and an Undo button inverted (on-ink fill, ink text, 10px corners, 40px tall).

### Navigation
- **Phones (≤1050px):** fixed bottom bar on the ground colour; five equal 44px buttons with line outline, panel-soft fill and 13px muted text; the active one takes the ink colour and carries `aria-current="page"`.
- **Desktop:** a 96px rail with the logo tile (ink fill, "W", 14px corners) and 60px-wide stacked buttons; active and hover get a line outline and panel-soft fill.

### Motion
One easing for state (`cubic-bezier(.2, .8, .2, 1)`) and one spring for rewards (`cubic-bezier(.34, 1.56, .64, 1)`). Card and button feedback is 90ms; theme changes cross-fade over 420ms. Rewards scale with meaning: every match gets a judgement and a ripple; milestones get a pop and stars; today's goal gets confetti and a banner. All effects run in one pointer-transparent layer and are skipped when the system asks for reduced motion or the learner turns effects off. Under `prefers-reduced-motion: reduce` a global rule also collapses every CSS animation and transition to 0.01ms; the judgement word and the banner still appear, static.

## Do's and Don'ts

### Do:
- **Do** give every state the same hue everywhere: violet chosen, teal correct/GREAT, gold PERFECT, leaf GOOD, rose wrong/MISS, ember lit streak.
- **Do** use the `-ink` variant of a hue for any text in it, and check it at 4.5:1 against the surface it sits on in both modes.
- **Do** set every numeral and every judgement or result word in Saira Condensed, and roll changed digits rather than replacing the number.
- **Do** make the primary action an ink-button fill (lavender on stage, indigo by day) with 16px corners and button lift.
- **Do** keep cards and controls at 14px corners with 2px outlines and the soft indigo-tinted lift.
- **Do** keep touch targets at 44px or more and show the 3px violet focus ring (2px offset) for keyboard focus.
- **Do** keep the judgement word visible when motion is reduced or effects are off; drop only its motion.

### Don't:
- **Don't** use gold for anything but PERFECT: not the combo, the streak, a result word, a warning or a celebration ripple.
- **Don't** use violet as a primary-action fill or for success; its only fill is a pressed state (the listen button while it speaks).
- **Don't** bring back the borrowed Duolingo look: green as brand colour, 3D block buttons with hard bottom edges, a mascot cheering.
- **Don't** set Chinese text or sentences in Saira Condensed.
- **Don't** add `text-transform: uppercase` to new components; capitals belong to the judgement and result words, which are written in capitals.
- **Don't** hard-code new hex values in components; add a token with both a stage and a day value first.
