import type { Atom, FlashcardSet, JSONContent, Note, Project } from '../db'

export type ProfileStats = {
  userNotes: Note[]
  userProjects: Project[]
  userAtoms: Atom[]
  totalNotes: number
  totalProjects: number
  totalAtoms: number
  totalSets: number
  notesUpdatedThisWeek: number
  atomsCreatedThisWeek: number
  wordsWrittenThisWeek: number
  dailyStreak: number
  wroteToday: boolean
  latestNote?: Note
  latestSetStudiedAt?: string
  totalWords: number
}

function isUserCreated(item: { source?: string; isStarter?: boolean }) {
  return item.source !== 'starter' && !item.isStarter
}

function startOfDayKey(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

function collectPlainText(content: JSONContent | undefined): string {
  if (!content) return ''
  if (typeof content.text === 'string') return content.text
  return (content.content ?? []).map(collectPlainText).join(' ').replace(/\s+/g, ' ').trim()
}

function countWords(content: JSONContent | undefined) {
  const text = collectPlainText(content)
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function buildProfileStats({
  notes,
  projects,
  atoms,
  flashcardSets,
  now,
}: {
  notes: Note[]
  projects: Project[]
  atoms: Atom[]
  flashcardSets: FlashcardSet[]
  now: Date
}): ProfileStats {
  const userNotes = notes.filter(isUserCreated)
  const userProjects = projects.filter(isUserCreated)
  const userAtoms = atoms.filter(isUserCreated)
  const sevenDaysAgo = now.getTime() - 6 * 24 * 60 * 60 * 1000
  const activeDayKeys = new Set<string>()

  let notesUpdatedThisWeek = 0
  let wordsWrittenThisWeek = 0
  userNotes.forEach((note) => {
    const updatedTime = new Date(note.updatedAt).getTime()
    if (updatedTime >= sevenDaysAgo) {
      notesUpdatedThisWeek += 1
      wordsWrittenThisWeek += countWords(note.content)
    }
    activeDayKeys.add(startOfDayKey(new Date(note.updatedAt)))
  })

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const todayKey = today.toISOString().slice(0, 10)
  const streakCursor = new Date(today)
  if (!activeDayKeys.has(todayKey)) streakCursor.setDate(streakCursor.getDate() - 1)
  let dailyStreak = 0
  while (activeDayKeys.has(streakCursor.toISOString().slice(0, 10))) {
    dailyStreak += 1
    streakCursor.setDate(streakCursor.getDate() - 1)
  }

  const latestNote = userNotes[0]
  const totalWords = userNotes.reduce((total, note) => total + countWords(note.content), 0)
  const latestSetStudiedAt = flashcardSets
    .map((set) => set.lastStudiedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

  return {
    userNotes,
    userProjects,
    userAtoms,
    totalNotes: userNotes.length,
    totalProjects: userProjects.length,
    totalAtoms: userAtoms.length,
    totalSets: flashcardSets.length,
    notesUpdatedThisWeek,
    atomsCreatedThisWeek: userAtoms.filter((atom) => new Date(atom.createdAt).getTime() >= sevenDaysAgo).length,
    wordsWrittenThisWeek,
    dailyStreak,
    wroteToday: activeDayKeys.has(todayKey),
    latestNote,
    latestSetStudiedAt,
    totalWords,
  }
}
