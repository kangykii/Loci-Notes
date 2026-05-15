import type { JSONContent } from '../db'

type WorkerNote = {
  id: string
  title: string
  updatedAt: string
  content: JSONContent
}

type WorkerRequest =
  | { id: string; type: 'index-notes'; notes: WorkerNote[] }
  | { id: string; type: 'search'; query: string }
  | { id: string; type: 'preview'; noteId: string; content: JSONContent }

type WorkerResponse =
  | { id: string; type: 'index-ready'; indexVersion: number; noteCount: number }
  | { id: string; type: 'search-results'; noteIds: string[]; indexVersion: number }
  | { id: string; type: 'preview-ready'; noteId: string; preview: string }

type SearchRecord = {
  id: string
  updatedAt: string
  title: string
  text: string
}

let indexVersion = 0
let records: SearchRecord[] = []

function collectText(content: JSONContent | undefined): string {
  if (!content) return ''
  if (typeof content.text === 'string') return content.text
  return (content.content ?? []).map(collectText).join(' ').replace(/\s+/g, ' ').trim()
}

function previewFor(content: JSONContent) {
  const text = collectText(content)
  if (text.length <= 180) return text
  return `${text.slice(0, 177)}...`
}

function post(response: WorkerResponse) {
  self.postMessage(response)
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'index-notes') {
    records = message.notes.map((note) => ({
      id: note.id,
      updatedAt: note.updatedAt,
      title: note.title.toLowerCase(),
      text: collectText(note.content).toLowerCase(),
    }))
    indexVersion += 1
    post({ id: message.id, type: 'index-ready', indexVersion, noteCount: records.length })
    return
  }

  if (message.type === 'search') {
    const query = message.query.trim().toLowerCase()
    const noteIds = query
      ? records
          .filter((record) => record.title.includes(query) || record.text.includes(query))
          .map((record) => record.id)
      : []
    post({ id: message.id, type: 'search-results', noteIds, indexVersion })
    return
  }

  post({ id: message.id, type: 'preview-ready', noteId: message.noteId, preview: previewFor(message.content) })
}
