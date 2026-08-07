import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role }
}

// Rejects both "missing" and "wrong type" — a JSON body of
// {"email": {"$ne": null}} is truthy but not a string, and without this
// check it flows straight into a Mongoose query filter as a Mongo operator.
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body
  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new ApiError(400, 'name, email, and password are required')
  }

  const existing = await User.findOne({ email })
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const user = await User.create({
    name,
    email,
    password,
    role: ['buyer', 'seller'].includes(role) ? role : 'buyer',
  })

  res.status(201).json({ user: toPublicUser(user), token: signToken(user) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    throw new ApiError(400, 'email and password are required')
  }

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password')
  }

  res.json({ user: toPublicUser(user), token: signToken(user) })
})

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: toPublicUser(req.user) })
})
