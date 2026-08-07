import { Badge } from './ui/badge'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

function resolveLabel(flag, hasReasons) {
  if (flag === 'Low')    return { label: 'Looks genuine',  icon: CheckCircle, className: 'border-primary/20 bg-primary/10 text-primary' }
  if (flag === 'Medium') return { label: 'Worth checking', icon: Info,        className: 'border-yellow-300/60 bg-yellow-50 text-yellow-700' }
  if (hasReasons)        return { label: 'Needs attention', icon: AlertCircle, className: 'border-destructive/20 bg-destructive/10 text-destructive' }
  return                        { label: 'Needs review',    icon: AlertCircle, className: 'border-orange-300/60 bg-orange-50 text-orange-700' }
}

function defaultExplanation(flag, trustScore) {
  if (flag !== 'High') return null
  if (trustScore != null && trustScore >= 75) {
    return 'Our system flagged this listing for a routine review. The listing itself scores well — a human may verify it shortly.'
  }
  return 'This listing has been queued for a manual review before it can be fully trusted.'
}

export default function RiskFlagBadge({ flag, reasons, trustScore }) {
  if (!flag) return null

  const hasReasons = reasons?.length > 0
  const { label, icon: Icon, className } = resolveLabel(flag, hasReasons)
  const inlineExplanation = null // reasons shown in the listing check card, not here
  const tooltipText = !hasReasons ? defaultExplanation(flag, trustScore) : null

  return (
    <div className="flex flex-col gap-1">
      {/* Tooltip wrapper — only when there's hover content */}
      <div className={tooltipText ? 'relative group inline-flex' : 'inline-flex'}>
        <Badge
          variant="outline"
          className={`inline-flex items-center gap-1.5 cursor-default ${className}`}
        >
          <Icon className="size-3 shrink-0" />
          {label}
        </Badge>

        {tooltipText && (
          <div
            role="tooltip"
            className="
              pointer-events-none absolute bottom-full left-0 mb-2 z-50
              w-64 rounded-xl border border-border/60
              bg-card/90 backdrop-blur-md
              px-3.5 py-3 shadow-brand
              text-xs text-foreground/80 leading-relaxed
              opacity-0 translate-y-1
              transition-all duration-200 ease-out
              group-hover:opacity-100 group-hover:translate-y-0
            "
          >
            {tooltipText}
            {/* Arrow */}
            <span className="absolute -bottom-[5px] left-4 size-2.5 rotate-45 rounded-sm border-b border-r border-border/60 bg-card/90" />
          </div>
        )}
      </div>

      {inlineExplanation && (
        <p className="text-xs text-muted-foreground leading-snug max-w-[260px]">
          {inlineExplanation}
        </p>
      )}
    </div>
  )
}
