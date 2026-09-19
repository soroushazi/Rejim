import { useEffect, useState } from 'react'
import { archiveTrainerNote, listTrainerNotes, markNoteRead, unarchiveTrainerNote } from '@/api/trainerNotes'
import type { TrainerNote } from '@/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NoteCard({ note, onToggleArchived }: { note: TrainerNote; onToggleArchived: () => void }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border px-3.5 py-3',
        note.read ? 'border-border bg-background' : 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">{formatTimestamp(note.created_at)}</span>
          {!note.read && <span className="text-xs font-semibold text-primary">New</span>}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-xs" onClick={onToggleArchived}>
          {note.archived ? 'Unarchive' : 'Archive'}
        </Button>
      </div>
      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
    </li>
  )
}

/** A trainee's own inbox of notes their trainer sent them (see
 * connection.models.TrainerNote) - reached via the Trainer tab's "Notes"
 * pill (TrainerLayout). The trainer's own composer for these lives on the
 * trainee-dashboard side instead (TrainerNotesSection, in TraineeDetailPage's
 * Notes & Q&A tab), since it needs a specific trainee already in context. */
export default function NotesPage() {
  const [notes, setNotes] = useState<TrainerNote[] | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    let cancelled = false
    listTrainerNotes()
      .then((data) => {
        if (cancelled) return
        setNotes(data)
        const unread = data.filter((n) => !n.read)
        if (unread.length > 0) {
          Promise.all(unread.map((n) => markNoteRead(n.id)))
            .then((updated) => {
              if (cancelled) return
              setNotes((prev) =>
                (prev ?? []).map((n) => updated.find((u) => u.id === n.id) ?? n),
              )
            })
            .catch(() => {
              /* best-effort - an unread badge lingering is harmless */
            })
        }
      })
      .catch(() => {
        if (!cancelled) setNotes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleToggleArchived(note: TrainerNote) {
    const updated = note.archived ? await unarchiveTrainerNote(note.id) : await archiveTrainerNote(note.id)
    setNotes((prev) => (prev ?? []).map((n) => (n.id === updated.id ? updated : n)))
  }

  if (notes === null) return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  if (notes.length === 0) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No notes from your trainer yet.</p>
  }

  const visibleNotes = notes.filter((n) => showArchived || !n.archived)
  const archivedCount = notes.filter((n) => n.archived).length

  return (
    <div className="flex flex-col gap-3">
      {archivedCount > 0 && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </Button>
        </div>
      )}
      {visibleNotes.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">All caught up - every note is archived.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} onToggleArchived={() => handleToggleArchived(note)} />
          ))}
        </ul>
      )}
    </div>
  )
}
