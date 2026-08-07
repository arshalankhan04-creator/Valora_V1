const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPrice(value) {
  if (value == null) return '—'
  return inr.format(value)
}

export function formatKm(value) {
  if (value == null) return '—'
  return `${new Intl.NumberFormat('en-IN').format(value)} km`
}
