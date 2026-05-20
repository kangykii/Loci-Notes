import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const githubLatestApi = 'https://api.github.com/repos/kangykii/Loci-Notes/releases/latest'

const options = parseArgs(process.argv.slice(2))
const failures = []
const warnings = []

function parseArgs(args) {
  const parsed = {
    version: undefined,
    artifactsDir: undefined,
    skipRemote: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--version') {
      parsed.version = args[index + 1]
      index += 1
      continue
    }
    if (arg === '--artifacts-dir') {
      parsed.artifactsDir = args[index + 1]
      index += 1
      continue
    }
    if (arg === '--skip-remote') {
      parsed.skipRemote = true
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return parsed
}

async function readJson(relativePath) {
  const content = await readFile(path.join(repoRoot, relativePath), 'utf8')
  return parseJsonText(content)
}

async function readText(relativePath) {
  return await readFile(path.join(repoRoot, relativePath), 'utf8')
}

function parseJsonText(content) {
  return JSON.parse(content.replace(/^\uFEFF/, ''))
}

function fail(message) {
  failures.push(message)
}

function warn(message) {
  warnings.push(message)
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) fail(`${label} is ${actual}, expected ${expected}.`)
}

function basenameFromUrl(value) {
  try {
    return decodeURIComponent(path.basename(new URL(value).pathname))
  } catch {
    return ''
  }
}

