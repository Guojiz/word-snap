/*
 * On-device model in the Android app: Qwen3.5-4B (4-bit, MNN), through the
 * app's WordSnapLlm plugin (android/app/src/main/java/.../LlmPlugin.java).
 *
 * nativeAI() returns the same object as createAI() in js/ai.js, so the page
 * uses it exactly like the browser model or the API key. Only offered on
 * phones with 12 GB of memory or more (deviceInfo().capable); slower phones
 * use an API key instead.
 */
import { createAI } from "./ai.js";

/** strong: trusted for meaning feedback, contrast and word lists (unlike the ≤1.7B browser models). */
export const NATIVE_MODEL = { id: "qwen3.5-4b-mnn", name: "Qwen3.5 4B", downloadMB: 2714, strong: true, native: true };

/** The plugin proxy in the app, or null on the web. */
export function nativePlugin(cap = globalThis.Capacitor) {
  try {
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
    return (cap.Plugins && cap.Plugins.WordSnapLlm) || (cap.registerPlugin && cap.registerPlugin("WordSnapLlm")) || null;
  } catch {
    return null;
  }
}

/** Engine with the WebLLM / API shape over the plugin. */
export function createNativeEngine(plugin) {
  return {
    chat: {
      completions: {
        async create(request) {
          const messages = (request.messages || []).map(m => ({ role: m.role, content: String(m.content) }));
          const reply = await plugin.generate({ messages, maxTokens: request.max_tokens || 400 });
          return { choices: [{ message: { content: reply && typeof reply.text === "string" ? reply.text : "" } }] };
        }
      }
    },
    interruptGenerate() {
      plugin.interrupt().catch(() => {});
    },
    async unload() {
      await plugin.unload();
    }
  };
}

/**
 * The AI object for the app's model. load(onProgress) downloads it first if
 * needed (progress 0..1), then starts it. timeoutMs: a 4B model on a phone needs
 * tens of seconds for a long answer.
 */
export function nativeAI(plugin, { timeoutMs = 60000 } = {}) {
  let listener = null;
  return createAI({
    model: NATIVE_MODEL,
    timeoutMs,
    lib: {
      hasModelInCache: async () => Boolean((await plugin.status()).downloaded),
      deleteModelAllInfoInCache: async () => { await plugin.remove(); }
    },
    createEngine: async (_modelId, onProgress) => {
      const status = await plugin.status();
      if (!status.downloaded) {
        if (onProgress && plugin.addListener) {
          listener = await plugin.addListener("progress", data => onProgress({ progress: Number(data.progress) || 0 }));
        }
        try {
          await plugin.download();
        } finally {
          if (listener) { listener.remove(); listener = null; }
        }
      }
      await plugin.load();
      return createNativeEngine(plugin);
    }
  });
}
