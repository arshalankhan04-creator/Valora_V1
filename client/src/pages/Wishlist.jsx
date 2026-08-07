import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getWishlist } from '../services/wishlist'
import { useWishlist } from '../context/WishlistContext'
import ListingCard from '../components/ListingCard'
import { Skeleton } from '../components/ui/skeleton'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function Wishlist() {
  const { wishlistIds } = useWishlist()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getWishlist()
      .then(setListings)
      .catch(() => setError('Could not load your wishlist'))
      .finally(() => setLoading(false))
  }, [])

  // Derive from the shared wishlistIds (not just the initial fetch) so
  // unsaving a listing here removes its card immediately instead of
  // waiting for a full page reload.
  const visibleListings = listings.filter((l) => wishlistIds.has(l._id))

  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-10">
      <h1 className="text-3xl font-bold text-foreground">My wishlist</h1>

      {loading && (
        <div aria-live="polite" className="mt-8">
          <span className="sr-only">Loading...</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        </div>
      )}
      {error && <p className="mt-8 text-destructive">{error}</p>}
      {!loading && !error && visibleListings.length === 0 && (
        <p className="mt-8 text-muted-foreground">Nothing saved yet — tap the heart on any listing to add it here.</p>
      )}

      {!loading && !error && visibleListings.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleListings.map((listing) => (
            <motion.div key={listing._id} variants={cardVariants}>
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
