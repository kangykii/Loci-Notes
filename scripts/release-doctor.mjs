import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const failures = []
const repoRoot = process.cwd()
const forbiddenPublicArtifactPattern = /\.(?:exe|msi|sig|zip|msix|dmg|deb|rpm|appimage)$/i

function fail(message) {
  failures.push(message)
}

async function listForbiddenArtifacts(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  if (!existsSync(absoluteDir)) return []

  const entries = await readdir(absoluteDir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) return await listForbiddenArtifacts(relativePath)
    if (forbiddenPublicArtifactPattern.test(entry.name)) return [relativePath]
    return []
  }))

  return nested.flat()
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()) {
  fail('TAURI_SIGNING_PRIVATE_KEY is missing. Set it securely before packaging updater artifacts.')
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD?.trim()) {
  fail('TAURI_SIGNING_PRIVATE_KEY_PASSWORD is missing. Set it securely before packaging updater artifacts.')
}

for (const artifact of [
  ...await listForbiddenArtifacts('public'),
  ...await listForbiddenArtifacts('dist'),
]) {
  fail(`${artifact} must not be bundled with the app. Publish release artifacts through GitHub Releases instead.`)
}

if (failures.length) {
  console.error('\nRelease preflight failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Release preflight passed.')
