import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ListingCard from '../ListingCard'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'

export default function FeaturedListings({ listings, loading }) {
  // Real data only — no fabricated "example" cards here. If there's
  // genuinely nothing to show yet, skip the section rather than fake it.
  if (!loading && listings.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured listings</h2>
          <p className="mt-1 text-muted-foreground">Real cars, already checked for price, fraud risk, and condition.</p>
        </div>
        <Button asChild variant="outline" className="hidden flex-shrink-0 sm:inline-flex">
          <Link to="/listings">View all</Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
          : listings.map((listing, i) => (
              <motion.div
                key={listing._id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
      </div>
    </section>
  )
}
