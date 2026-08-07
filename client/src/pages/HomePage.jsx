// ─── HomePage — single file, all landing sections inlined ───────────────────
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Search, Gauge, ShieldCheck, Camera, Sparkles,
  Fuel, Zap, Droplet, Leaf, Wind, Flame,
  MessageSquare, Handshake, Box, Car, ArrowUp,
} from 'lucide-react'
import { getListings } from '../services/listings'
import ListingCard from '../components/ListingCard'
import AnimatedTrustScore from '../components/AnimatedTrustScore'
import TrustBreakdownRow from '../components/TrustBreakdownRow'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import heroBg      from '../assets/hero-bg.png'
import plateImg    from '../assets/seller-cta-plate.png'
import user1 from '../assets/user1.jpg'
import user2 from '../assets/user2.jpg'
import user3 from '../assets/user3.jpg'
import user4 from '../assets/user4.jpg'
import car1  from '../assets/car1.jpg'
import car2  from '../assets/car2.jpg'
import car3  from '../assets/car3.jpg'
import car4  from '../assets/car4.jpg'

// ─── DATA ────────────────────────────────────────────────────────────────────
const BG = '#FAF9F5'

const AVATARS = [
  { initials: 'AK', bg: '#d1fae5', color: '#065f46' },
  { initials: 'RV', bg: '#fef3c7', color: '#92400e' },
  { initials: 'PS', bg: '#dbeafe', color: '#1e40af' },
  { initials: 'MT', bg: '#fce7f3', color: '#9d174d' },
]

const WHY_FEATURES = [
  { icon: Gauge,      title: 'Fair-price check', body: 'A predicted price range for every listing, not a single guess.' },
  { icon: ShieldCheck,title: 'Fraud risk flag',  body: 'Suspicious listings are flagged before you ever contact a seller.' },
  { icon: Camera,     title: 'Condition score',  body: "AI reads the seller's own photos to verify the car's real condition." },
  { icon: Sparkles,   title: 'Trust Score',      body: 'Price fairness, fraud risk, condition, and seller history combined into one 0–100 score.' },
]

const FUEL_TYPES = [
  { label: 'Petrol',   value: 'Petrol',   icon: Fuel },
  { label: 'Diesel',   value: 'Diesel',   icon: Droplet },
  { label: 'Electric', value: 'Electric', icon: Zap },
  { label: 'Hybrid',   value: 'Hybrid',   icon: Leaf },
  { label: 'CNG',      value: 'CNG',      icon: Wind },
  { label: 'LPG',      value: 'LPG',      icon: Flame },
]

const PRICE_RANGES = [
  { label: 'Under ₹5L',  params: { maxPrice: 500000 } },
  { label: '₹5L – 10L',  params: { minPrice: 500000,   maxPrice: 1000000 } },
  { label: '₹10L – 20L', params: { minPrice: 1000000,  maxPrice: 2000000 } },
  { label: 'Above ₹20L', params: { minPrice: 2000000 } },
]

const STEPS = [
  { icon: Search,        title: 'Search & filter',      body: 'Find cars matching your budget, brand, and fuel type.' },
  { icon: ShieldCheck,   title: 'Check the Trust Score', body: 'See the price fairness, fraud risk, and condition breakdown.' },
  { icon: MessageSquare, title: 'Message the seller',    body: 'Ask questions directly — every conversation is tied to that one listing.' },
  { icon: Handshake,     title: 'Meet & finalize',       body: 'Arrange a viewing and complete the deal directly with the seller.' },
]

