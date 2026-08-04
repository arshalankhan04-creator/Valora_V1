import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'

// Every answer here is checked against what Valora actually does — no
// invented guarantees, inspection services, or policies that don't exist.
const FAQS = [
  {
    q: 'Is browsing and contacting sellers free?',
    a: 'Yes. Searching, viewing listings, and messaging sellers on Valora is free — there are no listing fees or transaction charges.',
  },
  {
    q: 'How is the Trust Score calculated?',
    a: "It combines four things: how fair the asking price is against an AI-predicted range, a fraud risk check on the listing and seller, an AI condition score from the seller's own photos, and the seller's track record — all weighted into one 0–100 score.",
  },
  {
    q: 'Does Valora physically inspect the cars?',
    a: "No. The Trust Score is generated from the data and photos the seller provides, analyzed by AI — it's not a substitute for seeing the car and verifying its condition in person before you buy.",
  },
  {
    q: 'How do I contact a seller?',
    a: 'Every listing has its own message thread with the seller, tied specifically to that car — open it directly from the listing page.',
  },
  {
    q: 'Can I sell a car on Valora too?',
    a: 'Yes — register as a seller and your listings go through the same automatic scoring buyers already see, no extra steps.',
  },
]

export default function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Frequently asked questions</h2>
      <Accordion type="single" collapsible className="mt-6">
        {FAQS.map(({ q, a }, i) => (
          <AccordionItem key={q} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
