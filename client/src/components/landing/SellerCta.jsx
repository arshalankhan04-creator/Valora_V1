import { Link } from 'react-router-dom'
import { Button } from '../ui/button'

export default function SellerCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Selling a car instead?</h2>
          <p className="mt-2 text-muted-foreground">
            List your car and it gets the same automatic fair-price check, fraud screening, and
            condition score buyers already trust — no extra work on your part.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/register">List your car</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
