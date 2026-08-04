import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { WishlistProvider } from '../../context/WishlistContext'
import * as listingsService from '../../services/listings'
import LandingPage from './LandingPage'

vi.mock('../../services/listings', () => ({ getListings: vi.fn() }))
vi.mock('../../services/wishlist', () => ({
  getWishlist: vi.fn().mockResolvedValue([]),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}))

const SCORED_LISTING = {
  _id: 'l1', brand: 'Honda', model: 'City', year: 2021, kmDriven: 32000,
  fuelType: 'Petrol', transmission: 'Automatic', price: 1500000, images: [],
  ml: { trustScore: 92, trustBreakdown: { priceFairness: 38, fraudRisk: 27, conditionMatch: 25, sellerFactor: 2 } },
}
const UNSCORED_LISTING = {
  _id: 'l2', brand: 'Toyota', model: 'Innova', year: 2020, kmDriven: 50000,
  fuelType: 'Diesel', transmission: 'Manual', price: 1800000, images: [], ml: {},
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <WishlistProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/listings" element={<p>Listings page</p>} />
          </Routes>
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('LandingPage', () => {
  it('the hero search submits to /listings with a brand filter', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()

    await userEvent.type(screen.getByPlaceholderText(/Search by brand/), 'Honda')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Listings page')).toBeInTheDocument()
  })

  it('shows real featured listings once loaded, not fabricated ones', async () => {
    listingsService.getListings.mockResolvedValue([SCORED_LISTING, UNSCORED_LISTING])
    renderLanding()

    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
    expect(screen.getByText('Toyota Innova · 2020')).toBeInTheDocument()
  })

  it('skips the featured-listings section entirely when there are no listings yet', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()

    await screen.findByText('Why Valora?') // wait for load to settle
    expect(screen.queryByText('Featured listings')).not.toBeInTheDocument()
  })

  it('shows all four AI feature cards', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()

    expect(await screen.findByText('Fair-price check')).toBeInTheDocument()
    expect(screen.getByText('Fraud risk flag')).toBeInTheDocument()
    expect(screen.getByText('Condition score')).toBeInTheDocument()
    expect(screen.getByText('Trust Score')).toBeInTheDocument()
  })

  describe('Trust Score Showcase', () => {
    it('anchors to the real listing with the highest trust score', async () => {
      listingsService.getListings.mockResolvedValue([UNSCORED_LISTING, SCORED_LISTING])
      renderLanding()

      const heading = await screen.findByText('AI-powered trust scoring')
      const section = heading.closest('section')
      expect(within(section).getByText('Honda City')).toBeInTheDocument()
      expect(within(section).queryByText('Example')).not.toBeInTheDocument()
    })

    it('falls back to a clearly-labeled example when no listing has been scored yet', async () => {
      listingsService.getListings.mockResolvedValue([UNSCORED_LISTING])
      renderLanding()

      const heading = await screen.findByText('AI-powered trust scoring')
      const section = heading.closest('section')
      expect(within(section).getByText('Example')).toBeInTheDocument()
    })
  })

  it('category tiles link to the correct pre-filtered listings URLs', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()
    await screen.findByText('Browse by category')

    expect(screen.getByRole('link', { name: 'Electric' })).toHaveAttribute('href', '/listings?fuelType=Electric')
    expect(screen.getByRole('link', { name: 'Under ₹5L' })).toHaveAttribute('href', '/listings?maxPrice=500000')
  })

  it('the FAQ accordion expands an answer on click', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()
    await screen.findByText('Frequently asked questions')

    await userEvent.click(screen.getByRole('button', { name: /Does Valora physically inspect/ }))

    expect(await screen.findByText(/not a substitute for seeing the car/)).toBeInTheDocument()
  })

  it('the footer shows the oversized wordmark plus real nav links, not link columns', async () => {
    listingsService.getListings.mockResolvedValue([])
    renderLanding()
    await screen.findByText('Why Valora?')

    expect(screen.getAllByText('Valora').length).toBeGreaterThan(0)
    expect(screen.queryByText('Quick links')).not.toBeInTheDocument()
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument()

    const footerNav = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(footerNav).getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
    expect(within(footerNav).getByRole('link', { name: 'Sell a car' })).toHaveAttribute('href', '/register')
    expect(within(footerNav).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(within(footerNav).getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
  })
})
