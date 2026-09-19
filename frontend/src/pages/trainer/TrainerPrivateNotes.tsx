import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createTrainerPrivateNote, deleteTrainerPrivateNote, listTrainerPrivateNotes } from '@/api/trainerPrivateNotes'
import type { TrainerPrivateNote } from '@/api/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Trainer-only scratchpad about one trainee - never visible to the trainee
 * (see connection.models.TrainerPrivateNote, a deliberately separate model
 * from the trainee-visible TrainerNote used elsewhere in the app). */
export default function TrainerPrivateNotes({ traineeId }: { traineeId: number }) {
  const [notes, setNotes] = useState<TrainerPrivateNote[] | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrainerPrivateNote | null>(null)

  function reload() {
    listTrainerPrivateNotes(traineeId)
      .then(setNotes)
      .catch(() => setNotes([]))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traineeId])

  async function handleAdd() {
    if (!draft.trim()) return
    setSaving(true)
    try {
      await createTrainerPrivateNote({ trainee: traineeId, content: draft.trim() })
      setDraft('')
      reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteTrainerPrivateNote(deleteTarget.id)
    setNotes((prev) => (prev ?? []).filter((n) => n.id !== deleteTarget.id))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Private notes — only you can see these.</p>
      <div className="flex flex-col gap-1.5">
        <Textarea placeholder="Add a note…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="button" size="sm" className="w-fit" disabled={saving || !draft.trim()} onClick={handleAdd}>
          {saving ? 'Adding…' : 'Add note'}
        </Button>
      </div>
      {notes === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No private notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <div>
                <p>{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(note.created_at)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete note"
                onClick={() => setDeleteTarget(note)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this private note?"
        onConfirm={handleDelete}
      />
    </div>
  )
}
