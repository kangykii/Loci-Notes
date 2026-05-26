export type HomeTipAction = 'newNote' | 'openAtoms' | 'openSets' | 'openProjects' | 'openSearch'

export type HomeTip = {
  id: string
  body: string
  cta?: { label: string; action: HomeTipAction }
}

export const HOME_TIPS: HomeTip[] = [
  {
    id: 'atoms',
    body: 'Select a phrase in a note, then press Atomise to save it as an atom. Atoms keep definitions and reusable ideas close to the writing they came from.',
    cta: { label: 'Browse atoms', action: 'openAtoms' },
  },
  {
    id: 'new-note',
    body: 'When an idea is still rough, start a blank note first and sort it later. Loci keeps unsorted notes visible until you give them a project.',
    cta: { label: 'New note', action: 'newNote' },
  },
  {
    id: 'projects',
    body: 'Drag an unsorted file onto a project card to file it. The note moves out of Unsorted files and into that project without opening a menu.',
    cta: { label: 'Open projects', action: 'openProjects' },
  },
  {
    id: 'search',
    body: 'Cmd/Ctrl+K opens global search. Type a few letters to find a note, project, or atom without leaving your current flow.',
    cta: { label: 'Try search', action: 'openSearch' },
  },
  {
    id: 'search-keys',
    body: 'In search, use ArrowUp and ArrowDown to move through results, then press Enter to open the selected note, project, or atom.',
    cta: { label: 'Try search', action: 'openSearch' },
  },
  {
    id: 'escape',
    body: 'Esc is the quick way back to the page. It closes search, dialogs, atom creation, image crop mode, and the AI prompt.',
  },
  {
    id: 'clear-formatting',
    body: 'If pasted text brings messy styling with it, select the text in the editor and press Cmd/Ctrl+\\ to clear formatting.',
  },
  {
    id: 'sets',
    body: 'Open Atoms, switch to Sets, and group related atoms into a study deck. It turns the ideas you saved while writing into review cards.',
    cta: { label: 'Open sets', action: 'openSets' },
  },
  {
    id: 'study-keys',
    body: 'Studying a Set works from the keyboard: Space or Enter flips the card, and ArrowLeft or ArrowRight moves between cards.',
    cta: { label: 'Open sets', action: 'openSets' },
  },
  {
    id: 'project-polish',
    body: 'Pin active projects and give them colours from the project menu. The Projects view becomes easier to scan when busy work piles up.',
    cta: { label: 'Open projects', action: 'openProjects' },
  },
  {
    id: 'continue-writing',
    body: 'Use Continue writing on Home to reopen your latest note. Recent notes below it are the fastest way back into yesterday\'s work.',
  },
  {
    id: 'toolbar',
    body: 'The editor toolbar covers Atomise, highlight, and AI. Use the gutter + control to insert headings and blocks; right-click selected text for links and formatting.',
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
