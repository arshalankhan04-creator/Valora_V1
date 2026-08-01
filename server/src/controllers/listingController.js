import Listing from '../models/Listing.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { scoreListing } from '../services/listingIntelligence.js'

export const createListing = asyncHandler(async (req, res) => {
  const { brand, model, year, kmDriven, fuelType, transmission, price, description } = req.body

  const listing = await Listing.create({
    seller: req.user._id,
    brand,
    model,
    year,
    kmDriven,
    fuelType,
    transmission,
    price,
    description,
    images: (req.files || []).map((file) => file.path),
  })

  const { ml, status } = await scoreListing(listing, req.user)
  listing.ml = ml
  listing.status = status
  await listing.save()

  res.status(201).json({ listing })
})

export const getListings = asyncHandler(async (req, res) => {
  const { brand, fuelType, minPrice, maxPrice, minTrustScore } = req.query

  const filter = { status: 'active' }
  if (brand) filter.brand = brand
  if (fuelType) filter.fuelType = fuelType
  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice)
    if (maxPrice) filter.price.$lte = Number(maxPrice)
  }
  if (minTrustScore) filter['ml.trustScore'] = { $gte: Number(minTrustScore) }

  const listings = await Listing.find(filter).sort({ createdAt: -1 })
  res.json({ listings })
})

export const getListingById = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('seller', 'name email')
  if (!listing) throw new ApiError(404, 'Listing not found')
  res.json({ listing })
})

export const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
  if (!listing) throw new ApiError(404, 'Listing not found')
  if (String(listing.seller) !== String(req.user._id)) {
    throw new ApiError(403, 'Not your listing')
  }

  Object.assign(listing, req.body)
  await listing.save()
  res.json({ listing })
})

export const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
  if (!listing) throw new ApiError(404, 'Listing not found')
  if (String(listing.seller) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not your listing')
  }

  await listing.deleteOne()
  res.status(204).send()
})
