import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { WishlistProvider } from '../context/WishlistContext'
import * as listingsService from '../services/listings'
import * as inquiriesService from '../services/inquiries'
import ListingDetail from './ListingDetail'

vi.mock('../services/listings', () => ({ getListing: vi.fn() }))
vi.mock('../services/inquiries', () => ({ createInquiry: vi.fn() }))
vi.mock('../services/wishlist', () => ({
  getWishlist: vi.fn().mockResolvedValue([]),
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
}))

const LISTING = {
  _id: 'l1',
  brand: 'Honda',
  model: 'City',
  year: 2021,
  kmDriven: 32000,
  fuelType: 'Petrol',
  transmission: 'Automatic',
  price: 1500000,
  description: 'Well maintained, single owner.',
  images: [],
  seller: { _id: 'seller-1', name: 'Amit' },
  ml: {
    trustScore: 88,
    riskFlag: 'Low',
    predictedPriceMin: 1400000,
    predictedPriceMax: 1600000,
    confidenceLevel: 'high',
    fraudProbability: 0.1,
    fraudReasons: [],
    visualConditionScore: 90,
    detectedDamages: [],
  },
}

function renderDetail(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter initialEntries={['/listings/l1']}>
      <AuthProvider>
        <WishlistProvider>
          <Routes>
            <Route path="/listings/:id" element={<ListingDetail />} />
          </Routes>
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ListingDetail', () => {
  it('shows a loading state then the listing details', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    renderDetail()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
    expect(listingsService.getListing).toHaveBeenCalledWith('l1')
  })

  it('shows a not-found message when the listing fails to load', async () => {
    listingsService.getListing.mockRejectedValue(new Error('404'))
    renderDetail()

    expect(await screen.findByText('Listing not found')).toBeInTheDocument()
  })

  it('renders the fair-price, fraud, and condition ML breakdowns', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    renderDetail()

    expect(await screen.findByText(/Predicted range:/)).toBeInTheDocument()
    expect(screen.getByText(/high confidence/)).toBeInTheDocument()
    expect(screen.getByText(/Low risk \(10% probability\)/)).toBeInTheDocument()
    expect(screen.getByText('Visual condition score: 90/100')).toBeInTheDocument()
  })

  it('shows "not yet scored" placeholders when ml fields are absent', async () => {
    listingsService.getListing.mockResolvedValue({ ...LISTING, ml: {} })
    renderDetail()

    await screen.findByText('Honda City · 2021')
    // TrustScoreBadge, the price-fairness card, and the fraud card all fall
    // back to this same text when their respective ml fields are missing;
    // condition assessment uses different text.
    expect(screen.getAllByText('Not yet scored')).toHaveLength(3)
    expect(screen.getByText('No photos to assess')).toBeInTheDocument()
  })

  it('prompts a logged-out visitor to log in instead of showing the contact form', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    renderDetail(null)

    await screen.findByText('Honda City · 2021')
    expect(screen.getByText('Log in')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Ask the seller a question...')).not.toBeInTheDocument()
  })

  it('hides the contact form for the listing\'s own seller', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    renderDetail({ id: 'seller-1', role: 'seller' })

    await screen.findByText('Honda City · 2021')
    expect(screen.queryByPlaceholderText('Ask the seller a question...')).not.toBeInTheDocument()
  })

  it('hides the contact form for an admin viewer', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    renderDetail({ id: 'admin-1', role: 'admin' })

    await screen.findByText('Honda City · 2021')
    expect(screen.queryByPlaceholderText('Ask the seller a question...')).not.toBeInTheDocument()
  })

  it('lets a buyer send a message to the seller', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    inquiriesService.createInquiry.mockResolvedValue({ _id: 'inq-1' })
    renderDetail({ id: 'buyer-1', role: 'buyer' })
    await screen.findByText('Honda City · 2021')

    await userEvent.type(screen.getByPlaceholderText('Ask the seller a question...'), 'Is the AC working?')
    await userEvent.click(screen.getByRole('button', { name: 'Contact seller' }))

    expect(inquiriesService.createInquiry).toHaveBeenCalledWith('l1', 'Is the AC working?')
    expect(await screen.findByText(/Message sent/)).toBeInTheDocument()
  })

  it('shows an error if sending the message fails', async () => {
    listingsService.getListing.mockResolvedValue(LISTING)
    inquiriesService.createInquiry.mockRejectedValue(new Error('network error'))
    renderDetail({ id: 'buyer-1', role: 'buyer' })
    await screen.findByText('Honda City · 2021')

    await userEvent.type(screen.getByPlaceholderText('Ask the seller a question...'), 'Is the AC working?')
    await userEvent.click(screen.getByRole('button', { name: 'Contact seller' }))

    expect(await screen.findByText('Could not send message')).toBeInTheDocument()
  })
})
