import { describe, it, expect } from 'vitest'
import { formatPrice, formatKm } from './format'

describe('formatPrice', () => {
  it('formats a number as Indian-grouped rupees', () => {
    expect(formatPrice(2300000)).toBe('₹23,00,000')
  })

  it('renders a dash for null or undefined', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice(undefined)).toBe('—')
  })

  it('formats zero as a real amount, not a dash', () => {
    expect(formatPrice(0)).toBe('₹0')
  })
})

describe('formatKm', () => {
  it('formats a number with Indian grouping and a km suffix', () => {
    expect(formatKm(54000)).toBe('54,000 km')
  })

  it('renders a dash for null or undefined', () => {
    expect(formatKm(null)).toBe('—')
    expect(formatKm(undefined)).toBe('—')
  })
})
