import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import * as inquiriesService from '../services/inquiries'
import Inquiries from './Inquiries'
import { Toaster } from '../components/ui/sonner'

vi.mock('../services/inquiries', () => ({
  getMyInquiries: vi.fn(),
  addMessage: vi.fn(),
  markInquiryRead: vi.fn(),
  setInquiryArchived: vi.fn(),
}))

const BUYER = { id: 'buyer-1', name: 'Priya', role: 'buyer' }

function makeInquiry(overrides = {}) {
  return {
    _id: 'i1',
    listing: { _id: 'l1', brand: 'Honda', model: 'City', price: 1500000, images: [], kmDriven: 32000, ml: { trustScore: 88 } },
    buyer: { _id: 'buyer-1', name: 'Priya' },
    seller: { _id: 'seller-1', name: 'Amit' },
    archived: false,
    unread: false,
    messages: [{ _id: 'm1', sender: 'buyer-1', text: 'Is this still available?', createdAt: '2026-01-01T10:00:00.000Z' }],
    ...overrides,
  }
}

function renderInquiries(user = BUYER, initialPath = '/inquiries') {
  localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/inquiries/:id" element={<Inquiries />} />
        </Routes>
      </AuthProvider>
      <Toaster />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Inquiries', () => {
  it('shows a loading state then the conversation list, with nothing selected by default', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
    renderInquiries()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Amit')).toBeInTheDocument()
    expect(screen.getByText('Select a conversation')).toBeInTheDocument()
    expect(screen.queryByText('Is this still available?')).not.toBeInTheDocument()
  })

  it('shows a friendly empty state with a link to browse listings when there are no inquiries at all', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([])
    renderInquiries()

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
  })

  it('opens a conversation on click and shows its messages', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
    renderInquiries()
    await screen.findByText('Amit')

    await userEvent.click(screen.getByText('Amit'))

    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
    expect(screen.queryByText('Select a conversation')).not.toBeInTheDocument()
  })

  it('the "+ New" button links to Browse Listings', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
    renderInquiries()
    await screen.findByText('Amit')

    expect(screen.getByRole('link', { name: /New/ })).toHaveAttribute('href', '/listings')
  })

  it('the empty-state CTA also links to Browse Listings', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
    renderInquiries()

    expect(await screen.findByRole('link', { name: 'Browse cars to start a chat' })).toHaveAttribute('href', '/listings')
  })

  describe('tabs', () => {
    it('shows live counts and filters the list per tab', async () => {
      const active = makeInquiry({ _id: 'i1', seller: { _id: 's1', name: 'Amit' } })
      const unread = makeInquiry({ _id: 'i2', seller: { _id: 's2', name: 'Rahul' }, unread: true })
      const archived = makeInquiry({ _id: 'i3', seller: { _id: 's3', name: 'Sana' }, archived: true })
      inquiriesService.getMyInquiries.mockResolvedValue([active, unread, archived])
      renderInquiries()
      await screen.findByText('Amit')

      expect(screen.getByRole('tab', { name: 'Active 2' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Unread 1' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()
      // Active tab (default) excludes the archived conversation.
      expect(screen.queryByText('Sana')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('tab', { name: 'Unread 1' }))
      expect(screen.getByText('Rahul')).toBeInTheDocument()
      expect(screen.queryByText('Amit')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('tab', { name: 'Archived 1' }))
      expect(screen.getByText('Sana')).toBeInTheDocument()
      expect(screen.queryByText('Amit')).not.toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('filters conversations by listing brand/model or the other party\'s name', async () => {
      const honda = makeInquiry({ _id: 'i1', seller: { _id: 's1', name: 'Amit' } })
      const toyota = makeInquiry({
        _id: 'i2',
        listing: { _id: 'l2', brand: 'Toyota', model: 'Innova', price: 1800000, images: [], kmDriven: 40000, ml: {} },
        seller: { _id: 's2', name: 'Rahul' },
      })
      inquiriesService.getMyInquiries.mockResolvedValue([honda, toyota])
      renderInquiries()
      await screen.findByText('Amit')

      await userEvent.type(screen.getByPlaceholderText('Search conversations...'), 'toyota')

      expect(screen.getByText('Rahul')).toBeInTheDocument()
      expect(screen.queryByText('Amit')).not.toBeInTheDocument()
    })
  })

  describe('mark as read', () => {
    it('optimistically clears the unread indicator and calls markInquiryRead on open', async () => {
      inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry({ unread: true })])
      inquiriesService.markInquiryRead.mockResolvedValue()
      renderInquiries()
      await screen.findByText('Amit')

      await userEvent.click(screen.getByText('Amit'))

      expect(inquiriesService.markInquiryRead).toHaveBeenCalledWith('i1')
      expect(screen.getByRole('tab', { name: 'Unread 0' })).toBeInTheDocument()
    })
  })

  describe('archive', () => {
    it('archives the open conversation and reflects it in the Archived tab', async () => {
      inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
      inquiriesService.setInquiryArchived.mockResolvedValue()
      renderInquiries()
      await screen.findByText('Amit')
      await userEvent.click(screen.getByText('Amit'))

      await userEvent.click(screen.getByRole('button', { name: /Archive/ }))

      expect(inquiriesService.setInquiryArchived).toHaveBeenCalledWith('i1', true)
      expect(screen.getByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Unarchive/ })).toBeInTheDocument()
    })

    it('reverts the optimistic update and shows a toast if archiving fails', async () => {
      inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
      inquiriesService.setInquiryArchived.mockRejectedValue(new Error('network error'))
      renderInquiries()
      await screen.findByText('Amit')
      await userEvent.click(screen.getByText('Amit'))

      await userEvent.click(screen.getByRole('button', { name: /Archive/ }))

      expect(await screen.findByText('Could not archive conversation')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Active 1' })).toBeInTheDocument()
    })
  })

  describe('reply', () => {
    it('sends a reply and appends it to the open thread', async () => {
      inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
      inquiriesService.addMessage.mockResolvedValue(
        makeInquiry({
          messages: [
            ...makeInquiry().messages,
            { _id: 'm2', sender: 'buyer-1', text: 'Great, thanks!', createdAt: '2026-01-01T10:05:00.000Z' },
          ],
        }),
      )
      renderInquiries()
      await screen.findByText('Amit')
      await userEvent.click(screen.getByText('Amit'))

      await userEvent.type(screen.getByPlaceholderText('Type a reply...'), 'Great, thanks!')
      await userEvent.click(screen.getByRole('button', { name: 'Send' }))

      expect(inquiriesService.addMessage).toHaveBeenCalledWith('i1', 'Great, thanks!')
      expect(await screen.findByText('Great, thanks!')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Type a reply...')).toHaveValue('')
    })

    it('does not send an empty or whitespace-only reply', async () => {
      inquiriesService.getMyInquiries.mockResolvedValue([makeInquiry()])
      renderInquiries()
      await screen.findByText('Amit')
      await userEvent.click(screen.getByText('Amit'))

      await userEvent.type(screen.getByPlaceholderText('Type a reply...'), '   ')
      await userEvent.click(screen.getByRole('button', { name: 'Send' }))

      expect(inquiriesService.addMessage).not.toHaveBeenCalled()
    })
  })
})
