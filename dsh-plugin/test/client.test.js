// Client-half tests.
//
// The client bundle is a self-contained `window.__ModuleLoader__.load(...)`
// script, so this test materializes it exactly the way the web shell does: a
// fake `window`/`document`/`require` in, the plugin module out. The pure
// browser logic (game-storage merge, report building, open-once-per-revision)
// runs against a fake localStorage, and — when a React 18 build is reachable —
// both registered components are server-rendered for real.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const clientPath = fileURLToPath(new URL('../lib/client.js', import.meta.url))

function resolveFrom(dir, spec) {
  try {
    return createRequire(join(dir, 'noop.js')).resolve(spec)
  } catch (error) {
    return null
  }
}

/** Find a React 18 build: the profile's shared store is where the shell keeps it. */
function findReact() {
  const candidates = [
    process.env.DSH_WORDSNAP_REACT_DIR,
    process.env.DSH_HOME ? join(process.env.DSH_HOME, 'profiles', 'node_modules') : null,
    join(homedir(), '.dsh', 'profiles', 'node_modules'),
    join(fileURLToPath(new URL('..', import.meta.url)), 'node_modules'),
  ].filter(Boolean)
  for (const dir of candidates) {
    const react = resolveFrom(dir, 'react')
    const server = resolveFrom(dir, 'react-dom/server')
    if (react !== null && server !== null) return { react, server }
  }
  return null
}

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: key => { map.delete(key) },
    _map: map,
  }
}

/** Materialize the client bundle the way the web shell does. */
async function loadClientModule({ storage = fakeStorage(), react = null } = {}) {
  const source = await readFile(clientPath, 'utf8')
  const records = []
  const styles = []
  const window = {
    __ModuleLoader__: { load: record => { records.push(record) } },
    localStorage: storage,
    setInterval: () => 1,
    clearInterval: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    open: () => {},
  }
  const document = {
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { appendChild: node => styles.push(node) },
  }
  const requireShim = specifier => {
    if (specifier === 'react') return react
    throw new Error(`client bundle required an unexpected module: ${specifier}`)
  }
  // eslint-disable-next-line no-new-func -- the bundle is a script by contract.
  const run = new Function('window', 'document', 'require', source)
  run(window, document, requireShim)
  assert.equal(records.length, 1, 'the bundle registers exactly one module')
  const record = records[0]
  const exports = record.factory(requireShim)
  return { record, exports, styles, storage, window, document }
}

/** Enough React to materialize the module when no real build is reachable. */
const reactStub = Object.freeze({
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: value => ({ current: value }),
})

let reactBuild = null
let reactModule = reactStub
const reactPaths = findReact()
if (reactPaths !== null) {
  reactModule = createRequire(reactPaths.react)('react')
  reactBuild = createRequire(reactPaths.server)('react-dom/server')
}

test('the client bundle declares the expected module id and service injections', async () => {
  const { record, exports } = await loadClientModule({ react: reactModule })
  assert.equal(record.id, 'wordsnap-dsh')
  assert.deepEqual(exports.inject, ['slots', 'connection'])
  assert.equal(typeof exports.apply, 'function')
  assert.equal(typeof exports.__test.applyLibrary, 'function')
})

