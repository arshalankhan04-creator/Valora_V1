import { Badge } from './ui/badge'

const TIERS = [
  { min: 75, label: 'High trust', className: 'border-primary/20 bg-primary/10 text-primary' },
  { min: 50, label: 'Medium trust', className: 'border-secondary/50 bg-secondary/15 text-secondary-foreground' },
  { min: 0, label: 'Low trust', className: 'border-destructive/20 bg-destructive/10 text-destructive' },
]

export default function TrustScoreBadge({ score }) {
  if (score == null) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not yet scored
      </Badge>
    )
  }

  const tier = TIERS.find((t) => score >= t.min)

  return (
    <Badge variant="outline" title={tier.label} className={tier.className}>
      Trust {Math.round(score)}
    </Badge>
  )
}
