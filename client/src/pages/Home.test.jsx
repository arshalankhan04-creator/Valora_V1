import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import Home from './Home'

function renderHome(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('shows buyer-framed copy and a sign-up CTA when logged out', () => {
    renderHome(null)

    expect(screen.getByText('Find a used car you can actually trust')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
    expect(screen.getByRole('link', { name: 'Sign up free' })).toHaveAttribute('href', '/register')
  })

  it('shows buyer-framed copy but swaps sign-up for a wishlist link when logged in as a buyer', () => {
    renderHome({ id: 'u1', name: 'Priya', role: 'buyer' })

    expect(screen.getByText('Find a used car you can actually trust')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/listings')
    expect(screen.getByRole('link', { name: 'My wishlist' })).toHaveAttribute('href', '/wishlist')
    expect(screen.queryByRole('link', { name: 'Sign up free' })).not.toBeInTheDocument()
  })

  it('shows seller-framed copy and CTAs when logged in as a seller', () => {
    renderHome({ id: 'u2', name: 'Rohan', role: 'seller' })

    expect(screen.getByText('List your car with trust built in')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'List a car' })).toHaveAttribute('href', '/sell')
    expect(screen.getByRole('link', { name: 'My listings' })).toHaveAttribute('href', '/my-listings')
    expect(screen.queryByText('Find a used car you can actually trust')).not.toBeInTheDocument()
  })

  it('also shows the seller-framed page for admins', () => {
    renderHome({ id: 'u3', name: 'Admin', role: 'admin' })

    expect(screen.getByText('List your car with trust built in')).toBeInTheDocument()
  })

  it('reframes the three ML feature cards from the seller\'s perspective', () => {
    renderHome({ id: 'u2', name: 'Rohan', role: 'seller' })

    expect(screen.getByText(/so buyers see it as fair/)).toBeInTheDocument()
    expect(screen.getByText(/keeps your risk flag low/)).toBeInTheDocument()
    expect(screen.getByText(/back up your condition claims/)).toBeInTheDocument()
  })
})
