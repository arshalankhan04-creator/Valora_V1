import jwt from 'jsonwebtoken'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/User.js'

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated')
  }

  const token = header.split(' ')[1]
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new ApiError(401, 'Invalid or expired token')
  }

  const user = await User.findById(payload.id)
  if (!user) {
    throw new ApiError(401, 'User no longer exists')
  }

  req.user = user
  next()
})

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Not authorized for this action')
    }
    next()
  }
}
