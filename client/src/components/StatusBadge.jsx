const STATUS_STYLES = {
  pending_review: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  flagged: 'bg-red-100 text-red-800',
  sold: 'bg-blue-100 text-blue-800',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
