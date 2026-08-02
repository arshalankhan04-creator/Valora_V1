import Inquiry from '../models/Inquiry.js'
import Listing from '../models/Listing.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { sendMail } from '../services/emailService.js'

export const createInquiry = asyncHandler(async (req, res) => {
  const { listingId, text } = req.body
  const listing = await Listing.findById(listingId).populate('seller', 'email name')
  if (!listing) throw new ApiError(404, 'Listing not found')

  let inquiry = await Inquiry.findOne({ listing: listingId, buyer: req.user._id })
  if (!inquiry) {
    inquiry = await Inquiry.create({
      listing: listingId,
      buyer: req.user._id,
      seller: listing.seller._id,
      messages: [],
    })
  }

  inquiry.messages.push({ sender: req.user._id, text })
  await inquiry.save()

  sendMail({
    to: listing.seller.email,
    subject: `New inquiry on your listing: ${listing.brand} ${listing.model}`,
    text: `${req.user.name} says: ${text}`,
  }).catch((err) => console.error('Failed to send inquiry email:', err.message))

  res.status(201).json({ inquiry })
})

export const getMyInquiries = asyncHandler(async (req, res) => {
  const inquiries = await Inquiry.find({
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  })
    .populate('listing', 'brand model price images')
    .populate('buyer', 'name')
    .populate('seller', 'name')
    .sort({ updatedAt: -1 })

  res.json({ inquiries })
})

export const addMessage = asyncHandler(async (req, res) => {
  const { text } = req.body
  const inquiry = await Inquiry.findById(req.params.id)
    .populate('buyer', 'email name')
    .populate('seller', 'email name')
  if (!inquiry) throw new ApiError(404, 'Inquiry not found')

  const isBuyer = String(inquiry.buyer._id) === String(req.user._id)
  const isSeller = String(inquiry.seller._id) === String(req.user._id)
  if (!isBuyer && !isSeller) throw new ApiError(403, 'Not part of this conversation')

  inquiry.messages.push({ sender: req.user._id, text })
  await inquiry.save()

  // Notify whichever party didn't send this message — same fire-and-forget
  // pattern as createInquiry: a slow/down SMTP server shouldn't block the
  // reply itself.
  const recipient = isBuyer ? inquiry.seller : inquiry.buyer
  sendMail({
    to: recipient.email,
    subject: 'New reply to your Valora inquiry',
    text: `${req.user.name} says: ${text}`,
  }).catch((err) => console.error('Failed to send reply email:', err.message))

  res.status(201).json({ inquiry })
})
