import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const privateKeyPath = path.join(repoRoot, '.tauri-signing-private-key')
const passwordPath = path.join(repoRoot, '.tauri-signing-private-key.password')

if (!process.env.TAURI_SIGNING_PRIVATE_KEY && existsSync(privateKeyPath)) {
  process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(privateKeyPath, 'utf8').trim()
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD && existsSync(passwordPath)) {
  process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = readFileSync(passwordPath, 'utf8').trim()
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

await run('npm', ['run', 'release:doctor'])
await run('npm', ['run', 'tauri:build'])
await run('npm', ['run', 'release:manifest'])
await run('npm', ['run', 'release:verify', '--', '--skip-remote'])
