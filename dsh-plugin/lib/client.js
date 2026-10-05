// Word Snap for DeepSeek Harness — browser client half.
//
// This file is the built client entry in the exact `window.__ModuleLoader__.load`
// module format the harness web shell consumes (the same format the shipped
// `@deepseek-ai/dsh-client-ui-*` bundles use). It needs no build step: the shell
// serves it from the package's `exports["./client"]`.
//
// What it does:
//   * a chip in the conversation input dock that opens the panel;
//   * a full-frame panel hosting the unchanged Word Snap page at `/wordsnap/`;
//   * "sync" — merge the Host's shared library into the page's own storage and
//     reload the frame; "report" — read the page's self-reported snapshot back
//     to the Host so the agent can read it with `wordsnap_status`.
//
// Same-origin is the whole trick: the panel is served from the harness origin,
// so the iframe page and this script share one localStorage. The game keeps
// owning its state; this script only merges into the app's own storage contract
// (`duo_like_word_match_v1`) and never rewrites the app's source.
window.__ModuleLoader__.load({
  id: "wordsnap-dsh",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    const BASE_PATH = "/wordsnap";
    // The RPC channel lives on its own path: the harness registers a logical
    // channel as a web-server prefix route, so it cannot share BASE_PATH.
    const RPC_PATH = "/wordsnap-rpc";
    const GAME_STORAGE_KEY = "duo_like_word_match_v1";
    const PANEL_STATE_KEY = "wordsnap_dsh_panel_v1";
    const PUBLIC_URL = "https://guojiz.github.io/word-snap/vocabulary-match.html";
    const POLL_MS = 15000;
    // Mirrors the app's own clamp ranges (see loadSettings in vocabulary-match.html).
    const ROUND_MIN = 5;
    const ROUND_MAX = 200;
    const LEVEL_MS_MIN = 20000;
    const LEVEL_MS_MAX = 900000;
    const MAX_WEAK = 50;

    const css = [
      ".wsn-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-tip,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:4px 12px;cursor:pointer;user-select:none}",
      ".wsn-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}",
      ".wsn-chip-dot{width:6px;height:6px;border-radius:50%;background:#58cc02;flex:none}",
      ".wsn-badge{font-size:10px;line-height:1;padding:3px 6px;border-radius:999px;background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}",
      ".wsn-backdrop{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55);pointer-events:auto}",
      ".wsn-card{width:min(1080px,100%);height:min(900px,100%);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35)}",
      ".wsn-head{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px;color:var(--dsw-alias-label-primary)}",
      ".wsn-title{font-weight:600;flex:none}",
      ".wsn-stats{display:flex;gap:10px;font-size:11px;color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;white-space:nowrap}",
      ".wsn-actions{margin-left:auto;display:flex;gap:6px;flex:none}",
      ".wsn-btn{font:inherit;font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}",
      ".wsn-btn:hover:enabled{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}",
      ".wsn-btn:disabled{opacity:.45;cursor:default}",
      ".wsn-btn.primary{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:transparent;color:#fff}",
      ".wsn-note{padding:6px 14px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2,transparent)}",
      ".wsn-note.error{color:var(--dsw-alias-label-error,#d33)}",
      ".wsn-frame{flex:1;width:100%;border:0;background:#131f24}",
      ".wsn-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:32px;font-size:13px;color:var(--dsw-alias-label-secondary);text-align:center}",
    ].join("");

    const inject = ["slots", "connection"];

    /** localStorage access that never throws (file://, private mode, quota). */
    function readLocal(key) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? null : value;
      } catch (error) {
        return null;
      }
    }

    function writeLocal(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (error) {
        return false;
      }
    }

    function readJson(key) {
      const raw = readLocal(key);
      if (raw === null) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed !== null && typeof parsed === "object" ? parsed : null;
      } catch (error) {
        return null;
      }
    }

    function panelMemory() {
      const stored = readJson(PANEL_STATE_KEY);
      return {
        appliedOpenRevision: stored && Number.isFinite(Number(stored.appliedOpenRevision)) ? Number(stored.appliedOpenRevision) : 0,
        appliedLibraryRevision: stored && Number.isFinite(Number(stored.appliedLibraryRevision)) ? Number(stored.appliedLibraryRevision) : 0,
      };
    }

    function rememberPanel(patch) {
      const next = { ...panelMemory(), ...patch };
      writeLocal(PANEL_STATE_KEY, JSON.stringify(next));
      return next;
    }

    /** The app's own dedupe/identity rule for a pair. */
    function pairKey(en, zh) {
      return String(en).toLowerCase() + "::" + zh;
    }

    function readGameState() {
      const state = readJson(GAME_STORAGE_KEY);
      return state !== null && Array.isArray(state.words) ? state : null;
    }

    function clamp(value, min, max, fallback) {
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(max, Math.max(min, number));
    }

    /**
     * Merge the shared library into the page's own saved state.
     *
     * Merge-only, and never destructive: words already in the browser keep
     * their full progress records, and words the learner added inside the app
     * are kept even when the shared library does not list them. `mode: replace`
     * on the Host only replaces the Host-side library; discarding practice
     * progress stays the app's own "Clear all words" decision.
     */
    function applyLibrary(library) {
      const state = readGameState() || {};
      const existing = Array.isArray(state.words) ? state.words : [];
      const prior = new Map();
      for (const word of existing) {
        if (word !== null && typeof word === "object" && typeof word.en === "string" && typeof word.zh === "string") {
          prior.set(pairKey(word.en, word.zh), word);
        }
      }
      const words = existing.slice();
      const seen = new Set(prior.keys());
      let added = 0;
      const incoming = Array.isArray(library && library.words) ? library.words : [];
      for (const candidate of incoming) {
        if (candidate === null || typeof candidate !== "object") continue;
        if (typeof candidate.en !== "string" || typeof candidate.zh !== "string") continue;
        const en = candidate.en.trim();
        const zh = candidate.zh.trim();
        if (en === "" || zh === "") continue;
        const key = pairKey(en, zh);
        if (seen.has(key)) continue;
        seen.add(key);
        // Minimal shape: the app's own loadWords() rebuilds every counter,
        // box, and due-date default from {en, zh, custom}.
        words.push({ en, zh, custom: true });
        added += 1;
      }

      const settings = state.settings !== null && typeof state.settings === "object" ? { ...state.settings } : {};
      let settingsChanged = false;
      const suggestion = library && library.settings !== null && typeof library.settings === "object" ? library.settings : {};
      if (suggestion.langPair !== null && typeof suggestion.langPair === "object" && typeof suggestion.langPair.a === "string" && typeof suggestion.langPair.b === "string") {
        settings.langPair = { a: suggestion.langPair.a, b: suggestion.langPair.b };
        settingsChanged = true;
      }
      if (suggestion.roundSize !== undefined) {
        settings.roundSize = Math.round(clamp(suggestion.roundSize, ROUND_MIN, ROUND_MAX, settings.roundSize));
        settingsChanged = true;
      }
      if (suggestion.levelDurationMs !== undefined) {
        settings.levelDurationMs = Math.round(clamp(suggestion.levelDurationMs, LEVEL_MS_MIN, LEVEL_MS_MAX, settings.levelDurationMs));
        settingsChanged = true;
      }

      const next = {
        ...state,
        words,
        settings,
        savedAt: new Date().toISOString(),
      };
      const written = writeLocal(GAME_STORAGE_KEY, JSON.stringify(next));
      return { written, added, total: words.length, settingsApplied: settingsChanged, existing: existing.length };
    }

    /** The self-reported practice snapshot pushed back to the Host. */
    function buildReport(state, extra) {
      const words = state !== null && Array.isArray(state.words) ? state.words : [];
      const boxCounts = [0, 0, 0, 0, 0, 0];
      const weak = [];
      let mastered = 0;
      let custom = 0;
      for (const word of words) {
        if (word === null || typeof word !== "object") continue;
        const box = Math.round(clamp(word.box, 0, 5, 0));
        boxCounts[box] += 1;
        if (box >= 5 || word.mastered === true) mastered += 1;
        if (word.custom === true) custom += 1;
        const draws = Number(word.draws) || 0;
        if (draws > 0 && box < 5) {
          weak.push({
            en: String(word.en === undefined ? "" : word.en).slice(0, 200),
            zh: String(word.zh === undefined ? "" : word.zh).slice(0, 200),
            box,
            mistakes: Math.round(clamp(word.mistakes, 0, 100000, 0)),
          });
        }
      }
      weak.sort((a, b) => a.box - b.box || b.mistakes - a.mistakes);
      const settings = state !== null && state.settings !== null && typeof state.settings === "object" ? state.settings : {};
      return {
        wordCount: words.length,
        customCount: custom,
        mastered,
        boxCounts,
        weak: weak.slice(0, MAX_WEAK),
        settings: {
          ...(settings.langPair !== undefined ? { langPair: settings.langPair } : {}),
          ...(settings.roundSize !== undefined ? { roundSize: settings.roundSize } : {}),
          ...(settings.levelDurationMs !== undefined ? { levelDurationMs: settings.levelDurationMs } : {}),
        },
        round: Math.round(clamp(state === null ? 0 : state.round, 0, 100000, 0)),
        score: Math.round(clamp(state === null ? 0 : state.score, 0, 1000000, 0)),
        mistakes: Math.round(clamp(state === null ? 0 : state.mistakes, 0, 1000000, 0)),
        streak: Math.round(clamp(state === null ? 0 : state.streak, 0, 1000000, 0)),
        savedAt: state !== null && typeof state.savedAt === "string" ? state.savedAt : null,
        ...extra,
      };
    }

    // One panel instance per page: the chip and the overlay share this state so
    // an agent-requested open and the learner's own toggle cannot fight. It
    // lives at factory scope because the module materializes exactly once.
    let panelOpen = false;
    const listeners = new Set();
    function setOpen(next) {
      if (panelOpen === next) return;
      panelOpen = next;
      for (const listener of [...listeners]) {
        try { listener(); } catch (error) { /* a listener must not break the shell */ }
      }
    }
    function usePanelOpen() {
      const [, bump] = react.useState(0);
      react.useEffect(() => {
        const listener = () => bump(value => value + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      }, []);
      return panelOpen;
    }

    /**
     * Decide whether the agent asked for an open revision this page has not
     * applied yet. Returns 0 for "no". Applying once per revision is what makes
     * the learner's later manual close stick until the agent asks again.
     */
    function pendingOpenRevision(statusValue, memory) {
      const revision = statusValue !== null && statusValue.panel ? Number(statusValue.panel.openRevision) || 0 : 0;
      return revision > memory.appliedOpenRevision ? revision : 0;
    }

    /** Bounded local read of the page's own saved state (same origin). */
    function localSummary() {
      const state = readGameState();
      if (state === null) return { wordCount: null, mastered: null, custom: null };
      let mastered = 0;
      let custom = 0;
      for (const word of state.words) {
        if (word === null || typeof word !== "object") continue;
        if (word.mastered === true || Math.round(clamp(word.box, 0, 5, 0)) >= 5) mastered += 1;
        if (word.custom === true) custom += 1;
      }
      return { wordCount: state.words.length, mastered, custom };
    }

    function apply(ctx) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "wordsnap-dsh";
      tag.textContent = css;
      document.head.appendChild(tag);
      ctx.effect(() => () => { tag.remove(); }, "wordsnap: css");

      function callRpc(endpoint, payload) {
        return ctx.connection.rpc.call(RPC_PATH, endpoint, payload || {});
      }

      function Chip() {
        const open = usePanelOpen();
        const [status, setStatus] = react.useState(null);
        const [error, setError] = react.useState(null);

        react.useEffect(() => {
          let alive = true;
          async function load() {
            try {
              const result = await callRpc("status", {});
              if (!alive) return;
              if (result !== null && result.ok === true) {
                setStatus(result.value);
                setError(null);
                const revision = pendingOpenRevision(result.value, panelMemory());
                if (revision > 0) {
                  rememberPanel({ appliedOpenRevision: revision });
                  setOpen(true);
                }
              } else {
                setError((result && result.error && result.error.message) || "RPC failed");
              }
            } catch (cause) {
              if (alive) setError(String((cause && cause.message) || cause));
            }
          }
          load();
          const timer = window.setInterval(load, POLL_MS);
          return () => { alive = false; window.clearInterval(timer); };
        }, []);

        const libraryCount = status && status.library ? Number(status.library.count) || 0 : 0;
        const local = localSummary();
        // A badge means "the shared library changed since the last sync" — the
        // panel records the revision it applied, so this is never a guess.
        const stale = status !== null && (Number(status.libraryRevision) || 0) > panelMemory().appliedLibraryRevision;

        return react.createElement("div", { style: { display: "flex", justifyContent: "center" } },
          react.createElement("button", {
            type: "button",
            className: "wsn-chip",
            title: error === null ? "打开 Word Snap 练习面板" : "打开 Word Snap（宿主状态读取失败：" + error + "）",
            onClick: () => setOpen(!open),
          },
            react.createElement("span", { className: "wsn-chip-dot" }),
            "Word Snap",
            stale && libraryCount > 0 ? react.createElement("span", { className: "wsn-badge" }, String(libraryCount)) : null,
            local.wordCount !== null
              ? react.createElement("span", { style: { color: "var(--dsw-alias-label-secondary)", fontWeight: 400 } }, "页面 " + local.wordCount)
              : null,
          ));
      }

      function Panel() {
        const open = usePanelOpen();
        const [frameKey, setFrameKey] = react.useState(0);
        const [status, setStatus] = react.useState(null);
        const [note, setNote] = react.useState(null);
        const [error, setError] = react.useState(null);
        const [busy, setBusy] = react.useState(null);
        const [storageBroken, setStorageBroken] = react.useState(false);

        react.useEffect(() => {
          if (!open) return undefined;
          let alive = true;
          async function load() {
            try {
              const result = await callRpc("status", {});
              if (!alive) return;
              if (result !== null && result.ok === true) {
                setStatus(result.value);
                setError(null);
              } else {
                setError((result && result.error && result.error.message) || "RPC failed");
              }
            } catch (cause) {
              if (alive) setError(String((cause && cause.message) || cause));
            }
          }
          load();
          const timer = window.setInterval(load, POLL_MS);
          return () => { alive = false; window.clearInterval(timer); };
        }, [open]);

        react.useEffect(() => {
          if (!open) return undefined;
          const onKey = event => { if (event.key === "Escape") setOpen(false); };
          window.addEventListener("keydown", onKey);
          return () => window.removeEventListener("keydown", onKey);
        }, [open]);

        if (!open) return null;

        const practice = status && status.practice ? status.practice : {};
        const frameSrc = typeof practice.path === "string" ? practice.path : BASE_PATH + "/";
        const libraryRevision = status ? Number(status.libraryRevision) || 0 : 0;

        async function run(kind, task) {
          setBusy(kind);
          setNote(null);
          setError(null);
          try {
            await task();
          } catch (cause) {
            setError(String((cause && cause.message) || cause));
          } finally {
            setBusy(null);
          }
        }

        function syncLibrary() {
          return run("pull", async () => {
            const result = await callRpc("pull", {});
            if (result === null || result.ok !== true) throw new Error((result && result.error && result.error.message) || "拉取失败");
            const applied = applyLibrary(result.value);
            if (!applied.written) {
              setStorageBroken(true);
              setNote("无法写入页面存储（浏览器可能阻止了同源存储）。请在独立窗口中打开练习页。");
              return;
            }
            setStorageBroken(false);
            rememberPanel({ appliedLibraryRevision: Number(result.value.revision) || libraryRevision });
            setFrameKey(key => key + 1);
            setNote("已同步 " + applied.added + " 个新词，练习页现有 " + applied.total + " 个词。");
          });
        }

        function reportProgress() {
          return run("sync", async () => {
            const state = readGameState();
            if (state === null) {
              setNote("还没有可回传的练习数据：先在练习页玩一关。");
              return;
            }
            const report = buildReport(state, {});
            const result = await callRpc("sync", { report, libraryRevision, appliedAt: null });
            if (result === null || result.ok !== true) throw new Error((result && result.error && result.error.message) || "回传失败");
            setStatus(result.value);
            setNote("已回传：" + report.wordCount + " 个词，掌握 " + report.mastered + "，弱项 " + report.weak.length + "。");
          });
        }

        const libraryCount = status && status.library ? Number(status.library.count) || 0 : 0;
        const local = localSummary();

        return react.createElement("div", {
          className: "wsn-backdrop",
          onMouseDown: event => { if (event.target === event.currentTarget) setOpen(false); },
        },
          react.createElement("div", { className: "wsn-card", role: "dialog", "aria-label": "Word Snap" },
            react.createElement("div", { className: "wsn-head" },
              react.createElement("span", { className: "wsn-title" }, "Word Snap"),
              react.createElement("span", { className: "wsn-stats" },
                "共享词库 " + libraryCount,
                local.wordCount === null ? null : " · 页面 " + local.wordCount,
                local.mastered === null ? null : " · 掌握 " + local.mastered,
                status && status.panel && status.panel.reason ? " · " + String(status.panel.reason) : null,
              ),
              react.createElement("span", { className: "wsn-actions" },
                react.createElement("button", {
                  type: "button", className: "wsn-btn primary", disabled: busy !== null, onClick: syncLibrary,
                }, busy === "pull" ? "同步中…" : "同步词库"),
                react.createElement("button", {
                  type: "button", className: "wsn-btn", disabled: busy !== null, onClick: reportProgress,
                }, busy === "sync" ? "回传中…" : "回传进度"),
                react.createElement("button", {
                  type: "button", className: "wsn-btn",
                  onClick: () => window.open(typeof practice.url === "string" && practice.url ? practice.url : PUBLIC_URL, "_blank", "noopener"),
                }, "新窗口"),
                react.createElement("button", { type: "button", className: "wsn-btn", onClick: () => setOpen(false) }, "关闭"),
              ),
            ),
            note !== null ? react.createElement("div", { className: "wsn-note" }, note) : null,
            error !== null ? react.createElement("div", { className: "wsn-note error" }, "读取失败：" + error) : null,
            storageBroken
              ? react.createElement("div", { className: "wsn-empty" },
                  react.createElement("div", null, "此环境无法与练习页共享浏览器存储。"),
                  react.createElement("button", {
                    type: "button", className: "wsn-btn primary",
                    onClick: () => window.open(PUBLIC_URL, "_blank", "noopener"),
                  }, "在独立窗口打开 Word Snap"),
                  react.createElement("div", null, "独立窗口中的进度不会自动回传；同步词库仍会更新宿主共享词库。"),
                )
              : react.createElement("iframe", {
                  key: frameKey,
                  className: "wsn-frame",
                  src: frameSrc,
                  title: "Word Snap",
                  allow: "clipboard-write",
                }),
          ));
      }

      ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
        name: "conversation.input.dock",
        id: "wordsnap",
        order: 40,
      }, Chip));

      ctx.slots.inject("shell.overlay", () => ctx.slots.register({
        name: "shell.overlay",
        id: "wordsnap",
        order: 30,
      }, Panel));
    }

    exports.apply = apply;
    exports.inject = inject;
    // Internal test seam (not a harness contract): lets `node --test` exercise
    // the browser-side merge/report logic and the panel state machine without a
    // real browser. The shell only ever reads `apply` and `inject`.
    exports.__test = {
      applyLibrary,
      buildReport,
      localSummary,
      panelMemory,
      pendingOpenRevision,
      rememberPanel,
      setOpen,
      isOpen: () => panelOpen,
      constants: {
        BASE_PATH,
        RPC_PATH,
        GAME_STORAGE_KEY,
        PANEL_STATE_KEY,
        PUBLIC_URL,
        POLL_MS,
        MAX_WEAK,
      },
    };
    return module.exports;
  },
});
