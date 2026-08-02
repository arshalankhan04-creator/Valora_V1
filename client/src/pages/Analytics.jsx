import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { getMarketAnalytics } from '../services/listings'
import { formatPrice } from '../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

const CONDITION_LABELS = {
  0: '0-50 (Poor)',
  50: '50-70 (Fair)',
  70: '70-85 (Good)',
  85: '85-100 (Excellent)',
}

const tooltipForPrice = {
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => formatPrice(ctx.parsed.y) } },
  },
  scales: { y: { ticks: { callback: (value) => formatPrice(value) } } },
}

function ChartCard({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h2 className="font-medium text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMarketAnalytics()
      .then(setData)
      .catch(() => setError('Could not load market analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="px-6 py-12 text-gray-500">Loading...</p>
  if (error) return <p className="px-6 py-12 text-red-600">{error}</p>

  const noData = Object.values(data).every((group) => group.length === 0)

  return (
    <section className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Market analytics</h1>
      <p className="text-sm text-gray-500 mb-6">
        Live price trends across every active listing on Valora, not historical training data.
      </p>

      {noData && (
        <p className="text-gray-500">
          Not enough active listings yet to show trends — this fills in as the marketplace grows.
        </p>
      )}

      {!noData && (
        <div className="grid sm:grid-cols-2 gap-4">
          <ChartCard title="Average price by brand">
            <Bar
              data={{
                labels: data.byBrand.map((d) => d.brand),
                datasets: [{ label: 'Avg price', data: data.byBrand.map((d) => d.avgPrice), backgroundColor: '#111827' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by fuel type">
            <Bar
              data={{
                labels: data.byFuelType.map((d) => d.fuelType),
                datasets: [{ label: 'Avg price', data: data.byFuelType.map((d) => d.avgPrice), backgroundColor: '#111827' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by year (depreciation trend)">
            <Line
              data={{
                labels: data.byYear.map((d) => d.year),
                datasets: [{ label: 'Avg price', data: data.byYear.map((d) => d.avgPrice), borderColor: '#111827', backgroundColor: '#111827' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by condition score">
            <Bar
              data={{
                labels: data.byCondition.map((d) => CONDITION_LABELS[d.bucketStart] ?? d.bucketStart),
                datasets: [{ label: 'Avg price', data: data.byCondition.map((d) => d.avgPrice), backgroundColor: '#111827' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>
        </div>
      )}
    </section>
  )
}
