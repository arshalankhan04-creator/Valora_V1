import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminListings, updateListingStatus, deleteListing } from '../services/listings'
import { formatPrice } from '../utils/format'
import TrustScoreBadge from '../components/TrustScoreBadge'
import RiskFlagBadge from '../components/RiskFlagBadge'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = ['pending_review', 'active', 'flagged', 'sold']

export default function AdminDashboard() {
  const [status, setStatus] = useState('')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    getAdminListings(status)
      .then(setListings)
      .catch(() => setError('Could not load listings'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [status])

  const handleApprove = async (id) => {
    setActioningId(id)
    try {
      await updateListingStatus(id, 'active')
      setListings((prev) => prev.map((l) => (l._id === id ? { ...l, status: 'active' } : l)))
    } catch {
      setError('Could not approve listing')
    } finally {
      setActioningId(null)
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm('Permanently remove this listing?')) return
    setActioningId(id)
    try {
      await deleteListing(id)
      setListings((prev) => prev.filter((l) => l._id !== id))
    } catch {
      setError('Could not remove listing')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Admin — Listing moderation</h1>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm mb-6"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!loading && listings.length === 0 && <p className="text-gray-500">No listings match this filter.</p>}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <div key={listing._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link to={`/listings/${listing._id}`} className="font-medium text-gray-900 hover:underline">
                {listing.brand} {listing.model} · {listing.year}
              </Link>
              <p className="text-sm text-gray-500">
                {formatPrice(listing.price)} · Seller: {listing.seller?.name} ({listing.seller?.email})
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={listing.status} />
                <TrustScoreBadge score={listing.ml?.trustScore} />
                <RiskFlagBadge flag={listing.ml?.riskFlag} />
              </div>
              {listing.ml?.fraudReasons?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">{listing.ml.fraudReasons.join('; ')}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              {listing.status !== 'active' && (
                <button
                  onClick={() => handleApprove(listing._id)}
                  disabled={actioningId === listing._id}
                  className="bg-gray-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              <button
                onClick={() => handleRemove(listing._id)}
                disabled={actioningId === listing._id}
                className="border border-red-300 text-red-700 rounded px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
