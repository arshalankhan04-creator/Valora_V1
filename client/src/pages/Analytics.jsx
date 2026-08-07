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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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

  if (loading) {
    return (
      <section className="w-full px-6 sm:px-10 lg:px-16 py-8">
        <span className="sr-only">Loading...</span>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </section>
    )
  }
  if (error) return <p className="px-6 py-12 text-destructive">{error}</p>

  const noData = Object.values(data).every((group) => group.length === 0)

  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-8">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Market analytics</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Live price trends across every active listing on Valora, not historical training data.
      </p>

      {noData && (
        <p className="text-muted-foreground">
          Not enough active listings yet to show trends — this fills in as the marketplace grows.
        </p>
      )}

      {!noData && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartCard title="Average price by brand">
            <Bar
              data={{
                labels: data.byBrand.map((d) => d.brand),
                datasets: [{ label: 'Avg price', data: data.byBrand.map((d) => d.avgPrice), backgroundColor: 'hsl(142, 76%, 36%)' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by fuel type">
            <Bar
              data={{
                labels: data.byFuelType.map((d) => d.fuelType),
                datasets: [{ label: 'Avg price', data: data.byFuelType.map((d) => d.avgPrice), backgroundColor: 'hsl(142, 76%, 36%)' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by year (depreciation trend)">
            <Line
              data={{
                labels: data.byYear.map((d) => d.year),
                datasets: [{ label: 'Avg price', data: data.byYear.map((d) => d.avgPrice), borderColor: 'hsl(142, 76%, 36%)', backgroundColor: 'hsl(142, 76%, 36%)' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>

          <ChartCard title="Average price by condition score">
            <Bar
              data={{
                labels: data.byCondition.map((d) => CONDITION_LABELS[d.bucketStart] ?? d.bucketStart),
                datasets: [{ label: 'Avg price', data: data.byCondition.map((d) => d.avgPrice), backgroundColor: 'hsl(142, 76%, 36%)' }],
              }}
              options={tooltipForPrice}
            />
          </ChartCard>
        </div>
      )}
    </section>
  )
}
