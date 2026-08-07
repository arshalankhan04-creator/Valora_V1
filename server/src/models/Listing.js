import mongoose from 'mongoose'

// Field names mirror the Node<->Django API contract in
// Valora_Team_Workflow.md §8 so listing docs can be passed straight
// into the ML service request/response shapes without remapping.
const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    kmDriven: { type: Number, required: true },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid'],
      required: true,
    },
    transmission: { type: String, enum: ['Manual', 'Automatic'], required: true },
    price: { type: Number, required: true },
    description: { type: String, trim: true },
    images: [{ type: String }],

    status: {
      type: String,
      enum: ['pending_review', 'active', 'sold', 'flagged'],
      default: 'pending_review',
    },

    // --- Populated by the Django ML service after creation/update ---
    ml: {
      visualConditionScore: Number,
      conditionSeverity: String,
      conditionDecision: { type: String, enum: ['AUTO_APPROVE', 'HUMAN_REVIEW', 'ESCALATE'] },
      detectedDamages: [
        {
          part:            String,
          damageType:      String,
          confidence:      Number,
          severity:        String,
          location:        String,
          areaPercentage:  Number,
          estimatedCost:   Number,
        },
      ],
      predictedPriceMin: Number,
      predictedPriceMax: Number,
      confidenceLevel: String,
      featureImportance: { type: Map, of: Number },
      riskFlag: { type: String, enum: ['Low', 'Medium', 'High'] },
      fraudProbability: Number,
      fraudReasons: [String],
      trustScore: Number,
      trustBreakdown: {
        priceFairness:  Number,
        conditionMatch: Number,
        completeness:   Number,
      },
      // Display-only — not used in trust score formula
      sellerProfile: {
        responseRate:   Number,
        pastDeals:      Number,
        accountAgeDays: Number,
      },
      // Step 4 — OpenRouter vision-model verification result, present only
      // when that check actually ran (absent if the ML service was
      // unreachable at listing-creation time).
      aiVerification: {
        vehicleMatchesClaim: Boolean,
        matchConfidence: { type: String, enum: ['high', 'medium', 'low'] },
        imagesConsistent: Boolean,
        severityAssessment: String,
        damageDescription: String,
        // Why this listing was forced into pending_review, if it was —
        // empty when the AI check found nothing to flag.
        reviewReasons: [String],
      },
    },
  },
  { timestamps: true },
)

listingSchema.index({ brand: 1, model: 1, year: 1, price: 1 })

export default mongoose.model('Listing', listingSchema)
