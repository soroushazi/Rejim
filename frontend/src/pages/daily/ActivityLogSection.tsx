import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { createActivityLog, deleteActivityLog, listActivityLogs, updateActivityLog } from '@/api/activityLogs'
import type { ActivityLogEntry, NewActivityLogEntry } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  date: string
  canLog: boolean
  onChange?: () => void
}

type DraftState = {
  activity_type: string
  duration_minutes: string
  calories_burned: string
  notes: string
}

const EMPTY_DRAFT: DraftState = { activity_type: '', duration_minutes: '', calories_burned: '', notes: '' }

function toDraft(entry: ActivityLogEntry): DraftState {
  return {
    activity_type: entry.activity_type,
    duration_minutes: String(entry.duration_minutes),
    calories_burned: entry.calories_burned !== null ? String(entry.calories_burned) : '',
    notes: entry.notes,
  }
}

function toPayload(date: string, draft: DraftState): NewActivityLogEntry | null {
  const duration = Number(draft.duration_minutes)
  if (!draft.activity_type.trim() || !draft.duration_minutes.trim() || Number.isNaN(duration) || duration <= 0) {
    return null
  }
  return {
    date,
    activity_type: draft.activity_type.trim(),
    duration_minutes: duration,
    calories_burned: draft.calories_burned.trim() ? Number(draft.calories_burned) : null,
    notes: draft.notes,
  }
}

function DraftFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: DraftState
  onChange: (draft: DraftState) => void
  idPrefix: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-type`}>Activity</Label>
          <Input
            id={`${idPrefix}-type`}
            placeholder="walk, swim, yoga…"
            value={draft.activity_type}
            onChange={(e) => onChange({ ...draft, activity_type: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-duration`}>Duration (min)</Label>
          <Input
            id={`${idPrefix}-duration`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={draft.duration_minutes}
            onChange={(e) => onChange({ ...draft, duration_minutes: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-calories`}>Calories (optional)</Label>
          <Input
            id={`${idPrefix}-calories`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={draft.calories_burned}
            onChange={(e) => onChange({ ...draft, calories_burned: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${idPrefix}-notes`}>Notes (optional)</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        />
      </div>
    </div>
  )
}

export default function ActivityLogSection({ date, canLog, onChange }: Props) {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    setAdding(false)
    setEditingId(null)
    setError(null)
    listActivityLogs(date)
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
    return () => {
      cancelled = true
    }
  }, [date])

  async function handleAdd() {
    const payload = toPayload(date, addDraft)
    if (!payload) {
      setError('Enter an activity type and a duration.')
      return
    }
    setBusyId('new')
    setError(null)
    try {
      const created = await createActivityLog(payload)
      setEntries((prev) => [...(prev ?? []), created])
      setAddDraft(EMPTY_DRAFT)
      setAdding(false)
      onChange?.()
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'Only the trainee can log their own activity.'
          : 'Could not add this activity.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpdate(id: number) {
    const payload = toPayload(date, editDraft)
    if (!payload) {
      setError('Enter an activity type and a duration.')
      return
    }
    setBusyId(id)
    setError(null)
    try {
      const updated = await updateActivityLog(id, payload)
      setEntries((prev) => (prev ?? []).map((e) => (e.id === id ? updated : e)))
      setEditingId(null)
      onChange?.()
    } catch {
      setError('Could not update this activity.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Remove this activity?')) return
    setBusyId(id)
    setError(null)
    try {
      await deleteActivityLog(id)
      setEntries((prev) => (prev ?? []).filter((e) => e.id !== id))
      onChange?.()
    } catch {
      setError('Could not remove this activity.')
    } finally {
      setBusyId(null)
    }
  }

  function startEditing(entry: ActivityLogEntry) {
    setEditingId(entry.id)
    setEditDraft(toDraft(entry))
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {entries === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {entries !== null && entries.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No activity logged.</p>
      )}
      {entries !== null && entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="overflow-hidden rounded-lg border border-border bg-background">
              {editingId === entry.id ? (
                <div className="flex flex-col gap-3 px-3 py-3">
                  <DraftFields draft={editDraft} onChange={setEditDraft} idPrefix={`activity-edit-${entry.id}`} />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === entry.id}
                      onClick={() => handleUpdate(entry.id)}
                    >
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium capitalize">{entry.activity_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.duration_minutes} min
                      {entry.calories_burned !== null ? ` · ${entry.calories_burned} kcal` : ''}
                    </span>
                    {entry.notes && <span className="text-xs text-muted-foreground">{entry.notes}</span>}
                  </div>
                  {canLog && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${entry.activity_type}`}
                        onClick={() => startEditing(entry)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={busyId === entry.id}
                        aria-label={`Remove ${entry.activity_type}`}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {canLog && adding && (
        <div className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3">
          <DraftFields draft={addDraft} onChange={setAddDraft} idPrefix="activity-add" />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busyId === 'new'} onClick={handleAdd}>
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false)
                setAddDraft(EMPTY_DRAFT)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canLog && !adding && (
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" /> Add activity
        </Button>
      )}
    </div>
  )
}
