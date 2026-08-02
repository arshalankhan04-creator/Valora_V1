import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-semibold text-gray-900">
          Valora
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-600">
          <Link to="/listings">Listings</Link>
          {user ? (
            <>
              {(user.role === 'seller' || user.role === 'admin') && <Link to="/sell">Sell a car</Link>}
              <Link to="/inquiries">Inquiries</Link>
              {user.role === 'admin' && <Link to="/admin">Admin</Link>}
              <button onClick={logout} className="text-gray-900">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
