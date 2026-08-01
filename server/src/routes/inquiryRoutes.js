import { Router } from 'express'
import { createInquiry, getMyInquiries, addMessage } from '../controllers/inquiryController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)
router.get('/', getMyInquiries)
router.post('/', createInquiry)
router.post('/:id/messages', addMessage)

export default router
