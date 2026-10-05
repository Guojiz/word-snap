// Word Snap for DeepSeek Harness — Host half.
//
// Responsibilities, in order of who owns the truth:
//   1. Serve the unchanged Word Snap page on the harness origin, so the panel
//      runs the real app (`/wordsnap/`), sharing origin storage with its frame.
//   2. Own the durable SHARED word library (a JSON file under DSH_HOME) that
//      the agent maintains with `wordsnap_import_words`.
//   3. Accept the browser's SELF-REPORTED practice snapshot and store it, so
//      `wordsnap_status` can show what the page last observed — never as proof
//      that practice happened.
//
// The browser remains the only writer of practice progress, and the plugin
// never edits the game's source: it ships the page byte-for-byte and merges
// library entries into the page's own storage contract at sync time.
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LIMITS,
  applyImportSettings,
  createEmptyLibrary,
  libraryStatus,
  mergeWords,
  normalizeEntryList,
  normalizeReport,
  parseImportText,
  readLibraryFile,
  writeLibraryFile,
} from './library.js'

export const name = 'wordsnap-host'
export const inject = ['tools', 'systemPrompt']

/** The URL prefix the page is served under; the client half hardcodes the same one. */
export const ROUTE_PATH = '/wordsnap'

/**
 * The panel's logical RPC channel. It MUST differ from ROUTE_PATH: the
 * connection plugin registers a channel as a `prefix` route on the SAME web
 * server, so reusing `/wordsnap` is a duplicate-prefix composition failure.
 */
export const RPC_PATH = '/wordsnap-rpc'

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(PLUGIN_ROOT, 'assets')
const PACKAGE_NAME = 'wordsnap-dsh'

