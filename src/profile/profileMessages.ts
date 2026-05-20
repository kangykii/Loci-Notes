import type { ProfileStats } from './profileStats'

export type ProfileNextAction =
  | { kind: 'newNote'; label: string; body: string }
  | { kind: 'continueNote'; label: string; body: string; noteId: string }
  | { kind: 'openAtoms'; label: string; body: string }
  | { kind: 'openProjects'; label: string; body: string }

function pick<T>(items: T[], seed: number) {
  const safe = ((Math.trunc(seed) % items.length) + items.length) % items.length
  return items[safe]
}

function pickWeighted(items: Array<{ text: string; weight?: number }>, seed: number) {
  const totalWeight = items.reduce((total, item) => total + (item.weight ?? 1), 0)
  let cursor = ((Math.trunc(seed) % totalWeight) + totalWeight) % totalWeight
  for (const item of items) {
    cursor -= item.weight ?? 1
    if (cursor < 0) return item.text
  }
  return items[0]?.text ?? ''
}

export function getProfileGreeting(firstName: string, stats: ProfileStats) {
  const name = firstName.trim() || 'there'
  if (stats.totalNotes === 0 && stats.totalAtoms === 0) {
    return pick([
      `Welcome, ${name}.`,
      `Good to have you here, ${name}.`,
      `Your workspace is ready, ${name}.`,
      `Start gently, ${name}.`,
    ], name.length + stats.totalNotes)
  }
  if (stats.wroteToday) {
    return pick([
      `Nice work today, ${name}.`,
      `You showed up today, ${name}.`,
      `Good rhythm today, ${name}.`,
      `Today has a thread, ${name}.`,
    ], name.length + stats.totalNotes + stats.totalAtoms)
  }
  if (stats.dailyStreak >= 3) {
    return pick([
      `You are building momentum, ${name}.`,
      `The streak is alive, ${name}.`,
      `Keep the thread warm, ${name}.`,
      `You have a real rhythm, ${name}.`,
    ], name.length + stats.dailyStreak)
  }
  return pick([
    `Good to see you, ${name}.`,
    `Welcome back, ${name}.`,
    `Your notes are waiting, ${name}.`,
    `A little progress counts, ${name}.`,
  ], name.length + stats.notesUpdatedThisWeek)
}

