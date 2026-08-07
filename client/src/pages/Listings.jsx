import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { getListings } from '../services/listings'
import ListingCard from '../components/ListingCard'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']
const PAGE_SIZE  = 9

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const cardVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

const EMPTY_FILTERS = {
  brand: '', model: '', fuelType: '',
  minPrice: '', maxPrice: '',
  minYear: '', maxYear: '',
  minKm: '', maxKm: '',
  minTrustScore: '',
}

export default function Listings() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    brand:    searchParams.get('brand')    || '',
    model:    searchParams.get('model')    || '',
    fuelType: searchParams.get('fuelType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  }))
  const [listings, setListings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [page, setPage]           = useState(1)
  const [sidebarOpen, setSidebar] = useState(false)  // mobile sidebar toggle

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setPage(1)

    getListings(filters)
      .then(data  => { if (!cancelled) setListings(data) })
      .catch(()   => { if (!cancelled) setError('Could not load listings') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [filters])

  const set = (key) => (e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))
  const clearFilters = () => setFilters(EMPTY_FILTERS)
  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  // Pagination
  const totalPages = Math.ceil(listings.length / PAGE_SIZE)
  const paginated  = listings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const FilterPanel = () => (
    <aside className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Filters</p>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X className="size-3" />Clear all
          </button>
        )}
      </div>

      {/* Brand / Model */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brand & Model</label>
        <Input placeholder="Brand" value={filters.brand} onChange={set('brand')} />
        <Input placeholder="Model" value={filters.model} onChange={set('model')} />
      </div>

      {/* Fuel type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fuel type</label>
        <select value={filters.fuelType} onChange={set('fuelType')} className={SELECT_CLASS}>
          <option value="">Any</option>
          {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price (₹)</label>
        <Input type="number" placeholder="Min" value={filters.minPrice} onChange={set('minPrice')} />
        <Input type="number" placeholder="Max" value={filters.maxPrice} onChange={set('maxPrice')} />
      </div>

      {/* Year */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Year</label>
        <Input type="number" placeholder="From" value={filters.minYear} onChange={set('minYear')} />
        <Input type="number" placeholder="To"   value={filters.maxYear} onChange={set('maxYear')} />
      </div>

      {/* Km driven */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Km driven</label>
        <Input type="number" placeholder="Min" value={filters.minKm} onChange={set('minKm')} />
        <Input type="number" placeholder="Max" value={filters.maxKm} onChange={set('maxKm')} />
      </div>

      {/* Trust score */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min trust score</label>
        <select value={filters.minTrustScore} onChange={set('minTrustScore')} className={SELECT_CLASS}>
          <option value="">Any</option>
          <option value="75">75+ (High)</option>
          <option value="50">50+ (Medium)</option>
        </select>
      </div>
    </aside>
  )

  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 py-10">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every car checked for fair price, fraud risk, and condition.
          </p>
        </div>
        {/* Mobile filter button */}
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSidebar(v => !v)}>
          <SlidersHorizontal className="size-4" />
          Filters
          {hasActiveFilters && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground leading-none">{Object.values(filters).filter(Boolean).length}</span>}
        </Button>
      </div>

      <div className="mt-8 flex gap-8">

        {/* ── Desktop sidebar ── */}
        <div className="hidden w-56 flex-shrink-0 lg:block">
          <FilterPanel />
        </div>

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebar(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-background p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-foreground">Filters</p>
                <button onClick={() => setSidebar(false)}><X className="size-5" /></button>
              </div>
              <FilterPanel />
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">

          {/* Count */}
          {!loading && !error && (
            <p className="mb-4 text-sm text-muted-foreground">
              {listings.length === 0
                ? 'No listings match these filters.'
                : `${listings.length} listing${listings.length !== 1 ? 's' : ''} found`}
            </p>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div aria-live="polite">
              <span className="sr-only">Loading listings...</span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
              </div>
            </div>
          )}

          {error && <p className="text-destructive">{error}</p>}

          {/* Grid */}
          {!loading && !error && paginated.length > 0 && (
            <motion.div
              key={page}
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.05 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {paginated.map(listing => (
                <motion.div key={listing._id} variants={cardVariants}>
                  <ListingCard listing={listing} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="w-9"
                >
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
