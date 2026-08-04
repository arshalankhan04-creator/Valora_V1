import { Link } from 'react-router-dom'
import { Button } from '../ui/button'

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground sm:py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to find a car you can trust?</h2>
        <p className="mx-auto mt-2 max-w-md text-primary-foreground/80">
          Every listing checked for price, fraud, and condition before you ever message a seller.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/listings">Browse listings</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/register">Sign up free</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
