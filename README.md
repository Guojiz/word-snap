# Word Snap

A Duolingo-style word matching practice page for quick vocabulary review.

Word Snap is a static single-page vocabulary matching app. It runs from GitHub Pages, stores words and progress in browser local storage, and supports install-to-home-screen use on mobile browsers.

## Features

- Streaming 10-slot matching board: 5 Chinese slots and 5 English slots.
- Keyboard shortcuts from `1` to `0`.
- Instant match checking with no submit/check button.
- Correct matches flash, disappear, and are immediately refilled from the word queue.
- Wrong matches shake and reset automatically.
- Adaptive review: missed, slow, not-yet-stable, or due-for-review words return earlier.
- InkCanvas-style adaptive draw logic: recently drawn words are down-weighted, under-practiced words are boosted, and over-selected words are reduced.
- Per-word draw tracking: each word stores draw count, last draw round, and current draw probability.
- New word entry through the vocabulary modal, with single-word and batch entry.
- Full vocabulary management: default and custom words can both be deleted or cleared.
- Empty vocabulary prompt: if no words exist, the app asks the user to add words before practicing.
- Configurable practice options: level time, refill batch size, refill delay range, recent-history window, anti-repeat strength, selected-card refill pause, and mastered-word recycling.
- Words, settings, draw history, and progress are saved in browser local storage.
- Install reminder for Safari/iPad users: open the GitHub Pages URL, tap Share, then choose Add to Home Screen.
- Progressive Web App basics: manifest, icon, and service worker for a standalone app-style launch and offline app shell.
- Static single-page site, ready for GitHub Pages.

## Adaptive Draw Logic

The word queue now borrows the same idea as classroom roll-call tools: selection should feel random, but it should not keep picking the same item while others are under-practiced.

Each word records:

- `draws`: how many times the word has been drawn onto the board.
- `lastDrawRound`: the last level in which the word appeared.
- `drawProbability`: the current adaptive weight used by the queue builder.

When a new queue is built, Word Snap:

- prioritizes due review, weak, slow, and mistaken words;
- reduces words that appeared in the recent draw history;
- boosts words drawn less often than the average;
- reduces words drawn more often than the average;
- can recycle mastered words so practice does not end with an empty pool.

Refills also wait while a card is selected, so new words do not interrupt the current match.

## Use

Open `index.html`, or publish this folder with GitHub Pages.

On iPhone or iPad, open the GitHub Pages URL in Safari, tap the Share button, choose Add to Home Screen, and launch Word Snap from the home screen.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.
