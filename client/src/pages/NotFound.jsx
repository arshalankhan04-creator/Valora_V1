import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function NotFound() {
  return (
    <section className="px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back home</Link>
      </Button>
    </section>
  )
}
