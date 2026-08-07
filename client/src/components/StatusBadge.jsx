import { Badge } from './ui/badge'

const STATUS_STYLES = {
  pending_review: 'border-border bg-muted text-muted-foreground',
  active: 'border-primary/20 bg-primary/10 text-primary',
  flagged: 'border-destructive/20 bg-destructive/10 text-destructive',
  sold: 'border-chart-4/30 bg-chart-4/10 text-chart-4',
}

export default function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || 'text-muted-foreground'}>
      {status.replace('_', ' ')}
    </Badge>
  )
}
