import { Router } from 'express'
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} from '../controllers/listingController.js'
import { protect, authorize } from '../middleware/auth.js'
import { uploadListingImages } from '../middleware/upload.js'

const router = Router()

router.get('/', getListings)
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