/** Every servable asset: URL path → file in `assets/` plus its content type. */
export const ASSET_ROUTES = Object.freeze({
  '/': { file: 'vocabulary-match.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'vocabulary-match.html', type: 'text/html; charset=utf-8' },
  '/vocabulary-match.html': { file: 'vocabulary-match.html', type: 'text/html; charset=utf-8' },
  '/manifest.webmanifest': { file: 'manifest.webmanifest', type: 'application/manifest+json; charset=utf-8' },
  '/icon.svg': { file: 'icon.svg', type: 'image/svg+xml' },
  '/icon-192.png': { file: 'icon-192.png', type: 'image/png' },
  '/icon-512.png': { file: 'icon-512.png', type: 'image/png' },
  '/apple-touch-icon.png': { file: 'apple-touch-icon.png', type: 'image/png' },
})

const SYSTEM_PROMPT = '## Word Snap\nWord Snap is a vocabulary matching practice panel embedded in this harness (`/wordsnap/`). `wordsnap_status` reads the shared word library and the page\'s last self-reported practice snapshot; `wordsnap_import_words` maintains that shared library (agent-authored lists, one word/meaning per pair); `wordsnap_open` asks the in-GUI panel to open. The browser remains the only writer of practice progress: a browser report is a self-report, never proof that the learner practiced, mastered a word, or completed a level. Never claim a sync, an apply, or a mastered word without a report that says so.'

const WITHHELD_ASSETS = new Set(['service-worker.js'])

/** Top-level output contract helper; nested values stay generic on purpose. */
function objectSchema(properties, required = []) {
  return { type: 'object', additionalProperties: false, properties, required }
}

const statusOutputSchema = objectSchema({
  ok: { type: 'boolean' },
  practice: { type: 'object' },
  library: { type: 'object' },
  panel: { type: 'object' },
  browser: { oneOf: [{ type: 'object' }, { type: 'null' }] },
  warnings: { type: 'array', items: { type: 'string' } },
  limits: { type: 'object' },
})

const importOutputSchema = objectSchema({
  ok: { type: 'boolean' },
  status: { type: 'string' },
  mode: { type: 'string' },
  added: { type: 'number' },
  duplicates: { type: 'number' },
  removed: { type: 'number' },
  total: { type: 'number' },
  revision: { type: 'number' },
  settings: { type: 'object' },
  sources: { type: 'object' },
  sample: { type: 'array', items: { type: 'object' } },
  note: { type: 'string' },
})

const openOutputSchema = objectSchema({
  ok: { type: 'boolean' },
  status: { type: 'string' },
  revision: { type: 'number' },
  practice: { type: 'object' },
  note: { type: 'string' },
})

function textResult(value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

function tool(toolName, description, parameters, outputSchema, execute, { concurrencySafe = true, kind = 'read' } = {}) {
  return {
    name: toolName,
    description,
    parameters,
    output: { schema: outputSchema, render: (_args, value) => textResult(value) },
    execute,
    isConcurrencySafe: () => concurrencySafe,
    presentCall: () => ({ card: 'generic', title: toolName, kind }),
  }
}

/** DSH_HOME-relative default store, overridable by plugin config. */
export function defaultStoreFile(env = process.env) {
  const home = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== '' ? env.DSH_HOME : join(homedir(), '.dsh')
  return join(home, 'wordsnap', 'library.json')
}

/**
 * One serialized, cached view of the library file. Every mutation re-reads the
 * cache, writes atomically, and bumps the revision, so two writers in the same
 * process cannot interleave a read-modify-write.
 */
export function createLibraryStore(file) {
  /** @type {ReturnType<typeof createEmptyLibrary> | null} */
  let cache = null
  let warnings = []
  let chain = Promise.resolve()
  const load = async () => {
    if (cache !== null) return cache
    const result = await readLibraryFile(file)
    cache = result.library
    warnings = result.warnings
    return cache
  }
  const serialize = (task) => {
    const run = chain.then(task, task)
    chain = run.then(() => undefined, () => undefined)
    return run
  }
  const runUpdate = (mutator, bumpRevision) => serialize(async () => {
    const current = await load()
    const draft = JSON.parse(JSON.stringify(current))
    const result = await mutator(draft)
    if (result !== null && typeof result === 'object' && result.unchanged === true) {
      return { library: current, result }
    }
    const next = {
      ...draft,
      revision: bumpRevision ? current.revision + 1 : current.revision,
      updatedAt: bumpRevision ? new Date().toISOString() : current.updatedAt,
    }
    await writeLibraryFile(file, next)
    cache = next
    return { library: next, result }
  })
  return {
    file,
    warnings: () => [...warnings],
    read: () => serialize(load),
    /**
     * Read-modify-write under the store lock, bumping the library revision. A
     * mutator returning `{ unchanged: true }` performs no write and keeps the
     * revision, so an empty import can never look like a library change.
     * @param mutator - receives a private copy; returns data for the caller.
     */
    update: (mutator) => runUpdate(mutator, true),
    /**
     * Persist an observation about the library (the browser's self-report)
     * WITHOUT bumping the revision: the panel uses the revision to decide
     * whether the shared word list changed, and a progress report must not
     * look like a new word list.
     */
    updateKeepingRevision: (mutator) => runUpdate(mutator, false),
  }
}

/** Persist the browser's self-reported practice snapshot. */
async function writeReport(store, report, { libraryRevision, appliedAt }) {
  return store.updateKeepingRevision((draft) => {
    draft.report = normalizeReport({ ...report, libraryRevision, appliedAt })
    return draft.report
  })
}

async function importWords(store, args) {
  const text = typeof args?.text === 'string' ? args.text : ''
  const words = args?.words
  const mode = args?.mode === 'replace' ? 'replace' : 'merge'
  const requested = args?.source === 'learner' ? 'learner' : 'agent'

  const reject = async (note, overrides = {}) => {
    const current = await store.read()
    return {
      ok: false,
      status: 'rejected',
      mode,
      added: 0,
      duplicates: 0,
      removed: 0,
      total: current.words.length,
      revision: current.revision,
      settings: { ...current.settings },
      sources: { text: 0, words: 0, skipped: 0, dropped: 0, truncated: false },
      sample: [],
      note,
      ...overrides,
    }
  }

  if (text.trim() === '' && !Array.isArray(words)) {
    return reject('Provide `text` (the app\'s AI/import format) or `words: [{en, zh}]`.')
  }
  if (text.length > LIMITS.maxImportTextChars) {
    return reject(`text is ${text.length} characters; the cap is ${LIMITS.maxImportTextChars}. Split the list into several imports.`)
  }

  const parsed = text.trim() === '' ? { entries: [], config: {}, skipped: 0, duplicates: 0, truncated: false } : parseImportText(text)
  const listed = normalizeEntryList(words)
  const at = new Date().toISOString()
  const incoming = parsed.entries
    .concat(listed.entries)
    .map(candidate => ({ ...candidate, source: requested, addedAt: at }))

  const { library, result } = await store.update((draft) => {
    const merged = mergeWords(draft.words, incoming, mode)
    const settings = applyImportSettings(draft.settings, parsed.config)
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(draft.settings)
    if (merged.added === 0 && merged.removed === 0 && !settingsChanged) {
      return { ...merged, unchanged: true }
    }
    draft.words = merged.words
    draft.settings = settings
    return merged
  })

  const duplicatedTotal = result.duplicates + parsed.duplicates + listed.dropped
  const notes = []
  if (duplicatedTotal > 0) notes.push(`${duplicatedTotal} duplicate or unusable entries were skipped.`)
  if (parsed.skipped > 0) notes.push(`${parsed.skipped} line(s) were not recognised as a config line or a word pair.`)
  if (parsed.truncated || listed.truncated || result.truncated) notes.push(`The import stopped at the ${LIMITS.maxImportEntries}-entry cap.`)
  if (library.words.length >= LIMITS.maxLibraryEntries) notes.push(`The library is at its ${LIMITS.maxLibraryEntries}-entry cap; later entries were not stored.`)
  if (notes.length === 0) {
    notes.push(result.unchanged === true
      ? 'Nothing changed: every entry already exists in the shared library.'
      : 'Library updated. The panel applies it to the page storage when the learner syncs.')
  }

  return {
    ok: true,
    status: result.unchanged === true ? 'unchanged' : 'applied',
    mode,
    added: result.added,
    duplicates: duplicatedTotal,
    removed: result.removed,
    total: library.words.length,
    revision: library.revision,
    settings: { ...library.settings },
    sources: {
      text: parsed.entries.length,
      words: listed.entries.length,
      skipped: parsed.skipped,
      dropped: listed.dropped,
      truncated: parsed.truncated || listed.truncated || result.truncated,
    },
    sample: library.words.slice(-5).map(word => ({ en: word.en, zh: word.zh })),
    note: notes.join(' '),
  }
}

async function requestOpen(store, args, practice) {
  const reason = typeof args?.reason === 'string' && args.reason.trim() !== '' ? args.reason.trim().slice(0, 200) : null
  const { library } = await store.update((draft) => {
    draft.openRequest = { revision: draft.openRequest.revision + 1, at: new Date().toISOString(), reason }
    return draft.openRequest
  })
  return {
    ok: true,
    status: 'requested',
    revision: library.openRequest.revision,
    practice,
    note: 'The in-GUI Word Snap panel opens once for this revision; if the learner closed it afterwards, their toggle wins until the next request.',
  }
}

/** Build the static handler. Exported so a plain node:http test can drive it. */
export function createStaticHandler({ assetsDir = ASSETS_DIR, routePath = ROUTE_PATH, store, practiceUrl = () => null } = {}) {
  return async function handleWordSnapRequest(req, res) {
    const method = req.method ?? 'GET'
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('method not allowed\n')
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    if (pathname === routePath) {
      res.writeHead(308, { Location: `${routePath}/`, 'Cache-Control': 'no-store' })
      res.end()
      return
    }
    if (!pathname.startsWith(`${routePath}/`)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('not found\n')
      return
    }
    const rest = pathname.slice(routePath.length)
    const lastSegment = rest.split('/').at(-1) ?? ''
    if (WITHHELD_ASSETS.has(lastSegment)) {
      // Deliberately not served: a service worker registered on the harness
      // origin would outlive this plugin. The page tolerates the failed
      // registration, so this is a clean 404 rather than a persistent scope.
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('not found\n')
      return
    }
    if (rest === '/api/status') {
      const library = store === undefined ? createEmptyLibrary() : await store.read()
      const body = JSON.stringify({ ok: true, ...libraryStatus(library, { practiceUrl: practiceUrl(), routePath: `${routePath}/` }) }, null, 2)
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      if (method === 'HEAD') res.end()
      else res.end(body)
      return
    }
    const route = ASSET_ROUTES[rest]
    if (route === undefined) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('not found\n')
      return
    }
    let body
    try {
      body = await readFile(join(assetsDir, route.file))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(`asset unavailable: ${route.file}\n`)
      return
    }
    const immutable = route.type.startsWith('image/') || route.type.startsWith('application/manifest')
    res.writeHead(200, {
      'Content-Type': route.type,
      'Content-Length': body.length,
      'Cache-Control': immutable ? 'public, max-age=3600' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-WordSnap-Plugin': PACKAGE_NAME,
    })
    if (method === 'HEAD') res.end()
    else res.end(body)
  }
}

/** Build the loopback RPC handler the client panel talks to. */
export function createRpcHandler({ store, practiceUrl = () => null, routePath = ROUTE_PATH }) {
  const libraryView = async () => {
    const library = await store.read()
    return {
      status: { ok: true, ...libraryStatus(library, { practiceUrl: practiceUrl(), routePath: `${routePath}/` }), warnings: store.warnings() },
      pull: {
        revision: library.revision,
        settings: { ...library.settings },
        words: library.words.map(word => ({ en: word.en, zh: word.zh })),
      },
    }
  }
  return async function handleRpc(endpoint, payload) {
    try {
      if (endpoint === 'status') {
        const view = await libraryView()
        return { ok: true, value: { ...view.status, libraryRevision: view.pull.revision } }
      }
      if (endpoint === 'pull') {
        const view = await libraryView()
        return { ok: true, value: { revision: view.pull.revision, settings: view.pull.settings, words: view.pull.words, practiceUrl: practiceUrl(), routePath: `${routePath}/` } }
      }
      if (endpoint === 'sync') {
        const report = payload !== null && typeof payload === 'object' ? /** @type {Record<string, unknown>} */ (payload).report : null
        const libraryRevision = payload !== null && typeof payload === 'object' ? /** @type {Record<string, unknown>} */ (payload).libraryRevision : undefined
        const appliedAt = payload !== null && typeof payload === 'object' ? /** @type {Record<string, unknown>} */ (payload).appliedAt : undefined
        if (report === null || typeof report !== 'object') {
          return { ok: false, error: { code: 'internal', message: 'wordsnap: sync requires a report object', details: {} } }
        }
        await writeReport(store, report, {
          libraryRevision: Number.isFinite(Number(libraryRevision)) ? Math.max(0, Math.round(Number(libraryRevision))) : undefined,
          appliedAt: typeof appliedAt === 'string' ? appliedAt.slice(0, 40) : undefined,
        })
        const view = await libraryView()
        return { ok: true, value: { ...view.status, libraryRevision: view.pull.revision } }
      }
      return { ok: false, error: { code: 'internal', message: `wordsnap: unknown endpoint "${endpoint}"`, details: {} } }
    } catch (error) {
      return { ok: false, error: { code: 'internal', message: `wordsnap: ${String(/** @type {Error} */ (error)?.message ?? error)}`, details: {} } }
    }
  }
}

export function apply(ctx, config = {}) {
  const storeFile = typeof config.storeFile === 'string' && config.storeFile !== '' ? resolve(config.storeFile) : defaultStoreFile()
  const routePath = typeof config.routePath === 'string' && config.routePath !== '' ? config.routePath : ROUTE_PATH
  const store = createLibraryStore(storeFile)
  /** @type {null | (() => string | null)} */
  let practiceUrl = () => null

  if (config.systemPrompt !== false) {
    ctx.systemPrompt.section({ name: 'wordsnap', order: 150, text: SYSTEM_PROMPT })
  }

  // Web-only: the static page and the panel RPC channel. Both are optional so
  // a non-web composition still gets the tools (the panel is simply absent).
  ctx.inject(['webServer'], scope => {
    practiceUrl = () => {
      const host = scope.webServer.host === '0.0.0.0' ? '127.0.0.1' : scope.webServer.host
      return `http://${host}:${scope.webServer.port}${routePath}/`
    }
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: routePath,
      handler: createStaticHandler({ store, routePath, practiceUrl }),
    }), 'wordsnap: /wordsnap static route')
  })

  ctx.inject(['connection'], scope => {
    scope.effect(() => scope.connection.rpc.handle(
      RPC_PATH,
      createRpcHandler({ store, practiceUrl, routePath }),
      { authority: 'loopback' },
    ), `wordsnap: ${RPC_PATH} rpc channel`)
  })

  ctx.tools.register(tool(
    'wordsnap_status',
    'Read the Word Snap shared library and the page\'s last self-reported practice snapshot. Read-only; the browser stays the only writer of progress.',
    objectSchema({}),
    statusOutputSchema,
    async () => {
      const library = await store.read()
      const status = libraryStatus(library, { practiceUrl: practiceUrl(), routePath: `${routePath}/` })
      return { ok: true, ...status, warnings: store.warnings(), limits: { ...LIMITS } }
    },
  ))

  ctx.tools.register(tool(
    'wordsnap_import_words',
    'Add words to the Word Snap shared library (merge, or replace the whole list). Accepts the app\'s AI/import text (`@lang`/`@round`/`@time` config lines, then one `word,meaning` per line) and/or `words: [{en, zh}]`. The in-GUI panel applies the library to the page when the learner syncs.',
    objectSchema({
      text: { type: 'string', description: `Import text in the app's own format. Cap ${LIMITS.maxImportTextChars} characters.` },
      words: {
        type: 'array',
        items: objectSchema({ en: { type: 'string' }, zh: { type: 'string' } }, ['en', 'zh']),
        description: `Structured pairs. Cap ${LIMITS.maxImportEntries} entries per call.`,
      },
      mode: { type: 'string', enum: ['merge', 'replace'], description: 'merge (default) keeps existing entries; replace installs exactly this list.' },
      source: { type: 'string', description: 'Provenance label; use "learner" for words the learner supplied.' },
    }),
    importOutputSchema,
    async args => importWords(store, args ?? {}),
    { concurrencySafe: false, kind: 'write' },
  ))

  ctx.tools.register(tool(
    'wordsnap_open',
    'Ask the in-GUI Word Snap panel to open once for the current revision. Returns the practice URL; it does not start practice or write progress.',
    objectSchema({ reason: { type: 'string', description: 'Short reason shown to the learner, at most 200 characters.' } }),
    openOutputSchema,
    async args => {
      const practice = { path: `${routePath}/`, url: practiceUrl() }
      try {
        return await requestOpen(store, args ?? {}, practice)
      } catch (error) {
        return { ok: false, status: 'error', revision: 0, practice, note: String(/** @type {Error} */ (error)?.message ?? error) }
      }
    },
    { concurrencySafe: false, kind: 'write' },
  ))
}
