import Inquiry from '../models/Inquiry.js'
import Listing from '../models/Listing.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { sendMail } from '../services/emailService.js'

// Archive/read state is stored per-party (buyerArchived/sellerArchived,
// buyerLastReadAt/sellerLastReadAt) since an inquiry always has exactly two
// participants. This resolves those raw fields down to what "the current
// caller" sees, and strips them from the response — the other party's read/
// archive state isn't something the client ever needs or should see.
function toClientInquiry(inquiry, userId) {
  const plain = inquiry.toObject ? inquiry.toObject() : inquiry
  const { buyerArchived, sellerArchived, buyerLastReadAt, sellerLastReadAt, ...rest } = plain

  const isBuyer = String(plain.buyer._id ?? plain.buyer) === String(userId)
  const lastReadAt = isBuyer ? buyerLastReadAt : sellerLastReadAt
  const archived = isBuyer ? buyerArchived : sellerArchived

  const lastMessage = plain.messages[plain.messages.length - 1]
  const lastMessageFromMe =
    lastMessage && String(lastMessage.sender._id ?? lastMessage.sender) === String(userId)
  const unread = Boolean(
    lastMessage && !lastMessageFromMe && (!lastReadAt || lastMessage.createdAt > lastReadAt),
  )

  return { ...rest, archived, unread }
}

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
  // The buyer just wrote this — they've obviously seen the thread up to now.
  inquiry.buyerLastReadAt = new Date()
  await inquiry.save()

  sendMail({
    to: listing.seller.email,
    subject: `New inquiry on your listing: ${listing.brand} ${listing.model}`,
    text: `${req.user.name} says: ${text}`,
  }).catch((err) => console.error('Failed to send inquiry email:', err.message))

  res.status(201).json({ inquiry: toClientInquiry(inquiry, req.user._id) })
})

export const getMyInquiries = asyncHandler(async (req, res) => {
  const inquiries = await Inquiry.find({
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  })
    .populate('listing', 'brand model price images kmDriven ml')
    .populate('buyer', 'name')
    .populate('seller', 'name')
    .sort({ updatedAt: -1 })

  res.json({ inquiries: inquiries.map((inquiry) => toClientInquiry(inquiry, req.user._id)) })
})

export const addMessage = asyncHandler(async (req, res) => {
  const { text } = req.body
  const inquiry = await Inquiry.findById(req.params.id)
    .populate('listing', 'brand model price images kmDriven ml')
    .populate('buyer', 'email name')
    .populate('seller', 'email name')
  if (!inquiry) throw new ApiError(404, 'Inquiry not found')

  const isBuyer = String(inquiry.buyer._id) === String(req.user._id)
  const isSeller = String(inquiry.seller._id) === String(req.user._id)
  if (!isBuyer && !isSeller) throw new ApiError(403, 'Not part of this conversation')

  inquiry.messages.push({ sender: req.user._id, text })
  // Sending a reply means you've seen the thread up to now, same as createInquiry above.
  if (isBuyer) inquiry.buyerLastReadAt = new Date()
  else inquiry.sellerLastReadAt = new Date()
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

  res.status(201).json({ inquiry: toClientInquiry(inquiry, req.user._id) })
})

export const markInquiryRead = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id)
  if (!inquiry) throw new ApiError(404, 'Inquiry not found')

  const isBuyer = String(inquiry.buyer) === String(req.user._id)
  const isSeller = String(inquiry.seller) === String(req.user._id)
  if (!isBuyer && !isSeller) throw new ApiError(403, 'Not part of this conversation')

  if (isBuyer) inquiry.buyerLastReadAt = new Date()
  else inquiry.sellerLastReadAt = new Date()
  await inquiry.save()

  res.status(204).send()
})

export const setInquiryArchived = asyncHandler(async (req, res) => {
  const { archived } = req.body
  if (typeof archived !== 'boolean') {
    throw new ApiError(400, 'archived must be a boolean')
  }

  const inquiry = await Inquiry.findById(req.params.id)
  if (!inquiry) throw new ApiError(404, 'Inquiry not found')

  const isBuyer = String(inquiry.buyer) === String(req.user._id)
  const isSeller = String(inquiry.seller) === String(req.user._id)
  if (!isBuyer && !isSeller) throw new ApiError(403, 'Not part of this conversation')

  if (isBuyer) inquiry.buyerArchived = archived
  else inquiry.sellerArchived = archived
  await inquiry.save()

  res.status(204).send()
})
