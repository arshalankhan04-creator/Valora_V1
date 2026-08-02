import ApiError from '../utils/ApiError.js'

export default function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` })
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value', fields: err.keyValue })
  }

  console.error(err)
  return res.status(500).json({ message: 'Internal server error' })
}
