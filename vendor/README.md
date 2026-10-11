# Vendored libraries

Loaded only when a sentence card first appears, then cached by the service worker,
so the sentence check works offline. Unmodified copies of the published packages.

| Folder | Package | Version | License | Used for |
|---|---|---|---|---|
| `harper/` | [harper.js](https://github.com/automattic/harper) (`dist/` files) | 2.10.0 | Apache-2.0 | English grammar and spelling check (Rust → WebAssembly) |
| `compromise/` | [compromise](https://github.com/spencermountain/compromise) (`builds/three/compromise-three.mjs`) | 14.18.0 | MIT | Part-of-speech tags and word forms (ran → run) |
| `webllm/` | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) (`lib/index.js`) | 0.2.85 | Apache-2.0 | Optional on-device model on WebGPU (`js/ai.js`). Loaded only when the user turns on on-device AI; model weights come from Hugging Face and live in the browser's `webllm/*` caches |

To update: `npm pack harper.js@<version> compromise@<version> @mlc-ai/web-llm@<version>`, copy the same files, and update
`VENDOR_CACHE` in `service-worker.js` to the new versions. That cache is kept across app
releases, so learners download these files again only when a library actually changes.
Update rarely and in one go: every version stays in git history (~22 MB each time).

Note: Harper first probes for `harper_wasm_slim_bg.wasm`; it is not shipped, so the
browser logs one 404 and Harper falls back to the full `harper_wasm_bg.wasm`. Harmless.
