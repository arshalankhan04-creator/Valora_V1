import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyListings, deleteListing } from '../services/listings'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from '../components/TrustScoreBadge'
import RiskFlagBadge from '../components/RiskFlagBadge'
import StatusBadge from '../components/StatusBadge'

export default function SellerDashboard() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    getMyListings()
      .then(setListings)
      .catch(() => setError('Could not load your listings'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    setActioningId(id)
    try {
      await deleteListing(id)
      setListings((prev) => prev.filter((l) => l._id !== id))
    } catch {
      setError('Could not delete listing')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My listings</h1>
        <Link to="/sell" className="bg-gray-900 text-white rounded px-3 py-1.5 text-sm">
          List another car
        </Link>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!loading && listings.length === 0 && (
        <p className="text-gray-500">
          You haven't listed a car yet. <Link to="/sell" className="underline">List one now</Link>.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <div key={listing._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link to={`/listings/${listing._id}`} className="font-medium text-gray-900 hover:underline">
                {listing.brand} {listing.model} · {listing.year}
              </Link>
              <p className="text-sm text-gray-500">
                {formatPrice(listing.price)} · {formatKm(listing.kmDriven)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={listing.status} />
                <TrustScoreBadge score={listing.ml?.trustScore} />
                <RiskFlagBadge flag={listing.ml?.riskFlag} />
              </div>
              {listing.status === 'flagged' && listing.ml?.fraudReasons?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Flagged for review: {listing.ml.fraudReasons.join('; ')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <Link
                to={`/my-listings/${listing._id}/edit`}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm text-center"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(listing._id)}
                disabled={actioningId === listing._id}
                className="border border-red-300 text-red-700 rounded px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
