import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

function Consumer() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'none'}</span>
      <button onClick={() => login({ id: '1', name: 'Amit' }, 'token-123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('throws when useAuth is used outside AuthProvider', () => {
    // Expected console.error noise from React about the thrown render error.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider')
    spy.mockRestore()
  })

  it('starts with no user when localStorage is empty', () => {
    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('hydrates the user from localStorage on mount', () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Amit' }))
    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByTestId('user')).toHaveTextContent('Amit')
  })

  it('login persists the token and user to localStorage', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>)
    await userEvent.click(screen.getByText('login'))

    expect(screen.getByTestId('user')).toHaveTextContent('Amit')
    expect(localStorage.getItem('token')).toBe('token-123')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: '1', name: 'Amit' })
  })

  it('logout clears localStorage and the current user', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>)
    await userEvent.click(screen.getByText('login'))
    await userEvent.click(screen.getByText('logout'))

    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
