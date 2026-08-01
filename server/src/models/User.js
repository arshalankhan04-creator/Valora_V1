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
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

userSchema.virtual('accountAgeDays').get(function accountAgeDays() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

export default mongoose.model('User', userSchema)
