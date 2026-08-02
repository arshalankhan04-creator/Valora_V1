import { useEffect, useState } from 'react'
import { getWishlist } from '../services/wishlist'
import { useWishlist } from '../context/WishlistContext'
import ListingCard from '../components/ListingCard'

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
    <section className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">My wishlist</h1>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && visibleListings.length === 0 && (
        <p className="text-gray-500">Nothing saved yet — tap the heart on any listing to add it here.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleListings.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </section>
  )
}
