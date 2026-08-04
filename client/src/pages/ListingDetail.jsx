import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getListing } from '../services/listings'
import { createInquiry } from '../services/inquiries'
import { useAuth } from '../context/AuthContext'
import { ASSET_BASE_URL } from '../services/api'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from '../components/TrustScoreBadge'
import RiskFlagBadge from '../components/RiskFlagBadge'
import WishlistButton from '../components/WishlistButton'
import BackButton from '../components/BackButton'
import AnimatedTrustScore from '../components/AnimatedTrustScore'
import TrustBreakdownRow from '../components/TrustBreakdownRow'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Skeleton } from '../components/ui/skeleton'

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

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-8">
        <BackButton fallback="/listings" className="mb-4" />
        <span className="sr-only">Loading...</span>
        <Skeleton className="mb-6 aspect-video w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
      </section>
    )
  }
  if (error || !listing) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <BackButton fallback="/listings" className="mb-4" />
        <p className="text-destructive">{error || 'Not found'}</p>
      </section>
    )
  }

  const ml = listing.ml || {}
  const isOwnListing = user?.id === listing.seller?._id
  const canContactSeller = user && user.role !== 'admin' && !isOwnListing

  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <BackButton fallback="/listings" />
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
          <Link to="/listings" className="hover:text-foreground hover:underline">Listings</Link>
          <ChevronRight className="size-3.5 flex-shrink-0" />
          <span className="max-w-[220px] truncate text-foreground">{listing.brand} {listing.model}</span>
        </nav>
      </div>

      {listing.images?.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-2">
          {listing.images.map((img) => (
            <img
              key={img}
              src={`${ASSET_BASE_URL}/${img}`}
              alt={`${listing.brand} ${listing.model}`}
              className="aspect-video w-full rounded-lg object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="mb-6 flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
          No photos
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {listing.brand} {listing.model} · {listing.year}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {formatKm(listing.kmDriven)} · {listing.fuelType} · {listing.transmission}
          </p>
        </div>
        <p className="whitespace-nowrap text-2xl font-bold text-foreground">{formatPrice(listing.price)}</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TrustScoreBadge score={ml.trustScore} />
        <RiskFlagBadge flag={ml.riskFlag} />
        <WishlistButton listingId={listing._id} />
      </div>

      {listing.description && <p className="mt-4 text-foreground/90">{listing.description}</p>}

      <div className="mt-8 grid gap-4">
        {ml.trustScore != null && (
          <Card className="shadow-brand/60">
            <CardHeader>
              <CardTitle className="text-base">Trust Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="text-5xl font-bold text-primary">
                <AnimatedTrustScore value={ml.trustScore} />
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="flex-1 space-y-1.5">
                <TrustBreakdownRow label="Price fairness" value={ml.trustBreakdown?.priceFairness} max={40} />
                <TrustBreakdownRow label="Fraud risk" value={ml.trustBreakdown?.fraudRisk} max={30} />
                <TrustBreakdownRow label="Condition match" value={ml.trustBreakdown?.conditionMatch} max={30} />
                <TrustBreakdownRow label="Seller factor" value={ml.trustBreakdown?.sellerFactor} max={5} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fair price check</CardTitle>
            </CardHeader>
            <CardContent>
              {ml.predictedPriceMin != null ? (
                <p className="text-sm text-muted-foreground">
                  Predicted range: {formatPrice(ml.predictedPriceMin)} – {formatPrice(ml.predictedPriceMax)}
                  {ml.confidenceLevel && <> ({ml.confidenceLevel} confidence)</>}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet scored</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fraud risk</CardTitle>
            </CardHeader>
            <CardContent>
              {ml.riskFlag ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {ml.riskFlag} risk ({Math.round((ml.fraudProbability ?? 0) * 100)}% probability)
                  </p>
                  {ml.fraudReasons?.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {ml.fraudReasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet scored</p>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Condition assessment</CardTitle>
            </CardHeader>
            <CardContent>
              {ml.visualConditionScore != null ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Visual condition score: {ml.visualConditionScore}/100
                  </p>
                  {ml.detectedDamages?.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {ml.detectedDamages.map((d, i) => (
                        <li key={i}>{d.damageType} on {d.part.replace(/_/g, ' ')} ({Math.round(d.confidence * 100)}% confidence)</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No damage detected from photos</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No photos to assess</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="mb-3 font-semibold text-foreground">Seller</h2>
        <p className="text-foreground/90">{listing.seller?.name}</p>

        {canContactSeller && !sent && (
          <form onSubmit={handleContactSeller} className="mt-4 flex max-w-md flex-col gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the seller a question..."
              rows={3}
              required
            />
            <Button type="submit" disabled={sending} className="self-start">
              {sending ? 'Sending...' : 'Contact seller'}
            </Button>
          </form>
        )}
        {sent && (
          <p className="mt-4 text-sm text-primary">
            Message sent. View it in <Link to="/inquiries" className="underline">your inquiries</Link>.
          </p>
        )}
        {!user && (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/login" className="underline">Log in</Link> to contact the seller.
          </p>
        )}
      </div>
    </section>
  )
}