const FAQS = [
  { q: 'Is browsing and contacting sellers free?',  a: 'Yes. Searching, viewing listings, and messaging sellers on Valora is free — there are no listing fees or transaction charges.' },
  { q: 'How is the Trust Score calculated?',        a: "It combines four things: how fair the asking price is against an AI-predicted range, a fraud risk check on the listing and seller, an AI condition score from the seller's own photos, and the seller's track record — all weighted into one 0–100 score." },
  { q: 'Does Valora physically inspect the cars?',  a: "No. The Trust Score is generated from the data and photos the seller provides, analyzed by AI — it's not a substitute for seeing the car and verifying its condition in person before you buy." },
  { q: 'How do I contact a seller?',                a: 'Every listing has its own message thread with the seller, tied specifically to that car — open it directly from the listing page.' },
  { q: 'Can I sell a car on Valora too?',           a: 'Yes — register as a seller and your listings go through the same automatic scoring buyers already see, no extra steps.' },
]

const EXAMPLE_BREAKDOWN = { trustScore: 87, trustBreakdown: { priceFairness: 35, fraudRisk: 26, conditionMatch: 24, sellerFactor: 2 } }

// orbit
const ORBITS = [
  { r: 36,  dur: 0,  pairs: [] },
  { r: 80,  dur: 28, pairs: [{ user: user1, car: car1, angle: 45  }] },
  { r: 130, dur: 40, pairs: [{ user: user2, car: car2, angle: 200 }, { user: user3, car: car3, angle: 20  }] },
  { r: 190, dur: 55, pairs: [{ user: user4, car: car4, angle: 290 }, { user: user1, car: car2, angle: 110 }] },
]
const SIZE = 380, PADDING = 50, CX = SIZE / 2

const BUYER_LINKS  = [{ label: 'Browse listings', to: '/listings' }, { label: 'Wishlist', to: '/wishlist' }, { label: 'My inquiries', to: '/inquiries' }, { label: 'Log in', to: '/login' }, { label: 'Sign up', to: '/register' }]
const SELLER_LINKS = [{ label: 'List a car', to: '/register' }, { label: 'My listings', to: '/my-listings' }, { label: 'Analytics', to: '/analytics' }, { label: 'Log in', to: '/login' }, { label: 'Sign up', to: '/register' }]
const LETTERS = ['V','a','l','o','r','a']
const LIFTS   = [0, 0, 0, 6, 14, 22]

const toQuery = (p) => new URLSearchParams(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,String(v)]))).toString()

// ─── SUB-COMPONENTS (private, only used here) ────────────────────────────────

function OrbitPair({ user, car, orbitR, angle, orbitDur, orbitIndex }) {
  const avatar = 20, gap = 14, dir = orbitIndex % 2 === 0 ? 1 : -1
  const rad = (angle * Math.PI) / 180
  const px = CX + orbitR * Math.cos(rad), py = CX + orbitR * Math.sin(rad)
  const rotateTo = dir * 360
  return (
    <g>
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CX}`} to={`${rotateTo} ${CX} ${CX}`} dur={`${orbitDur}s`} repeatCount="indefinite" additive="sum" />
        <g transform={`translate(${px} ${py})`}>
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to={`${-rotateTo} 0 0`} dur={`${orbitDur}s`} repeatCount="indefinite" additive="sum" />
            <clipPath id={`clip-car-${orbitR}-${angle}`}><circle cx={gap} cy={0} r={avatar} /></clipPath>
            <circle cx={gap} cy={0} r={avatar} fill="white" stroke="white" strokeWidth={2} />
            <image href={car} x={gap-avatar} y={-avatar} width={avatar*2} height={avatar*2} clipPath={`url(#clip-car-${orbitR}-${angle})`} preserveAspectRatio="xMidYMid slice" />
            <clipPath id={`clip-user-${orbitR}-${angle}`}><circle cx={-gap} cy={0} r={avatar} /></clipPath>
            <circle cx={-gap} cy={0} r={avatar} fill="white" stroke="white" strokeWidth={2} />
            <image href={user} x={-gap-avatar} y={-avatar} width={avatar*2} height={avatar*2} clipPath={`url(#clip-user-${orbitR}-${angle})`} preserveAspectRatio="xMidYMid slice" />
          </g>
        </g>
      </g>
    </g>
  )
}

