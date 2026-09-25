import type { ReactNode } from 'react'
import { Check, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { defineText, useT } from '@/i18n'

const icons = [<ShieldCheck aria-hidden />, <UsersRound aria-hidden />, <Check aria-hidden />, <Sparkles aria-hidden />]

const copy = defineText(
  {
    eyebrow: 'Why AI101 Talents',
    heading: 'A marketplace built around trust.',
    features: [
      { title: 'Human-reviewed', text: 'Every introduction is thoughtful, private, and reviewed by our team.' },
      { title: 'Real opportunity', text: 'Meet teams and candidates who are ready to do their best work.' },
      { title: 'Less noise', text: 'Structured profiles make the signal clear for everyone.' },
      { title: 'Better matches', text: 'Find fit beyond keywords, experience, and a single job title.' },
    ],
  },
  {
    eyebrow: 'Warum AI101 Talents',
    heading: 'Ein Marktplatz, der auf Vertrauen baut.',
    features: [
      { title: 'Von Menschen geprüft', text: 'Jede Vorstellung ist durchdacht, vertraulich und von unserem Team geprüft.' },
      { title: 'Echte Chancen', text: 'Lernen Sie Teams und Kandidaten kennen, die bereit sind, ihr Bestes zu geben.' },
      { title: 'Weniger Rauschen', text: 'Strukturierte Profile machen das Wesentliche für alle sichtbar.' },
      { title: 'Bessere Treffer', text: 'Finden Sie Passung jenseits von Stichworten, Erfahrung und einem einzelnen Jobtitel.' },
    ],
  },
)

export function WhyAI101() {
  const t = useT(copy)
  const features = t.features.map((f, i) => ({ ...f, icon: icons[i] }))
  return (
    <section id="why" aria-labelledby="why-heading" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.eyebrow}</p>
            <h2 id="why-heading" className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.heading}</h2>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <Feature {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="h-full rounded-lg border border-foreground/12 p-5">
      <div className="mb-8 grid size-10 place-items-center rounded-md bg-brand-soft text-brand">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/60">{text}</p>
    </div>
  )
}
