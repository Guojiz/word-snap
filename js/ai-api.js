/*
 * AI through the learner's own API key (optional, off by default).
 *
 * createApiEngine() returns an engine with the same shape as the WebLLM engine
 * (chat.completions.create / interruptGenerate / unload), so createAI() in
 * js/ai.js drives it unchanged. Two wire formats cover the common providers:
 *   openai     POST {baseURL}/chat/completions  (OpenAI, DeepSeek, Qwen, Kimi, GLM, SiliconFlow, OpenRouter…)
 *   anthropic  POST {baseURL}/v1/messages
 * The key is kept on this device only (the page stores it apart from the word
 * library, so backups and exports never carry it). What the learner writes is
 * sent to the chosen provider; the settings text says so.
 *
 * Browsers block some providers (CORS). In the packaged app CapacitorHttp sends
 * the request natively, so every provider works there.
 */

/** keyUrl is where a learner gets a key. json: the provider accepts response_format json_object. */
export const PROVIDERS = [
  { id: "deepseek", name: "DeepSeek", format: "openai", baseURL: "https://api.deepseek.com", model: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys", json: true },
  { id: "qwen", name: "通义千问 Qwen", format: "openai", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", keyUrl: "https://bailian.console.aliyun.com/", json: true },
  { id: "kimi", name: "Kimi (Moonshot)", format: "openai", baseURL: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", keyUrl: "https://platform.moonshot.cn/console/api-keys", json: true },
  { id: "glm", name: "智谱 GLM", format: "openai", baseURL: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", keyUrl: "https://open.bigmodel.cn/usercenter/apikeys", json: true },
  { id: "siliconflow", name: "SiliconFlow 硅基流动", format: "openai", baseURL: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct", keyUrl: "https://cloud.siliconflow.cn/account/ak", json: true },
  { id: "openai", name: "OpenAI", format: "openai", baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini", keyUrl: "https://platform.openai.com/api-keys", json: true },
  { id: "anthropic", name: "Claude (Anthropic)", format: "anthropic", baseURL: "https://api.anthropic.com", model: "claude-haiku-4-5-20251001", keyUrl: "https://console.anthropic.com/settings/keys", json: false },
  { id: "openrouter", name: "OpenRouter", format: "openai", baseURL: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-chat", keyUrl: "https://openrouter.ai/keys", json: true },
  { id: "custom", name: "Custom (OpenAI-compatible)", format: "openai", baseURL: "", model: "", keyUrl: "", json: false }
];

export function providerById(id) {
  return PROVIDERS.find(provider => provider.id === id) || PROVIDERS[0];
}

/**
 * The stored settings, cleaned: { provider, baseURL, model, key, on }.
 * Empty baseURL / model fall back to the provider's defaults.
 */
export function normalizeConfig(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const provider = providerById(value.provider);
  const text = (x, max) => String(x == null ? "" : x).trim().slice(0, max);
  return {
    provider: provider.id,
    baseURL: text(value.baseURL, 300).replace(/\/+$/, ""),
    model: text(value.model, 120),
    key: text(value.key, 400),
    on: value.on === true
  };
}

/** Settings with the provider defaults filled in, or null if not usable yet. */
export function resolveConfig(raw) {
  const config = normalizeConfig(raw);
  const provider = providerById(config.provider);
  const baseURL = config.baseURL || provider.baseURL;
  const model = config.model || provider.model;
  if (!config.key || !/^https?:\/\/\S+$/.test(baseURL) || !model) return null;
  return { ...config, baseURL, model, format: provider.format, json: provider.json, name: provider.name };
}

export class ApiError extends Error {
  /** kind: "auth" (bad key), "quota" (rate limit / no balance), "model", "network" (offline or CORS), "http", "format" */
  constructor(kind, message, status = 0) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

function kindFor(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 402 || status === 429) return "quota";
  if (status === 404) return "model";
  return "http";
}

/** Builds the HTTP request for one chat call. Pure, tested in Node. */
export function buildRequest(config, request) {
  const messages = request.messages || [];
  if (config.format === "anthropic") {
    const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
    return {
      url: `${config.baseURL}/v1/messages`,
      headers: {
        "content-type": "application/json",
        "x-api-key": config.key,
        "anthropic-version": "2023-06-01",
        // Needed for calls straight from a web page; the key is the learner's own.
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: {
        model: config.model,
        max_tokens: request.max_tokens || 400,
        temperature: request.temperature ?? 0,
        ...(system ? { system } : {}),
        messages: messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }))
      }
    };
  }
  return {
    url: `${config.baseURL}/chat/completions`,
    headers: { "content-type": "application/json", authorization: `Bearer ${config.key}` },
    body: {
      model: config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0,
      max_tokens: request.max_tokens || 400,
      // WebLLM's schema string is not part of the OpenAI API; plain JSON mode is.
      ...(config.json && request.response_format ? { response_format: { type: "json_object" } } : {})
    }
  };
}

/** The reply text from either wire format. */
export function replyText(format, data) {
  if (format === "anthropic") {
    const block = data && Array.isArray(data.content) && data.content.find(part => part.type === "text");
    return block ? block.text : null;
  }
  const choice = data && Array.isArray(data.choices) && data.choices[0];
  return choice && choice.message && typeof choice.message.content === "string" ? choice.message.content : null;
}

/**
 * createApiEngine(rawConfig, { fetch? }) → engine for createAI({ createEngine: async () => engine }).
 * Throws ApiError (with .kind) on failure; createAI turns that into null.
 */
export function createApiEngine(raw, options = {}) {
  const config = resolveConfig(raw);
  if (!config) throw new ApiError("format", "API key, base URL and model are required");
  const doFetch = options.fetch || globalThis.fetch.bind(globalThis);
  const controllers = new Set();

  async function send(request) {
    const { url, headers, body } = buildRequest(config, request);
    const controller = new AbortController();
    controllers.add(controller);
    let response;
    try {
      response = await doFetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (error) {
      if (error && error.name === "AbortError") throw error;
      // fetch() rejects without a status when offline or when the browser blocks the reply (CORS).
      throw new ApiError("network", String(error && error.message || error));
    } finally {
      controllers.delete(controller);
    }
    let data = null;
    try { data = await response.json(); } catch { /* not JSON */ }
    if (!response.ok) {
      const detail = data && (data.error && (data.error.message || data.error) || data.message);
      throw new ApiError(kindFor(response.status), String(detail || `HTTP ${response.status}`).slice(0, 300), response.status);
    }
    const content = replyText(config.format, data);
    if (content == null) throw new ApiError("format", "Unexpected reply");
    return content;
  }

  return {
    config,
    chat: {
      completions: {
        async create(request) {
          let content;
          try {
            content = await send(request);
          } catch (error) {
            // A few compatible servers reject response_format; ask once more without it.
            if (!(error instanceof ApiError) || error.status !== 400 || !config.json || !request.response_format) throw error;
            content = await send({ ...request, response_format: undefined });
          }
          return { choices: [{ message: { content } }] };
        }
      }
    },
    interruptGenerate() {
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    },
    async unload() {
      this.interruptGenerate();
    }
  };
}

/** One small call to check the key and model. → { ok: true } or { ok: false, kind, message }. */
export async function testConnection(raw, options = {}) {
  try {
    const engine = createApiEngine(raw, options);
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: "Reply with JSON only." },
        { role: "user", content: 'Return {"ok":true}' }
      ],
      max_tokens: 20,
      temperature: 0,
      response_format: { type: "json_object" }
    });
    return reply.choices[0].message.content ? { ok: true } : { ok: false, kind: "format", message: "" };
  } catch (error) {
    return { ok: false, kind: error.kind || "network", message: String(error.message || error) };
  }
}
