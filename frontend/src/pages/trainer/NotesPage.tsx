import { useEffect, useState } from 'react'
import { listTrainees } from '@/api/accounts'
import { ApiError } from '@/api/client'
import { createTrainerNote, listTrainerNotes, markNoteRead } from '@/api/trainerNotes'
import type { TrainerNote, User } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NoteCard({ note, variant }: { note: TrainerNote; variant: 'inbox' | 'sent' }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border px-3.5 py-3',
        note.read ? 'border-border bg-background' : 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{formatTimestamp(note.created_at)}</span>
        {variant === 'inbox' && !note.read && <span className="text-xs font-semibold text-primary">New</span>}
        {variant === 'sent' && (
          <span className={cn('text-xs', note.read ? 'text-muted-foreground' : 'font-semibold text-primary')}>
            {note.read ? 'Seen' : 'Not seen yet'}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
    </li>
  )
}

function TraineeNotes() {
  const [notes, setNotes] = useState<TrainerNote[] | null>(null)

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

  if (notes === null) return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  if (notes.length === 0) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">No notes from your trainer yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} variant="inbox" />
      ))}
    </ul>
  )
}

function TrainerNotes() {
  const [trainees, setTrainees] = useState<User[] | null>(null)
  const [notes, setNotes] = useState<TrainerNote[] | null>(null)
  const [selectedTraineeId, setSelectedTraineeId] = useState<number | undefined>(undefined)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listTrainees()
      .then((data) => {
        setTrainees(data)
        setSelectedTraineeId((prev) => prev ?? data[0]?.id)
      })
      .catch(() => setTrainees([]))
    listTrainerNotes()
      .then(setNotes)
      .catch(() => setNotes([]))
  }, [])

  async function handleSend() {
    if (!selectedTraineeId || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const created = await createTrainerNote({ trainee: selectedTraineeId, body: body.trim() })
      setNotes((prev) => [created, ...(prev ?? [])])
      setBody('')
    } catch (err) {
      setError(err instanceof ApiError ? 'Could not send this note.' : 'Something went wrong.')
    } finally {
      setSending(false)
    }
  }

  if (trainees === null || notes === null) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }
  if (trainees.length === 0) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">You have no trainees yet.</p>
  }

  const visibleNotes = notes.filter((n) => n.trainee === selectedTraineeId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
        {trainees.length > 1 && (
          <Select value={String(selectedTraineeId)} onValueChange={(v) => setSelectedTraineeId(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {trainees.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Textarea
          placeholder="Something to keep in mind, e.g. 'focus on tempo this week'…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" size="sm" disabled={sending || !body.trim()} onClick={handleSend} className="self-start">
          {sending ? 'Sending…' : 'Send note'}
        </Button>
      </div>

      {visibleNotes.length === 0 ? (
        <p className="mt-2 text-center text-sm text-muted-foreground">No notes sent yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} variant="sent" />
          ))}
        </ul>
      )}
    </div>
  )
}

export default function NotesPage() {
  const { viewMode } = useAuth()
  return viewMode === 'trainer' ? <TrainerNotes /> : <TraineeNotes />
}
