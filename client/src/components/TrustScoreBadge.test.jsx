import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrustScoreBadge from './TrustScoreBadge'

describe('TrustScoreBadge', () => {
  it('shows "Not yet scored" when score is null', () => {
    render(<TrustScoreBadge score={null} />)
    expect(screen.getByText('Not yet scored')).toBeInTheDocument()
  })

  it('rounds the score in its label', () => {
    render(<TrustScoreBadge score={84.6} />)
    expect(screen.getByText('Trust 85')).toBeInTheDocument()
  })

  it.each([
    [92, 'High trust'],
    [60, 'Medium trust'],
    [30, 'Low trust'],
  ])('labels a score of %i as %s', (score, expectedTitle) => {
    render(<TrustScoreBadge score={score} />)
    expect(screen.getByTitle(expectedTitle)).toBeInTheDocument()
  })

  it.each([
    [75, 'High trust'], // exact boundary
    [50, 'Medium trust'], // exact boundary
  ])('treats %i as the start of the %s tier, not the tier below', (score, expectedTitle) => {
    render(<TrustScoreBadge score={score} />)
    expect(screen.getByTitle(expectedTitle)).toBeInTheDocument()
  })
})
