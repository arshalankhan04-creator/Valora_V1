import User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist')
  // A wishlisted listing may since have been deleted — populate leaves a
  // null in its place rather than removing the entry, so filter those out.
  res.json({ listings: user.wishlist.filter(Boolean) })
})

export const addToWishlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { wishlist: req.params.listingId },
  })
  res.status(204).send()
})

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { wishlist: req.params.listingId },
  })
  res.status(204).send()
})
