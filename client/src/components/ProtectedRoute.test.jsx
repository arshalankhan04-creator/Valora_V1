import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

function renderAt(path, roles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ProtectedRoute', () => {
  it('redirects to /login when nobody is logged in', () => {
    useAuth.mockReturnValue({ user: null })
    renderAt('/protected')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects to / when the user has the wrong role', () => {
    useAuth.mockReturnValue({ user: { role: 'buyer' } })
    renderAt('/protected', ['admin'])
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it('renders the protected content when logged in with no role restriction', () => {
    useAuth.mockReturnValue({ user: { role: 'buyer' } })
    renderAt('/protected')
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('renders the protected content when the role matches', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' } })
    renderAt('/protected', ['admin', 'seller'])
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })
})
