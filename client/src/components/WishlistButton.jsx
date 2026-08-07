import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { cn } from '../lib/utils'

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
    <motion.button
      onClick={handleClick}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      whileTap={{ scale: 1.35 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1.5 transition-colors',
        saved ? 'text-destructive' : 'text-muted-foreground hover:text-destructive',
        className,
      )}
    >
      <Heart className="size-4" fill={saved ? 'currentColor' : 'none'} />
    </motion.button>
  )
}
