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

`www/` and Android build outputs are not committed. After changing web files, run `npm run cap:sync` again.
