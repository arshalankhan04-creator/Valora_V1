import { Router } from 'express'
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/userController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)
router.get('/me/wishlist', getWishlist)
router.post('/me/wishlist/:listingId', addToWishlist)
router.delete('/me/wishlist/:listingId', removeFromWishlist)

export default router
