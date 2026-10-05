// Library-core tests: parsing, merging, persistence bounds.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  LIMITS,
  applyImportSettings,
  createEmptyLibrary,
  libraryStatus,
  mergeWords,
  normalizeEntryList,
  normalizeLibrary,
  normalizeReport,
  pairKey,
  parseEntryLine,
  parseImportText,
  readLibraryFile,
  writeLibraryFile,
} from '../lib/library.js'

test('parseEntryLine follows the app separator priority (tab, =, full-width comma, comma)', () => {
  assert.deepEqual(parseEntryLine('apple,苹果'), ['apple', '苹果'])
  assert.deepEqual(parseEntryLine('apple，苹果'), ['apple', '苹果'])
  assert.deepEqual(parseEntryLine('apple = 苹果'), ['apple', '苹果'])
  assert.deepEqual(parseEntryLine('apple\t苹果'), ['apple', '苹果'])
  // First separator wins, so a meaning may keep its own commas.
  assert.deepEqual(parseEntryLine('take part in,参加,参与'), ['take part in', '参加,参与'])
  // Tab outranks a comma that appears earlier in the line.
  assert.deepEqual(parseEntryLine('a,b\tc'), ['a,b', 'c'])
  // Spaced dash keeps hyphenated words intact.
  assert.deepEqual(parseEntryLine('well-known - 著名的'), ['well-known', '著名的'])
  assert.equal(parseEntryLine('well-known'), null)
  assert.equal(parseEntryLine('   '), null)
  assert.equal(parseEntryLine(',only-meaning'), null)
})

test('parseImportText reads config lines, tolerates fences/bullets, and counts skips', () => {
  const parsed = parseImportText([
    '```',
    '@lang: English | 日本語',
    '@round: 25',
    '@time: 90',
    '# a comment',
    '- apple,苹果',
    '2. banana,香蕉',
    'take part in = 参加する',
    '',
    'this line is not a pair',
    'apple,苹果',
    '```',
  ].join('\n'))
  assert.deepEqual(parsed.config, { lang: { a: 'English', b: '日本語' }, round: 25, time: 90 })
  assert.deepEqual(parsed.entries.map(entry => [entry.en, entry.zh]), [
    ['apple', '苹果'],
    ['banana', '香蕉'],
    ['take part in', '参加する'],
  ])
  assert.equal(parsed.skipped, 1)
  assert.equal(parsed.duplicates, 1)
  assert.equal(parsed.truncated, false)
})

test('parseImportText caps entries and field length', () => {
  const long = 'x'.repeat(LIMITS.maxFieldChars + 20)
  const parsed = parseImportText(`word,${long}`)
  assert.equal(parsed.entries[0].zh.length, LIMITS.maxFieldChars)
  assert.deepEqual(parsed.truncatedFields, [long.slice(0, LIMITS.maxFieldChars)])
})

test('normalizeEntryList drops junk, dedupes, and caps', () => {
  const result = normalizeEntryList([
    { en: 'apple', zh: '苹果' },
    { en: ' apple ', zh: '苹果' },
    { en: 'banana', zh: '香蕉', source: 'learner' },
    { en: '', zh: '空' },
    null,
    'nope',
  ])
  assert.equal(result.entries.length, 2)
  assert.equal(result.dropped, 4)
  assert.equal(result.entries[1].source, 'learner')
  assert.equal(normalizeEntryList(undefined).entries.length, 0)
})

test('mergeWords merges, reports duplicates, and replaces', () => {
  const existing = [{ en: 'apple', zh: '苹果', source: 'agent' }]
  const merged = mergeWords(existing, [{ en: 'Apple', zh: '苹果' }, { en: 'banana', zh: '香蕉' }], 'merge')
  assert.equal(merged.added, 1)
  assert.equal(merged.duplicates, 1)
  assert.equal(merged.words.length, 2)
  const replaced = mergeWords(existing, [{ en: 'cherry', zh: '樱桃' }], 'replace')
  assert.equal(replaced.removed, 1)
  assert.deepEqual(replaced.words.map(word => word.en), ['cherry'])
})

test('mergeWords stops at the library cap', () => {
  const existing = Array.from({ length: LIMITS.maxLibraryEntries }, (_, index) => ({ en: `w${index}`, zh: `z${index}` }))
  const merged = mergeWords(existing, [{ en: 'overflow', zh: '溢出' }], 'merge')
  assert.equal(merged.added, 0)
  assert.equal(merged.truncated, true)
  assert.equal(merged.words.length, LIMITS.maxLibraryEntries)
})

