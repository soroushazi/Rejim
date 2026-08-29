import type { Nutrients } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { caloriesStatus, proteinStatus } from '@/lib/dietStatus'
import { round } from '@/lib/utils'

type Props = {
  heading: string
  nutrients: Nutrients
  target: Nutrients
}

const STATUS_BG_CLASS = {
  good: 'text-emerald-200',
  bad: 'text-red-200',
  neutral: 'text-primary-foreground',
}

export default function ProgressSummaryCard({ heading, nutrients, target }: Props) {
  const calStatus =
    nutrients.calories !== null && target.calories ? caloriesStatus(nutrients.calories, target.calories) : 'neutral'
  const proteinStat =
    nutrients.protein_g !== null && target.protein_g ? proteinStatus(nutrients.protein_g, target.protein_g) : 'neutral'
  const calPct =
    nutrients.calories !== null && target.calories ? Math.round((nutrients.calories / target.calories) * 100) : null

  return (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader>
        <CardTitle className="text-primary-foreground">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-baseline justify-between gap-2">
        <span className={`text-2xl font-semibold ${STATUS_BG_CLASS[calStatus]}`}>
          {nutrients.calories !== null ? round(nutrients.calories) : '—'}
          <span className="ml-1 text-sm font-normal opacity-80">
            / {target.calories !== null ? round(target.calories) : '—'} kcal{calPct !== null ? ` · ${calPct}%` : ''}
          </span>
        </span>
        <span className="flex gap-3 text-sm opacity-90">
          <span className={STATUS_BG_CLASS[proteinStat]}>
            P {nutrients.protein_g !== null ? round(nutrients.protein_g) : '—'}g
          </span>
          <span>C {nutrients.carbs_g !== null ? round(nutrients.carbs_g) : '—'}g</span>
          <span>F {nutrients.fat_g !== null ? round(nutrients.fat_g) : '—'}g</span>
        </span>
      </CardContent>
    </Card>
  )
}
