import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('AI request UX stability', () => {
  it('does not clear notifications when the main AI request starts', () => {
    const appSource = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    const requestStart = appSource.indexOf('const requestAICompletion = async')
    const submitStart = appSource.indexOf('const submitAIPrompt =', requestStart)
    const requestBody = appSource.slice(requestStart, submitStart)

    expect(requestBody).toContain("setAiRequestStatus('running')")
    expect(requestBody).not.toContain("showNotice('')")
  })

  it('keeps prompt blur and escape from collapsing the shell while AI is running', () => {
    const appSource = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    expect(appSource).toMatch(/onPromptBlur=\{\(\) => \{\s+if \(aiRunning\) return/)
    expect(appSource).toMatch(/if \(event\.key === 'Escape'\) \{\s+event\.preventDefault\(\)\s+if \(aiRunning\) return/)
  })
})
