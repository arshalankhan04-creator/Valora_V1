import { Link } from 'react-router-dom'

// This footer only ever renders on the guest landing page (LandingPage is
// only shown when logged out), so there's no "logged in" variant to branch
// on here — Log in/Sign up are always the right links in this context.
const LINKS = [
  { label: 'Browse listings', to: '/listings' },
  // Sends new sellers to /register rather than the protected /sell route,
  // matching the same choice made in the Seller CTA section — a
  // logged-out visitor almost certainly doesn't have an account yet, so
  // this avoids an extra sell → login → back-to-register bounce.
  { label: 'Sell a car', to: '/register' },
  { label: 'Log in', to: '/login' },
  { label: 'Sign up', to: '/register' },
]

export default function LandingFooter() {
  return (
    <footer className="mx-auto max-w-6xl overflow-hidden px-6 pt-8 pb-6">
      <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        {LINKS.map(({ label, to }) => (
          <Link key={label} to={to} className="text-muted-foreground transition-colors hover:text-foreground">
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Valora
      </div>
      <p
        aria-hidden="true"
        className="mt-2 select-none text-center leading-none font-bold tracking-tighter text-foreground/15"
        style={{ fontSize: 'clamp(3.5rem, 18vw, 11rem)' }}
      >
        Valora
      </p>
    </footer>
  )
}
