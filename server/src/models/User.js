import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    // Seller-history inputs for the Trust Score API contract (§8, Valora_Team_Workflow.md)
    responseRate: { type: Number, default: 0 },
    pastDeals: { type: Number, default: 0 },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  },
  { timestamps: true },
)

// Mongoose 9 middleware is promise-based: an async pre-hook with no `next`
// param resolves the hook itself, no callback needed (calling a `next` arg
// here throws, since none is passed when the function takes zero args).
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.virtual('accountAgeDays').get(function accountAgeDays() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

export default mongoose.model('User', userSchema)
