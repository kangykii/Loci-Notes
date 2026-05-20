import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const version = process.argv[2] ?? JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8')).version
const artifactsDir = path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
const installerName = `Loci Notes_${version}_x64-setup.exe`
const signatureName = `${installerName}.sig`
const publishedInstallerName = installerName.replaceAll(' ', '.')
const manifestName = 'latest.json'
const installerPath = path.join(artifactsDir, installerName)
const signaturePath = path.join(artifactsDir, signatureName)

if (!existsSync(installerPath)) {
  console.error(`Missing installer artifact: ${installerPath}`)
  process.exit(1)
}

if (!existsSync(signaturePath)) {
  console.error(`Missing updater signature: ${signaturePath}`)
  process.exit(1)
}

const signature = (await readFile(signaturePath, 'utf8')).trim()
const manifest = {
  version,
  notes: `Loci Notes release ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/kangykii/Loci-Notes/releases/download/v${version}/${encodeURIComponent(publishedInstallerName)}`,
    },
  },
}

await writeFile(path.join(artifactsDir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${path.join(artifactsDir, manifestName)}`)
