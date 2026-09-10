import { ChevronRight, Dumbbell, Utensils } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

const LINKS = [
  { to: '/diet/plan', label: 'Diet Plan', description: "View your trainer's reference meal plan", Icon: Utensils },
  { to: '/workout/plan', label: 'Workout Plan', description: "View your trainer's session rotation", Icon: Dumbbell },
]

/** Pure navigation shortcut - plans are authored/viewed on their own tabs
 * already (Diet -> Plan, Workout -> Plan); this is not a duplicate editing
 * surface, per the Plan Management spec. */
export default function PlanManagementPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Plan Management</h1>
      {LINKS.map(({ to, label, description, Icon }) => (
        <Card key={to} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate(to)}>
          <CardContent className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-muted-foreground">{description}</span>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
