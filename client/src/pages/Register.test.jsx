import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import api from '../services/api'
import Register from './Register'

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }))

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Register', () => {
  it('defaults to the buyer role', () => {
    renderRegister()
    expect(screen.getByRole('combobox')).toHaveValue('buyer')
  })

  it('submits the chosen role and navigates home on success', async () => {
    api.post.mockResolvedValue({
      data: { user: { id: '1', name: 'Priya', role: 'seller' }, token: 'tok-456' },
    })
    renderRegister()

    await userEvent.type(screen.getByPlaceholderText('Full name'), 'Priya')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'priya@valora.test')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'seller')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Priya',
      email: 'priya@valora.test',
      password: 'password123',
      role: 'seller',
    })
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('tok-456')
  })

  it('shows the server error message on a duplicate email', async () => {
    api.post.mockRejectedValue({
      response: { data: { message: 'An account with this email already exists' } },
    })
    renderRegister()

    await userEvent.type(screen.getByPlaceholderText('Full name'), 'Priya')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'priya@valora.test')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })
})
