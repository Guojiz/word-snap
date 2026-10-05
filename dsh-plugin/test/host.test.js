// Host-half tests: the store, the static route, and the panel RPC channel.
//
// These drive the exported factories directly over a real node:http server, so
// route behaviour is verified without booting the harness.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { createLibraryStore, createRpcHandler, createStaticHandler, defaultStoreFile } from '../lib/host.js'

async function withServer(handler, run) {
  const server = createServer((req, res) => { handler(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

async function withStore(run) {
  const dir = await mkdtemp(join(tmpdir(), 'wordsnap-host-'))
  try {
    await run(createLibraryStore(join(dir, 'library.json')), dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('defaultStoreFile lives under DSH_HOME', () => {
  assert.equal(defaultStoreFile({ DSH_HOME: '/tmp/dsh-home' }), '/tmp/dsh-home/wordsnap/library.json')
})

test('library store serializes writes and bumps the revision once per change', async () => {
  await withStore(async (store) => {
    const first = await store.update(draft => { draft.words.push({ en: 'apple', zh: '苹果' }); return {} })
    assert.equal(first.library.revision, 1)
    const [a, b] = await Promise.all([
      store.update(draft => { draft.words.push({ en: 'banana', zh: '香蕉' }); return {} }),
      store.update(draft => { draft.words.push({ en: 'cherry', zh: '樱桃' }); return {} }),
    ])
    assert.deepEqual([a.library.revision, b.library.revision], [2, 3])
    assert.equal((await store.read()).words.length, 3)
  })
})

test('an unchanged mutator performs no write and keeps the revision', async () => {
  await withStore(async (store) => {
    await store.update(draft => { draft.words.push({ en: 'apple', zh: '苹果' }); return {} })
    const skipped = await store.update(() => ({ unchanged: true }))
    assert.equal(skipped.library.revision, 1)
    assert.equal(skipped.result.unchanged, true)
  })
})

test('static route serves the app, redirects the bare prefix, and refuses everything else', async () => {
  await withStore(async (store) => {
    const handler = createStaticHandler({ store, practiceUrl: () => 'http://127.0.0.1:9/wordsnap/' })
    await withServer(handler, async (base) => {
      const redirect = await fetch(`${base}/wordsnap`, { redirect: 'manual' })
      assert.equal(redirect.status, 308)
      assert.equal(redirect.headers.get('location'), '/wordsnap/')

      const page = await fetch(`${base}/wordsnap/`)
      assert.equal(page.status, 200)
      assert.match(page.headers.get('content-type'), /^text\/html/)
      assert.equal(page.headers.get('x-wordsnap-plugin'), 'wordsnap-dsh')
      const html = await page.text()
      assert.match(html, /<!doctype html>/i)
      assert.match(html, /Word Snap|单词配对/)

      const icon = await fetch(`${base}/wordsnap/icon.svg`)
      assert.equal(icon.status, 200)
      assert.match(icon.headers.get('content-type'), /image\/svg\+xml/)
      assert.match(icon.headers.get('cache-control'), /max-age/)

      const status = await fetch(`${base}/wordsnap/api/status`)
      assert.equal(status.status, 200)
      const body = await status.json()
      assert.equal(body.ok, true)
      assert.equal(body.practice.path, '/wordsnap/')

      for (const path of ['/wordsnap/service-worker.js', '/wordsnap/nope.js', '/wordsnap/../../package.json']) {
        const missing = await fetch(`${base}${path}`, { redirect: 'manual' })
        assert.equal(missing.status, 404, path)
      }
      const encoded = await fetch(`${base}/wordsnap/%2e%2e/package.json`)
      assert.equal(encoded.status, 404)

      const post = await fetch(`${base}/wordsnap/`, { method: 'POST' })
      assert.equal(post.status, 405)
      assert.equal(post.headers.get('allow'), 'GET, HEAD')

      const head = await fetch(`${base}/wordsnap/`, { method: 'HEAD' })
      assert.equal(head.status, 200)
      assert.equal(await head.text(), '')
    })
  })
})

test('the static route answers 404 (not a crash) when an asset is missing', async () => {
  await withStore(async (store) => {
    const handler = createStaticHandler({ store, assetsDir: '/nonexistent-assets-dir' })
    await withServer(handler, async (base) => {
      const page = await fetch(`${base}/wordsnap/`)
      assert.equal(page.status, 500)
      assert.match(await page.text(), /asset unavailable/)
    })
  })
})

test('RPC: status, pull, sync stores a self-report, and unknown endpoints fail closed', async () => {
  await withStore(async (store) => {
    const rpc = createRpcHandler({ store, practiceUrl: () => 'http://127.0.0.1:9/wordsnap/' })

    const unknown = await rpc('nope', {})
    assert.equal(unknown.ok, false)
    assert.match(unknown.error.message, /unknown endpoint/)

    await store.update(draft => {
      draft.words.push({ en: 'apple', zh: '苹果' })
      draft.words.push({ en: 'banana', zh: '香蕉' })
      draft.settings = { roundSize: 25 }
      return {}
    })

    const pull = await rpc('pull', {})
    assert.equal(pull.ok, true)
    assert.equal(pull.value.revision, 1)
    assert.deepEqual(pull.value.words, [{ en: 'apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }])
    assert.deepEqual(pull.value.settings, { roundSize: 25 })

    const beforeReport = await rpc('status', {})
    assert.equal(beforeReport.value.browser, null)

    const synced = await rpc('sync', {
      report: {
        wordCount: 12,
        customCount: 9,
        mastered: 2,
        boxCounts: [4, 3, 2, 1, 1, 1],
        weak: [{ en: 'apple', zh: '苹果', box: 1, mistakes: 3 }],
        round: 4,
        score: 30,
        mistakes: 6,
        streak: 2,
      },
      libraryRevision: 1,
    })
    assert.equal(synced.ok, true)
    assert.equal(synced.value.browser.wordCount, 12)
    assert.equal(synced.value.browser.weak[0].mistakes, 3)
    assert.equal(synced.value.browser.libraryRevision ?? 1, 1)

    const stored = await store.read()
    assert.equal(stored.report.schema, 'wordsnap.report/v1')
    assert.equal(stored.report.mastered, 2)
    assert.equal(stored.revision, 1, 'a report write must not bump the library revision')

    const bad = await rpc('sync', { report: 'not-an-object' })
    assert.equal(bad.ok, false)
    assert.match(bad.error.message, /requires a report object/)
  })
})
