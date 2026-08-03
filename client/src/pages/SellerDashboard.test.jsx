import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as listingsService from '../services/listings'
import SellerDashboard from './SellerDashboard'
import { Toaster } from '../components/ui/sonner'

vi.mock('../services/listings', () => ({
  getMyListings: vi.fn(),
  deleteListing: vi.fn(),
}))

const ACTIVE = {
  _id: 'l1', brand: 'Honda', model: 'City', year: 2021, kmDriven: 32000, price: 1500000,
  status: 'active', ml: { trustScore: 88, riskFlag: 'Low' },
}
const FLAGGED = {
  _id: 'l2', brand: 'Toyota', model: 'Etios', year: 2015, kmDriven: 120000, price: 300000,
  status: 'flagged', ml: { trustScore: 20, riskFlag: 'High', fraudReasons: ['Price is far outside the predicted fair-price range'] },
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <SellerDashboard />
      <Toaster />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('SellerDashboard', () => {
  it('shows a loading state then the seller\'s own listings', async () => {
    listingsService.getMyListings.mockResolvedValue([ACTIVE])
    renderDashboard()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
  })

  it('shows an empty state with a link to create a listing', async () => {
    listingsService.getMyListings.mockResolvedValue([])
    renderDashboard()

    expect(await screen.findByText('List one now')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', async () => {
    listingsService.getMyListings.mockRejectedValue(new Error('network error'))
    renderDashboard()

    expect(await screen.findByText('Could not load your listings')).toBeInTheDocument()
  })

  it('shows the fraud reasons for a flagged listing', async () => {
    listingsService.getMyListings.mockResolvedValue([FLAGGED])
    renderDashboard()

    expect(await screen.findByText(/Flagged for review: Price is far outside the predicted fair-price range/)).toBeInTheDocument()
  })

  describe('delete', () => {
    it('does nothing if the confirmation dialog is cancelled', async () => {
      listingsService.getMyListings.mockResolvedValue([ACTIVE])
      renderDashboard()
      await screen.findByText('Honda City · 2021')

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      expect(listingsService.deleteListing).not.toHaveBeenCalled()
      expect(screen.getByText('Honda City · 2021')).toBeInTheDocument()
    })

    it('deletes and removes the listing from the list on confirm', async () => {
      listingsService.getMyListings.mockResolvedValue([ACTIVE])
      listingsService.deleteListing.mockResolvedValue()
      renderDashboard()
      await screen.findByText('Honda City · 2021')

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(listingsService.deleteListing).toHaveBeenCalledWith('l1')
      expect(await screen.findByText('List one now')).toBeInTheDocument()
    })

    it('shows a toast if the delete request fails', async () => {
      listingsService.getMyListings.mockResolvedValue([ACTIVE])
      listingsService.deleteListing.mockRejectedValue(new Error('network error'))
      renderDashboard()
      await screen.findByText('Honda City · 2021')

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const dialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(await screen.findByText('Could not delete listing')).toBeInTheDocument()
      expect(screen.getByText('Honda City · 2021')).toBeInTheDocument()
    })
  })
})
