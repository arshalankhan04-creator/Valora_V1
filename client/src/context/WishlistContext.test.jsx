import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthContext'
import { WishlistProvider, useWishlist } from './WishlistContext'
import * as wishlistService from '../services/wishlist'

vi.mock('../services/wishlist', () => ({
  getWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}))

function Consumer() {
  const { wishlistIds, toggle } = useWishlist()
  return (
    <div>
      <span data-testid="ids">{[...wishlistIds].join(',')}</span>
      <button onClick={() => toggle('listing-1')}>toggle</button>
    </div>
  )
}

function renderWithUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  return render(
    <AuthProvider>
      <WishlistProvider>
        <Consumer />
      </WishlistProvider>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  wishlistService.getWishlist.mockResolvedValue([])
})

describe('WishlistContext', () => {
  it('never calls getWishlist when nobody is logged in', () => {
    renderWithUser(null)
    expect(wishlistService.getWishlist).not.toHaveBeenCalled()
    expect(screen.getByTestId('ids')).toHaveTextContent('')
  })

  it('loads the wishlist for the current user on mount', async () => {
    wishlistService.getWishlist.mockResolvedValue([{ _id: 'listing-1' }, { _id: 'listing-2' }])
    renderWithUser({ id: 'u1' })

    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('listing-1,listing-2')
    })
  })

  it('optimistically adds an id and calls addToWishlist', async () => {
    wishlistService.addToWishlist.mockResolvedValue()
    renderWithUser({ id: 'u1' })
    await waitFor(() => expect(wishlistService.getWishlist).toHaveBeenCalled())

    await userEvent.click(screen.getByText('toggle'))

    expect(screen.getByTestId('ids')).toHaveTextContent('listing-1')
    expect(wishlistService.addToWishlist).toHaveBeenCalledWith('listing-1')
  })

  it('reverts the optimistic add if the request fails', async () => {
    wishlistService.addToWishlist.mockRejectedValue(new Error('network error'))
    renderWithUser({ id: 'u1' })
    await waitFor(() => expect(wishlistService.getWishlist).toHaveBeenCalled())

    await userEvent.click(screen.getByText('toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('')
    })
  })

  it('optimistically removes an already-saved id and calls removeFromWishlist', async () => {
    wishlistService.getWishlist.mockResolvedValue([{ _id: 'listing-1' }])
    wishlistService.removeFromWishlist.mockResolvedValue()
    renderWithUser({ id: 'u1' })
    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('listing-1')
    })

    await userEvent.click(screen.getByText('toggle'))

    expect(screen.getByTestId('ids')).toHaveTextContent('')
    expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith('listing-1')
  })
})
