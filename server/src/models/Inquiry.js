import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

const inquirySchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
    // Archive/read state is per-party, not a single shared flag — an
    // inquiry always has exactly two participants (never a group thread),
    // so one field per side is simpler than a generic participants array
    // and matches how `buyer`/`seller` are already modeled as fixed fields.
    buyerArchived: { type: Boolean, default: false },
    sellerArchived: { type: Boolean, default: false },
    buyerLastReadAt: { type: Date, default: null },
    sellerLastReadAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export default mongoose.model('Inquiry', inquirySchema)
