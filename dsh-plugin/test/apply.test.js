// Host-half apply() tests.
//
// The plugin's real entry point is `apply(ctx, config)`, so this drives it with
// a fake Cordis context: captured services, captured injections, and captured
// tool definitions. Every declared output schema is then validated against the
// values the tools actually return, which is what catches schema drift before
// the model ever sees a call.
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply, defaultStoreFile } from '../lib/host.js'
import { LIMITS } from '../lib/library.js'

/** Minimal JSON Schema check over the subset these tools declare. */
function validate(value, schema, path = '$') {
  const fail = message => { throw new Error(`${path}: ${message}`) }
  if (schema === undefined) return
  if (Array.isArray(schema.oneOf)) {
    const errors = []
    for (const option of schema.oneOf) {
      try {
        validate(value, option, path)
        return
      } catch (error) {
        errors.push(error.message)
      }
    }
    fail(`matches no oneOf branch (${errors.join(' | ')})`)
  }
  switch (schema.type) {
    case 'object': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`expected object, got ${Array.isArray(value) ? 'array' : typeof value}`)
      for (const key of Object.keys(value)) {
        if (schema.additionalProperties === false && !(key in (schema.properties ?? {}))) fail(`unexpected key "${key}"`)
      }
      for (const key of schema.required ?? []) {
        if (!(key in value)) fail(`missing required key "${key}"`)
      }
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        if (key in value) validate(value[key], sub, `${path}.${key}`)
      }
      return
    }
    case 'array': {
      if (!Array.isArray(value)) fail(`expected array, got ${typeof value}`)
      value.forEach((item, index) => validate(item, schema.items, `${path}[${index}]`))
      return
    }
    case 'string': {
      if (typeof value !== 'string') fail(`expected string, got ${typeof value}`)
      if (schema.enum !== undefined && !schema.enum.includes(value)) fail(`"${value}" is not one of ${schema.enum.join(', ')}`)
      return
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`expected number, got ${typeof value}`)
      return
    }
    case 'boolean': {
      if (typeof value !== 'boolean') fail(`expected boolean, got ${typeof value}`)
      return
    }
    case 'null': {
      if (value !== null) fail('expected null')
      return
    }
    default:
      return
  }
}

function fakeContext() {
  const state = {
    tools: new Map(),
    sections: [],
    injections: [],
    routes: [],
    channels: [],
    effects: [],
  }
  const effect = (factory, label) => {
    state.effects.push(label)
    const disposer = factory()
    return typeof disposer === 'function' ? disposer : () => {}
  }
  const ctx = {
    systemPrompt: { section: section => { state.sections.push(section); return () => {} } },
    tools: { register: definition => { state.tools.set(definition.name, definition); return () => {} } },
    inject: (deps, callback) => {
      state.injections.push([...deps])
      if (deps.includes('webServer')) {
        callback({
          effect,
          webServer: {
            host: '127.0.0.1',
            port: 4242,
            register: route => { state.routes.push(route); return () => {} },
          },
        })
      }
      if (deps.includes('connection')) {
        callback({
          effect,
          connection: {
            rpc: {
              handle: (channel, handler, options) => {
                state.channels.push({ channel, handler, options })
                return async () => {}
              },
            },
          },
        })
      }
      return {}
    },
  }
  return { ctx, state }
}

