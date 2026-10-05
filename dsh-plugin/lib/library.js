// Word Snap shared-library core — pure logic, no harness imports.
//
// The Host half owns the durable word library (a JSON file under DSH_HOME) and
// the browser report the in-GUI panel pushes back. Both are plain data, so all
// parsing, merging, and persistence live here where `node --test` can cover
// them without booting the harness.
//
// The browser is a SECOND writer: the game persists its own state under the
// `duo_like_word_match_v1` localStorage key. The plugin never claims the
// browser state as its own; it only accepts a self-reported snapshot.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const LIBRARY_SCHEMA = 'wordsnap.library/v1'
export const REPORT_SCHEMA = 'wordsnap.report/v1'

/** Hard bounds; every one of them is reported to the caller when it bites. */
export const LIMITS = Object.freeze({
  /** Characters accepted in one `wordsnap_import_words` call. */
  maxImportTextChars: 200_000,
  /** Entries accepted in one import call. */
  maxImportEntries: 2_000,
  /** Entries kept in the shared library. */
  maxLibraryEntries: 5_000,
  /** Characters accepted per word/meaning field. */
  maxFieldChars: 200,
  /** Weak words carried in a browser report. */
  maxReportWeakWords: 50,
  /** Recent entries echoed by a status read. */
  maxStatusRecent: 5,
})

// Separators, in the app's own priority order: tab (spreadsheet / Anki paste),
// `=`, full-width comma, ASCII comma. Only the FIRST separator splits the line,
// so a meaning may itself contain commas. Mirrors `normalizePair` in
// vocabulary-match.html — the import contract must not drift between the two.
const SEPARATORS = ['\t', '=', '，', ',']

// `@lang: English | 中文`, `@round: 25`, `@time: 120` — the optional config head
// the app's own "copy AI prompt" asks a model to emit.
const CONFIG_KEYS = Object.freeze({ lang: 'lang', language: 'lang', round: 'round', time: 'time' })

/** One canonical library entry. */
function entry(en, zh, { source = 'agent', addedAt = new Date().toISOString() } = {}) {
  return { en, zh, source, addedAt }
}

/** The dedupe key both this plugin and the app use for the same pair. */
export function pairKey(en, zh) {
  return `${String(en).toLowerCase()}::${zh}`
}

/** Trim and bound one field; returns '' when nothing usable is left. */
export function normalizeField(value) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, LIMITS.maxFieldChars)
}

/**
 * Split one line into its two bounded fields. Mirrors the app's `normalizePair`:
 * the separator priority is tab, `=`, full-width comma, comma, then a spaced
 * dash, and only the FIRST separator splits, so a meaning may keep its commas.
 *
 * @returns `{en, zh, truncated}` with `truncated` naming over-long fields, or null.
 */
export function splitPair(line) {
  const trimmed = String(line ?? '').trim()
  if (!trimmed) return null
  const separator = SEPARATORS.find(candidate => trimmed.includes(candidate))
  let en
  let zh
  if (separator !== undefined) {
    const at = trimmed.indexOf(separator)
    en = trimmed.slice(0, at)
    zh = trimmed.slice(at + separator.length)
  } else {
    // "word - meaning" (spaced dash) — common in AI answers; "well-known" stays intact.
    const dash = trimmed.match(/^(.+?)\s+[-–—]\s+(.+)$/)
    if (dash === null) return null
    en = dash[1]
    zh = dash[2]
  }
  const left = normalizeField(en)
  const right = normalizeField(zh)
  if (left === '' || right === '') return null
  return {
    en: left,
    zh: right,
    truncated: {
      ...(en.trim().length > LIMITS.maxFieldChars ? { en: true } : {}),
      ...(zh.trim().length > LIMITS.maxFieldChars ? { zh: true } : {}),
    },
  }
}

/** Parse one line into `[en, zh]`, or null. */
export function parseEntryLine(line) {
  const pair = splitPair(line)
  return pair === null ? null : [pair.en, pair.zh]
}

