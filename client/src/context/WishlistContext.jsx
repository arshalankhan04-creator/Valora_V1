import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getWishlist, addToWishlist, removeFromWishlist } from '../services/wishlist'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [wishlistIds, setWishlistIds] = useState(new Set())

  useEffect(() => {
    if (!user) {
      setWishlistIds(new Set())
      return
    }
    getWishlist()
      .then((listings) => setWishlistIds(new Set(listings.map((l) => l._id))))
      .catch(() => setWishlistIds(new Set()))
  }, [user])

  const toggle = useCallback(async (listingId) => {
    const isSaved = wishlistIds.has(listingId)
    // Optimistic update — the request rarely fails, and waiting on it first
    // makes the heart icon feel laggy for what should be an instant toggle.
    setWishlistIds((prev) => {
      const next = new Set(prev)
      isSaved ? next.delete(listingId) : next.add(listingId)
      return next
    })

    try {
      if (isSaved) {
        await removeFromWishlist(listingId)
      } else {
        await addToWishlist(listingId)
      }
    } catch {
      // Revert on failure
      setWishlistIds((prev) => {
        const next = new Set(prev)
        isSaved ? next.add(listingId) : next.delete(listingId)
        return next
      })
    }
  }, [wishlistIds])

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggle }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
