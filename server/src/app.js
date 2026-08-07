import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import listingRoutes from './routes/listingRoutes.js'
import inquiryRoutes from './routes/inquiryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
// Helmet's default Cross-Origin-Resource-Policy (same-origin) blocks the
// Vite client (a different origin) from loading these images — scoped to
// just this route rather than relaxed app-wide.
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
}))

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/inquiries', inquiryRoutes)
app.use('/api/users', userRoutes)

app.use(errorHandler)

export default app