/**
 * Parse the app's import text: an optional head of `@lang` / `@round` / `@time`
 * config lines, then one `word,meaning` pair per line. Fences, bullets,
 * numbering, and comments are tolerated exactly like the app's importer.
 *
 * @param text - raw pasted text (an AI answer, a backup, a spreadsheet paste).
 * @returns parsed entries, the config keys actually present, and skip counts.
 */
export function parseImportText(text) {
  const entries = []
  const config = {}
  let skipped = 0
  let duplicates = 0
  const truncatedFields = []
  const seen = new Set()
  const lines = String(text ?? '').split(/\r?\n/)
  let truncated = false

  for (const raw of lines) {
    let line = raw.replace(/^\uFEFF/, '').trim()
    if (!line || line.startsWith('```') || line.startsWith('#') || line.startsWith('//')) continue
    line = line.replace(/^(?:[-*•]|\d+[.)、])\s+/, '').trim()
    const configMatch = line.match(/^@\s*([A-Za-z]+)\s*[:：=]?\s*(.*)$/)
    if (configMatch !== null) {
      const key = CONFIG_KEYS[configMatch[1].toLowerCase()]
      const value = configMatch[2].trim()
      if (key === 'lang') {
        const sides = value.split(/\s*(?:\||↔|<->|->|→|\/|,|，)\s*/).map(side => side.trim()).filter(Boolean)
        if (sides.length >= 2 && sides[0].length <= 24 && sides[1].length <= 24) {
          config.lang = { a: sides[0], b: sides[1] }
          continue
        }
      } else if (key !== undefined) {
        const number = Number.parseInt(value, 10)
        if (Number.isFinite(number) && number > 0) {
          config[key] = number
          continue
        }
      }
      skipped += 1
      continue
    }
    const parsed = splitPair(line)
    if (parsed === null) {
      skipped += 1
      continue
    }
    if (parsed.truncated.en === true) truncatedFields.push(parsed.en)
    if (parsed.truncated.zh === true) truncatedFields.push(parsed.zh)
    const key = pairKey(parsed.en, parsed.zh)
    if (seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)
    entries.push(entry(parsed.en, parsed.zh))
    if (entries.length >= LIMITS.maxImportEntries) {
      truncated = true
      break
    }
  }
  return { entries, config, skipped, duplicates, truncated, truncatedFields }
}

/** Coerce arbitrary caller input (`words: [{en, zh}]`) into entries, dropping junk. */
export function normalizeEntryList(words) {
  if (!Array.isArray(words)) return { entries: [], dropped: 0, truncated: false }
  const entries = []
  let dropped = 0
  let truncated = false
  const seen = new Set()
  for (const value of words) {
    if (value === null || typeof value !== 'object') {
      dropped += 1
      continue
    }
    const record = /** @type {{ en?: unknown, zh?: unknown, source?: unknown }} */ (value)
    const en = normalizeField(record.en)
    const zh = normalizeField(record.zh)
    if (en === '' || zh === '') {
      dropped += 1
      continue
    }
    const key = pairKey(en, zh)
    if (seen.has(key)) {
      dropped += 1
      continue
    }
    seen.add(key)
    entries.push(entry(en, zh, { source: typeof record.source === 'string' && record.source ? record.source.slice(0, 40) : 'agent' }))
    if (entries.length >= LIMITS.maxImportEntries) {
      truncated = true
      break
    }
  }
  return { entries, dropped, truncated }
}

/** The initial empty library. */
export function createEmptyLibrary(now = new Date().toISOString()) {
  return {
    schema: LIBRARY_SCHEMA,
    revision: 0,
    updatedAt: now,
    words: [],
    settings: {},
    openRequest: { revision: 0, at: null, reason: null },
    report: null,
  }
}

