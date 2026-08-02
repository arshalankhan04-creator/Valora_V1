import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getListing } from '../services/listings'
import { createInquiry } from '../services/inquiries'
import { useAuth } from '../context/AuthContext'
import { ASSET_BASE_URL } from '../services/api'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from '../components/TrustScoreBadge'
import RiskFlagBadge from '../components/RiskFlagBadge'
import WishlistButton from '../components/WishlistButton'

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setLoading(true)
    getListing(id)
      .then(setListing)
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleContactSeller = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await createInquiry(id, message)
      setSent(true)
      setMessage('')
    } catch {
      setError('Could not send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="px-6 py-12 text-gray-500">Loading...</p>
  if (error || !listing) return <p className="px-6 py-12 text-red-600">{error || 'Not found'}</p>

  const ml = listing.ml || {}
  const isOwnListing = user?.id === listing.seller?._id
  const canContactSeller = user && user.role !== 'admin' && !isOwnListing

  return (
    <section className="px-6 py-8 max-w-4xl mx-auto">
      {listing.images?.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {listing.images.map((img) => (
            <img
              key={img}
              src={`${ASSET_BASE_URL}/${img}`}
              alt={`${listing.brand} ${listing.model}`}
              className="w-full aspect-video object-cover rounded-lg"
            />
          ))}
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6 text-gray-400">
          No photos
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {listing.brand} {listing.model} · {listing.year}
          </h1>
          <p className="text-gray-500 mt-1">
            {formatKm(listing.kmDriven)} · {listing.fuelType} · {listing.transmission}
          </p>
        </div>
        <p className="text-2xl font-semibold text-gray-900 whitespace-nowrap">{formatPrice(listing.price)}</p>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <TrustScoreBadge score={ml.trustScore} />
        <RiskFlagBadge flag={ml.riskFlag} />
        <WishlistButton listingId={listing._id} />
      </div>

      {listing.description && <p className="text-gray-700 mt-4">{listing.description}</p>}

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-gray-900 mb-2">Fair price check</h2>
          {ml.predictedPriceMin != null ? (
            <p className="text-sm text-gray-600">
              Predicted range: {formatPrice(ml.predictedPriceMin)} – {formatPrice(ml.predictedPriceMax)}
              {ml.confidenceLevel && <> ({ml.confidenceLevel} confidence)</>}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Not yet scored</p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-gray-900 mb-2">Fraud risk</h2>
          {ml.riskFlag ? (
            <>
              <p className="text-sm text-gray-600">{ml.riskFlag} risk ({Math.round((ml.fraudProbability ?? 0) * 100)}% probability)</p>
              {ml.fraudReasons?.length > 0 && (
                <ul className="text-sm text-gray-500 list-disc list-inside mt-1">
                  {ml.fraudReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Not yet scored</p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4 sm:col-span-2">
          <h2 className="font-medium text-gray-900 mb-2">Condition assessment</h2>
          {ml.visualConditionScore != null ? (
            <>
              <p className="text-sm text-gray-600">Visual condition score: {ml.visualConditionScore}/100</p>
              {ml.detectedDamages?.length > 0 ? (
                <ul className="text-sm text-gray-500 list-disc list-inside mt-1">
                  {ml.detectedDamages.map((d, i) => (
                    <li key={i}>{d.damageType} on {d.part.replace(/_/g, ' ')} ({Math.round(d.confidence * 100)}% confidence)</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No damage detected from photos</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">No photos to assess</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 mt-8 pt-6">
        <h2 className="font-medium text-gray-900 mb-3">Seller</h2>
        <p className="text-gray-700">{listing.seller?.name}</p>

        {canContactSeller && !sent && (
          <form onSubmit={handleContactSeller} className="mt-4 flex flex-col gap-2 max-w-md">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the seller a question..."
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-gray-900 text-white rounded px-3 py-2 text-sm self-start disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Contact seller'}
            </button>
          </form>
        )}
        {sent && (
          <p className="text-green-700 text-sm mt-4">
            Message sent. View it in <Link to="/inquiries" className="underline">your inquiries</Link>.
          </p>
        )}
        {!user && <p className="text-gray-500 text-sm mt-4"><Link to="/login" className="underline">Log in</Link> to contact the seller.</p>}
      </div>
    </section>
  )
}
