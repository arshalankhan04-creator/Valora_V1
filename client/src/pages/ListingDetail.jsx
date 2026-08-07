import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, LayoutGrid, Rows3 } from 'lucide-react'
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function conditionLabel(score) {
  if (score == null) return null
  if (score >= 90) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 30) return 'Fair'
  return 'Poor'
}

function decisionLabel(d) {
  if (d === 'AUTO_APPROVE') return { text: 'Looks good', color: 'bg-green-100 text-green-800' }
  if (d === 'HUMAN_REVIEW') return { text: 'Under review', color: 'bg-yellow-100 text-yellow-800' }
  if (d === 'ESCALATE')     return { text: 'Needs specialist', color: 'bg-red-100 text-red-800' }
  return null
}

function priceSentiment(pf) {
  if (pf >= 40) return { icon: '✓', text: 'Price looks fair', tone: 'text-primary' }
  if (pf >= 20) return { icon: '⚠', text: 'Above the typical range', tone: 'text-secondary-foreground' }
  return { icon: '✗', text: 'Significantly overpriced', tone: 'text-destructive' }
}

// Returns a pill showing price vs market range
function PriceDelta({ price, min, max }) {
  if (price == null || min == null || max == null) return null

  const fmt = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`
    if (n >= 1000)   return `₹${Math.round(n / 1000)}k`
    return `₹${Math.round(n)}`
  }

  if (price >= min && price <= max) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        within market range
      </span>
    )
  }

  if (price < min) {
    const diff = min - price
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        {fmt(diff)} below market
      </span>
    )
  }

  // price > max
  const diff = price - max
  return (
    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      {fmt(diff)} above market
    </span>
  )
}

// Derive human-readable reasons when the model flagged but produced no explicit reasons.
function inferReasons(ml, listing) {
  const reasons = []
  if (!listing.description?.trim()) reasons.push('No description provided — add details about condition, service history, and reason for selling')
  if ((listing.images?.length ?? 0) < 3) reasons.push(`Only ${listing.images?.length ?? 0} photo${listing.images?.length === 1 ? '' : 's'} uploaded — 3 or more improves credibility`)
  if ((ml.trustBreakdown?.completeness ?? 0) < 10) reasons.push('Listing quality score is low — complete all fields for a better result')
  if (!reasons.length) reasons.push('Our automated system flagged this listing for a manual review — no specific issue was identified')
  return reasons
}

function riskSentiment(flag, reasons) {
  if (flag === 'Low')    return { icon: '✓', text: 'Nothing suspicious',   tone: 'text-primary' }
  if (flag === 'Medium') return { icon: '⚠', text: 'Worth a closer look',  tone: 'text-yellow-600' }
  if (reasons?.length > 0) return { icon: '✗', text: 'Some issues detected', tone: 'text-destructive' }
  return { icon: '○', text: 'Queued for routine review', tone: 'text-orange-600' }
}

// ── Layout A — current card grid ──────────────────────────────────────────────

function LayoutA({ listing, ml, canContactSeller, sent, sending, message, setMessage, onContact, user }) {
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-8">
      {listing.images?.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {listing.images.map(img => (
            <img key={img} src={`${ASSET_BASE_URL}/${img}`}
              alt={`${listing.brand} ${listing.model}`}
              className="aspect-video w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : (
        <div className="mb-6 flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">No photos</div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{listing.brand} {listing.model} · {listing.year}</h1>
          <p className="mt-1 text-muted-foreground">{formatKm(listing.kmDriven)} · {listing.fuelType} · {listing.transmission}</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="text-2xl font-bold text-foreground sm:whitespace-nowrap">{formatPrice(listing.price)}</p>
          <PriceDelta price={listing.price} min={ml.predictedPriceMin} max={ml.predictedPriceMax} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TrustScoreBadge score={ml.trustScore} />
        <RiskFlagBadge flag={ml.riskFlag} reasons={ml.fraudReasons} trustScore={ml.trustScore} />
        <WishlistButton listingId={listing._id} />
      </div>

      {listing.description && <p className="mt-4 text-foreground/90">{listing.description}</p>}

      <div className="mt-8 grid gap-4">
        {ml.trustScore != null && (
          <Card>
            <CardHeader><CardTitle className="text-base">Trust Score</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="text-5xl font-bold text-primary">
                <AnimatedTrustScore value={ml.trustScore} /><span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="flex-1 space-y-1.5">
                <TrustBreakdownRow label="Price fairness"  value={ml.trustBreakdown?.priceFairness}  max={50} />
                <TrustBreakdownRow label="Condition"       value={ml.trustBreakdown?.conditionMatch} max={35} />
                <TrustBreakdownRow label="Listing quality" value={ml.trustBreakdown?.completeness}   max={15} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Price check</CardTitle></CardHeader>
            <CardContent>
              {ml.predictedPriceMin != null ? (() => {
                const s = priceSentiment(ml.trustBreakdown?.priceFairness ?? 0)
                return (
                  <div className="flex flex-col gap-1">
                    <p className={`text-sm font-medium ${s.tone}`}>{s.icon} {s.text}</p>
                    <p className="text-sm text-muted-foreground">
                      Similar cars sell for {formatPrice(ml.predictedPriceMin)} – {formatPrice(ml.predictedPriceMax)}
                      {ml.confidenceLevel === 'low' && <span className="block mt-0.5 text-xs">Limited data — treat as approximate</span>}
                    </p>
                  </div>
                )
              })() : <p className="text-sm text-muted-foreground">Not yet scored</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Listing check</CardTitle></CardHeader>
            <CardContent>
              {ml.riskFlag ? (() => {
                const s = riskSentiment(ml.riskFlag, ml.fraudReasons)
                const displayReasons = ml.fraudReasons?.length > 0
                  ? ml.fraudReasons
                  : ml.riskFlag === 'High' ? inferReasons(ml, listing) : []
                return (
                  <div className="flex flex-col gap-1">
                    <p className={`text-sm font-medium ${s.tone}`}>{s.icon} {s.text}</p>
                    {displayReasons.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                        {displayReasons.map(r => <li key={r}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )
              })() : <p className="text-sm text-muted-foreground">Not yet scored</p>}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader><CardTitle className="text-base">Condition assessment</CardTitle></CardHeader>
            <CardContent>
              {ml.visualConditionScore != null ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">Condition: <span className="font-medium text-foreground">{conditionLabel(ml.visualConditionScore)}</span></p>
                    {ml.conditionSeverity && <p className="text-sm text-muted-foreground">— {ml.conditionSeverity}</p>}
                    {ml.conditionDecision && (() => {
                      const d = decisionLabel(ml.conditionDecision)
                      return d ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.color}`}>{d.text}</span> : null
                    })()}
                  </div>
                  {ml.detectedDamages?.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {ml.detectedDamages.map((d, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-x-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <span className="font-medium text-foreground capitalize">{d.damageType?.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">· {d.severity} · {d.location}</span>
                          {d.estimatedCost > 0 && <span className="text-muted-foreground">· ~₹{Math.round(d.estimatedCost * 83).toLocaleString('en-IN')} est.</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">No photos to assess</p>}
            </CardContent>
          </Card>

          {ml.sellerProfile && (
            <Card className="sm:col-span-2">
              <CardHeader><CardTitle className="text-base">Seller profile</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">For your reference only — not part of the Trust Score.</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>Account age: <span className="font-medium text-foreground">
                    {ml.sellerProfile.accountAgeDays < 30
                      ? `${ml.sellerProfile.accountAgeDays}d`
                      : `${Math.floor(ml.sellerProfile.accountAgeDays / 30)}mo`}
                  </span></span>
                  <span>Past deals: <span className="font-medium text-foreground">{ml.sellerProfile.pastDeals}</span></span>
                  <span>Response rate: <span className="font-medium text-foreground">{ml.sellerProfile.responseRate}%</span></span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ContactSection listing={listing} canContactSeller={canContactSeller} sent={sent} sending={sending} message={message} setMessage={setMessage} onContact={onContact} user={user} />
    </section>
  )
}

// ── Layout B — editorial two-column ──────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function InlineCheck({ icon, text, tone, sub }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-sm font-medium ${tone}`}>{icon} {text}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function LayoutB({ listing, ml, canContactSeller, sent, sending, message, setMessage, onContact, user }) {
  const ps = priceSentiment(ml.trustBreakdown?.priceFairness ?? 0)
  const rs = riskSentiment(ml.riskFlag ?? 'Low', ml.fraudReasons)
  const cLabel = conditionLabel(ml.visualConditionScore)
  const dLabel = ml.conditionDecision ? decisionLabel(ml.conditionDecision) : null

  return (
    <article className="w-full px-6 sm:px-10 lg:px-16 py-8">
      {/* ── Image strip ── */}
      {listing.images?.length > 0 ? (
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {listing.images.map((img, i) => (
            <img key={img} src={`${ASSET_BASE_URL}/${img}`}
              alt={`${listing.brand} ${listing.model}`}
              className={`aspect-video w-full rounded-xl object-cover ${i === 0 ? 'col-span-2 row-span-2 sm:col-span-2' : ''}`} />
          ))}
        </div>
      ) : (
        <div className="mb-8 flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">No photos</div>
      )}

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr]">

        {/* Left rail — identity + trust */}
        <aside className="flex flex-col gap-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{listing.year} · {listing.fuelType}</p>
            <h1 className="text-3xl font-black tracking-tight text-foreground leading-tight">
              {listing.brand}<br />{listing.model}
            </h1>
            <p className="mt-2 text-2xl font-bold text-primary">{formatPrice(listing.price)}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">{formatKm(listing.kmDriven)} · {listing.transmission}</p>
              <PriceDelta price={listing.price} min={ml.predictedPriceMin} max={ml.predictedPriceMax} />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <TrustScoreBadge score={ml.trustScore} />
            <RiskFlagBadge flag={ml.riskFlag} reasons={ml.fraudReasons} trustScore={ml.trustScore} />
            <WishlistButton listingId={listing._id} />
          </div>

          {ml.trustScore != null && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Valora Trust Score</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-6xl font-black text-primary leading-none tabular-nums">
                  <AnimatedTrustScore value={ml.trustScore} />
                </span>
                <span className="text-xl text-muted-foreground mb-1">/100</span>
              </div>
              <div className="space-y-2">
                <TrustBreakdownRow label="Price"    value={ml.trustBreakdown?.priceFairness}  max={50} />
                <TrustBreakdownRow label="Condition" value={ml.trustBreakdown?.conditionMatch} max={35} />
                <TrustBreakdownRow label="Quality"  value={ml.trustBreakdown?.completeness}   max={15} />
              </div>
            </div>
          )}

          {ml.sellerProfile && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Seller</p>
              <p className="font-semibold text-foreground mb-3">{listing.seller?.name}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-base font-bold text-foreground">
                    {ml.sellerProfile.accountAgeDays < 30
                      ? `${ml.sellerProfile.accountAgeDays}d`
                      : `${Math.floor(ml.sellerProfile.accountAgeDays / 30)}mo`}
                  </p>
                  <p className="text-xs text-muted-foreground">on Valora</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-base font-bold text-foreground">{ml.sellerProfile.pastDeals}</p>
                  <p className="text-xs text-muted-foreground">deals</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-base font-bold text-foreground">{ml.sellerProfile.responseRate}%</p>
                  <p className="text-xs text-muted-foreground">response</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">Not factored into Trust Score</p>
            </div>
          )}
        </aside>

        {/* Right column — details + AI analysis */}
        <div className="flex flex-col gap-8">

          {/* Spec grid */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
            <Stat label="Year"         value={listing.year} />
            <Stat label="Mileage"      value={formatKm(listing.kmDriven)} />
            <Stat label="Fuel"         value={listing.fuelType} />
            <Stat label="Transmission" value={listing.transmission} />
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">About this car</p>
              <p className="text-foreground/90 leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* AI analysis */}
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">AI analysis</p>

            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {/* Price */}
              {ml.predictedPriceMin != null && (
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Price check</p>
                  <InlineCheck icon={ps.icon} text={ps.text} tone={ps.tone}
                    sub={`Similar cars: ${formatPrice(ml.predictedPriceMin)} – ${formatPrice(ml.predictedPriceMax)}${ml.confidenceLevel === 'low' ? ' (limited data)' : ''}`} />
                </div>
              )}

              {/* Fraud */}
              {ml.riskFlag && (
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Listing check</p>
                  <InlineCheck icon={rs.icon} text={rs.text} tone={rs.tone} />
                  {(() => {
                    const displayReasons = ml.fraudReasons?.length > 0
                      ? ml.fraudReasons
                      : ml.riskFlag === 'High' ? inferReasons(ml, listing) : []
                    return displayReasons.length > 0 ? (
                      <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
                        {displayReasons.map(r => <li key={r}>{r}</li>)}
                      </ul>
                    ) : null
                  })()}
                </div>
              )}

              {/* Condition */}
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Condition</p>
                {ml.visualConditionScore != null ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{cLabel}</span>
                      {ml.conditionSeverity && <span className="text-sm text-muted-foreground">— {ml.conditionSeverity}</span>}
                      {dLabel && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${dLabel.color}`}>{dLabel.text}</span>}
                    </div>
                    {ml.detectedDamages?.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {ml.detectedDamages.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                            <span className="capitalize font-medium text-foreground">{d.damageType?.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground text-xs">{d.severity} · {d.location}
                              {d.estimatedCost > 0 ? ` · ~₹${Math.round(d.estimatedCost * 83).toLocaleString('en-IN')}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : <span className="text-sm text-muted-foreground">No photos to assess</span>}
              </div>
            </div>
          </div>

          {/* Contact */}
          <ContactSection listing={listing} canContactSeller={canContactSeller} sent={sent} sending={sending} message={message} setMessage={setMessage} onContact={onContact} user={user} compact />
        </div>
      </div>
    </article>
  )
}

// ── Shared contact section ────────────────────────────────────────────────────

function ContactSection({ listing, canContactSeller, sent, sending, message, setMessage, onContact, user, compact }) {
  return (
    <div className={compact ? '' : 'mt-8 border-t border-border pt-6'}>
      {!compact && <h2 className="mb-3 font-semibold text-foreground">Seller</h2>}
      {!compact && <p className="text-foreground/90">{listing.seller?.name}</p>}
      {canContactSeller && !sent && (
        <form onSubmit={onContact} className="mt-4 flex max-w-md flex-col gap-2">
          <Textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Ask the seller a question..." rows={3} required />
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
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [layout, setLayout] = useState(() => localStorage.getItem('listing-layout') ?? 'A')

  useEffect(() => {
    setLoading(true)
    getListing(id)
      .then(setListing)
      .catch(() => setError('Listing not found'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleLayout = () => {
    const next = layout === 'A' ? 'B' : 'A'
    setLayout(next)
    localStorage.setItem('listing-layout', next)
  }

  const handleContact = async (e) => {
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
      <section className="w-full px-6 sm:px-10 lg:px-16 py-8">
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
      <section className="w-full px-6 sm:px-10 lg:px-16 py-12">
        <BackButton fallback="/listings" className="mb-4" />
        <p className="text-destructive">{error || 'Not found'}</p>
      </section>
    )
  }

  const ml = listing.ml || {}
  const isOwnListing = user?.id === listing.seller?._id
  const canContactSeller = user && user.role !== 'admin' && !isOwnListing

  const sharedProps = { listing, ml, canContactSeller, sent, sending, message, setMessage, onContact: handleContact, user }

  return (
    <>
      {/* Top nav bar — consistent across both layouts */}
      <div className="w-full px-6 sm:px-10 lg:px-16 pt-4 pb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton fallback="/listings" />
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <Link to="/listings" className="hover:text-foreground hover:underline">Listings</Link>
            <ChevronRight className="size-3.5 shrink-0" />
            <span className="max-w-[220px] truncate text-foreground" aria-current="page">
              {listing.brand} {listing.model}
            </span>
          </nav>
        </div>

        {/* Layout toggle */}
        <button
          onClick={toggleLayout}
          title={layout === 'A' ? 'Switch to editorial layout' : 'Switch to card layout'}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
        >
          {layout === 'A' ? <Rows3 className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
          {layout === 'A' ? 'Editorial view' : 'Card view'}
        </button>
      </div>

      {layout === 'A'
        ? <LayoutA {...sharedProps} />
        : <LayoutB {...sharedProps} />}
    </>
  )
}