/** Normalize anything read from disk into a usable library (fail closed to empty). */
export function normalizeLibrary(value, now = new Date().toISOString()) {
  if (value === null || typeof value !== 'object') return createEmptyLibrary(now)
  const raw = /** @type {Record<string, unknown>} */ (value)
  if (raw.schema !== LIBRARY_SCHEMA || !Array.isArray(raw.words)) return createEmptyLibrary(now)
  const words = []
  const seen = new Set()
  for (const candidate of raw.words) {
    if (candidate === null || typeof candidate !== 'object') continue
    const record = /** @type {Record<string, unknown>} */ (candidate)
    const en = normalizeField(record.en)
    const zh = normalizeField(record.zh)
    if (en === '' || zh === '') continue
    const key = pairKey(en, zh)
    if (seen.has(key)) continue
    seen.add(key)
    words.push(entry(en, zh, {
      source: typeof record.source === 'string' && record.source ? record.source.slice(0, 40) : 'agent',
      addedAt: typeof record.addedAt === 'string' ? record.addedAt : now,
    }))
    if (words.length >= LIMITS.maxLibraryEntries) break
  }
  const settings = raw.settings !== null && typeof raw.settings === 'object' ? raw.settings : {}
  const openRequest = raw.openRequest !== null && typeof raw.openRequest === 'object' ? raw.openRequest : {}
  const report = raw.report === null || typeof raw.report !== 'object' ? null : raw.report
  return {
    schema: LIBRARY_SCHEMA,
    revision: Number.isFinite(Number(raw.revision)) ? Math.max(0, Math.round(Number(raw.revision))) : 0,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    words,
    settings: {
      ...(settings.langPair !== undefined ? { langPair: settings.langPair } : {}),
      ...(settings.roundSize !== undefined ? { roundSize: settings.roundSize } : {}),
      ...(settings.levelDurationMs !== undefined ? { levelDurationMs: settings.levelDurationMs } : {}),
    },
    openRequest: {
      revision: Number.isFinite(Number(openRequest.revision)) ? Math.max(0, Math.round(Number(openRequest.revision))) : 0,
      at: typeof openRequest.at === 'string' ? openRequest.at : null,
      reason: typeof openRequest.reason === 'string' ? openRequest.reason.slice(0, 200) : null,
    },
    report,
  }
}

/**
 * Apply parsed config lines onto the stored settings. Only keys the import
 * actually carried are written, so an import never silently resets a practice
 * option the learner chose in the app.
 */
export function applyImportSettings(settings, config) {
  const next = { ...settings }
  if (config.lang !== undefined) next.langPair = { a: config.lang.a, b: config.lang.b }
  if (config.round !== undefined) next.roundSize = Math.min(200, Math.max(5, Math.round(config.round)))
  if (config.time !== undefined) next.levelDurationMs = Math.min(900_000, Math.max(20_000, Math.round(config.time) * 1000))
  return next
}

/**
 * Merge normalized entries into a library word list.
 *
 * @param existing - current `library.words`.
 * @param incoming - normalized entries to add or install.
 * @param mode - `merge` keeps existing entries (skipping duplicates) and
 *   appends new ones; `replace` installs exactly the incoming list.
 * @returns the next list plus what the operation did.
 */
export function mergeWords(existing, incoming, mode = 'merge') {
  const base = mode === 'replace' ? [] : existing.map(word => ({ ...word }))
  const next = base
  const seen = new Set(next.map(word => pairKey(word.en, word.zh)))
  let added = 0
  let duplicates = 0
  let truncated = false
  for (const candidate of incoming) {
    const key = pairKey(candidate.en, candidate.zh)
    if (seen.has(key)) {
      duplicates += 1
      continue
    }
    if (next.length >= LIMITS.maxLibraryEntries) {
      truncated = true
      break
    }
    seen.add(key)
    next.push({ ...candidate })
    added += 1
  }
  return {
    words: next,
    added,
    duplicates,
    truncated,
    removed: mode === 'replace' ? existing.length : 0,
  }
}

/**
 * Fold one browser report into a library. The report is a self-report from the
 * page, so it is stored verbatim (bounded) and never treated as proof of work.
 */
