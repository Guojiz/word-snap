---
target: Word Snap 人机交互界面
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/guojizheng/Documents/Projects/repos/word-snap/vocabulary-match.html"
target_fingerprint: "sha256:68e569bac2f22807a9a1905fce1b1abbbf12b268cb06f83098c6fe3c2c2c1685"
target_path: /Users/guojizheng/Documents/Projects/repos/word-snap/vocabulary-match.html
timestamp: 2026-10-10T12-56-09Z
slug: vocabulary-match-html
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score: 25/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Today bar and summary disagree on due count; estimate jumps |
| 2 | Match system / real world | 3 | 组/轮/关 mixed; engineering terms (补词延迟, 时间容错, 端侧模型) |
| 3 | User control & freedom | 2 | Library delete = one tap, no undo; top-left × is "start over" but reads as exit |
| 4 | Consistency & standards | 2 | Skin rotation changes correct/wrong colours; "关闭" means two things |
| 5 | Error prevention | 2 | One-tap delete next to same-colour status tags |
| 6 | Recognition vs recall | 3 | 练习方式 vs 练习模式 |
| 7 | Flexibility & efficiency | 3 | 1–0 keys, auto focus; little for mobile |
| 8 | Aesthetic & minimalist | 2 | Settings flat 26 controls / 2 screens; summary has 5 actions |
| 9 | Error recovery | 2 | Wrong match does not show the right pair; rules check praises "I like eat pear" |
| 10 | Help & docs | 3 | Present but long (4-paragraph intro) |

## Specificity verdict
Borrowed identity: Duolingo palette (#58cc02/#1cb0f6/#ff4b4b/#ffc800, #131f24), 3D duo-button, Windows-only font stack, skin rotation per set. Product-specific ideas (1–0 keys, staggered refill, confusion pairs, exam word books, dictation print sheet) are functions, not visual language.
Detector: 26 CLI findings (22 low-contrast, 2 bounce-easing, 1 icon-tile-stack, 1 dark-glow); ~13 false positives (print-only #111, static white backgrounds). Browser confirmed light-mode accent-as-text failures (1.8–2.1:1), --dim 2.1–2.8:1, unselected lang toggle 1.8–2.4:1.

## Priority issues
- [P1] Accent colours used as text fail contrast in light mode (round label, nav active, drill target word, 我没有思路, 获取 Key, card number hints) — derive per-theme --accent-ink ≥4.5:1, hints ≥3:1. colorize → audit
- [P1] Modals: no focus move/trap/return, background tabbable, hidden install nudge tabbable, Enter hijacked on summary/intro, no :focus-visible, inputs outline:none. harden/audit
- [P1] Learning feedback misleads: wrong match never shows the correct pair; rules-only check praises flawed sentences ("语法正确，句子不错！"). clarify
- [P2] Library delete one-tap with no undo; × reads as exit. harden
- [P2] Settings and summary overload / naming collisions: group settings (学习计划 / 练习节奏 / 反馈与外观 / AI), rename 方式/模式, one primary CTA on summary. distill/clarify
- [P2] Borrowed identity, unstable semantic colours, font stack. bolder/typeset

## Persona red flags
Jordan: wall-of-text intro, "选择配对" uninformative, × looks like exit, orphan cards during refill, 方式/模式.
Casey: top nav far from thumb, ~300px empty below board, 36px close buttons, delete beside tags, install sheet over summary.
Sam: contrast, no modal focus management, state only visual (no aria-pressed / announcements), no focus-visible.

## Minor
Desktop: 760px column, right 40% empty, hidden stats panel; GitHub in learner nav; native confirm() dialogs; placeholder contrast 3.6–4.3:1; bounce easing on progress/badge/tiles (intentional, spring); dark glow on focus-mode progress.

## Questions
1. Without Duolingo green, what makes a 中考 student recognise Word Snap — 默写本, 红笔批改, 错题本?
2. Is the summary a reward or homework?
3. Is per-set skin novelty worth unstable correct/wrong colours?