test('applyImportSettings only writes the keys the import carried', () => {
  const before = { roundSize: 30, levelDurationMs: 60000 }
  assert.deepEqual(applyImportSettings(before, {}), before)
  assert.deepEqual(applyImportSettings(before, { round: 1000 }), { roundSize: 200, levelDurationMs: 60000 })
  assert.deepEqual(applyImportSettings(before, { time: 1 }), { roundSize: 30, levelDurationMs: 20000 })
  assert.deepEqual(applyImportSettings(before, { lang: { a: 'English', b: '日本語' } }).langPair, { a: 'English', b: '日本語' })
})

test('normalizeLibrary round-trips, rejects foreign schemas, and dedupes', () => {
  const empty = createEmptyLibrary('2026-01-01T00:00:00.000Z')
  assert.deepEqual(normalizeLibrary(empty), empty)
  assert.deepEqual(normalizeLibrary({ schema: 'other', words: [] }), createEmptyLibrary(normalizeLibrary({ schema: 'other' }).updatedAt))
  const normalized = normalizeLibrary({
    schema: 'wordsnap.library/v1',
    revision: '3',
    words: [{ en: 'apple', zh: '苹果' }, { en: 'APPLE', zh: '苹果' }, { en: '', zh: 'x' }],
    settings: { langPair: { a: 'A', b: 'B' }, junk: true },
    openRequest: { revision: '2', at: 'now', reason: 'r' },
  })
  assert.equal(normalized.revision, 3)
  assert.equal(normalized.words.length, 1)
  assert.deepEqual(Object.keys(normalized.settings), ['langPair'])
  assert.deepEqual(normalized.openRequest, { revision: 2, at: 'now', reason: 'r' })
})

test('normalizeReport bounds weak words, box counts, and numbers', () => {
  const report = normalizeReport({
    wordCount: '120',
    mastered: '7',
    boxCounts: [1, 2, 3, 4, 5, 6, 7],
    weak: Array.from({ length: LIMITS.maxReportWeakWords + 10 }, (_, index) => ({ en: `w${index}`, zh: `z${index}`, box: 2, mistakes: 1 })),
    settings: { roundSize: 25, junk: 1 },
    round: -5,
  }, '2026-01-02T00:00:00.000Z')
  assert.equal(report.wordCount, 120)
  assert.equal(report.mastered, 7)
  assert.equal(report.boxCounts.length, 6)
  assert.equal(report.weak.length, LIMITS.maxReportWeakWords)
  assert.equal(report.round, 0)
  assert.deepEqual(Object.keys(report.settings), ['roundSize'])
  assert.equal(normalizeReport(null), null)
})

test('libraryStatus bounds recent entries and weak words', () => {
  const library = normalizeLibrary({
    schema: 'wordsnap.library/v1',
    revision: 4,
    words: Array.from({ length: 30 }, (_, index) => ({ en: `w${index}`, zh: `z${index}` })),
    openRequest: { revision: 2, at: 'now', reason: null },
    report: normalizeReport({
      wordCount: 30,
      weak: Array.from({ length: 40 }, (_, index) => ({ en: `w${index}`, zh: `z${index}`, box: 1, mistakes: 1 })),
    }),
  })
  const status = libraryStatus(library, { practiceUrl: 'http://127.0.0.1:1/wordsnap/', routePath: '/wordsnap/' })
  assert.equal(status.library.count, 30)
  assert.equal(status.library.recent.length, LIMITS.maxStatusRecent)
  assert.equal(status.library.recent.at(-1).en, 'w29')
  assert.equal(status.browser.weak.length, 20)
  assert.equal(status.browser.weakCount, 40)
  assert.equal(status.panel.openRevision, 2)
  assert.equal(status.practice.url, 'http://127.0.0.1:1/wordsnap/')
})

test('readLibraryFile and writeLibraryFile round-trip, warn on corruption, and stay atomic', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wordsnap-library-'))
  const file = join(dir, 'nested', 'library.json')
  try {
    const missing = await readLibraryFile(file)
    assert.deepEqual(missing.library.words, [])
    assert.deepEqual(missing.warnings, [])

    const library = normalizeLibrary({
      schema: 'wordsnap.library/v1',
      revision: 1,
      words: [{ en: 'apple', zh: '苹果' }],
    })
    await writeLibraryFile(file, library)
    const loaded = await readLibraryFile(file)
    assert.deepEqual(loaded.library.words.map(word => word.en), ['apple'])
    assert.equal(JSON.parse(await readFile(file, 'utf8')).schema, 'wordsnap.library/v1')

    await writeFile(file, '{ not json')
    const corrupt = await readLibraryFile(file)
    assert.deepEqual(corrupt.library.words, [])
    assert.equal(corrupt.warnings.length, 1)
    assert.match(corrupt.warnings[0], /cannot parse/)

    // No temp files survive a successful write.
    const { readdir } = await import('node:fs/promises')
    assert.deepEqual(await readdir(join(dir, 'nested')), ['library.json'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('pairKey matches the app dedupe rule', () => {
  assert.equal(pairKey('Apple', '苹果'), 'apple::苹果')
})
