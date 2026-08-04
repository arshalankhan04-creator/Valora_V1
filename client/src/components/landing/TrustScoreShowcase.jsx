import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedTrustScore from '../AnimatedTrustScore'
import TrustBreakdownRow from '../TrustBreakdownRow'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

// Shown only when no real scored listing exists yet — clearly labeled as an
// example, never presented as if it were a real listing.
const EXAMPLE_BREAKDOWN = {
  trustScore: 87,
  trustBreakdown: { priceFairness: 35, fraudRisk: 26, conditionMatch: 24, sellerFactor: 2 },
}

export default function TrustScoreShowcase({ listings, loading }) {
  const scored = listings.filter((l) => l.ml?.trustScore != null)
  const best = scored.length > 0
    ? scored.reduce((a, b) => (b.ml.trustScore > a.ml.trustScore ? b : a))
    : null

  const isReal = Boolean(best)
  const trustScore = isReal ? best.ml.trustScore : EXAMPLE_BREAKDOWN.trustScore
  const breakdown = isReal ? best.ml.trustBreakdown : EXAMPLE_BREAKDOWN.trustBreakdown
  const label = isReal ? `${best.brand} ${best.model}` : 'Example breakdown'

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">AI-powered trust scoring</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Every listing analyzed before you connect. Price fairness, fraud risk, condition, and
            seller history — combined into one score you can actually check.
          </p>
          <Button asChild className="mt-6">
            <Link to="/listings">See it on real listings</Link>
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-56 rounded-2xl" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-brand/60">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{label}</span>
                  {!isReal && <span className="text-xs font-normal text-muted-foreground">Example</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <div className="text-5xl font-bold text-primary">
                  <AnimatedTrustScore value={trustScore} />
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <TrustBreakdownRow label="Price fairness" value={breakdown?.priceFairness} max={40} />
                  <TrustBreakdownRow label="Fraud risk" value={breakdown?.fraudRisk} max={30} />
                  <TrustBreakdownRow label="Condition match" value={breakdown?.conditionMatch} max={30} />
                  <TrustBreakdownRow label="Seller factor" value={breakdown?.sellerFactor} max={5} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  )
}
