# Upstream

Vendored unchanged from [RubenGlez/mobile-design](https://github.com/RubenGlez/mobile-design)
at commit `97474ed9b969d0c7f8a2acf712e30eeb0b9078d1` (v0.3.0), MIT licensed (see `LICENSE`).
Copied: `SKILL.md`, `references/`, `LICENSE`. Not copied: README, evals, contributor files.

To update, re-copy those paths from a newer upstream commit and bump the hash above.
Keep local edits out of the upstream files so updates stay a clean copy.

## Notes for Word Snap

- Word Snap is HTML/CSS/JS shipped in a Capacitor WebView (Android first, iOS later), not
  React Native. Apply the design guidance as written; translate the RN code samples to the web
  equivalents: `env(safe-area-inset-*)` for safe areas, `prefers-reduced-motion` for Reduce
  Motion, Capacitor plugins (haptics, status bar, splash screen) for native surfaces, and
  `min-width`/`min-height` 48px hit areas.
- Upstream says little about launch screens. Follow the platform: Android 12+ SplashScreen API
  (icon on a solid background, hand off straight to the first screen) and an iOS launch screen
  that matches the first screen's chrome, with no logo-only marketing delay.
