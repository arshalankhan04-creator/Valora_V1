import { Router } from 'express'
import {
  createListing,
  getListings,
  getMyListings,
  getAdminListings,
  getListingById,
  updateListing,
  deleteListing,
} from '../controllers/listingController.js'
import { getMarketAnalytics } from '../controllers/analyticsController.js'
import { protect, authorize } from '../middleware/auth.js'
import { uploadListingImages } from '../middleware/upload.js'

const router = Router()

router.get('/', getListings)
// Must come before /:id — otherwise Express matches "mine"/"admin"/"analytics" as the :id param.
router.get('/mine', protect, authorize('seller', 'admin'), getMyListings)
router.get('/admin', protect, authorize('admin'), getAdminListings)
router.get('/analytics', protect, authorize('seller', 'admin'), getMarketAnalytics)
router.get('/:id', getListingById)
router.post(
  '/',
  protect,
  authorize('seller', 'admin'),
  uploadListingImages.array('images', 8),
  createListing,
)
router.patch('/:id', protect, authorize('seller', 'admin'), updateListing)
router.delete('/:id', protect, authorize('seller', 'admin'), deleteListing)

export default router
