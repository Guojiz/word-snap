#!/usr/bin/env node
// Copy the Word Snap runtime assets from the app root into the plugin's
// `assets/` directory.
//
// The plugin must ship as one installable package, so it cannot read the app
// root after `dsh plugin add`. The copies in `assets/` are the installed truth;
// re-run this script (and commit) whenever the app assets change.
//
// `service-worker.js` is deliberately NOT copied: installing a service worker
// on the harness origin would outlive the plugin. The page tolerates a failed
// registration, so `/wordsnap/service-worker.js` simply 404s.
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..')
const appRoot = join(pluginRoot, '..')
const assetsDir = join(pluginRoot, 'assets')

/** The files the host route serves, mapped to the name it serves them under. */
export const SHIPPED_ASSETS = Object.freeze([
  'vocabulary-match.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
])

export async function syncAssets({ source = appRoot, target = assetsDir, quiet = false } = {}) {
  await mkdir(target, { recursive: true })
  const manifest = {}
  for (const name of SHIPPED_ASSETS) {
    const from = join(source, name)
    const to = join(target, name)
    await copyFile(from, to)
    const bytes = await readFile(to)
    manifest[name] = {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    if (!quiet) console.log(`synced ${name} (${bytes.length} bytes)`)
  }
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // `--from <dir>` syncs from another checkout of the app (for example a
  // worktree that has the release not yet merged into the main checkout).
  const fromIndex = process.argv.indexOf('--from')
  const source = fromIndex === -1 ? appRoot : resolve(process.argv[fromIndex + 1] ?? '')
  if (fromIndex !== -1 && process.argv[fromIndex + 1] === undefined) {
    console.error('usage: sync-assets.mjs [--from <app directory>]')
    process.exit(2)
  }
  console.log(`source: ${source}`)
  const manifest = await syncAssets({ source })
  console.log(JSON.stringify({ assets: manifest }, null, 2))
}
