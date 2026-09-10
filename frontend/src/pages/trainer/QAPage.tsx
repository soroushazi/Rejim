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

export default function QAPage() {
  const { user } = useAuth()
  const isTrainer = user?.role === 'trainer'
  const [threads, setThreads] = useState<QAThread[] | null>(null)
  const [trainees, setTrainees] = useState<User[] | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [newThreadTraineeId, setNewThreadTraineeId] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listQAThreads()
      .then(setThreads)
      .catch(() => setThreads([]))
    if (isTrainer) {
      listTrainees()
        .then((data) => {
          setTrainees(data)
          setNewThreadTraineeId((prev) => prev ?? data[0]?.id)
        })
        .catch(() => setTrainees([]))
    }
  }, [isTrainer])

  function handleThreadUpdated(updated: QAThread) {
    setThreads((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleCreate() {
    if (!subject.trim() || !firstMessage.trim()) {
      setError('Enter a subject and a message.')
      return
    }
    if (isTrainer && !newThreadTraineeId) {
      setError('Pick a trainee.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const thread = await createQAThread({
        subject: subject.trim(),
        ...(isTrainer ? { trainee: newThreadTraineeId } : {}),
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
          {isTrainer && trainees && trainees.length > 1 && (
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
                    {isTrainer ? `${thread.trainee_username} · ` : ''}
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
