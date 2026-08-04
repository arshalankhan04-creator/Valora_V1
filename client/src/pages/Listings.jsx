import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getListings } from '../services/listings'
import ListingCard from '../components/ListingCard'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']
const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function Listings() {
  // Seeded once from the URL on mount — lets the landing page's hero search
  // and category tiles deep-link straight into a pre-filtered result (e.g.
  // /listings?fuelType=Electric), without making the filter UI itself
  // bidirectionally URL-synced, which is a bigger feature than this needs.
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({
    brand: searchParams.get('brand') || '',
    model: searchParams.get('model') || '',
    fuelType: searchParams.get('fuelType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minYear: '',
    maxYear: '',
    minKm: '',
    maxKm: '',
    minTrustScore: '',
  }))
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getListings(filters)
      .then((data) => {
        if (!cancelled) setListings(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load listings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const handleFilterChange = (key) => (e) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Listings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every car below has already been checked for a fair price, fraud risk, and condition.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input placeholder="Brand" value={filters.brand} onChange={handleFilterChange('brand')} className="w-32" />
        <Input placeholder="Model" value={filters.model} onChange={handleFilterChange('model')} className="w-32" />
        <select value={filters.fuelType} onChange={handleFilterChange('fuelType')} className={SELECT_CLASS}>
          <option value="">Any fuel type</option>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <Input type="number" placeholder="Min price" value={filters.minPrice} onChange={handleFilterChange('minPrice')} className="w-28" />
        <Input type="number" placeholder="Max price" value={filters.maxPrice} onChange={handleFilterChange('maxPrice')} className="w-28" />
        <Input type="number" placeholder="Min year" value={filters.minYear} onChange={handleFilterChange('minYear')} className="w-24" />
        <Input type="number" placeholder="Max year" value={filters.maxYear} onChange={handleFilterChange('maxYear')} className="w-24" />
        <Input type="number" placeholder="Min km" value={filters.minKm} onChange={handleFilterChange('minKm')} className="w-24" />
        <Input type="number" placeholder="Max km" value={filters.maxKm} onChange={handleFilterChange('maxKm')} className="w-24" />
        <select value={filters.minTrustScore} onChange={handleFilterChange('minTrustScore')} className={SELECT_CLASS}>
          <option value="">Any trust score</option>
          <option value="75">75+ (High)</option>
          <option value="50">50+ (Medium)</option>
        </select>
      </div>

      {loading && (
        <div aria-live="polite" className="mt-8">
          <span className="sr-only">Loading listings...</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-8 text-destructive">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="mt-8 text-muted-foreground">No listings match these filters.</p>
      )}

      {!loading && !error && listings.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {listings.map((listing) => (
            <motion.div key={listing._id} variants={cardVariants}>
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