function decodeSignatureMetadata(signature) {
  try {
    return Buffer.from(signature, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function signatureFileName(signature) {
  const decoded = decodeSignatureMetadata(signature)
  const match = decoded.match(/\bfile:([^\r\n]+)/)
  return match?.[1]?.trim()
}

function githubAssetName(fileName) {
  return fileName.replaceAll(' ', '.')
}

function parseTomlVersion(content) {
  const match = content.match(/^version\s*=\s*"([^"]+)"/m)
  return match?.[1]
}

function parseSemver(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!match) return undefined
  return match.slice(1, 4).map(Number)
}

function compareSemver(a, b) {
  const parsedA = parseSemver(a)
  const parsedB = parseSemver(b)
  if (!parsedA || !parsedB) return undefined
  for (let index = 0; index < 3; index += 1) {
    if (parsedA[index] > parsedB[index]) return 1
    if (parsedA[index] < parsedB[index]) return -1
  }
  return 0
}

function expectedAssetNames(version) {
  const installerName = `Loci Notes_${version}_x64-setup.exe`
  const publishedInstallerName = githubAssetName(installerName)
  return {
    installerName,
    publishedInstallerName,
    signatureName: `${installerName}.sig`,
    publishedSignatureName: `${publishedInstallerName}.sig`,
    manifestName: 'latest.json',
  }
}

async function findArtifactsDir(version) {
  if (options.artifactsDir) return path.resolve(repoRoot, options.artifactsDir)

  return path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
}

function validateManifest(latestJson, version, sourceLabel) {
  const { installerName, publishedInstallerName } = expectedAssetNames(version)
  assertEqual(`${sourceLabel} latest.json version`, latestJson.version, version)

  const platform = latestJson.platforms?.['windows-x86_64'] ?? latestJson.platforms?.['windows-x86_64-msvc']
  if (!platform) {
    fail(`${sourceLabel} latest.json is missing a windows-x86_64 platform entry.`)
    return
  }

  if (typeof platform.signature !== 'string' || !platform.signature.trim()) {
    fail(`${sourceLabel} latest.json platform entry is missing a signature.`)
  }

  const urlAssetName = typeof platform.url === 'string' ? basenameFromUrl(platform.url) : ''
  if (urlAssetName !== publishedInstallerName) {
    fail(`${sourceLabel} latest.json platform URL does not reference ${publishedInstallerName}.`)
  }

  if (typeof platform.url === 'string' && platform.url.includes('/latest/download/')) {
    fail(`${sourceLabel} latest.json platform URL must not use the moving /latest/download/ path; use a tag-specific release URL for rollback clarity.`)
  }

  const signedFileName = typeof platform.signature === 'string' ? signatureFileName(platform.signature) : undefined
  if (signedFileName && signedFileName !== installerName) {
    fail(`${sourceLabel} latest.json signature metadata references ${signedFileName}, expected ${installerName}. Regenerate updater artifacts instead of renaming signed files.`)
  }
}

async function validateLocalArtifacts(version, manifestEndpoint) {
  const artifactsDir = await findArtifactsDir(version)
  const { installerName, signatureName, manifestName } = expectedAssetNames(version)
  const files = existsSync(artifactsDir) ? await readdir(artifactsDir) : []

  if (!files.includes(installerName)) fail(`Missing installer artifact: ${path.join(artifactsDir, installerName)}`)
  if (!files.includes(signatureName)) fail(`Missing updater signature: ${path.join(artifactsDir, signatureName)}`)
  if (!files.includes(manifestName)) fail(`Missing updater manifest: ${path.join(artifactsDir, manifestName)}`)
  if (!files.includes(manifestName)) return

  const latestJson = parseJsonText(await readFile(path.join(artifactsDir, manifestName), 'utf8'))
  validateManifest(latestJson, version, 'local')
}

async function validateRemoteRelease(version) {
  const response = await fetch(githubLatestApi, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    fail(`Could not read GitHub latest release: ${response.status} ${response.statusText}`)
    return
  }

  const release = await response.json()
  const latestVersion = String(release.tag_name ?? '').replace(/^v/, '')
  const comparison = compareSemver(version, latestVersion)
  if (comparison === undefined) {
    fail(`Could not compare release SemVer ${version} against GitHub latest ${release.tag_name}.`)
  } else if (comparison <= 0 && version !== latestVersion) {
    fail(`Release version ${version} must be greater than GitHub latest ${latestVersion}.`)
  }

  const assets = release.assets ?? []
  const assetNames = new Set(assets.map((asset) => asset.name))
  const { publishedInstallerName, publishedSignatureName, manifestName } = expectedAssetNames(version)
  if (version === latestVersion) {
    for (const assetName of [publishedInstallerName, publishedSignatureName, manifestName]) {
      if (!assetNames.has(assetName)) fail(`GitHub latest release is missing ${assetName}.`)
    }
    const remoteManifestAsset = assets.find((asset) => asset.name === manifestName)
    if (remoteManifestAsset?.browser_download_url) {
      const manifestResponse = await fetch(remoteManifestAsset.browser_download_url)
      if (!manifestResponse.ok) {
        fail(`Could not read remote latest.json: ${manifestResponse.status} ${manifestResponse.statusText}`)
      } else {
        validateManifest(await manifestResponse.json(), version, 'remote')
      }
    }
  }
}

const packageJson = await readJson('package.json')
const packageLock = await readJson('package-lock.json')
const tauriConfig = await readJson('src-tauri/tauri.conf.json')
const cargoToml = await readText('src-tauri/Cargo.toml')

const version = options.version ?? packageJson.version
const cargoVersion = parseTomlVersion(cargoToml)
const updaterEndpoint = tauriConfig.plugins?.updater?.endpoints?.[0]

assertEqual('package.json version', packageJson.version, version)
assertEqual('package-lock.json root version', packageLock.version, version)
assertEqual('package-lock.json package version', packageLock.packages?.['']?.version, version)
assertEqual('src-tauri/Cargo.toml version', cargoVersion, version)
assertEqual('src-tauri/tauri.conf.json version', tauriConfig.version, version)

if (!parseSemver(version)) fail(`Version ${version} is not valid SemVer.`)
if (tauriConfig.identifier !== 'com.loci.notes') fail(`Tauri identifier changed to ${tauriConfig.identifier}.`)
if (tauriConfig.bundle?.targets !== 'nsis') fail('Tauri bundle target must remain nsis for the Windows updater path.')
if (tauriConfig.bundle?.createUpdaterArtifacts !== true) fail('Tauri createUpdaterArtifacts must be true.')
if (!String(updaterEndpoint ?? '').startsWith('https://github.com/kangykii/Loci-Notes/releases/latest/download/latest.json')) {
  fail(`Unexpected updater endpoint: ${updaterEndpoint}`)
}
if (!tauriConfig.plugins?.updater?.pubkey) fail('Updater public key is missing.')
if (tauriConfig.plugins?.updater?.windows?.installMode !== 'passive') fail('Windows updater installMode should remain passive.')

await validateLocalArtifacts(version, updaterEndpoint ?? '')
if (!options.skipRemote) await validateRemoteRelease(version)

for (const message of warnings) console.warn(`Warning: ${message}`)

if (failures.length) {
  console.error('\nRelease verification failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log(`Release verification passed for ${version}.`)
