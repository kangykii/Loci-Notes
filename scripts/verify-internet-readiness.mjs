import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const failures = []

async function readText(relativePath) {
  return await readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(stripJsonComments((await readText(relativePath)).replace(/^\uFEFF/, '')))
}

async function listSourceFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  const entries = await readdir(absoluteDir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) return await listSourceFiles(relativePath)
    if (/\.(ts|tsx)$/.test(entry.name)) return [relativePath]
    return []
  }))
  return files.flat()
}

function stripJsonComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function fail(message) {
  failures.push(message)
}

function assertIncludes(label, content, expected) {
  if (!content.includes(expected)) fail(`${label} is missing: ${expected}`)
}

function assertNotIncludes(label, content, unexpected) {
  if (content.includes(unexpected)) fail(`${label} must not include: ${unexpected}`)
}

function assertMatches(label, content, pattern) {
  if (!pattern.test(content)) fail(`${label} did not match ${pattern}`)
}

const [
  packageJson,
  tsconfig,
  appCss,
  formatBlocksCss,
  landing,
  remoteContentService,
  urlValidation,
  pocketBaseAuth,
  communitySyncAdapter,
  remoteRecordValidation,
  db,
  sharingService,
  collaborationService,
  aiClient,
  aiOrchestrator,
  directAIClient,
  app,
  releaseVerifier,
  packageRelease,
  releaseDoctor,
  updaterManifest,
  tauriConfig,
  capability,
] = await Promise.all([
  readJson('package.json'),
  readJson('tsconfig.app.json'),
  readText('src/App.css'),
  readText('src/components/editor/formatBlocks.css'),
  readText('src/Landing.tsx'),
  readText('src/services/remoteContentService.ts'),
  readText('src/utils/urlValidation.ts'),
  readText('src/integrations/pocketbase/auth.ts'),
  readText('src/services/communitySyncAdapter.ts'),
  readText('src/services/remoteRecordValidation.ts'),
  readText('src/db.ts'),
  readText('src/services/sharingService.ts'),
  readText('src/services/collaborationService.ts'),
  readText('src/ai/aiClient.ts'),
  readText('src/ai/aiOrchestrator.ts'),
  readText('src/ai/directAIClient.ts'),
  readText('src/App.tsx'),
  readText('scripts/verify-release.mjs'),
  readText('scripts/package-release.mjs'),
  readText('scripts/release-doctor.mjs'),
  readText('scripts/generate-updater-manifest.mjs'),
  readJson('src-tauri/tauri.conf.json'),
  readJson('src-tauri/capabilities/default.json'),
])

if (packageJson.scripts?.['readiness:verify'] !== 'node scripts/verify-internet-readiness.mjs') {
  fail('package.json must expose readiness:verify.')
}

if (tsconfig.compilerOptions?.forceConsistentCasingInFileNames !== true) {
  fail('tsconfig.app.json must enable forceConsistentCasingInFileNames.')
}

assertNotIncludes('src/App.css', appCss, '.note-editor .tableWrapper')
assertNotIncludes('src/App.css', appCss, '.note-editor .loci-quote')
assertNotIncludes('src/App.css', appCss, '.note-editor .loci-latex')
assertNotIncludes('src/App.css', appCss, '.note-editor ul[data-type="taskList"]')
assertIncludes('formatBlocks.css', formatBlocksCss, '.note-editor .tableWrapper')
assertIncludes('formatBlocks.css', formatBlocksCss, '.format-side-controls')

for (const [label, content] of [
  ['src/Landing.tsx', landing],
  ['src/services/remoteContentService.ts', remoteContentService],
]) {
  assertNotIncludes(label, content, '/releases/latest/download/Loci-Notes-Setup')
}
assertIncludes('remoteContentService', remoteContentService, 'sanitizeTrustedDownloadUrl')
assertIncludes('urlValidation', urlValidation, 'sanitizeTrustedDownloadUrl')
assertIncludes('urlValidation', urlValidation, 'TRUSTED_GITHUB_DOWNLOAD_PATH')
assertNotIncludes('pocketbase auth integration', pocketBaseAuth, 'export function signOut')

