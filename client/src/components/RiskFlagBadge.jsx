import { Badge } from './ui/badge'

const STYLES = {
  Low: 'border-primary/20 bg-primary/10 text-primary',
  Medium: 'border-secondary/50 bg-secondary/15 text-secondary-foreground',
  High: 'border-destructive/20 bg-destructive/10 text-destructive',
}

export default function RiskFlagBadge({ flag }) {
  if (!flag) return null

  return (
    <Badge variant="outline" className={STYLES[flag] || 'text-muted-foreground'}>
      {flag} risk
    </Badge>
  )
}
