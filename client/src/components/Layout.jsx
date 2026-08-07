import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Car,
  Search,
  Heart,
  MessageSquare,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useEffect, useRef, useState } from 'react'
import GradualBlur from './GradualBlur'

/* ─── Inline styles for the floating-glass navbar ─── */
const navStyles = `
  /* ── FLOATING NAV ── */
  #valora-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    transition: top 0.45s ease, left 0.45s ease, right 0.45s ease;
  }
  #valora-header.scrolled {
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
  }

  #valora-nav-pill {
    margin: 0 auto;
    max-width: 1200px;
    transition: background 0.45s ease, border 0.45s ease,
                border-radius 0.45s ease, box-shadow 0.45s ease,
                max-width 0.45s ease, padding 0.45s ease;
  }
  #valora-header.scrolled #valora-nav-pill,
  #valora-header.menu-open #valora-nav-pill {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 1rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(255,255,255,0.9) inset;
    max-width: 1100px;
  }

  #valora-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.75rem;
    height: 4.5rem;
    transition: height 0.45s ease, padding 0.45s ease;
  }
  #valora-header.scrolled #valora-nav-inner {
    height: 3.25rem;
    padding: 0 1.25rem;
  }

  /* Logo */
  .vn-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--color-foreground);
    text-decoration: none;
    transition: font-size 0.45s ease;
    flex-shrink: 0;
  }
  #valora-header.scrolled .vn-logo { font-size: 1.125rem; }

  /* Desktop nav links */
  .vn-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .vn-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted-foreground);
    text-decoration: none;
    transition: color 0.2s, background 0.2s;
    white-space: nowrap;
  }
  .vn-link svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; }
  .vn-link:hover {
    color: var(--color-foreground);
    background: var(--color-muted);
  }
  .vn-link:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }

  /* CTA area */
  .vn-cta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .vn-btn-ghost {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-foreground);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s;
    display: inline-flex;
    align-items: center;
  }
  .vn-btn-ghost:hover { background: var(--color-muted); }
  .vn-btn-solid {
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    background: var(--color-foreground);
    border: 1px solid transparent;
    color: var(--color-background);
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.2s;
    display: inline-flex;
    align-items: center;
  }
  .vn-btn-solid:hover { opacity: 0.85; }
  #valora-header.scrolled .vn-btn-ghost,
  #valora-header.scrolled .vn-btn-solid {
    font-size: 0.75rem;
    padding: 0.3rem 0.75rem;
  }

  /* Avatar dropdown trigger */
  .vn-user-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem 0.25rem 0.25rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-foreground);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  .vn-user-trigger:hover { background: var(--color-muted); }

  /* Hamburger button */
  #vn-mobile-btn {
    display: none;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--color-foreground);
    cursor: pointer;
    border-radius: 0.5rem;
    transition: background 0.2s;
    line-height: 0;
    min-width: 44px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
  }
  #vn-mobile-btn:hover { background: var(--color-muted); }
  #vn-mobile-btn:focus-visible { outline: 2px solid var(--color-ring); }

  /* ── MOBILE FULL-SCREEN MENU ── */
  #vn-mobile-menu {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 45;
    background: var(--color-background);
    overflow-y: auto;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }
  #vn-mobile-menu.open {
    opacity: 1;
    pointer-events: auto;
  }
  .vn-mobile-inner {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: 6.5rem 2rem 2rem;
  }
  .vn-mobile-links {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
  }
  .vn-mobile-link {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
    font-size: clamp(1.5rem, 6vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--color-foreground);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border);
    opacity: 0;
    transform: translateY(0.75rem);
    transition: opacity 0.4s ease, transform 0.4s ease, color 0.2s;
  }
  .vn-mobile-link svg { width: 1.25rem; height: 1.25rem; color: var(--color-muted-foreground); }
  #vn-mobile-menu.open .vn-mobile-link { opacity: 1; transform: translateY(0); }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(1) { transition-delay: 40ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(2) { transition-delay: 80ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(3) { transition-delay: 120ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(4) { transition-delay: 160ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(5) { transition-delay: 200ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(6) { transition-delay: 240ms; }
  #vn-mobile-menu.open .vn-mobile-link:nth-child(7) { transition-delay: 280ms; }
  .vn-mobile-link:hover { color: var(--color-muted-foreground); }
  .vn-mobile-cta {
    display: flex;
    gap: 0.75rem;
    padding-top: 2rem;
    opacity: 0;
    transform: translateY(0.75rem);
    transition: opacity 0.4s ease 280ms, transform 0.4s ease 280ms;
  }
  #vn-mobile-menu.open .vn-mobile-cta { opacity: 1; transform: translateY(0); }
  .vn-mobile-btn {
    flex: 1;
    height: 3.25rem;
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: inherit;
    border-radius: 9999px;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
    min-height: 44px;
  }
  .vn-mobile-btn-ghost {
    background: transparent;
    border: 1.5px solid var(--color-border);
    color: var(--color-foreground);
  }
  .vn-mobile-btn-solid {
    background: var(--color-foreground);
    border: 1.5px solid var(--color-foreground);
    color: var(--color-background);
  }
  .vn-mobile-btn:hover { opacity: 0.8; }
  .vn-mobile-logout {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-muted-foreground);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: color 0.2s;
  }
  .vn-mobile-logout:hover { color: var(--color-destructive); }

  /* ── RESPONSIVE BREAKPOINT ── */
  @media (max-width: 900px) {
    #vn-mobile-btn { display: inline-flex; }
    .vn-links, .vn-cta { display: none !important; }
    #vn-mobile-menu { display: block; }
  }
`

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const initial = user?.name?.[0]?.toUpperCase() ?? '?'

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)

  /* Scroll watcher */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close mobile menu on route change */
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  /* Close mobile menu on Escape */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && menuOpen) setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  /* Lock body scroll when menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const headerClass = ['', scrolled && 'scrolled', menuOpen && 'menu-open']
    .filter(Boolean).join(' ')

  const isSeller = user?.role === 'seller' || user?.role === 'admin'
  const isAdmin  = user?.role === 'admin'

  /* Desktop nav link */
  const DLink = ({ to, icon: Icon, children }) => (
    <Link to={to} className="vn-link">
      <Icon />
      {children}
    </Link>
  )

  /* Mobile nav link */
  const MLink = ({ to, icon: Icon, children }) => (
    <Link to={to} className="vn-mobile-link" onClick={() => setMenuOpen(false)}>
      <Icon />
      {children}
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Inject scoped styles */}
      <style>{navStyles}</style>

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-foreground focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      {/* ── HEADER ── */}
      <header id="valora-header" ref={headerRef} className={headerClass}>
        <div id="valora-nav-pill">
          <div id="valora-nav-inner">

            {/* Logo */}
            <Link to="/" className="vn-logo">
              <Car className="size-5 text-primary" />
              Valora
            </Link>

            {/* Desktop links */}
            <nav className="vn-links" aria-label="Primary">
              <DLink to="/listings" icon={Search}>Listings</DLink>
              {isSeller && (
                <>
                  <DLink to="/sell"         icon={PlusCircle}>Sell a car</DLink>
                  <DLink to="/my-listings"  icon={LayoutDashboard}>My listings</DLink>
                  <DLink to="/analytics"    icon={BarChart3}>Analytics</DLink>
                </>
              )}
              {user && (
                <>
                  <DLink to="/wishlist"   icon={Heart}>Wishlist</DLink>
                  <DLink to="/inquiries"  icon={MessageSquare}>Inquiries</DLink>
                </>
              )}
              {isAdmin && <DLink to="/admin" icon={ShieldCheck}>Admin</DLink>}
            </nav>

            {/* Desktop CTA */}
            <div className="vn-cta">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="vn-user-trigger" aria-label="User menu">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                      <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} variant="destructive">
                      <LogOut className="size-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login"    className="vn-btn-ghost">Log in</Link>
                  <Link to="/register" className="vn-btn-solid">Sign up</Link>
                </>
              )}
            </div>

            {/* Hamburger */}
            <button
              id="vn-mobile-btn"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="vn-mobile-menu"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Gradual blur sits just below the navbar in z-order — blurs content scrolling behind it */}
      <GradualBlur
        target="page"
        position="top"
        height="5rem"
        strength={3}
        divCount={6}
        curve="bezier"
        exponential
        opacity={1}
        style={{ zIndex: 49 }}
      />

      {/* ── MOBILE MENU ── */}
      <div
        id="vn-mobile-menu"
        className={menuOpen ? 'open' : ''}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-label="Navigation menu"
      >
        <div className="vn-mobile-inner">
          <nav className="vn-mobile-links" aria-label="Mobile primary">
            <MLink to="/listings"    icon={Search}>Listings</MLink>
            {isSeller && (
              <>
                <MLink to="/sell"        icon={PlusCircle}>Sell a car</MLink>
                <MLink to="/my-listings" icon={LayoutDashboard}>My listings</MLink>
                <MLink to="/analytics"   icon={BarChart3}>Analytics</MLink>
              </>
            )}
            {user && (
              <>
                <MLink to="/wishlist"  icon={Heart}>Wishlist</MLink>
                <MLink to="/inquiries" icon={MessageSquare}>Inquiries</MLink>
              </>
            )}
            {isAdmin && <MLink to="/admin" icon={ShieldCheck}>Admin</MLink>}
          </nav>

          <div className="vn-mobile-cta">
            {user ? (
              <button
                className="vn-mobile-logout"
                onClick={() => { logout(); setMenuOpen(false) }}
              >
                <LogOut className="size-4" />
                Log out ({user.name})
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="vn-mobile-btn vn-mobile-btn-ghost"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="vn-mobile-btn vn-mobile-btn-solid"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {/* pt-[4.5rem] offsets the fixed navbar height so content isn't hidden under it */}
      <main id="main-content" className="flex-1 pt-[4.5rem]">
        <Outlet />
      </main>
    </div>
  )
}
