import Listing from '../models/Listing.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import escapeRegex from '../utils/escapeRegex.js'
import { scoreListing } from '../services/listingIntelligence.js'
import { validateVehicle, verifyListing } from '../services/mlService.js'

export const createListing = asyncHandler(async (req, res) => {
  const { brand, model, year, kmDriven, fuelType, transmission, price, description } = req.body

  const images = (req.files || []).map((file) => file.path.replace(/\\/g, '/'))
  if (images.length === 0) throw new ApiError(400, 'At least one photo is required')

  // Basic description sanity check — catches gibberish before any ML runs.
  // ponytail: regex covers 95% of cases; LLM semantic check only if needed later
  if (description) {
    const d = description.trim()
    const letters = (d.match(/[a-zA-Z]/g) || []).length
    const hasSpaces = d.includes(' ')
    if (d.length < 20 || letters < 10 || !hasSpaces) {
      throw new ApiError(400, 'Description looks incomplete. Write at least a sentence about the car.')
    }
  }

  // Step 2 — vehicle check (YOLOv8, local, no API cost).
  // If the ML service is down we skip the check rather than blocking the listing.
  try {
    const check = await validateVehicle(images)
    if (!check.valid) {
      throw new ApiError(400, check.reason ?? 'Photos must show the vehicle being listed.')
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    console.warn('[ML] validateVehicle unavailable, skipping check:', err?.message)
  }

  // Step 4 — AI verification (OpenRouter vision model): does the photo set
  // match the claimed brand/model/year, do all photos show the same
  // vehicle. A *confident* mismatch hard-rejects the listing right here
  // (400, with specific reasons for the client to show in a modal) — this
  // is the check meant to catch whatever slipped past steps 1-3. A
  // low/medium-confidence concern does NOT hard-reject, since this model
  // can be wrong (a purpose-built make/model classifier we evaluated only
  // hits ~50% top-1 accuracy on this exact kind of judgment) — instead it
  // gets carried forward and the listing is created as pending_review so
  // an admin decides, same pattern as an existing fraud High risk flag.
  // If the check itself is unreachable (network/API failure), skip it
  // entirely — fail open, same as step 2 — rather than making listing
  // creation depend on a third-party API's uptime.
  let verification = null
  try {
    verification = await verifyListing({ imagePaths: images, brand, model, year })
  } catch (err) {
    console.warn('[ML] verifyListing unavailable, skipping check:', err?.message)
  }

  const pendingReviewReasons = []
  if (verification) {
    const isConfident = verification.match_confidence === 'high'
    const brandMismatch = !verification.vehicle_matches_claim
    const inconsistentPhotos = !verification.images_consistent

    // Mixed cars = always hard reject regardless of confidence
    if (inconsistentPhotos) {
      throw new ApiError(
        400,
        'Your photos appear to show different cars. All photos must be of the same vehicle.',
        verification.reasons?.length ? verification.reasons : ['Photos show more than one vehicle.'],
      )
    }
    // Brand/model mismatch — only hard reject when confident
    if (isConfident && brandMismatch) {
      throw new ApiError(
        400,
        'The photos could not be verified against the listing details.',
        verification.reasons?.length
          ? verification.reasons
          : ['The uploaded photos do not appear to match the vehicle described.'],
      )
    }
    if (brandMismatch) {
      pendingReviewReasons.push(...(verification.reasons?.length
        ? verification.reasons
        : ['AI photo review found a possible mismatch — needs manual review.']))
    }
    if (!verification.adequate_coverage) {
      throw new ApiError(
        400,
        'Please upload at least one photo showing the full vehicle or a visible badge/logo. Close-up-only photos are not enough.',
      )
    }
  }

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
    // Normalize to forward slashes: multer's file.path uses the OS
    // separator (backslash on Windows), but this gets served over HTTP
    // via express.static('uploads') and consumed as a URL fragment.
    images,
  })

  const { ml, status } = await scoreListing(listing, req.user)
    .catch((err) => {
      console.error('[ML] scoreListing failed — listing saved as pending_review:', err?.message ?? err)
      return { ml: {}, status: 'pending_review' }
    })

  // Cross-check step 3's (condition_assessment CNN) severity read against
  // step 4's independent one — neither was shown the other's answer. A
  // disagreement isn't auto-resolved in either direction, it goes to an
  // admin, same as an unconfident brand/model mismatch above.
  if (verification && ml.conditionSeverity && verification.severity_assessment
      && ml.conditionSeverity !== verification.severity_assessment) {
    pendingReviewReasons.push(
      `AI photo review assessed "${verification.severity_assessment}" but the condition model assessed `
      + `"${ml.conditionSeverity}" — flagged for manual comparison.`,
    )
  }

  if (verification) {
    ml.aiVerification = {
      vehicleMatchesClaim: verification.vehicle_matches_claim,
      matchConfidence: verification.match_confidence,
      imagesConsistent: verification.images_consistent,
      severityAssessment: verification.severity_assessment,
      damageDescription: verification.damage_description,
      reviewReasons: pendingReviewReasons,
    }
  }

  listing.ml = ml
  listing.status = pendingReviewReasons.length > 0 ? 'pending_review' : status
  await listing.save()

  res.status(201).json({ listing })
})

