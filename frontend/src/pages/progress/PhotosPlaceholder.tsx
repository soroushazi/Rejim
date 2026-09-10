import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** ProgressPhoto is deferred for Stage 1 (see CLAUDE.md's Deferred section) -
 * this section is a placeholder until that model/upload UI exists. */
export default function PhotosPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </CardContent>
    </Card>
  )
}