export function normalizeReport(value, now = new Date().toISOString()) {
  if (value === null || typeof value !== 'object') return null
  const raw = /** @type {Record<string, unknown>} */ (value)
  const weakSource = Array.isArray(raw.weak) ? raw.weak : []
  const weak = []
  for (const candidate of weakSource.slice(0, LIMITS.maxReportWeakWords)) {
    if (candidate === null || typeof candidate !== 'object') continue
    const record = /** @type {Record<string, unknown>} */ (candidate)
    const en = normalizeField(record.en)
    const zh = normalizeField(record.zh)
    if (en === '' || zh === '') continue
    weak.push({
      en,
      zh,
      box: Number.isFinite(Number(record.box)) ? Math.max(0, Math.min(5, Math.round(Number(record.box)))) : 0,
      mistakes: Number.isFinite(Number(record.mistakes)) ? Math.max(0, Math.round(Number(record.mistakes))) : 0,
      mastered: record.mastered === true,
    })
  }
  const boxCounts = Array.isArray(raw.boxCounts)
    ? raw.boxCounts.slice(0, 6).map(count => (Number.isFinite(Number(count)) ? Math.max(0, Math.round(Number(count))) : 0))
    : []
  const settings = raw.settings !== null && typeof raw.settings === 'object' ? raw.settings : {}
  const count = (input) => (Number.isFinite(Number(input)) ? Math.max(0, Math.round(Number(input))) : 0)
  return {
    schema: REPORT_SCHEMA,
    receivedAt: now,
    wordCount: count(raw.wordCount),
    customCount: count(raw.customCount),
    mastered: count(raw.mastered),
    boxCounts,
    weak,
    settings: {
      ...(settings.langPair !== undefined ? { langPair: settings.langPair } : {}),
      ...(settings.roundSize !== undefined ? { roundSize: settings.roundSize } : {}),
      ...(settings.levelDurationMs !== undefined ? { levelDurationMs: settings.levelDurationMs } : {}),
    },
    round: count(raw.round),
    score: count(raw.score),
    mistakes: count(raw.mistakes),
    streak: count(raw.streak),
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt.slice(0, 40) : null,
    libraryRevision: count(raw.libraryRevision),
    appliedAt: typeof raw.appliedAt === 'string' ? raw.appliedAt.slice(0, 40) : null,
  }
}

/** Compact, model-facing status of the stored library (bounded by construction). */
export function libraryStatus(library, { practiceUrl = null, routePath = '/wordsnap/' } = {}) {
  const report = library.report
  return {
    practice: { path: routePath, url: practiceUrl },
    library: {
      count: library.words.length,
      revision: library.revision,
      updatedAt: library.updatedAt,
      recent: library.words.slice(-LIMITS.maxStatusRecent).map(word => ({ en: word.en, zh: word.zh })),
      settings: { ...library.settings },
    },
    panel: { openRevision: library.openRequest.revision, openRequestedAt: library.openRequest.at, reason: library.openRequest.reason },
    browser: report === null
      ? null
      : {
          receivedAt: report.receivedAt,
          wordCount: report.wordCount,
          customCount: report.customCount,
          mastered: report.mastered,
          boxCounts: [...report.boxCounts],
          weak: report.weak.slice(0, 20).map(word => ({ en: word.en, zh: word.zh, box: word.box, mistakes: word.mistakes })),
          weakCount: report.weak.length,
          settings: { ...report.settings },
          round: report.round,
          score: report.score,
          mistakes: report.mistakes,
          streak: report.streak,
        },
  }
}

/**
 * Read the library file. A missing file is an empty library; an unreadable or
 * malformed file yields an empty library plus a warning so a caller never
 * reports stored words that cannot actually be read.
 */
export async function readLibraryFile(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error)?.code === 'ENOENT') return { library: createEmptyLibrary(), warnings: [] }
    return { library: createEmptyLibrary(), warnings: [`cannot read ${file}: ${String(/** @type {Error} */ (error)?.message ?? error)}`] }
  }
  try {
    return { library: normalizeLibrary(JSON.parse(text)), warnings: [] }
  } catch (error) {
    return { library: createEmptyLibrary(), warnings: [`cannot parse ${file}: ${String(/** @type {Error} */ (error)?.message ?? error)}`] }
  }
}

/** Atomically persist the library: write a sibling temp file, then rename. */
export async function writeLibraryFile(file, library) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`
  const body = `${JSON.stringify(library, null, 2)}\n`
  try {
    await writeFile(temporary, body, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, file)
  } catch (error) {
    try {
      await rm(temporary, { force: true })
    } catch {}
    throw error
  }
  return library
}
