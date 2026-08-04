import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import heroImage from '../../assets/hero-image.webp'

export default function LandingHero() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    // Search maps to the brand filter specifically (not a fuzzy any-field
    // search) — that's what getListings' brand param actually supports
    // server-side, and the placeholder is worded to match rather than imply
    // broader search than what's real.
    navigate(query.trim() ? `/listings?brand=${encodeURIComponent(query.trim())}` : '/listings')
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pt-12 pb-8">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-foreground sm:text-5xl"
          >
            Find a used car you can actually trust
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 max-w-xl text-muted-foreground"
          >
            Every listing gets a fair-price check, a fraud risk flag, and a condition score before you ever message the seller.
          </motion.p>

          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-6 flex max-w-md gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by brand — Honda, Toyota, Maruti..."
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 flex gap-3"
          >
            <Button asChild size="lg">
              <Link to="/listings">Browse listings</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Sign up free</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-brand/60"
        >
          <img
            src={heroImage}
            alt="A car being delivered on a Valora-branded flatbed"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </div>
    </section>
  )
}
