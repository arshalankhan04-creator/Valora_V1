import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RiskFlagBadge from './RiskFlagBadge'

describe('RiskFlagBadge', () => {
  it('renders nothing when there is no flag yet', () => {
    const { container } = render(<RiskFlagBadge flag={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each(['Low', 'Medium', 'High'])('renders the %s risk label', (flag) => {
    render(<RiskFlagBadge flag={flag} />)
    expect(screen.getByText(`${flag} risk`)).toBeInTheDocument()
  })
})
