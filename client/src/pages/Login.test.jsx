import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import api from '../services/api'
import Login from './Login'

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('Login', () => {
  it('logs in and navigates home on success', async () => {
    api.post.mockResolvedValue({
      data: { user: { id: '1', name: 'Amit', role: 'buyer' }, token: 'tok-123' },
    })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('Email'), 'amit@valora.test')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'amit@valora.test',
      password: 'password123',
    })
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('tok-123')
  })

  it('shows the server error message and does not navigate on failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('Email'), 'amit@valora.test')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })

  it('falls back to a generic error message when the server gives none', async () => {
    api.post.mockRejectedValue(new Error('network down'))
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('Email'), 'amit@valora.test')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Login failed')).toBeInTheDocument()
  })
})
