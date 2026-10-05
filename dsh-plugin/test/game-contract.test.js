// Drift guard between the shipped game and the plugin.
//
// The plugin never edits the game, but the browser client reads and writes the
// game's saved state directly. When Word Snap changes, re-run
// `npm run sync:assets`; if the game changed anything this plugin depends on,
// this file fails and says which contract moved.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const assetPath = new URL('../assets/vocabulary-match.html', import.meta.url)
const clientPath = new URL('../lib/client.js', import.meta.url)
const html = await readFile(fileURLToPath(assetPath), 'utf8')
const clientSource = await readFile(fileURLToPath(clientPath), 'utf8')

test('the game still saves under the storage key the client reads and writes', () => {
  assert.match(clientSource, /duo_like_word_match_v1/)
  assert.ok(html.includes('"duo_like_word_match_v1"') || html.includes("'duo_like_word_match_v1'"),
    'the game no longer uses duo_like_word_match_v1; update GAME_STORAGE_KEY in lib/client.js')
})

test('the game still understands the saved fields the client depends on', () => {
  for (const field of ['words', 'settings', 'langPair', 'roundSize', 'levelDurationMs', 'box', 'custom', 'mastered', 'mistakes', 'streak', 'score', 'savedAt']) {
    assert.ok(html.includes(field), `the game no longer mentions "${field}"`)
  }
})

test('the game clamps settings to the same ranges as the client', () => {
  // The client constants: ROUND_MIN/MAX and LEVEL_MS_MIN/MAX.
  const range = name => Number(new RegExp(`const ${name} = (\\d+);`).exec(clientSource)?.[1])
  assert.match(html, new RegExp(`clampNumber\\(raw\\.roundSize, ${range('ROUND_MIN')}, ${range('ROUND_MAX')},`))
  assert.match(html, new RegExp(`clampNumber\\(raw\\.levelDurationMs, ${range('LEVEL_MS_MIN')}, ${range('LEVEL_MS_MAX')},`))
})

test('the game tolerates the service worker the plugin deliberately 404s', () => {
  // `/wordsnap/service-worker.js` is withheld on purpose; the page must keep
  // swallowing a failed registration instead of surfacing it.
  assert.match(html, /serviceWorker\.register\([^)]*\)\.catch\(/)
})