assertIncludes('communitySyncAdapter', communitySyncAdapter, 'function assertAuthenticatedForSync()')
assertMatches('communitySyncAdapter', communitySyncAdapter, /export async function flushPendingSyncQueue\(\)\s*\{\s*assertAuthenticatedForSync\(\)/)
assertMatches('communitySyncAdapter', communitySyncAdapter, /async function pushQueueItem\([^)]*\)\s*:[^{]+\{\s*assertAuthenticatedForSync\(\)/)
assertNotIncludes('communitySyncAdapter', communitySyncAdapter, 'localOnlyCommunitySyncAdapter = pocketBaseCommunitySyncAdapter')
assertIncludes('communitySyncAdapter', communitySyncAdapter, 'validateRemoteSyncRecord')
assertIncludes('remoteRecordValidation', remoteRecordValidation, 'validateRemoteSyncRecord')

assertIncludes('db.ts', db, 'accountId?: string')
assertIncludes('db.ts', db, 'idempotencyKey?: string')
assertIncludes('db.ts', db, 'sharedNoteSnapshots!: Dexie.Table<SharedNoteSnapshot')
assertIncludes('db.ts', db, 'opId: string')
assertMatches('db.ts version 16', db, /this\.version\(16\)\.stores\(\{[\s\S]*sharedNoteSnapshots:/)
assertIncludes('sharingService', sharingService, 'createSharedSnapshot')
assertIncludes('sharingService', sharingService, 'db.sharedNoteSnapshots')
assertIncludes('collaborationService', collaborationService, "where('[clientId+opId]')")
assertIncludes('collaborationService', collaborationService, 'serverSequence')

assertIncludes('aiClient', aiClient, 'requestAITextWithPolicy')
assertNotIncludes('aiClient', aiClient, 'requestDirectAIText(')
assertIncludes('aiOrchestrator', aiOrchestrator, 'buildAIContextFromPolicy')
assertIncludes('aiOrchestrator', aiOrchestrator, 'AIContextManifest')
assertIncludes('aiOrchestrator', aiOrchestrator, 'requestDirectAIText')
assertIncludes('directAIClient', directAIClient, 'max_output_tokens')
assertIncludes('directAIClient', directAIClient, 'maxOutputTokens')
assertIncludes('App.tsx', app, 'aiIncludeSelectedText')
assertIncludes('App.tsx', app, 'aiIncludeNoteExcerpt')
assertIncludes('App.tsx', app, 'contextManifest: aiContext.manifest')

for (const file of await listSourceFiles('src')) {
  if (file === path.join('src', 'ai', 'aiOrchestrator.ts') || file === path.join('src', 'ai', 'directAIClient.ts')) continue
  const content = await readText(file)
  if (content.includes('requestDirectAIText')) {
    fail(`${file} must not import or call requestDirectAIText directly; route through the AI orchestrator.`)
  }
}

const csp = tauriConfig.app?.security?.csp ?? ''
assertIncludes('Tauri CSP', csp, "script-src 'self'")
assertIncludes('Tauri CSP', csp, "object-src 'none'")
assertIncludes('Tauri CSP', csp, "frame-src 'none'")
assertIncludes('Tauri CSP', csp, "form-action 'none'")
assertMatches('Tauri CSP', csp, /connect-src [^;]*https:\/\/api\.openai\.com/)

const version = packageJson.version
const expectedInstallerTemplate = 'Loci Notes_${version}_x64-setup.exe'
assertIncludes('generate-updater-manifest', updaterManifest, expectedInstallerTemplate)
assertIncludes('generate-updater-manifest', updaterManifest, "replaceAll(' ', '.')")
assertIncludes('verify-release', releaseVerifier, 'signatureFileName')
assertIncludes('verify-release', releaseVerifier, "validateManifest(await manifestResponse.json(), version, 'remote')")
assertIncludes('verify-release', releaseVerifier, 'Regenerate updater artifacts instead of renaming signed files.')
assertIncludes('package.json', packageJson.scripts?.package ?? '', 'scripts/package-release.mjs')
assertIncludes('package-release', packageRelease, "release:verify', '--', '--skip-remote")
assertIncludes('package-release', packageRelease, "release:manifest")
assertIncludes('release-doctor', releaseDoctor, 'listForbiddenArtifacts')
assertIncludes('release-doctor', releaseDoctor, 'GitHub Releases instead')

const permissions = capability.permissions ?? []
for (const forbidden of ['fs:default', 'shell:default', 'core:webview:allow-create-webview']) {
  if (permissions.includes(forbidden)) fail(`Default Tauri capability must not include ${forbidden}.`)
}

assertIncludes('communitySyncAdapter', communitySyncAdapter, 'assertQueueItemAccountScope')
assertIncludes('communitySyncAdapter', communitySyncAdapter, 'isRemoteRecordInAccountScope')
assertIncludes('remoteRecordValidation', remoteRecordValidation, 'hasEnum')
assertIncludes('remoteRecordValidation', remoteRecordValidation, 'hasOptionalTrustedDownloadUrl')
assertIncludes('aiTypes', await readText('src/ai/aiTypes.ts'), 'contextManifest?: AIContextManifest')
assertIncludes('aiOrchestrator', aiOrchestrator, 'contextManifest: request.contextManifest')
assertIncludes('aiOrchestrator', aiOrchestrator, 'contextManifest.transportMode !== transportMode')

if (failures.length) {
  console.error('\nInternet readiness verification failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Internet readiness verification passed.')
