const TIERS = [
  { min: 75, label: 'High trust', className: 'bg-green-100 text-green-800' },
  { min: 50, label: 'Medium trust', className: 'bg-yellow-100 text-yellow-800' },
  { min: 0, label: 'Low trust', className: 'bg-red-100 text-red-800' },
]

export default function TrustScoreBadge({ score }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">
        Not yet scored
      </span>
    )
  }

  const tier = TIERS.find((t) => score >= t.min)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tier.className}`}
      title={tier.label}
    >
      Trust {Math.round(score)}
    </span>
  )
}
