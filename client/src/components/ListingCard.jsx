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
      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {thumbnail ? (
          <img
            src={`${ASSET_BASE_URL}/${thumbnail}`}
            alt={`${listing.brand} ${listing.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-400 text-sm">No photo</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900">
            {listing.brand} {listing.model} · {listing.year}
          </h3>
          <WishlistButton listingId={listing._id} />
        </div>
        <p className="text-lg font-semibold text-gray-900 mt-1">{formatPrice(listing.price)}</p>
        <p className="text-sm text-gray-500">{formatKm(listing.kmDriven)} · {listing.fuelType} · {listing.transmission}</p>
        <div className="flex items-center gap-2 mt-3">
          <TrustScoreBadge score={listing.ml?.trustScore} />
          <RiskFlagBadge flag={listing.ml?.riskFlag} />
        </div>
      </div>
    </Link>
  )
}
