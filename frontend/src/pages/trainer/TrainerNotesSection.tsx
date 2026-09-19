import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { createTrainerNote, deleteTrainerNote, listTrainerNotes } from '@/api/trainerNotes'
import type { TrainerNote } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Trainer-authored, trainee-visible notes for one trainee (see
 * connection.models.TrainerNote) - the trainee sees these in their own
 * Trainer > Notes tab (TraineeNotes in NotesPage.tsx) and they're auto-marked
 * read as soon as that tab is opened. Distinct from TrainerPrivateNotes,
 * which the trainee never sees. */
export default function TrainerNotesSection({ traineeId }: { traineeId: number }) {
  const [notes, setNotes] = useState<TrainerNote[] | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TrainerNote | null>(null)

  function reload() {
    listTrainerNotes(traineeId)
      .then(setNotes)
      .catch(() => setNotes([]))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const created = await createTrainerNote({ trainee: traineeId, body: body.trim() })
      setNotes((prev) => [created, ...(prev ?? [])])
      setBody('')
    } catch (err) {
      setError(err instanceof ApiError ? 'Could not send this note.' : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteTrainerNote(deleteTarget.id)
    setNotes((prev) => (prev ?? []).filter((n) => n.id !== deleteTarget.id))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Visible to the trainee, as soon as they open their Trainer tab.</p>
      <div className="flex flex-col gap-1.5">
        <Textarea
          placeholder="Something to keep in mind, e.g. 'focus on tempo this week'…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" size="sm" className="w-fit" disabled={sending || !body.trim()} onClick={handleSend}>
          {sending ? 'Sending…' : 'Send note'}
        </Button>
      </div>
      {notes === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes sent yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs text-muted-foreground">{formatTimestamp(note.created_at)}</span>
                  <span className={cn('text-xs', note.read ? 'text-muted-foreground' : 'font-semibold text-primary')}>
                    {note.read ? 'Seen' : 'Not seen yet'}
                  </span>
                  {note.archived && <span className="text-xs text-muted-foreground">· Archived by trainee</span>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete note"
                  onClick={() => setDeleteTarget(note)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this note?"
        description="The trainee will no longer be able to see it."
        onConfirm={handleDelete}
      />
    </div>
  )
}