async function withAppliedPlugin(run) {
  const dir = await mkdtemp(join(tmpdir(), 'wordsnap-apply-'))
  const storeFile = join(dir, 'library.json')
  const { ctx, state } = fakeContext()
  apply(ctx, { storeFile, systemPrompt: true })
  try {
    await run({ state, storeFile, call: (name, args) => state.tools.get(name).execute(args ?? {}, {}) })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('apply registers the prompt section, three tools, and both optional web faces', async () => {
  await withAppliedPlugin(async ({ state }) => {
    assert.deepEqual(state.sections.map(section => section.name), ['wordsnap'])
    assert.equal(state.sections[0].order, 150)
    assert.match(state.sections[0].text, /wordsnap_status/)

    assert.deepEqual([...state.tools.keys()], ['wordsnap_status', 'wordsnap_import_words', 'wordsnap_open'])
    for (const definition of state.tools.values()) {
      assert.equal(typeof definition.description, 'string')
      assert.equal(definition.parameters.type, 'object')
      assert.equal(definition.output.schema.type, 'object')
      assert.equal(typeof definition.output.render, 'function')
      assert.deepEqual(definition.output.render({}, { ok: true }).map(block => block.type), ['text'])
      assert.equal(typeof definition.isConcurrencySafe(), 'boolean')
      assert.equal(definition.presentCall().kind, definition.name === 'wordsnap_status' ? 'read' : 'write')
    }
    assert.equal(state.tools.get('wordsnap_status').isConcurrencySafe(), true)
    assert.equal(state.tools.get('wordsnap_import_words').isConcurrencySafe(), false)

    assert.deepEqual(state.injections, [['webServer'], ['connection']])
    assert.deepEqual(state.routes.map(route => [route.kind, route.path]), [['prefix', '/wordsnap']])
    assert.deepEqual(state.channels.map(channel => [channel.channel, channel.options.authority]), [['/wordsnap-rpc', 'loopback']])
    assert.notEqual(
      state.routes[0].path,
      state.channels[0].channel,
      'the page prefix and the RPC channel prefix must differ or the web server rejects the duplicate route',
    )
  })
})

test('wordsnap_status reports an empty library and the live practice URL', async () => {
  await withAppliedPlugin(async ({ call, state }) => {
    const status = await call('wordsnap_status')
    validate(status, state.tools.get('wordsnap_status').output.schema)
    assert.equal(status.ok, true)
    assert.equal(status.library.count, 0)
    assert.equal(status.library.revision, 0)
    assert.equal(status.browser, null)
    assert.deepEqual(status.practice, { path: '/wordsnap/', url: 'http://127.0.0.1:4242/wordsnap/' })
    assert.deepEqual(status.warnings, [])
    assert.equal(status.limits.maxLibraryEntries, LIMITS.maxLibraryEntries)
  })
})

test('wordsnap_import_words applies text, is idempotent, and rejects empty input', async () => {
  await withAppliedPlugin(async ({ call, state }) => {
    const schema = state.tools.get('wordsnap_import_words').output.schema
    const first = await call('wordsnap_import_words', {
      text: '@lang: English | 中文\n@round: 25\n@time: 90\napple,苹果\nbanana = 香蕉\napple,苹果\nnot a pair at all',
    })
    validate(first, schema)
    assert.equal(first.ok, true)
    assert.equal(first.status, 'applied')
    assert.equal(first.added, 2)
    assert.equal(first.duplicates, 1)
    assert.equal(first.total, 2)
    assert.equal(first.revision, 1)
    assert.deepEqual(first.settings, { langPair: { a: 'English', b: '中文' }, roundSize: 25, levelDurationMs: 90000 })
    assert.deepEqual(first.sample, [{ en: 'apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }])
    assert.match(first.note, /not recognised|unusable/)

    const again = await call('wordsnap_import_words', { text: 'apple,苹果\nbanana = 香蕉' })
    validate(again, schema)
    assert.equal(again.status, 'unchanged')
    assert.equal(again.revision, 1, 'an unchanged import must not bump the revision')

    const structured = await call('wordsnap_import_words', { words: [{ en: 'cherry', zh: '樱桃' }] })
    assert.equal(structured.status, 'applied')
    assert.equal(structured.added, 1)
    assert.equal(structured.revision, 2)

    const replace = await call('wordsnap_import_words', { words: [{ en: 'damson', zh: '李子' }], mode: 'replace' })
    assert.equal(replace.removed, 3)
    assert.equal(replace.total, 1)

    const rejected = await call('wordsnap_import_words', {})
    validate(rejected, schema)
    assert.equal(rejected.ok, false)
    assert.equal(rejected.status, 'rejected')
    assert.match(rejected.note, /Provide `text`/)

    const oversized = await call('wordsnap_import_words', { text: 'a'.repeat(LIMITS.maxImportTextChars + 1) })
    validate(oversized, schema)
    assert.equal(oversized.status, 'rejected')
    assert.match(oversized.note, /cap is 200000/)
  })
})

test('wordsnap_import_words drops malformed entries and caps the batch', async () => {
  await withAppliedPlugin(async ({ call, state }) => {
    const schema = state.tools.get('wordsnap_import_words').output.schema
    const result = await call('wordsnap_import_words', {
      words: [{ en: 'ok', zh: '好' }, { en: 'missing' }, null, { en: '', zh: '' }],
    })
    validate(result, schema)
    assert.equal(result.added, 1)
    assert.equal(result.duplicates, 3)

    const many = Array.from({ length: LIMITS.maxImportEntries + 5 }, (_, index) => ({ en: `w${index}`, zh: `z${index}` }))
    const capped = await call('wordsnap_import_words', { words: many })
    validate(capped, schema)
    assert.equal(capped.added, LIMITS.maxImportEntries)
    assert.equal(capped.sources.truncated, true)
  })
})

test('wordsnap_open bumps exactly one revision the panel can apply once', async () => {
  await withAppliedPlugin(async ({ call, state }) => {
    const schema = state.tools.get('wordsnap_open').output.schema
    const first = await call('wordsnap_open', { reason: '先练这 5 个词' })
    validate(first, schema)
    assert.equal(first.status, 'requested')
    assert.equal(first.revision, 1)
    assert.deepEqual(first.practice, { path: '/wordsnap/', url: 'http://127.0.0.1:4242/wordsnap/' })

    const status = await call('wordsnap_status')
    assert.equal(status.panel.openRevision, 1)
    assert.equal(status.panel.reason, '先练这 5 个词')

    const second = await call('wordsnap_open', {})
    assert.equal(second.revision, 2)
    assert.equal((await call('wordsnap_status')).panel.reason, null)
  })
})

test('the imported library is visible to the panel RPC handler through the same store', async () => {
  await withAppliedPlugin(async ({ call, state }) => {
    await call('wordsnap_import_words', { text: '@round: 30\napple,苹果' })
    const rpc = state.channels[0].handler
    const pull = await rpc('pull', {})
    assert.equal(pull.ok, true)
    assert.deepEqual(pull.value.words, [{ en: 'apple', zh: '苹果' }])
    assert.equal(pull.value.settings.roundSize, 30)
    assert.equal(pull.value.routePath, '/wordsnap/')
  })
})

test('the default store path and config surface stay stable', () => {
  assert.match(defaultStoreFile({ DSH_HOME: '/tmp/home' }), /\/tmp\/home\/wordsnap\/library\.json$/)
  const { ctx } = fakeContext()
  assert.doesNotThrow(() => apply(ctx, { storeFile: '/tmp/wordsnap-config-test/library.json', systemPrompt: false }))
})
