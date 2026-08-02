import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { WishlistProvider } from '../context/WishlistContext'
import * as wishlistService from '../services/wishlist'
import Wishlist from './Wishlist'

vi.mock('../services/wishlist', () => ({
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}))

const HONDA = { _id: 'l1', brand: 'Honda', model: 'City', year: 2021, kmDriven: 32000, fuelType: 'Petrol', transmission: 'Automatic', price: 1500000, ml: {} }
const TOYOTA = { _id: 'l2', brand: 'Toyota', model: 'Innova', year: 2020, kmDriven: 50000, fuelType: 'Diesel', transmission: 'Manual', price: 1800000, ml: {} }

function renderWishlist(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <WishlistProvider>
          <Wishlist />
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Wishlist', () => {
  it('shows a loading state then the saved listings', async () => {
    wishlistService.getWishlist.mockResolvedValue([HONDA])
    renderWishlist({ id: 'u1' })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is saved', async () => {
    wishlistService.getWishlist.mockResolvedValue([])
    renderWishlist({ id: 'u1' })

    expect(await screen.findByText('Nothing saved yet — tap the heart on any listing to add it here.')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', async () => {
    wishlistService.getWishlist.mockRejectedValue(new Error('network error'))
    renderWishlist({ id: 'u1' })

    expect(await screen.findByText('Could not load your wishlist')).toBeInTheDocument()
  })

  it('only shows listings still present in the shared wishlistIds set', async () => {
    // Two independent getWishlist calls fire on mount: the page's own fetch
    // (both listings) and WishlistContext's fetch (the source of truth for
    // what's actually saved, here only Honda) — Toyota must be filtered out
    // rather than shown just because the page's own fetch included it.
    wishlistService.getWishlist
      .mockResolvedValueOnce([HONDA, TOYOTA])
      .mockResolvedValueOnce([HONDA])
    renderWishlist({ id: 'u1' })

    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
    expect(screen.queryByText('Toyota Innova · 2020')).not.toBeInTheDocument()
  })
})