export const getListings = asyncHandler(async (req, res) => {
  const {
    brand,
    model,
    fuelType,
    minPrice,
    maxPrice,
    minYear,
    maxYear,
    minKm,
    maxKm,
    minTrustScore,
  } = req.query

  // A repeated query key (?fuelType=a&fuelType=b) parses to an array under
  // Express 5's default query parser, not a string — and Express 5 no
  // longer parses bracket notation into nested objects by default the way
  // Express 4's `qs`-based parser did, but that's a default that could
  // change (a custom 'query parser' setting, a future Express version).
  // Every free-text param gets a string check before touching `filter`
  // either way, rather than relying on the current parser's behavior.
  for (const [key, value] of Object.entries({ brand, model, fuelType })) {
    if (value !== undefined && typeof value !== 'string') {
      throw new ApiError(400, `${key} must be a string`)
    }
  }

  const filter = { status: 'active' }
  // Free-text fields get a case-insensitive partial match, not exact
  // equality — a search box where "swift" doesn't find "Maruti Suzuki
  // Swift" isn't search, it's a lookup table.
  if (brand) filter.brand = new RegExp(escapeRegex(brand), 'i')
  if (model) filter.model = new RegExp(escapeRegex(model), 'i')
  if (fuelType) filter.fuelType = fuelType
  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice)
    if (maxPrice) filter.price.$lte = Number(maxPrice)
  }
  if (minYear || maxYear) {
    filter.year = {}
    if (minYear) filter.year.$gte = Number(minYear)
    if (maxYear) filter.year.$lte = Number(maxYear)
  }
  if (minKm || maxKm) {
    filter.kmDriven = {}
    if (minKm) filter.kmDriven.$gte = Number(minKm)
    if (maxKm) filter.kmDriven.$lte = Number(maxKm)
  }
  if (minTrustScore) filter['ml.trustScore'] = { $gte: Number(minTrustScore) }

  const listings = await Listing.find(filter).populate('seller', 'name').sort({ createdAt: -1 })
  res.json({ listings })
})

export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ seller: req.user._id }).populate('seller', 'name').sort({ createdAt: -1 })
  res.json({ listings })
})

export const getAdminListings = asyncHandler(async (req, res) => {
  const { status } = req.query
  if (status !== undefined && typeof status !== 'string') {
    throw new ApiError(400, 'status must be a string')
  }
  const filter = status ? { status } : {}

  const listings = await Listing.find(filter)
    .populate('seller', 'name email')
    .sort({ createdAt: -1 })
  res.json({ listings })
})

export const getListingById = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('seller', 'name email')
  if (!listing) throw new ApiError(404, 'Listing not found')
  res.json({ listing })
})

const SELLER_UPDATE_FIELDS = [
  'brand',
  'model',
  'year',
  'kmDriven',
  'fuelType',
  'transmission',
  'price',
  'description',
]

export const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id)
  if (!listing) throw new ApiError(404, 'Listing not found')

  const isOwner = String(listing.seller) === String(req.user._id)
  const isAdmin = req.user.role === 'admin'
  if (!isOwner && !isAdmin) throw new ApiError(403, 'Not your listing')

  // Fields that affect ML scoring — any change triggers a re-score
  const SCORE_FIELDS = ['brand', 'model', 'year', 'kmDriven', 'fuelType', 'transmission', 'price']
  let needsRescore = false

  for (const field of SELLER_UPDATE_FIELDS) {
    if (field in req.body) {
      if (SCORE_FIELDS.includes(field) && String(listing[field]) !== String(req.body[field])) {
        needsRescore = true
      }
      listing[field] = req.body[field]
    }
  }
  if (isAdmin && 'status' in req.body) listing.status = req.body.status

  // Image replacement — new uploads replace all existing photos
  const newImages = (req.files || []).map(f => f.path.replace(/\\/g, '/'))
  if (newImages.length > 0) {
    // Delete old files from disk (best-effort — don't fail if missing)
    for (const oldPath of listing.images) {
      try { (await import('fs')).default.unlinkSync(oldPath) } catch {}
    }

    // Re-run vehicle check on new photos
    try {
      const check = await validateVehicle(newImages)
      if (!check.valid) throw new ApiError(400, check.reason ?? 'Photos must show the vehicle being listed.')
    } catch (err) {
      if (err instanceof ApiError) throw err
      console.warn('[ML] validateVehicle unavailable on edit, skipping:', err?.message)
    }

    listing.images = newImages
    needsRescore = true
  }

  if (needsRescore) {
    const User = (await import('../models/User.js')).default
    const seller = await User.findById(listing.seller)
    const { ml, status } = await scoreListing(listing, seller).catch((err) => {
      console.warn('[ML] re-score on edit failed, keeping existing scores:', err?.message)
      return { ml: listing.ml, status: listing.status }
    })
    listing.ml = ml
    if (!isAdmin) listing.status = status
  }

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
