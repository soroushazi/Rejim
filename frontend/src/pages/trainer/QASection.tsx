import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { listTrainees } from '@/api/accounts'
import { ApiError } from '@/api/client'
import { sendQAMessage } from '@/api/qaMessages'
import { createQAThread, listQAThreads } from '@/api/qaThreads'
import type { QAThread, User } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import QAThreadDetail from './QAThreadDetail'

const STATUS_BADGE: Record<QAThread['status'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  open: { label: 'Open', variant: 'default' },
  answered: { label: 'Answered', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'outline' },
}

function formatUpdated(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type Props = {
  /** undefined = every thread the requester can see (QAPage's own use);
   * set to scope to one trainee (TraineeDetailPage) - skips the "which
   * trainee is this about" picker on a new thread since it's already known. */
  traineeId?: number
}

/** The thread list + compose + detail body shared by QAPage (the standalone
 * Trainer tab) and TraineeDetailPage's Notes & Q&A tab. */
export default function QASection({ traineeId }: Props) {
  const { viewMode } = useAuth()
  // A known traineeId (passed in from TraineeDetailPage) always means we're
  // acting on behalf of that trainee. With no traineeId, whether we're
  // composing/labelling for a named trainee or for ourselves depends on the
  // current view mode - this is what lets a dual-role account use this same
  // standalone Q&A page (reached via the shared bottom-nav Trainer tab)
  // both ways.
  const actingForTrainee = traineeId !== undefined || viewMode === 'trainer'
  const [threads, setThreads] = useState<QAThread[] | null>(null)
  const [trainees, setTrainees] = useState<User[] | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [newThreadTraineeId, setNewThreadTraineeId] = useState<number | undefined>(traineeId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listQAThreads(traineeId)
      .then(setThreads)
      .catch(() => setThreads([]))
    if (actingForTrainee && !traineeId) {
      listTrainees()
        .then((data) => {
          setTrainees(data)
          setNewThreadTraineeId((prev) => prev ?? data[0]?.id)
        })
        .catch(() => setTrainees([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingForTrainee, traineeId])

  function handleThreadUpdated(updated: QAThread) {
    setThreads((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleCreate() {
    if (!subject.trim() || !firstMessage.trim()) {
      setError('Enter a subject and a message.')
      return
    }
    if (actingForTrainee && !newThreadTraineeId) {
      setError('Pick a trainee.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const thread = await createQAThread({
        subject: subject.trim(),
        ...(actingForTrainee ? { trainee: newThreadTraineeId } : {}),
      })
      await sendQAMessage({ thread: thread.id, body: firstMessage.trim() })
      setThreads((prev) => [thread, ...(prev ?? [])])
      setSubject('')
      setFirstMessage('')
      setCreating(false)
      setSelectedThreadId(thread.id)
    } catch (err) {
      setError(err instanceof ApiError ? 'Could not open this thread.' : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (selectedThreadId !== null) {
    const thread = threads?.find((t) => t.id === selectedThreadId)
    if (thread) {
      return <QAThreadDetail thread={thread} onBack={() => setSelectedThreadId(null)} onStatusChange={handleThreadUpdated} />
    }
    return (
      <div className="flex flex-col gap-3">
        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedThreadId(null)}>
          ← Back
        </Button>
        <p className="text-sm text-muted-foreground">Thread not found.</p>
      </div>
    )
  }

  if (threads === null) {
    return <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
  }

  const visibleThreads = threads.filter((t) => showArchived || t.status !== 'archived')
  const archivedCount = threads.filter((t) => t.status === 'archived').length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setCreating((v) => !v)}>
          <Plus className="size-3.5" /> New thread
        </Button>
        {archivedCount > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
          {actingForTrainee && !traineeId && trainees && trainees.length > 1 && (
            <Select value={String(newThreadTraineeId)} onValueChange={(v) => setNewThreadTraineeId(Number(v))}>
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
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            placeholder="Your message…"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={handleCreate}>
              {saving ? 'Opening…' : 'Open thread'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {visibleThreads.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No threads yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleThreads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-3 text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{thread.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {actingForTrainee && !traineeId ? `${thread.trainee_username} · ` : ''}
                    {formatUpdated(thread.updated_at)}
                  </span>
                </div>
                <Badge variant={STATUS_BADGE[thread.status].variant}>{STATUS_BADGE[thread.status].label}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
