import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Gauge, Camera } from 'lucide-react'
import { Button } from '../components/ui/button'

const FEATURES = [
  { icon: Gauge, title: 'Fair-price check', body: 'A predicted price range for every listing, not a single guess.' },
  { icon: ShieldCheck, title: 'Fraud risk flag', body: 'Suspicious listings are flagged before you ever contact a seller.' },
  { icon: Camera, title: 'Condition score', body: "AI reads the seller's own photos to verify the car's real condition." },
]

export default function Home() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-4xl font-bold text-foreground sm:text-5xl"
      >
        Find a used car you can actually trust
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mt-4 max-w-xl text-muted-foreground"
      >
        Every listing gets a fair-price check, a fraud risk flag, and a condition score before you ever message the seller.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 flex justify-center gap-3"
      >
        <Button asChild size="lg">
          <Link to="/listings">Browse listings</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/register">Sign up free</Link>
        </Button>
      </motion.div>

      <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