export function getProfileProgressMessage(stats: ProfileStats, seed: number) {
  if (stats.totalNotes === 0 && stats.totalAtoms === 0) {
    return pickWeighted([
      { text: 'Your starter workspace is ready. One short note is enough to make it yours.', weight: 3 },
      { text: 'You are at the beginning. Start with a thought you do not want to lose.', weight: 3 },
      { text: 'Nothing serious is required yet. A single sentence can start the trail.', weight: 3 },
      { text: 'The first note does not need to be polished. It only needs to exist.', weight: 2 },
      { text: 'Start small today. Loci works best when one useful thought has somewhere to land.', weight: 2 },
      { text: 'A blank workspace is not empty pressure. It is room for the next thing you care about.', weight: 2 },
      { text: 'Give one idea a home and the rest of the system can begin to help.', weight: 1 },
      { text: 'Your first note can be messy. The important part is making the thought visible.', weight: 1 },
      { text: 'One line is enough to begin. You can always return and shape it later.', weight: 1 },
      { text: 'Use this as a quiet place to catch what would otherwise disappear.', weight: 1 },
    ], seed)
  }
  if (stats.wroteToday) {
    return pickWeighted([
      { text: 'You touched the page today. That is the habit doing its work.', weight: 4 },
      { text: 'Today already has a mark in it. Keep the thread going while it is warm.', weight: 4 },
      { text: 'You showed up today. Loci is keeping the trail clear behind you.', weight: 3 },
      { text: 'You added to the trail today. Even a small note makes tomorrow easier.', weight: 3 },
      { text: 'That is today handled: one idea caught, one step kept alive.', weight: 2 },
      { text: 'You have already done the hard part today by opening the loop again.', weight: 2 },
      { text: 'Your notes got attention today. Let that count before asking for more.', weight: 2 },
      { text: 'Today has evidence of effort in it. That is worth noticing.', weight: 2 },
      { text: 'You made contact with your work today. A quick follow-up could turn it into momentum.', weight: 1 },
      { text: 'The workspace is warmer because you used it today.', weight: 1 },
      { text: 'You kept the system alive today. Small touches compound here.', weight: 1 },
      { text: 'A note moved today, and that is the rhythm Loci is built around.', weight: 1 },
    ], seed)
  }
  if (stats.dailyStreak >= 3) {
    return pickWeighted([
      { text: `A ${stats.dailyStreak}-day writing streak is not luck. You are making this a rhythm.`, weight: 4 },
      { text: `You have kept a ${stats.dailyStreak}-day thread alive. Protect it with one small note today.`, weight: 3 },
      { text: `The streak is doing its quiet work. ${stats.dailyStreak} days is a real foundation.`, weight: 3 },
      { text: `${stats.dailyStreak} days in a row means this is becoming familiar ground.`, weight: 2 },
      { text: `A ${stats.dailyStreak}-day streak is a signal: your ideas have somewhere to return to.`, weight: 2 },
      { text: `You have been showing up for ${stats.dailyStreak} days. Keep it easy enough to continue.`, weight: 2 },
      { text: `${stats.dailyStreak} days is momentum. One small sentence can keep the door open.`, weight: 1 },
      { text: `The streak is not about pressure. It is proof that returning is getting easier.`, weight: 1 },
      { text: `You have built a ${stats.dailyStreak}-day path back to your work. Walk it gently today.`, weight: 1 },
      { text: `${stats.dailyStreak} days of attention is a solid base. Keep the next step small.`, weight: 1 },
    ], seed)
  }
  if (stats.notesUpdatedThisWeek >= 3 || stats.atomsCreatedThisWeek >= 3) {
    return pickWeighted([
      { text: 'This week has real movement in it. Your notes are starting to compound.', weight: 4 },
      { text: 'You have been shaping ideas this week. A little review now will make them easier to reuse.', weight: 4 },
      { text: 'There is enough new work here to notice. Keep connecting the pieces.', weight: 3 },
      { text: 'This week is not empty. You have been leaving useful marks behind.', weight: 3 },
      { text: 'Your workspace has been active this week. A small review could reveal what is forming.', weight: 2 },
      { text: 'You have added enough recently that patterns may be starting to show.', weight: 2 },
      { text: 'This is the part where scattered notes can start becoming structure.', weight: 2 },
      { text: 'You are building a body of work in small pieces. That is exactly how it should happen.', weight: 1 },
      { text: 'Recent activity is turning into material. Give one piece a little more shape.', weight: 1 },
      { text: 'There is movement here. Keep the ideas close enough that they can find each other.', weight: 1 },
      { text: 'You have done more this week than it may feel like. The trail is visible.', weight: 1 },
      { text: 'The week has momentum. Use it kindly, not urgently.', weight: 1 },
    ], seed)
  }
  return pickWeighted([
    { text: 'You have started the workspace. Come back to one useful idea and make it clearer.', weight: 4 },
    { text: 'A quiet day is fine. Your last thread is still here when you want it.', weight: 4 },
    { text: 'Progress can be small and still count. Pick one note and add the next useful line.', weight: 3 },
    { text: 'Nothing is behind. Open one note and make it a little more useful.', weight: 3 },
    { text: 'The work is still here. A gentle return is enough.', weight: 2 },
    { text: 'You do not need a big session. One precise sentence can restart the thread.', weight: 2 },
    { text: 'Pick the easiest note to improve. Momentum often starts there.', weight: 2 },
    { text: 'Your notes do not need pressure. They need a little attention, one pass at a time.', weight: 1 },
    { text: 'A quiet stretch does not erase progress. Return where the next step feels light.', weight: 1 },
    { text: 'Small edits are real work. Make one idea clearer and call it a win.', weight: 1 },
    { text: 'The next step can be simple: open a note, add what is missing, stop before it gets heavy.', weight: 1 },
    { text: 'You have already begun. Today can just be a small continuation.', weight: 1 },
  ], seed)
}

export function getProfileNextAction(stats: ProfileStats): ProfileNextAction {
  if (stats.totalNotes === 0) {
    return { kind: 'newNote', label: 'Start a note', body: 'Create your first note and make the starter workspace yours.' }
  }
  if (stats.latestNote) {
    return { kind: 'continueNote', label: 'Continue writing', body: `Pick up “${stats.latestNote.title || 'Untitled Note'}”.`, noteId: stats.latestNote.id }
  }
  if (stats.totalAtoms === 0) {
    return { kind: 'openAtoms', label: 'Create atoms', body: 'Turn durable phrases into reusable study cards.' }
  }
  return { kind: 'openProjects', label: 'Open projects', body: 'Review where your notes are collecting.' }
}
