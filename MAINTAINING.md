# Maintaining

Use this checklist when updating the practice page.

## Review priorities

- Keep the first practice action quick.
- Keep mobile layout usable.
- Keep matching behavior predictable.
- Avoid adding heavy dependencies unless they remove real complexity.
- Keep vocabulary data redistributable.

## Before accepting a pull request

- Check that UI changes work on desktop and mobile.
- Check that keyboard or touch interactions still make sense.
- Check that no private or copyrighted word list was added improperly.
- Ask for a smaller pull request if UI and logic changes are mixed without need.

## Release notes

For visible changes, note:

- practice flow changes;
- scoring or matching behavior changes;
- mobile layout changes;
- data format changes;
- known limitations.
## Android app (APK)

The app is the same site wrapped with Capacitor; there is no Google Play listing, only APKs.

Requirements: Node 20+, JDK 21 (`brew install openjdk@21`), the Android SDK (platform 36, build-tools 36, NDK 27 and CMake for the on-device model).

```bash
npm install
npm run build:www        # copies the site into www/
npx cap sync android     # copies www/ and plugins into android/
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk
```

`www/` and Android build outputs are not committed. After changing web files, run `npm run cap:sync` again. Releases are built by CI (below).

## CI and releases

GitHub Actions (`.github/workflows/`):

- **CI** (`ci.yml`) — every pull request and every push to `main`: unit tests (`npm test`), page checks (`npm run check`: inline scripts parse, every precached file exists, `<div>`s balance, ids are unique, every literal `t("…")` key exists in English and Chinese), and a site build.
- **Deploy site** (`pages.yml`) — every push to `main`: tests, checks, then `npm run build:site` and publishes only `www/` to GitHub Pages. The service worker's cache name is stamped with the commit, so `CACHE_NAME` in `service-worker.js` no longer has to be bumped by hand (the value in the file is only the local fallback).
  One-time switch, after this workflow is on `main`: Settings → Pages → Source → **GitHub Actions**, or
  `gh api -X PUT repos/Guojiz/word-snap/pages -f build_type=workflow`. Until then the old branch deployment keeps serving the site.
- **Android APK** (`apk.yml`) — a tag `v1.2.3` builds the APK and publishes a GitHub Release with it; *Run workflow* builds one as a downloadable artifact. `versionCode` is the run number and `versionName` the tag.

### Release signing (once, by the maintainer)

Without a key the APK workflow builds a debug APK. For a signed release APK, create a key on your own machine and keep it safe — every later update must be signed with the same key:

```bash
keytool -genkeypair -v -keystore word-snap-release.jks -alias word-snap -keyalg RSA -keysize 4096 -validity 10000
base64 -i word-snap-release.jks | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body word-snap
gh secret set ANDROID_KEY_PASSWORD
```

Never commit the keystore or its passwords. Locally, `npm run apk:release` signs when `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` are set.

### Branch protection

`main` requires a pull request (no direct pushes, no force pushes, no deletion). Once CI is on `main`, also require the **test** check:
`gh api -X PATCH repos/Guojiz/word-snap/branches/main/protection/required_status_checks -F strict=false -f 'contexts[]=test'`.
