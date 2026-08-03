import { Link } from 'react-router-dom'
import { ASSET_BASE_URL } from '../services/api'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from './TrustScoreBadge'
import RiskFlagBadge from './RiskFlagBadge'
import WishlistButton from './WishlistButton'

export default function ListingCard({ listing }) {
  const thumbnail = listing.images?.[0]

  return (
    <Link
      to={`/listings/${listing._id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-brand"
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
        {thumbnail ? (
          <img
            src={`${ASSET_BASE_URL}/${thumbnail}`}
            alt={`${listing.brand} ${listing.model}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-sm text-muted-foreground">No photo</span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">
            {listing.brand} {listing.model} · {listing.year}
          </h3>
          <WishlistButton listingId={listing._id} />
        </div>
        <p className="text-lg font-semibold text-foreground">{formatPrice(listing.price)}</p>
        <p className="text-sm text-muted-foreground">
          {formatKm(listing.kmDriven)} · {listing.fuelType} · {listing.transmission}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <TrustScoreBadge score={listing.ml?.trustScore} />
          <RiskFlagBadge flag={listing.ml?.riskFlag} />
        </div>
      </div>
    </Link>
  )
}
