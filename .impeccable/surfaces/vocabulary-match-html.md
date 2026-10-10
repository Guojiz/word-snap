---
version: 1
slug: "vocabulary-match-html"
primary_target: "vocabulary-match.html"
related_targets: []
---

# Surface brief: Word Snap practice app (vocabulary-match.html)

Scope: the whole app shell — practice board, set summary, Library and Settings dialogs. Mode: Operate.
Audience and job: Chinese middle-school students (中考 / 高考) on a phone, a few minutes at a time: match meanings to words, finish today's goal, come back tomorrow.
Constraints: single file + js/ modules, offline (fonts bundled locally), 中文 / English UI, light and dark, reduced motion, WCAG AA, 44 px targets, keyboard 1–0.
Memorable moment: the judgement word that lands on every match.

## Direction contract

THESIS: Every match is judged like a rhythm game — PERFECT / GREAT / GOOD / MISS from the engine's real reaction-time grade. Refuses the Duolingo arrangement (green, 3D block buttons, mascot cheer).

OWN-WORLD: Stage indigo (#24205a dark ground) and lavender day (#f5f3ff); violet #7c5cff reserved only for the selected card; judgement colours gold / teal / leaf / rose as state colours; white cards with soft offset shadows, 14 px radius; one condensed face (Saira Condensed, bundled) for judgements and all numerals, system Chinese UI face for text; numbers roll digit by digit.

STORY: The learner sees how fast and how right each match was, keeps a combo alive, and watches today's remaining count fall to zero.

FIRST VIEWPORT: Progress lane (rhythm track with beat ticks) across the top with combo count at its right end; today's remaining number large beneath; 2×5 board centred; judgement word pops above the matched pair; nothing else.

FORM: Rhythm-game judgement (音游判定), position 7 of the ordered list, seed key f4ff5bc5.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Raises kept from declined challengers: one colour only for the selected card (orienteering); digits roll per character (split-flap); phones show only the next decision (airport); one face per role (design annual).
