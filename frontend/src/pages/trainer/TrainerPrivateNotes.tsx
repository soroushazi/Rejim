import { useEffect, useState } from 'react'
import { createTrainerPrivateNote, listTrainerPrivateNotes } from '@/api/trainerPrivateNotes'
import type { TrainerPrivateNote } from '@/api/types'
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
            <li key={note.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <p>{note.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(note.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
