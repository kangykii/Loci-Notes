export type ProjectMemorySections = {
  summary: string
  instructions: string
  writingStyle: string
  markingCriteria: string
}

export const PROJECT_MEMORY_HEADINGS: Array<{ key: keyof ProjectMemorySections; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'writingStyle', label: 'Writing style' },
  { key: 'markingCriteria', label: 'Marking criteria' },
]

export const PROJECT_MEMORY_FIELD_META: Record<
  keyof ProjectMemorySections,
  { hint: string; placeholder: string; ariaLabel: string }
> = {
  summary: {
    hint: 'Project purpose, topic, audience, and context.',
    placeholder: 'What is this project about?',
    ariaLabel: 'Project summary',
  },
  instructions: {
    hint: 'General AI behavior for this project.',
    placeholder: 'How should AI work in this project?',
    ariaLabel: 'Project instructions',
  },
  writingStyle: {
    hint: 'Tone, structure, and phrasing preferences.',
    placeholder: 'What should the writing sound like?',
    ariaLabel: 'Project writing style',
  },
  markingCriteria: {
    hint: 'Rubric used only by Mark writing.',
    placeholder: 'How should writing be assessed?',
    ariaLabel: 'Project marking criteria',
  },
}

export function parseProjectMemory(description = ''): ProjectMemorySections {
  const sections: ProjectMemorySections = {
    summary: '',
    instructions: '',
    writingStyle: '',
    markingCriteria: '',
  }
  const headingByLabel = new Map(PROJECT_MEMORY_HEADINGS.map((item) => [item.label.toLowerCase(), item.key]))
  let current: keyof ProjectMemorySections | null = null
  const unsectioned: string[] = []

  for (const line of description.replace(/\r\n?/g, '\n').split('\n')) {
    const key = headingByLabel.get(line.trim().replace(/:$/, '').toLowerCase())
    if (key) {
      current = key
      continue
    }
    if (current) {
      sections[current] = `${sections[current]}${sections[current] ? '\n' : ''}${line}`.trimEnd()
    } else if (line.trim()) {
      unsectioned.push(line)
    }
  }

  if (!Object.values(sections).some((value) => value.trim()) && unsectioned.length) {
    sections.summary = unsectioned.join('\n').trim()
  } else if (unsectioned.length && !sections.summary.trim()) {
    sections.summary = unsectioned.join('\n').trim()
  }

  return sections
}

export function serializeProjectMemory(sections: ProjectMemorySections) {
  return PROJECT_MEMORY_HEADINGS
    .map(({ key, label }) => `${label}\n${sections[key].trim()}`)
    .join('\n\n')
    .trim()
}

export function updateProjectMemorySection(description: string | undefined, key: keyof ProjectMemorySections, value: string) {
  const sections = parseProjectMemory(description ?? '')
  sections[key] = value
  return serializeProjectMemory(sections)
}
