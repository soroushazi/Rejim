import { useEffect, useState } from 'react'
import { getTrainerConnection } from '@/api/trainerConnection'
import type { TrainerConnection } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const OPTION_LABEL: Record<TrainerConnection['option_selected'], string> = {
  no_preference: 'No preference - any available trainer',
  specific_trainer: 'Requested a specific trainer',
  train_myself: 'Train myself',
}

const STATUS_LABEL: Record<TrainerConnection['status'], string> = {
  pending_manual_assignment: 'Pending assignment',
  active: 'Active',
  not_applicable: 'Not applicable',
}

/** Read-only - "what we get from the wizard" on the ongoing Profile surface.
 * Only renders once a request exists, same "only show if it has data"
 * convention PlanMealCard already uses for the Diet Plan page. */
export default function TrainerConnectionCard() {
  const [connection, setConnection] = useState<TrainerConnection | null>(null)

  useEffect(() => {
    getTrainerConnection()
      .then(setConnection)
      .catch(() => setConnection(null))
  }, [])

  if (!connection) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trainer Connection</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant={connection.status === 'active' ? 'secondary' : 'outline'}>
            {STATUS_LABEL[connection.status]}
          </Badge>
        </div>
        <p className="text-sm">{OPTION_LABEL[connection.option_selected]}</p>
        {connection.option_selected === 'specific_trainer' && connection.requested_trainer_name && (
          <p className="text-sm text-muted-foreground">Requested: {connection.requested_trainer_name}</p>
        )}
        {connection.assigned_trainer_username && (
          <p className="text-sm text-muted-foreground">Assigned trainer: {connection.assigned_trainer_username}</p>
        )}
      </CardContent>
    </Card>
  )
}
