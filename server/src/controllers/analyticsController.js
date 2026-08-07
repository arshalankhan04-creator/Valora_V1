import Listing from '../models/Listing.js'
import asyncHandler from '../utils/asyncHandler.js'

// Real MongoDB aggregation pipelines (FSD-2 Unit 9), not application-level
// grouping in JS — the point of this endpoint is to demonstrate and use
// the aggregation framework, not just loop over a find() result.
const ACTIVE_ONLY = { $match: { status: 'active' } }

export const getMarketAnalytics = asyncHandler(async (req, res) => {
  const [byBrand, byFuelType, byYear, byCondition] = await Promise.all([
    Listing.aggregate([
      ACTIVE_ONLY,
      { $group: { _id: '$brand', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
      { $sort: { avgPrice: -1 } },
      { $project: { _id: 0, brand: '$_id', avgPrice: { $round: ['$avgPrice', 0] }, count: 1 } },
    ]),

    Listing.aggregate([
      ACTIVE_ONLY,
      { $group: { _id: '$fuelType', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
      { $sort: { avgPrice: -1 } },
      { $project: { _id: 0, fuelType: '$_id', avgPrice: { $round: ['$avgPrice', 0] }, count: 1 } },
    ]),

    Listing.aggregate([
      ACTIVE_ONLY,
      { $group: { _id: '$year', avgPrice: { $avg: '$price' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, year: '$_id', avgPrice: { $round: ['$avgPrice', 0] }, count: 1 } },
    ]),

    // $bucket needs a numeric field to bucket on — listings scored before
    // any photos were uploaded have no visualConditionScore at all, so
    // those are excluded rather than silently coerced into a bucket.
    Listing.aggregate([
      ACTIVE_ONLY,
      { $match: { 'ml.visualConditionScore': { $type: 'number' } } },
      {
        $bucket: {
          groupBy: '$ml.visualConditionScore',
          boundaries: [0, 50, 70, 85, 100.1], // 100.1 so a perfect 100 score falls in the last bucket
          default: 'unscored',
          output: { avgPrice: { $avg: '$price' }, count: { $sum: 1 } },
        },
      },
      { $project: { _id: 0, bucketStart: '$_id', avgPrice: { $round: ['$avgPrice', 0] }, count: 1 } },
    ]),
  ])

  res.json({ byBrand, byFuelType, byYear, byCondition })
})
