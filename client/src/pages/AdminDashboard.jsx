import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getAdminListings, updateListingStatus, deleteListing } from '../services/listings'
import { formatPrice } from '../utils/format'
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

const STATUS_OPTIONS = ['pending_review', 'active', 'flagged', 'sold']
const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

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
      toast.error('Could not approve listing')
    } finally {
      setActioningId(null)
    }
  }

  const handleRemove = async (id) => {
    setActioningId(id)
    try {
      await deleteListing(id)
      setListings((prev) => prev.filter((l) => l._id !== id))
    } catch {
      toast.error('Could not remove listing')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-8">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Admin — Listing moderation</h1>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${SELECT_CLASS} mb-6`}>
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>

      {loading && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <span className="sr-only">Loading...</span>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      )}
      {error && <p className="mb-4 text-destructive">{error}</p>}
      {!loading && listings.length === 0 && <p className="text-muted-foreground">No listings match this filter.</p>}

      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <div key={listing._id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <Link to={`/listings/${listing._id}`} className="font-medium text-foreground hover:underline">
                {listing.brand} {listing.model} · {listing.year}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatPrice(listing.price)} · Seller: {listing.seller?.name} ({listing.seller?.email})
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={listing.status} />
                <TrustScoreBadge score={listing.ml?.trustScore} />
                <RiskFlagBadge flag={listing.ml?.riskFlag} />
              </div>
              {listing.ml?.fraudReasons?.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{listing.ml.fraudReasons.join('; ')}</p>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-row gap-2 sm:flex-col">
              {listing.status !== 'active' && (
                <Button size="sm" disabled={actioningId === listing._id} onClick={() => handleApprove(listing._id)} className="flex-1 sm:flex-none">
                  Approve
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actioningId === listing._id}
                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 sm:flex-none"
                  >
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently remove this listing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {listing.brand} {listing.model} will be permanently deleted for every user. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => handleRemove(listing._id)}>
                      Remove
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
