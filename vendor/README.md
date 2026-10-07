# Vendored libraries

Loaded only when a sentence card first appears, then cached by the service worker,
so the sentence check works offline. Unmodified copies of the published packages.

| Folder | Package | Version | License | Used for |
|---|---|---|---|---|
| `harper/` | [harper.js](https://github.com/automattic/harper) (`dist/` files) | 2.10.0 | Apache-2.0 | English grammar and spelling check (Rust → WebAssembly) |
| `compromise/` | [compromise](https://github.com/spencermountain/compromise) (`builds/three/compromise-three.mjs`) | 14.18.0 | MIT | Part-of-speech tags and word forms (ran → run) |

To update: `npm pack harper.js@<version> compromise@<version>`, copy the same files, and bump the
service worker cache name.

Note: Harper first probes for `harper_wasm_slim_bg.wasm`; it is not shipped, so the
browser logs one 404 and Harper falls back to the full `harper_wasm_bg.wasm`. Harmless.
