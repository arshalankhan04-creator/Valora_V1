const STYLES = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800',
}

export default function RiskFlagBadge({ flag }) {
  if (!flag) return null

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[flag] || 'bg-gray-100 text-gray-600'}`}>
      {flag} risk
    </span>
  )
}
