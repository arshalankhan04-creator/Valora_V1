import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Gauge, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import LandingPage from '../components/landing/LandingPage'

const BUYER_FEATURES = [
  { icon: Gauge, title: 'Fair-price check', body: 'A predicted price range for every listing, not a single guess.' },
  { icon: ShieldCheck, title: 'Fraud risk flag', body: 'Suspicious listings are flagged before you ever contact a seller.' },
  { icon: Camera, title: 'Condition score', body: "AI reads the seller's own photos to verify the car's real condition." },
]

const SELLER_FEATURES = [
  { icon: Gauge, title: 'Fair-price check', body: 'Your asking price is checked against a predicted range, so buyers see it as fair — not a guess.' },
  { icon: ShieldCheck, title: 'Fraud risk flag', body: 'A clean, complete listing keeps your risk flag low, building buyer confidence automatically.' },
  { icon: Camera, title: 'Condition score', body: 'Upload photos and let AI back up your condition claims instead of just your word.' },
]

export default function Home() {
  const { user } = useAuth()

  // Logged-out visitors get the full marketing landing page. Logged-in
  // buyers/sellers get a short, functional welcome-back page instead — they
  // don't need re-convincing of the value prop, they need a fast path to
  // what they'd actually do next.
  if (!user) return <LandingPage />

  const isSeller = user.role === 'seller' || user.role === 'admin'

  const title = isSeller ? 'List your car with trust built in' : 'Find a used car you can actually trust'
  const subtitle = isSeller
    ? 'Every listing you post gets an automatic fair-price check, fraud risk flag, and condition score — the same signals buyers use to decide who to trust.'
    : 'Every listing gets a fair-price check, a fraud risk flag, and a condition score before you ever message the seller.'
  const primaryCta = isSeller ? { to: '/sell', label: 'List a car' } : { to: '/listings', label: 'Browse listings' }
  const secondaryCta = isSeller ? { to: '/my-listings', label: 'My listings' } : { to: '/wishlist', label: 'My wishlist' }
  const features = isSeller ? SELLER_FEATURES : BUYER_FEATURES

  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold text-foreground sm:text-5xl"
      >
        {title}
      </motion.h1>
      <motion.p
        key={subtitle}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mt-4 max-w-xl text-muted-foreground"
      >
        {subtitle}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 flex justify-center gap-3"
      >
        <Button asChild size="lg">
          <Link to={primaryCta.to}>{primaryCta.label}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
        </Button>
      </motion.div>

      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title: featureTitle, body }, i) => (
          <motion.div
            key={featureTitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold text-foreground">{featureTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
