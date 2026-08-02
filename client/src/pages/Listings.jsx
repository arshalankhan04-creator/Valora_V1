import { useEffect, useState } from 'react'
import { getListings } from '../services/listings'
import ListingCard from '../components/ListingCard'

const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG', 'LPG', 'Hybrid']

export default function Listings() {
  const [filters, setFilters] = useState({ brand: '', fuelType: '', minPrice: '', maxPrice: '', minTrustScore: '' })
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
    <section className="px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Listings</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Brand"
          value={filters.brand}
          onChange={handleFilterChange('brand')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select
          value={filters.fuelType}
          onChange={handleFilterChange('fuelType')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Any fuel type</option>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min price"
          value={filters.minPrice}
          onChange={handleFilterChange('minPrice')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32"
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={handleFilterChange('maxPrice')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32"
        />
        <select
          value={filters.minTrustScore}
          onChange={handleFilterChange('minTrustScore')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Any trust score</option>
          <option value="75">75+ (High)</option>
          <option value="50">50+ (Medium)</option>
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading listings...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="text-gray-500">No listings match these filters.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </section>
  )
}
