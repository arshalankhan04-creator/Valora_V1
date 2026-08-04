import { Link } from 'react-router-dom'
import { Fuel, Zap, Droplet, Leaf, Wind, Flame } from 'lucide-react'

// Fuel type and price range only — both are real, already-queryable fields
// on the Listing schema. Body type (Coupe/Sedan/etc.) is NOT included since
// it doesn't exist on the schema.
const FUEL_TYPES = [
  { label: 'Petrol', value: 'Petrol', icon: Fuel },
  { label: 'Diesel', value: 'Diesel', icon: Droplet },
  { label: 'Electric', value: 'Electric', icon: Zap },
  { label: 'Hybrid', value: 'Hybrid', icon: Leaf },
  { label: 'CNG', value: 'CNG', icon: Wind },
  { label: 'LPG', value: 'LPG', icon: Flame },
]

const PRICE_RANGES = [
  { label: 'Under ₹5L', params: { maxPrice: 500000 } },
  { label: '₹5L – 10L', params: { minPrice: 500000, maxPrice: 1000000 } },
  { label: '₹10L – 20L', params: { minPrice: 1000000, maxPrice: 2000000 } },
  { label: 'Above ₹20L', params: { minPrice: 2000000 } },
]

function toQuery(params) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString()
}

export default function BrowseByCategory() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Browse by category</h2>

      <div className="mt-6">
        <p className="text-sm font-medium text-muted-foreground">By fuel type</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {FUEL_TYPES.map(({ label, value, icon: Icon }) => (
            <Link
              key={value}
              to={`/listings?fuelType=${value}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-ring hover:bg-accent"
            >
              <Icon className="size-5 text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-medium text-muted-foreground">By budget</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRICE_RANGES.map(({ label, params }) => (
            <Link
              key={label}
              to={`/listings?${toQuery(params)}`}
              className="rounded-xl border border-border bg-card p-4 text-center font-medium text-foreground transition-colors hover:border-ring hover:bg-accent"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
