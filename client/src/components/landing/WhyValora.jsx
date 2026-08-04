import { motion } from 'framer-motion'
import { Gauge, ShieldCheck, Camera, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: Gauge, title: 'Fair-price check', body: 'A predicted price range for every listing, not a single guess.' },
  { icon: ShieldCheck, title: 'Fraud risk flag', body: 'Suspicious listings are flagged before you ever contact a seller.' },
  { icon: Camera, title: 'Condition score', body: "AI reads the seller's own photos to verify the car's real condition." },
  { icon: Sparkles, title: 'Trust Score', body: 'Price fairness, fraud risk, condition, and seller history combined into one 0–100 score.' },
]

export default function WhyValora() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Why Valora?</h2>
        <p className="mt-2 text-muted-foreground">
          Four AI checks run on every listing before you ever see it — the same system every car on
          this site actually goes through, not marketing copy.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Icon className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
