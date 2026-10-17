# Word Snap

A vocabulary app for learners preparing for exams (中考 and 高考 first, then CET-4/6, 考研, IELTS, TOEFL, GRE) and for anyone learning words in any language pair. Learners match words to meanings on a board; a personal review engine decides which word comes next.

## Practice

**Board**:
The matching grid of cards: meanings on one side, words on the other.
_Avoid_: Grid, game area

**Set** (组):
25 matches in endless practice, followed by a **Set summary**.
_Avoid_: Round, batch

**Level** (关):
A timed run of matches, the alternative to endless practice.
_Avoid_: Stage, round

**Set summary**:
The screen after a **Set**: judgement counts, **Mixed-up pairs**, missed words and the cards after the set.
_Avoid_: Result page, report

**Miss**:
A wrong pair on the **Board**. Its first card is the **Answered word**; the second is the **Wrong pick**.
_Avoid_: Error, mistake (in UI copy the judgement reads MISS)

**Answered word**:
The word whose card was picked first in a **Miss**; the one the learner was trying to answer, and the one that counts as forgotten.

**Wrong pick**:
The card picked second in a **Miss**; it was mixed up, not forgotten.
_Avoid_: Distractor

**Mixed-up pair**:
Two words the learner matched with each other's meaning, or two look-alike words; they come back on the **Board** together.
_Avoid_: Confusable, confused words

## Words

**Library** (词库):
All the learner's words with their progress, on this device.
_Avoid_: Vocabulary, deck, word list (in UI copy)

**Word book** (词书):
A built-in exam word list (中考 … GRE) cut from ECDICT by its exam tags.
_Avoid_: Dictionary, course

## Memory aids

**Memory aid** (记忆法):
Anything shown to make a word easier to remember: a **Root breakdown**, a **Near-synonym note** or an **AI mnemonic**.
_Avoid_: Hint, tip, explanation

**Root breakdown** (词根拆解):
A word split into known roots and affixes, each with its meaning, e.g. in- (into) + spect (look). Only shown when every part is in the **Root table**.
_Avoid_: Etymology, morphology

**Root table**:
The open list of roots and affixes with Chinese meanings that **Root breakdowns** are built from.

**Near-synonym note** (近义词辨析):
A short Chinese explanation of how a group of close words differ, e.g. quite / rather / pretty / fairly.
_Avoid_: Synonym list, comparison

**AI mnemonic** (AI 联想):
A sound-alike, picture or story association for one word, written by the learner's own AI and kept on the word, marked as AI-written.
_Avoid_: AI hint, AI memory aid

**Learner's own AI**:
An AI the learner runs or pays for: the on-device model in the app, or their own API key. Never a model the project hosts or pays for.
_Avoid_: Our AI, cloud AI

## Editions

**Web edition**:
The open-source site; free; no on-device model.

**Android edition**:
The open-source app; free; runs an on-device model. Ships first.

**iOS edition**:
A later, closed-source, paid app built on Apple Intelligence with its own design.