function OrbitIllustration() {
  const W = SIZE + PADDING * 2
  return (
    <div style={{ width: W, height: W, flexShrink: 0, position: 'relative' }}>
      <svg width={W} height={W} viewBox={`${-PADDING} ${-PADDING} ${W} ${W}`} fill="none" style={{ position: 'absolute', inset: 0 }}>
        {ORBITS.map(({ r }, i) => <circle key={i} cx={CX} cy={CX} r={r} stroke="hsl(150,20%,80%)" strokeWidth={1} strokeDasharray="5 6" fill="none" />)}
        {ORBITS.map(({ r, dur, pairs }, i) => pairs.map(p => <OrbitPair key={`${r}-${p.angle}`} user={p.user} car={p.car} orbitR={r} angle={p.angle} orbitDur={dur} orbitIndex={i} />))}
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box size={28} color="black" strokeWidth={1.5} />
      </div>
    </div>
  )
}

function ValoraMark() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.6 })
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', marginTop: '1rem', lineHeight: 1, overflow: 'hidden', cursor: 'default' }}>
      <div aria-hidden="true" className="select-none flex justify-center font-bold tracking-tighter" style={{ fontSize: 'clamp(3.5rem, 18vw, 10rem)', lineHeight: 1 }}>
        {LETTERS.map((l, i) => (
          <motion.span key={i} initial={{ color: 'hsl(150,60%,5%)', y: 0, opacity: 0.04 }} animate={isInView ? { color: 'hsl(142,76%,36%)', y: -LIFTS[i], opacity: 0.18 } : {}} transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }} style={{ display: 'inline-block' }}>{l}</motion.span>
        ))}
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', background: `linear-gradient(to bottom, transparent, ${BG})`, pointerEvents: 'none' }} />
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    getListings({})
      .then(data => setListings(data.slice(0, 6)))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/listings?brand=${encodeURIComponent(query.trim())}` : '/listings')
  }

  const handleNewsletter = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  // trust showcase
  const scored = listings.filter(l => l.ml?.trustScore != null)
  const best   = scored.length > 0 ? scored.reduce((a, b) => b.ml.trustScore > a.ml.trustScore ? b : a) : null
  const tsData = best
    ? { score: best.ml.trustScore, breakdown: best.ml.trustBreakdown, label: `${best.brand} ${best.model}`, isReal: true }
    : { score: EXAMPLE_BREAKDOWN.trustScore, breakdown: EXAMPLE_BREAKDOWN.trustBreakdown, label: 'Example breakdown', isReal: false }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950/5 via-background to-slate-100/50 pt-8 pb-16 lg:pt-14 lg:pb-24">
        {/* Ambient radial glow lights */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/15 to-teal-400/20 blur-3xl opacity-70" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">

            {/* Left Col: Hero Content */}
            <div className="lg:col-span-7 flex flex-col items-start">
              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md"
              >
                <div className="flex -space-x-2">
                  {AVATARS.map((av) => (
                    <div
                      key={av.initials}
                      style={{ background: av.bg, color: av.color }}
                      className="flex size-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold"
                    >
                      {av.initials}
                    </div>
                  ))}
                </div>
                <span>Trusted by 10,000+ car buyers & sellers</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
              >
                Find a used car <br />
                you can{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  actually trust
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2 }}
                className="mt-4 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed"
              >
                Every car gets an automated fair-price check, a fraud risk flag, and a verified condition score before you ever contact the seller.
              </motion.p>

              {/* Search Box */}
              <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.3 }}
                className="mt-8 flex w-full max-w-md gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search brand — Honda, Toyota, Maruti..."
                    className="border-0 bg-transparent pl-9 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  />
                </div>
                <Button type="submit" className="rounded-xl px-5 font-semibold">
                  Search
                </Button>
              </motion.form>

              {/* Quick Tags */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.38 }}
                className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="font-medium">Popular:</span>
                {['Honda City', 'Toyota Fortuner', 'Petrol', 'Under ₹5L'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => { setQuery(tag); navigate(`/listings?query=${encodeURIComponent(tag)}`) }}
                    className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
                  >
                    {tag}
                  </button>
                ))}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Button asChild size="lg" className="rounded-xl font-semibold shadow-brand">
                  <Link to="/listings">Browse all listings</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl font-semibold">
                  <Link to="/register">Sign up free</Link>
                </Button>
              </motion.div>
            </div>

            {/* Right Col: Interactive Visual Card Showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-500/5 p-4 shadow-2xl backdrop-blur-xl">
                {/* Hero Car Showcase Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30">
                  <img
                    src={heroBg}
                    alt="Valora Verified Car"
                    className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                {/* Floating Badge 1 (Top Right): Fraud Status */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-8 right-8 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-background/90 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md"
                >
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fraud Status</div>
                    <div className="text-emerald-600 font-bold">0% Risk (Verified)</div>
                  </div>
                </motion.div>

                {/* Floating Badge 2 (Bottom Left): AI Trust Score */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-8 left-8 flex items-center gap-2.5 rounded-xl border border-border bg-background/95 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    94
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Trust Score</div>
                    <div className="font-bold text-foreground">Excellent Match</div>
                  </div>
                </motion.div>

                {/* Floating Badge 3 (Bottom Right): Fair Price */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="absolute bottom-8 right-8 hidden sm:flex items-center gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md"
                >
                  <Gauge className="size-4 text-amber-500" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Valuation</div>
                    <div className="text-foreground font-bold">Fair Market Price</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      {(loading || listings.length > 0) && (
        <section className="w-full bg-slate-50/60 py-16 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured listings</h2>
                <p className="mt-1 text-muted-foreground">Real cars, already checked for price, fraud risk, and condition.</p>
              </div>
              <Button asChild variant="outline" className="hidden flex-shrink-0 sm:inline-flex"><Link to="/listings">View all</Link></Button>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
                : listings.slice(0, 3).map((listing, i) => (
                    <motion.div key={listing._id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                      <ListingCard listing={listing} />
                    </motion.div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY VALORA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Why Valora?</h2>
          <p className="mt-2 text-muted-foreground">Four AI checks run on every listing before you ever see it — the same system every car on this site actually goes through, not marketing copy.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TRUST SCORE SHOWCASE ── */}
      <section className="w-full bg-gradient-to-b from-emerald-50/40 via-background to-transparent py-16 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">AI-powered trust scoring</h2>
              <p className="mt-2 max-w-md text-muted-foreground">Every listing analyzed before you connect. Price fairness, fraud risk, condition, and seller history — combined into one score you can actually check.</p>
              <Button asChild size="lg" className="mt-6 rounded-xl font-semibold"><Link to="/listings">See it on real listings</Link></Button>
            </div>
            {loading ? <Skeleton className="h-56 rounded-2xl" /> : (
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <Card className="shadow-xl border-emerald-500/20">
                  <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{tsData.label}</span>{!tsData.isReal && <span className="text-xs font-normal text-muted-foreground">Example</span>}</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                    <div className="text-5xl font-bold text-primary"><AnimatedTrustScore value={tsData.score} /><span className="text-2xl text-muted-foreground">/100</span></div>
                    <div className="flex-1 space-y-1.5">
                      <TrustBreakdownRow label="Price fairness"  value={tsData.breakdown?.priceFairness}  max={40} />
                      <TrustBreakdownRow label="Fraud risk"      value={tsData.breakdown?.fraudRisk}      max={30} />
                      <TrustBreakdownRow label="Condition match" value={tsData.breakdown?.conditionMatch} max={30} />
                      <TrustBreakdownRow label="Seller factor"   value={tsData.breakdown?.sellerFactor}   max={5}  />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── BROWSE BY CATEGORY ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Browse by category</h2>
        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground">By fuel type</p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {FUEL_TYPES.map(({ label, value, icon: Icon }) => (
              <Link key={value} to={`/listings?fuelType=${value}`} className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-5 text-center transition-all hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-10">
          <p className="text-sm font-medium text-muted-foreground">By budget</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRICE_RANGES.map(({ label, params }) => (
              <Link key={label} to={`/listings?${toQuery(params)}`} className="rounded-2xl border border-border bg-card p-4 text-center font-semibold text-foreground transition-all hover:border-emerald-500 hover:shadow-sm">{label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="w-full bg-slate-50/60 py-16 border-y border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl text-center sm:text-left">How buying works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => {
              const num = String(i + 1).padStart(2, '0')
              return (
                <div key={title} className="flex flex-col items-center text-center bg-card p-6 rounded-2xl border border-border/60 shadow-sm">
                  <div style={{ position: 'relative', lineHeight: 1, overflow: 'hidden', paddingRight: '0.1em' }}>
                    <span style={{ display: 'block', fontSize: 'clamp(3.5rem, 6vw, 5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--color-foreground)', userSelect: 'none', paddingBottom: '0.1em' }}>{num}</span>
                  </div>
                  <h3 className="mt-3 font-bold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
                  <div className="mt-4 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SELLER CTA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-emerald-50/40 p-8 sm:p-12 shadow-lg">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Selling a car instead?</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">List your car and it gets the same automatic fair-price check, fraud screening, and condition score buyers already trust — no extra work on your part.</p>
            <Button asChild size="lg" className="mt-6 rounded-xl font-semibold"><Link to="/register">List your car</Link></Button>
          </div>
          <img src={plateImg} alt="" aria-hidden="true" style={{ position: 'absolute', top: '-25%', right: '1%', height: '160%', width: 'auto', objectFit: 'cover', objectPosition: 'top left', pointerEvents: 'none', userSelect: 'none' }} />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl text-center sm:text-left">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQS.map(({ q, a }, i) => (
            <AccordionItem key={q} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-semibold text-base">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-900/90 via-emerald-950 to-slate-900 p-8 lg:p-12 text-white shadow-2xl">
          <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative z-10 max-w-xl text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Start for free</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
                Ready to find a car<br className="hidden sm:block" /> you can trust?
              </h2>
              <p className="mt-3 text-emerald-100/80 leading-relaxed text-sm sm:text-base">
                Every listing checked for price, fraud, and condition before you ever message a seller.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button asChild size="lg" className="rounded-xl font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  <Link to="/listings">Browse listings</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl font-semibold border-white/20 text-white hover:bg-white/10">
                  <Link to="/register">Sign up free</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-8">
          <div className="grid gap-12 lg:grid-cols-4">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-foreground"><Car className="size-5 text-primary" />Valora</Link>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">Every listing analysed for price fairness, fraud risk, and condition before you ever message a seller.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For buyers</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {BUYER_LINKS.map(({ label, to }) => <li key={label}><Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link></li>)}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For sellers</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {SELLER_LINKS.map(({ label, to }) => <li key={label}><Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link></li>)}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Get alerts when prices drop</p>
              <p className="mt-0.5 text-xs text-muted-foreground">We'll notify you on sudden price drops and product updates. No spam.</p>
              {subscribed
                ? <p className="mt-3 text-sm font-medium text-primary">✓ You're on the list.</p>
                : <form onSubmit={handleNewsletter} className="mt-3 flex gap-2">
                    <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="flex-1" />
                    <Button type="submit" size="sm">Subscribe</Button>
                  </form>
              }
            </div>
          </div>
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Valora. All rights reserved.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <ArrowUp className="size-3.5" />Back to top
            </button>
          </div>
          <ValoraMark />
        </div>
      </footer>
    </>
  )
}
