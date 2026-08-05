import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getMyListings, deleteListing } from '../services/listings'
import { formatPrice, formatKm } from '../utils/format'
import TrustScoreBadge from '../components/TrustScoreBadge'
import RiskFlagBadge from '../components/RiskFlagBadge'
import StatusBadge from '../components/StatusBadge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog'

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
    setActioningId(id)
    try {
      await deleteListing(id)
      setListings((prev) => prev.filter((l) => l._id !== id))
    } catch {
      toast.error('Could not delete listing')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My listings</h1>
        <Button asChild size="sm">
          <Link to="/sell">List another car</Link>
        </Button>
      </div>

      {loading && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <span className="sr-only">Loading...</span>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      )}
      {error && <p className="mb-4 text-destructive">{error}</p>}
      {!loading && listings.length === 0 && (
        <p className="text-muted-foreground">
          You haven't listed a car yet. <Link to="/sell" className="underline">List one now</Link>.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <div key={listing._id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <Link to={`/listings/${listing._id}`} className="font-medium text-foreground hover:underline">
                {listing.brand} {listing.model} · {listing.year}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatPrice(listing.price)} · {formatKm(listing.kmDriven)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={listing.status} />
                <TrustScoreBadge score={listing.ml?.trustScore} />
                <RiskFlagBadge flag={listing.ml?.riskFlag} />
              </div>
              {listing.status === 'flagged' && listing.ml?.fraudReasons?.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Flagged for review: {listing.ml.fraudReasons.join('; ')}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-row gap-2 sm:flex-col">
              <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Link to={`/my-listings/${listing._id}/edit`}>Edit</Link>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={actioningId === listing._id} className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. {listing.brand} {listing.model} will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => handleDelete(listing._id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
