import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'

export default function WishlistButton({ listingId, className = '' }) {
  const { user } = useAuth()
  const { wishlistIds, toggle } = useWishlist()

  if (!user) return null

  const saved = wishlistIds.has(listingId)

  const handleClick = (e) => {
    e.preventDefault() // don't follow a wrapping <Link> (e.g. inside ListingCard)
    e.stopPropagation()
    toggle(listingId)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`text-xl leading-none ${saved ? 'text-red-500' : 'text-gray-400 hover:text-red-400'} ${className}`}
    >
      {saved ? '♥' : '♡'}
    </button>
  )
}
