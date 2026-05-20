export type HomeTipAction = 'newNote' | 'openAtoms' | 'openProjects' | 'openSearch'

export type HomeTip = {
  id: string
  body: string
  cta?: { label: string; action: HomeTipAction }
}

export const HOME_TIPS: HomeTip[] = [
  {
    id: 'atoms',
    body: 'Highlight any phrase in a note and press A to mint an atom — small, reusable thoughts you can drop into any document later.',
    cta: { label: 'Browse atoms', action: 'openAtoms' },
  },
  {
    id: 'templates',
    body: 'Open a fresh note the moment an idea lands. Loci keeps the path from thought to page short.',
    cta: { label: 'New note', action: 'newNote' },
  },
  {
    id: 'projects',
    body: 'Drag a loose file onto any project in the sidebar to file it. Loci will quietly tidy the inbox for you.',
    cta: { label: 'Open projects', action: 'openProjects' },
  },
  {
    id: 'search',
    body: 'Cmd/Ctrl+K jumps straight to search. Type a few letters of any note, atom, or project — Loci weighs your recent work first.',
    cta: { label: 'Try search', action: 'openSearch' },
  },
  {
    id: 'focus',
    body: 'Toggle focus mode on a note to dim the chrome and write to the page. Everything else fades out of view.',
  },
  {
    id: 'shortcuts',
    body: 'Most of Loci is keyboard-first. / opens the block menu inside a note, and Esc steps you back out — like a good editor should.',
  },
  {
    id: 'streak',
    body: 'Loci tracks the days you write, not the words. A single line counts — the habit matters more than the volume.',
  },
  {
    id: 'sets',
    body: 'Group related atoms into a Set and you can study them like flashcards — useful right before an exam or a meeting.',
    cta: { label: 'Open atoms', action: 'openAtoms' },
  },
  {
    id: 'community',
    body: 'Share-ready community spaces are planned for a later release. For now, keep shaping the notes you will want to send.',
  },
  {
    id: 'breath',
    body: 'A blank page is not a problem to solve. Open one, write a single sentence, and let the rest follow.',
  },
  {
    id: 'recall',
    body: 'Reread a note from a month ago. Old thinking is the easiest way to find the next idea.',
  },
  {
    id: 'archive',
    body: 'Move stale projects out of the way instead of deleting them. Loci keeps them ready if you ever want to return.',
    cta: { label: 'Open projects', action: 'openProjects' },
  },
]

export function getTipForDate(now: Date = new Date()): HomeTip {
  if (HOME_TIPS.length === 0) {
    return { id: 'fallback', body: 'Write a line today. Tomorrow you will be glad you did.' }
  }
  const start = Date.UTC(now.getUTCFullYear(), 0, 0)
  const diff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start
  const dayOfYear = Math.floor(diff / 86_400_000)
  const index = ((dayOfYear % HOME_TIPS.length) + HOME_TIPS.length) % HOME_TIPS.length
  return HOME_TIPS[index]
}

export function getTipByIndex(index: number): HomeTip {
  if (HOME_TIPS.length === 0) {
    return { id: 'fallback', body: 'Write a line today. Tomorrow you will be glad you did.' }
  }
  const safe = ((Math.trunc(index) % HOME_TIPS.length) + HOME_TIPS.length) % HOME_TIPS.length
  return HOME_TIPS[safe]
}

type GreetingBucket = 'lateNight' | 'earlyMorning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'

const GREETINGS: Record<GreetingBucket, string[]> = {
  lateNight: [
    'Still up',
    'Burning the midnight oil',
    'Up late',
    'Night owl hours',
    'A quiet hour to think',
  ],
  earlyMorning: [
    'You are up early',
    'An early start',
    'Before the world wakes',
    'Morning is yours',
  ],
  morning: [
    'Good morning',
    'Morning',
    'Rise and write',
    'A fresh page awaits',
    'Hello there',
    'Welcome back',
  ],
  midday: [
    'Hello',
    'Midday check-in',
    'A good time to pause',
    'Halfway through the day',
    'Welcome back',
  ],
  afternoon: [
    'Good afternoon',
    'Afternoon',
    'Hope your day is going well',
    'Back so soon',
    'Welcome back',
  ],
  evening: [
    'Good evening',
    'Evening',
    'Wrapping up the day',
    'A calm end to the day',
    'Welcome back',
  ],
  night: [
    'Good night',
    'Quiet hours',
    'Winding down',
    'One last thought before bed',
  ],
}

function pickBucket(hour: number): GreetingBucket {
  if (hour < 4) return 'lateNight'
  if (hour < 7) return 'earlyMorning'
  if (hour < 12) return 'morning'
  if (hour < 14) return 'midday'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

export function getGreeting(now: Date, seed: number, firstName: string): string {
  const bucket = pickBucket(now.getHours())
  const pool = GREETINGS[bucket]
  const safeSeed = ((Math.trunc(seed) % pool.length) + pool.length) % pool.length
  const opener = pool[safeSeed]
  const trimmed = (firstName ?? '').trim()
  return trimmed ? `${opener}, ${trimmed}.` : `${opener}.`
}

const SUBTAGLINES = [
  'Ready to capture your next big idea?',
  'A blank page is a quiet invitation.',
  'Pick up where you left off — or start something new.',
  'Small thoughts compound into big ones.',
  'Write one true sentence and the rest will follow.',
  'Today is a good day for a paragraph.',
]

export function getSubtagline(seed: number): string {
  const safeSeed = ((Math.trunc(seed) % SUBTAGLINES.length) + SUBTAGLINES.length) % SUBTAGLINES.length
  return SUBTAGLINES[safeSeed]
}
