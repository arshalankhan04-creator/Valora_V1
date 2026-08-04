import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { WishlistProvider } from '../context/WishlistContext'
import Home from './Home'

// The guest branch renders <LandingPage/>, which fetches real listings on
// mount (Featured Listings + Trust Score Showcase) — mocked here since these
// tests care about routing/branching, not landing-page content (that's
// LandingPage.test.jsx's job).
vi.mock('../services/listings', () => ({ getListings: vi.fn().mockResolvedValue([]) }))

function renderHome(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <WishlistProvider>
          <Home />
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('renders the full landing page (hero + CTAs) when logged out', () => {
    renderHome(null)

    // "Browse listings"/"Sign up free" legitimately appear twice on the full
    // landing page (hero + final CTA band) — scoping to the hero specifically
    // is what proves the *hero's* CTAs are unchanged, not just that the text
    // exists somewhere on the page.
    const hero = screen.getByRole('heading', { name: 'Find a used car you can actually trust' }).closest('section')
    expect(within(hero).getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
    expect(within(hero).getByRole('link', { name: 'Sign up free' })).toHaveAttribute('href', '/register')
  })

  it('shows buyer-framed copy but swaps sign-up for a wishlist link when logged in as a buyer', () => {
    renderHome({ id: 'u1', name: 'Priya', role: 'buyer' })

    expect(screen.getByText('Find a used car you can actually trust')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
    expect(screen.getByRole('link', { name: 'My wishlist' })).toHaveAttribute('href', '/wishlist')
    expect(screen.queryByRole('link', { name: 'Sign up free' })).not.toBeInTheDocument()
  })

  it('shows seller-framed copy and CTAs when logged in as a seller', () => {
    renderHome({ id: 'u2', name: 'Rohan', role: 'seller' })

    expect(screen.getByText('List your car with trust built in')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'List a car' })).toHaveAttribute('href', '/sell')
    expect(screen.getByRole('link', { name: 'My listings' })).toHaveAttribute('href', '/my-listings')
    expect(screen.queryByText('Find a used car you can actually trust')).not.toBeInTheDocument()
  })

  it('also shows the seller-framed page for admins', () => {
    renderHome({ id: 'u3', name: 'Admin', role: 'admin' })

    expect(screen.getByText('List your car with trust built in')).toBeInTheDocument()
  })

  it('reframes the three ML feature cards from the seller\'s perspective', () => {
    renderHome({ id: 'u2', name: 'Rohan', role: 'seller' })

    expect(screen.getByText(/so buyers see it as fair/)).toBeInTheDocument()
    expect(screen.getByText(/keeps your risk flag low/)).toBeInTheDocument()
    expect(screen.getByText(/back up your condition claims/)).toBeInTheDocument()
  })
})
