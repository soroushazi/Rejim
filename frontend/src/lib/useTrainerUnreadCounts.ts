import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getUnreadSummary } from '@/api/connectionSummary'

/** Unread counts for the trainee's own Trainer-tab badge (BottomNav) and its
 * Notes/Q&A pill counts (TrainerLayout). Refetches on every route change,
 * which is what actually clears it after opening Notes/a Q&A thread marks
 * things read elsewhere - there's no shared state to push an update instead,
 * and polling would be overkill at this app's scale. */
export function useTrainerUnreadCounts(): { notesUnread: number; qaUnread: number } {
  const { pathname } = useLocation()
  const [counts, setCounts] = useState({ notesUnread: 0, qaUnread: 0 })

  useEffect(() => {
    getUnreadSummary()
      .then((s) => setCounts({ notesUnread: s.notes_unread, qaUnread: s.qa_unread }))
      .catch(() => {})
  }, [pathname])

  return counts
}
