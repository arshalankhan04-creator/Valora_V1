import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as listingsService from '../services/listings'
import AdminDashboard from './AdminDashboard'
import { Toaster } from '../components/ui/sonner'

vi.mock('../services/listings', () => ({
  getAdminListings: vi.fn(),
  updateListingStatus: vi.fn(),
  deleteListing: vi.fn(),
}))

const PENDING = {
  _id: 'l1', brand: 'Honda', model: 'City', year: 2021, price: 1500000, status: 'pending_review',
  seller: { name: 'Amit', email: 'amit@valora.test' }, ml: { trustScore: 88, riskFlag: 'Low' },
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
      <Toaster />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('AdminDashboard', () => {
  it('loads all statuses on mount', async () => {
    listingsService.getAdminListings.mockResolvedValue([PENDING])
    renderDashboard()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Honda City · 2021')).toBeInTheDocument()
    expect(listingsService.getAdminListings).toHaveBeenCalledWith('')
  })

  it('shows the seller name and email alongside each listing', async () => {
    listingsService.getAdminListings.mockResolvedValue([PENDING])
    renderDashboard()

    expect(await screen.findByText(/Seller: Amit \(amit@valora.test\)/)).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches the filter', async () => {
    listingsService.getAdminListings.mockResolvedValue([])
    renderDashboard()

    expect(await screen.findByText('No listings match this filter.')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', async () => {
    listingsService.getAdminListings.mockRejectedValue(new Error('network error'))
    renderDashboard()

    expect(await screen.findByText('Could not load listings')).toBeInTheDocument()
  })

  it('re-fetches with the selected status when the filter changes', async () => {
    listingsService.getAdminListings.mockResolvedValue([])
    renderDashboard()
    await screen.findByText('No listings match this filter.')

    await userEvent.selectOptions(screen.getByRole('combobox'), 'flagged')

    expect(listingsService.getAdminListings).toHaveBeenLastCalledWith('flagged')
  })

  it('approves a listing and updates its badge without a full reload', async () => {
    listingsService.getAdminListings.mockResolvedValue([PENDING])
    listingsService.updateListingStatus.mockResolvedValue({ ...PENDING, status: 'active' })
    renderDashboard()
    await screen.findByText('Honda City · 2021')

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(listingsService.updateListingStatus).toHaveBeenCalledWith('l1', 'active')
    // Approve button disappears once status flips to active (only shown when status !== 'active').
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  describe('remove', () => {
    it('does nothing if the confirmation dialog is cancelled', async () => {
      listingsService.getAdminListings.mockResolvedValue([PENDING])
      renderDashboard()
      await screen.findByText('Honda City · 2021')

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

      expect(listingsService.deleteListing).not.toHaveBeenCalled()
    })

    it('removes the listing from the list on confirm', async () => {
      listingsService.getAdminListings.mockResolvedValue([PENDING])
      listingsService.deleteListing.mockResolvedValue()
      renderDashboard()
      await screen.findByText('Honda City · 2021')

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      const dialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

      expect(listingsService.deleteListing).toHaveBeenCalledWith('l1')
      expect(await screen.findByText('No listings match this filter.')).toBeInTheDocument()
    })
  })
})