test('apply registers the dock chip and the shell overlay and owns its CSS', async () => {
  const { exports, styles } = await loadClientModule({ react: reactModule })
  const registered = []
  const effects = []
  const ctx = {
    effect: (factory, label) => {
      effects.push(label)
      const disposer = factory()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    slots: {
      inject: (name, callback) => { callback() },
      register: (options, component) => { registered.push({ options, component }) },
    },
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
  }
  exports.apply(ctx)

  assert.equal(styles.length, 1, 'the plugin injects exactly one style tag')
  assert.equal(styles[0].dataset.plugin, 'wordsnap-dsh')
  assert.equal(effects.length, 1)
  assert.deepEqual(registered.map(item => item.options.name), ['conversation.input.dock', 'shell.overlay'])
  assert.deepEqual(registered.map(item => item.options.id), ['wordsnap', 'wordsnap'])
  assert.equal(typeof registered[0].component, 'function')
  assert.equal(typeof registered[1].component, 'function')
})

test('the panel is closed by default and opens through the shared state machine', async () => {
  const { exports } = await loadClientModule({ react: reactModule })
  const registered = []
  exports.apply({
    effect: factory => { factory(); return () => {} },
    slots: { inject: (_name, callback) => callback(), register: (options, component) => registered.push({ options, component }) },
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
  })
  const [chip, panel] = registered.map(item => item.component)

  if (reactBuild === null) {
    assert.equal(exports.__test.isOpen(), false)
    exports.__test.setOpen(true)
    assert.equal(exports.__test.isOpen(), true)
    exports.__test.setOpen(false)
    assert.equal(exports.__test.isOpen(), false)
    return
  }

  const { renderToStaticMarkup } = reactBuild
  const render = component => renderToStaticMarkup(reactModule.createElement(component, {}))

  assert.equal(exports.__test.isOpen(), false)
  assert.equal(render(panel), '', 'a closed panel renders nothing at all')
  const closedChip = render(chip)
  assert.match(closedChip, /Word Snap/)
  assert.match(closedChip, /wsn-chip/)

  exports.__test.setOpen(true)
  const openPanel = render(panel)
  assert.match(openPanel, /wsn-backdrop/)
  assert.match(openPanel, /<iframe/)
  assert.match(openPanel, /\/wordsnap\//)
  assert.match(render(chip), /Word Snap/)
  exports.__test.setOpen(false)
})

test('pendingOpenRevision applies exactly once per revision', async () => {
  const { exports } = await loadClientModule({ react: reactModule })
  const { pendingOpenRevision } = exports.__test
  assert.equal(pendingOpenRevision(null, { appliedOpenRevision: 0 }), 0)
  assert.equal(pendingOpenRevision({ panel: { openRevision: 3 } }, { appliedOpenRevision: 0 }), 3)
  assert.equal(pendingOpenRevision({ panel: { openRevision: 3 } }, { appliedOpenRevision: 3 }), 0)
  assert.equal(pendingOpenRevision({ panel: { openRevision: 2 } }, { appliedOpenRevision: 3 }), 0)
})

test('applyLibrary merges into the page storage without destroying progress or learner words', async () => {
  const storage = fakeStorage({
    duo_like_word_match_v1: JSON.stringify({
      words: [
        { en: 'apple', zh: '苹果', custom: false, box: 3, mistakes: 2, draws: 9, seen: 12 },
        { en: 'cherry', zh: '樱桃', custom: true, box: 0, mistakes: 1, draws: 2 },
      ],
      settings: { roundSize: 40, langPair: { a: 'English', b: '中文' } },
      round: 5,
      score: 42,
    }),
  })
  const { exports } = await loadClientModule({ storage, react: reactModule })
  const applied = exports.__test.applyLibrary({
    words: [{ en: 'Apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }, { en: 'banana', zh: '香蕉' }],
    settings: { roundSize: 20, levelDurationMs: 120000, langPair: { a: 'English', b: '日本語' } },
  })

  assert.equal(applied.written, true)
  assert.equal(applied.added, 1, 'the duplicate pair and the already-present apple add nothing')
  assert.equal(applied.total, 3)

  const saved = JSON.parse(storage.getItem('duo_like_word_match_v1'))
  assert.equal(saved.words.length, 3)
  const apple = saved.words.find(word => word.en === 'apple')
  assert.equal(apple.box, 3, 'existing progress survives the merge')
  assert.equal(apple.seen, 12)
  const cherry = saved.words.find(word => word.en === 'cherry')
  assert.equal(cherry.box, 0, 'a learner-added word the library never listed is preserved')
  const banana = saved.words.find(word => word.en === 'banana')
  assert.deepEqual(banana, { en: 'banana', zh: '香蕉', custom: true }, 'new words use the minimal shape the app rebuilds from')
  assert.equal(saved.settings.roundSize, 20)
  assert.equal(saved.settings.levelDurationMs, 120000)
  assert.deepEqual(saved.settings.langPair, { a: 'English', b: '日本語' })
  assert.equal(saved.round, 5, 'unrelated saved fields are untouched')
})

test('applyLibrary clamps settings to the app ranges and reports a broken storage', async () => {
  const storage = fakeStorage()
  const { exports } = await loadClientModule({ storage, react: reactModule })
  const applied = exports.__test.applyLibrary({
    words: [{ en: 'apple', zh: '苹果' }],
    settings: { roundSize: 9999, levelDurationMs: 1 },
  })
  assert.equal(applied.written, true)
  const saved = JSON.parse(storage.getItem('duo_like_word_match_v1'))
  assert.equal(saved.settings.roundSize, 200)
  assert.equal(saved.settings.levelDurationMs, 20000)

  const blocked = fakeStorage()
  blocked.setItem = () => { throw new Error('quota') }
  const second = await loadClientModule({ storage: blocked, react: reactModule })
  assert.equal(second.exports.__test.applyLibrary({ words: [{ en: 'a', zh: '甲' }] }).written, false)
})

test('buildReport mirrors the app counters and bounds the weak list', async () => {
  const { exports } = await loadClientModule({ react: reactModule })
  const words = [
    { en: 'apple', zh: '苹果', custom: true, box: 0, mistakes: 5, draws: 3 },
    { en: 'banana', zh: '香蕉', custom: false, box: 1, mistakes: 1, draws: 2 },
    { en: 'cherry', zh: '樱桃', custom: true, box: 5, mistakes: 0, draws: 8, mastered: true },
    { en: 'damson', zh: '李子', custom: false, box: 0, mistakes: 0, draws: 0 },
  ]
  const report = exports.__test.buildReport({
    words,
    settings: { roundSize: 25 },
    round: 7,
    score: 99,
    mistakes: 6,
    streak: 4,
    savedAt: '2026-01-01T00:00:00.000Z',
  })
  assert.equal(report.wordCount, 4)
  assert.equal(report.customCount, 2)
  assert.equal(report.mastered, 1)
  assert.deepEqual(report.boxCounts, [2, 1, 0, 0, 0, 1])
  assert.deepEqual(report.weak.map(word => word.en), ['apple', 'banana'], 'undrawn words are not weak; lowest box first')
  assert.equal(report.round, 7)
  assert.equal(report.savedAt, '2026-01-01T00:00:00.000Z')

  const empty = exports.__test.buildReport(null)
  assert.equal(empty.wordCount, 0)
  assert.equal(empty.round, 0)
})

test('localSummary reads the page snapshot without inventing data', async () => {
  const storage = fakeStorage({
    duo_like_word_match_v1: JSON.stringify({
      words: [
        { en: 'apple', zh: '苹果', custom: true, box: 5 },
        { en: 'banana', zh: '香蕉', custom: false, box: 2 },
      ],
    }),
  })
  const { exports } = await loadClientModule({ storage, react: reactModule })
  assert.deepEqual(exports.__test.localSummary(), { wordCount: 2, mastered: 1, custom: 1 })
  assert.deepEqual(exports.__test.localSummary.call(null), { wordCount: 2, mastered: 1, custom: 1 })

  const bare = await loadClientModule({ react: reactModule })
  assert.deepEqual(bare.exports.__test.localSummary(), { wordCount: null, mastered: null, custom: null })
})

test('the module contract matches the shipped client-bundle conventions', async () => {
  const { exports } = await loadClientModule({ react: reactModule })
  const { constants } = exports.__test
  assert.equal(constants.BASE_PATH, '/wordsnap')
  assert.notEqual(constants.RPC_PATH, constants.BASE_PATH, 'the RPC channel cannot share the page prefix route')
  assert.equal(constants.GAME_STORAGE_KEY, 'duo_like_word_match_v1')
  assert.match(constants.PUBLIC_URL, /^https:\/\/guojiz\.github\.io\/word-snap\//)
})
