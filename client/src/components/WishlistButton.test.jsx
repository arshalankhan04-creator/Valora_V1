import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import WishlistButton from './WishlistButton'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../context/WishlistContext', () => ({ useWishlist: vi.fn() }))

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when nobody is logged in', () => {
    useAuth.mockReturnValue({ user: null })
    useWishlist.mockReturnValue({ wishlistIds: new Set(), toggle: vi.fn() })

    const { container } = render(<WishlistButton listingId="l1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an empty heart and "Save" label when not wishlisted', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } })
    useWishlist.mockReturnValue({ wishlistIds: new Set(), toggle: vi.fn() })

    render(<WishlistButton listingId="l1" />)
    expect(screen.getByRole('button', { name: 'Save to wishlist' })).toHaveTextContent('♡')
  })

  it('shows a filled heart and "Remove" label when already wishlisted', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } })
    useWishlist.mockReturnValue({ wishlistIds: new Set(['l1']), toggle: vi.fn() })

    render(<WishlistButton listingId="l1" />)
    expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toHaveTextContent('♥')
  })

  it('calls toggle with the listing id on click', async () => {
    const toggle = vi.fn()
    useAuth.mockReturnValue({ user: { id: 'u1' } })
    useWishlist.mockReturnValue({ wishlistIds: new Set(), toggle })

    render(<WishlistButton listingId="l1" />)
    await userEvent.click(screen.getByRole('button'))

    expect(toggle).toHaveBeenCalledWith('l1')
  })

  it('does not follow a wrapping link when clicked', async () => {
    const toggle = vi.fn()
    useAuth.mockReturnValue({ user: { id: 'u1' } })
    useWishlist.mockReturnValue({ wishlistIds: new Set(), toggle })

    let navigated = false
    render(
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      <a href="/listings/l1" onClick={() => { navigated = true }}>
        <WishlistButton listingId="l1" />
      </a>,
    )
    await userEvent.click(screen.getByRole('button'))

    expect(toggle).toHaveBeenCalled()
    expect(navigated).toBe(false)
  })
})
