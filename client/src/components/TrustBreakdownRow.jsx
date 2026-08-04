export default function TrustBreakdownRow({ label, value, max }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {value?.toFixed(1) ?? '—'} <span className="text-muted-foreground">/ {max}</span>
      </span>
    </div>
  )
}
