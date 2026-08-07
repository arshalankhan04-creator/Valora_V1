import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car } from 'lucide-react'
import { ASSET_BASE_URL } from '../services/api'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from './TrustScoreBadge'
import RiskFlagBadge from './RiskFlagBadge'
import WishlistButton from './WishlistButton'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Card } from './ui/card'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ListingCard({ listing }) {
  const thumbnail = listing.images?.[0]
  const sellerName = listing.seller?.name ?? null
  const initials = getInitials(sellerName)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <Link to={`/listings/${listing._id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
        <Card className="group relative h-full overflow-hidden rounded-2xl border-border/50 bg-card/30 p-0 gap-0 backdrop-blur-md transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-black/20">

          {/* ── Image ── */}
          <div className="relative aspect-video overflow-hidden">
            {thumbnail ? (
              <img
                src={`${ASSET_BASE_URL}/${thumbnail}`}
                alt={`${listing.brand} ${listing.model}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Car className="size-10 text-muted-foreground/40" />
              </div>
            )}

            {/* Gradient overlay — only visible on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-60" />

            {/* Wishlist button top-right */}
            <div
              className="absolute right-3 top-3"
              onClick={(e) => e.preventDefault()}
            >
              <WishlistButton listingId={listing._id} />
            </div>

            {/* Hover CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25">
                <Car className="size-4" />
                View listing
              </span>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex flex-col gap-3 p-4">
            {/* Title + price */}
            <div className="space-y-1">
              <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground line-clamp-1">
                {listing.brand} {listing.model} · {listing.year}
              </h3>
              <p className="text-lg font-bold text-foreground">
                {formatPrice(listing.price)}
              </p>
              <p className="text-sm text-muted-foreground">
                {[formatKm(listing.kmDriven), listing.fuelType, listing.transmission].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Trust + risk badges */}
            <div className="flex items-center gap-2">
              <TrustScoreBadge score={listing.ml?.trustScore} />
              <RiskFlagBadge flag={listing.ml?.riskFlag} />
            </div>

            {/* Seller row */}
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <div className="flex items-center gap-2">
                <Avatar className="size-7 border border-border/50">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {sellerName ?? 'Seller'}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {formatDate(listing.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </Card>
      </Link>
    </motion.div>
  )
}
