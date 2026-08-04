import { Search, ShieldCheck, MessageSquare, Handshake } from 'lucide-react'

const STEPS = [
  { icon: Search, title: 'Search & filter', body: 'Find cars matching your budget, brand, and fuel type.' },
  { icon: ShieldCheck, title: 'Check the Trust Score', body: 'See the price fairness, fraud risk, and condition breakdown.' },
  { icon: MessageSquare, title: 'Message the seller', body: 'Ask questions directly — every conversation is tied to that one listing.' },
  { icon: Handshake, title: 'Meet & finalize', body: 'Arrange a viewing and complete the deal directly with the seller.' },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How buying works</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title}>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </div>
            <Icon className="mt-4 size-5 text-primary" />
            <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
