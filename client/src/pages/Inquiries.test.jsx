import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import * as inquiriesService from '../services/inquiries'
import Inquiries from './Inquiries'

vi.mock('../services/inquiries', () => ({
  getMyInquiries: vi.fn(),
  addMessage: vi.fn(),
}))

const BUYER = { id: 'buyer-1', name: 'Priya', role: 'buyer' }
const SELLER = { _id: 'seller-1', name: 'Amit' }

const INQUIRY_1 = {
  _id: 'i1',
  listing: { brand: 'Honda', model: 'City', price: 1500000 },
  buyer: { _id: 'buyer-1' },
  seller: SELLER,
  messages: [
    { _id: 'm1', sender: 'buyer-1', text: 'Is this still available?' },
    { _id: 'm2', sender: { _id: 'seller-1' }, text: 'Yes, still available.' },
  ],
}
const INQUIRY_2 = {
  _id: 'i2',
  listing: { brand: 'Toyota', model: 'Innova', price: 1800000 },
  buyer: { _id: 'buyer-1' },
  seller: { _id: 'seller-2', name: 'Rahul' },
  messages: [{ _id: 'm3', sender: 'buyer-1', text: 'Any damage history?' }],
}

function renderInquiries(user = BUYER) {
  localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Inquiries />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Inquiries', () => {
  it('shows a loading state then the first inquiry selected by default', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([INQUIRY_1, INQUIRY_2])
    renderInquiries()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(await screen.findByText('Is this still available?')).toBeInTheDocument()
    expect(screen.getByText('Yes, still available.')).toBeInTheDocument()
  })

  it('shows an empty state when there are no inquiries', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([])
    renderInquiries()

    expect(await screen.findByText('No inquiries yet.')).toBeInTheDocument()
  })

  it('shows the other party\'s name in the thread list, not the current user\'s', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([INQUIRY_1])
    renderInquiries()

    expect(await screen.findByText('with Amit')).toBeInTheDocument()
  })

  it('switches the open thread when a different conversation is selected', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([INQUIRY_1, INQUIRY_2])
    renderInquiries()
    await screen.findByText('Is this still available?')

    await userEvent.click(screen.getByText('with Rahul'))

    expect(screen.getByText('Any damage history?')).toBeInTheDocument()
    expect(screen.queryByText('Is this still available?')).not.toBeInTheDocument()
  })

  it('sends a reply and appends it to the open thread', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([INQUIRY_1])
    inquiriesService.addMessage.mockResolvedValue({
      ...INQUIRY_1,
      messages: [...INQUIRY_1.messages, { _id: 'm4', sender: 'buyer-1', text: 'Great, thanks!' }],
    })
    renderInquiries()
    await screen.findByText('Is this still available?')

    await userEvent.type(screen.getByPlaceholderText('Type a reply...'), 'Great, thanks!')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(inquiriesService.addMessage).toHaveBeenCalledWith('i1', 'Great, thanks!')
    expect(await screen.findByText('Great, thanks!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a reply...')).toHaveValue('')
  })

  it('does not send an empty or whitespace-only reply', async () => {
    inquiriesService.getMyInquiries.mockResolvedValue([INQUIRY_1])
    renderInquiries()
    await screen.findByText('Is this still available?')

    await userEvent.type(screen.getByPlaceholderText('Type a reply...'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(inquiriesService.addMessage).not.toHaveBeenCalled()
  })
})
