import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import BackButton from './BackButton'

function Page({ label, fallback }) {
  return (
    <div>
      <p>{label}</p>
      <BackButton fallback={fallback} />
    </div>
  )
}

describe('BackButton', () => {
  it('navigates to the fallback when opened directly (no in-app history)', async () => {
    render(
      <MemoryRouter initialEntries={['/listings/l1']}>
        <Routes>
          <Route path="/listings" element={<Page label="Listings page" />} />
          <Route path="/listings/:id" element={<Page label="Detail page" fallback="/listings" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Detail page')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByText('Listings page')).toBeInTheDocument()
  })

  it('goes back in history instead of the fallback when it was reached via in-app navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/listings', '/listings/l1']} initialIndex={1}>
        <Routes>
          <Route path="/listings" element={<Page label="Listings page" />} />
          <Route path="/listings/:id" element={<Page label="Detail page" fallback="/somewhere-else" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Detail page')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    // Went back to the real previous entry, not the (deliberately wrong) fallback.
    expect(await screen.findByText('Listings page')).toBeInTheDocument()
  })
})
