import multer from 'multer'
import path from 'path'
import fs from 'fs'
import ApiError from '../utils/ApiError.js'

const UPLOAD_DIR = 'uploads/listings'
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new ApiError(400, 'Only image uploads are allowed'))
  }
  cb(null, true)
}

export const uploadListingImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
})
