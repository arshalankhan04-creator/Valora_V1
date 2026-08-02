import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('replaces the underscore in pending_review for display', () => {
    render(<StatusBadge status="pending_review" />)
    expect(screen.getByText('pending review')).toBeInTheDocument()
  })

  it.each(['active', 'flagged', 'sold'])('renders the %s status as-is', (status) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})
