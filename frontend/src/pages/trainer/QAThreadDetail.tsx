import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { listQAMessages, sendQAMessage } from '@/api/qaMessages'
import { updateQAThreadStatus } from '@/api/qaThreads'
import type { QAMessage, QAThread, QAThreadStatus } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Props = {
  thread: QAThread
  onBack: () => void
  onStatusChange: (thread: QAThread) => void
}

const STATUS_OPTIONS: { value: QAThreadStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'archived', label: 'Archived' },
]

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function QAThreadDetail({ thread, onBack, onStatusChange }: Props) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<QAMessage[] | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    listQAMessages(thread.id)
      .then((data) => {
        if (!cancelled) setMessages(data)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
    return () => {
      cancelled = true
    }
  }, [thread.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const sent = await sendQAMessage({ thread: thread.id, body: body.trim() })
      setMessages((prev) => [...(prev ?? []), sent])
      setBody('')
    } catch {
      setError('Could not send this message.')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(status: QAThreadStatus) {
    setStatusSaving(true)
    setError(null)
    try {
      const updated = await updateQAThreadStatus(thread.id, status)
      onStatusChange(updated)
    } catch {
      setError('Could not update the status.')
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" size="icon-sm" variant="ghost" onClick={onBack} aria-label="Back to threads">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{thread.subject}</span>
          <span className="text-xs text-muted-foreground">{thread.trainee_username}</span>
        </div>
        <Select
          value={thread.status}
          onValueChange={(v) => handleStatusChange(v as QAThreadStatus)}
          disabled={statusSaving}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3">
        {messages === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {messages !== null && messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages !== null &&
          messages.map((m) => {
            const own = m.sender === user?.id
            return (
              <div key={m.id} className={cn('flex flex-col gap-0.5', own ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    own ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {m.body}
                </div>
                <span className="text-xs text-muted-foreground">
                  {own ? 'You' : m.sender_username} · {formatTimestamp(m.created_at)}
                </span>
              </div>
            )
          })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a reply…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1"
        />
        <Button type="button" size="sm" disabled={sending || !body.trim()} onClick={handleSend} className="self-end">
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
