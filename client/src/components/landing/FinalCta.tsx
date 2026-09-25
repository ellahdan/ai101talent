import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/Reveal'
import { defineText, useT } from '@/i18n'

const text = defineText(
  {
    eyebrow: 'Your next chapter starts here',
    heading: 'Find work that works for you.',
    lead: 'Join a network that puts people, potential, and possibility first.',
    start: 'Get started',
    hiring: 'Hiring? Find talent',
  },
  {
    eyebrow: 'Ihr nächstes Kapitel beginnt hier',
    heading: 'Finden Sie Arbeit, die zu Ihnen passt.',
    lead: 'Werden Sie Teil eines Netzwerks, das Menschen, Potenzial und Möglichkeiten an erste Stelle setzt.',
    start: "Los geht's",
    hiring: 'Sie stellen ein? Talente finden',
  },
)

export function FinalCta() {
  const t = useT(text)
  return (
    <section className="px-4 pb-14 sm:px-8 sm:pb-20">
      <Reveal className="mx-auto max-w-7xl rounded-lg bg-ink p-7 text-ink-foreground sm:p-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand-bright">{t.eyebrow}</p>
        <h2 className="max-w-2xl text-3xl font-medium tracking-[-.06em] sm:text-6xl">{t.heading}</h2>
        <p className="mt-5 max-w-md text-white/65">{t.lead}</p>
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <Link to="/apply" className={cn(buttonVariants(), 'rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
            {t.start} <ArrowRight data-icon="inline-end" />
          </Link>
          <Link to="/talent" className="text-sm font-semibold text-brand-bright underline-offset-4 hover:underline">{t.hiring}</Link>
        </div>
      </Reveal>
    </section>
  )
}
