import { useEffect, useMemo, useState } from 'react'

import { createBaseHandleFromDisplayName, initialsFromName } from '../../lib/profileHelpers'
import type { ProfileDraft } from '../../types/profileDraft'

export type OnboardingScreenProps = {
  profileDraft: ProfileDraft
  onDraftChange: React.Dispatch<React.SetStateAction<ProfileDraft>>
  onSubmit: () => void
}

export function OnboardingScreen({ profileDraft, onDraftChange, onSubmit }: OnboardingScreenProps) {
  const welcomeMessages = useMemo(() => [
    'Welcome.',
    'Thank you for using Loci Notes.',
    'What is your name?',
  ], [])
  const [welcomeIndex, setWelcomeIndex] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const [nameEntryVisible, setNameEntryVisible] = useState(false)
  const displayName = profileDraft.displayName
  const canSubmit = displayName.trim().length > 0
  const activeWelcomeMessage = welcomeMessages[welcomeIndex] ?? ''
  const typedWelcomeMessage = activeWelcomeMessage.slice(0, typedLength)

  useEffect(() => {
    if (nameEntryVisible) return
    if (typedLength < activeWelcomeMessage.length) {
      const timer = window.setTimeout(() => {
        setTypedLength((length) => length + 1)
      }, 72)
      return () => window.clearTimeout(timer)
    }

    if (welcomeIndex < welcomeMessages.length - 1) {
      const timer = window.setTimeout(() => {
        setWelcomeIndex((index) => index + 1)
        setTypedLength(0)
      }, 1500)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setNameEntryVisible(true), 1000)
    return () => window.clearTimeout(timer)
  }, [activeWelcomeMessage.length, nameEntryVisible, typedLength, welcomeIndex, welcomeMessages.length])

  const updateDisplayName = (nextDisplayName: string) => {
    onDraftChange((current) => ({
      ...current,
      displayName: nextDisplayName,
      initials: initialsFromName(nextDisplayName),
      handle: current.handleEdited ? current.handle : createBaseHandleFromDisplayName(nextDisplayName),
    }))
  }

  return (
    <section className="onboarding-screen" aria-labelledby="onboarding-title">
      <div className="onboarding-canvas">
        <form
          className="onboarding-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) onSubmit()
          }}
        >
          {!nameEntryVisible ? (
            <h1 id="onboarding-title" className="onboarding-typewriter" aria-live="polite">
              <span>{typedWelcomeMessage}</span>
              <span className="onboarding-caret" aria-hidden />
            </h1>
          ) : (
            <>
              <h1 id="onboarding-title">What is your name?</h1>
              <label className="onboarding-name-row">
                <input
                  className="onboarding-name-input"
                  value={displayName}
                  onChange={(event) => updateDisplayName(event.target.value)}
                  placeholder="Type enter to proceed"
                  aria-label="Your name"
                  autoComplete="name"
                  autoFocus
                />
              </label>
            </>
          )}
        </form>
      </div>
    </section>
  )
}
