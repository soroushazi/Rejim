import type { Nutrients } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { round } from '@/lib/utils'

export default function DayAverageSummary({ nutrients }: { nutrients: Nutrients }) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader>
        <CardTitle className="text-primary-foreground">Average day</CardTitle>
      </CardHeader>
      <CardContent className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold">
          {nutrients.calories !== null ? round(nutrients.calories) : '—'}
          <span className="ml-1 text-sm font-normal opacity-80">kcal</span>
        </span>
        <span className="flex gap-3 text-sm opacity-90">
          <span>P {nutrients.protein_g !== null ? round(nutrients.protein_g) : '—'}g</span>
          <span>C {nutrients.carbs_g !== null ? round(nutrients.carbs_g) : '—'}g</span>
          <span>F {nutrients.fat_g !== null ? round(nutrients.fat_g) : '—'}g</span>
        </span>
      </CardContent>
    </Card>
  )
}
