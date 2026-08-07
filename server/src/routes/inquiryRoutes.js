import { Router } from 'express'
import {
  createInquiry,
  getMyInquiries,
  addMessage,
  markInquiryRead,
  setInquiryArchived,
} from '../controllers/inquiryController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)
router.get('/', getMyInquiries)
router.post('/', createInquiry)
router.post('/:id/messages', addMessage)
router.patch('/:id/read', markInquiryRead)
router.patch('/:id/archive', setInquiryArchived)

export default router
