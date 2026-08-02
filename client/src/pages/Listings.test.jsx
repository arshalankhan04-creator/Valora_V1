import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { WishlistProvider } from '../context/WishlistContext'
import * as listingsService from '../services/listings'
import Listings from './Listings'

vi.mock('../services/listings', () => ({ getListings: vi.fn() }))

const HONDA = {
  _id: 'l1',
  brand: 'Honda',
  model: 'City',
  year: 2021,
  kmDriven: 32000,
  fuelType: 'Petrol',
  transmission: 'Automatic',
  price: 1500000,
  ml: { trustScore: 88, riskFlag: 'Low' },
}

function renderListings() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <WishlistProvider>
          <Listings />
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Listings', () => {
  it('shows a loading state then renders listings from the API', async () => {
    listingsService.getListings.mockResolvedValue([HONDA])
    renderListings()

    expect(screen.getByText('Loading listings...')).toBeInTheDocument()

    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
    expect(screen.queryByText('Loading listings...')).not.toBeInTheDocument()
  })

  it('shows an empty state when no listings match', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderListings()

    expect(await screen.findByText('No listings match these filters.')).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    listingsService.getListings.mockRejectedValue(new Error('network error'))
    renderListings()

    expect(await screen.findByText('Could not load listings')).toBeInTheDocument()
  })

  it('re-fetches with the updated filter when the brand input changes', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderListings()
    await waitFor(() => expect(listingsService.getListings).toHaveBeenCalledWith(
      expect.objectContaining({ brand: '' }),
    ))

    await userEvent.type(screen.getByPlaceholderText('Brand'), 'Honda')

    await waitFor(() => expect(listingsService.getListings).toHaveBeenLastCalledWith(
      expect.objectContaining({ brand: 'Honda' }),
    ))
  })
})
