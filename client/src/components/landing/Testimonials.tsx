import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useTestimonials } from '@/hooks/usePublicData'
import { Reveal } from '@/components/Reveal'
import { defineText, useT } from '@/i18n'

const text = defineText(
  {
    eyebrow: 'In their words',
    heading: 'Connections that worked.',
    previous: 'Previous testimonial',
    next: 'Next testimonial',
    region: 'Testimonials',
    slide: (n: number, total: number) => `${n} of ${total}`,
    show: (n: number) => `Show testimonial ${n}`,
  },
  {
    eyebrow: 'In ihren Worten',
    heading: 'Verbindungen, die funktioniert haben.',
    previous: 'Vorheriges Zitat',
    next: 'Nächstes Zitat',
    region: 'Erfahrungsberichte',
    slide: (n: number, total: number) => `${n} von ${total}`,
    show: (n: number) => `Zitat ${n} anzeigen`,
  },
)

const AUTOPLAY_MS = 7000

export function Testimonials() {
  const { data, isLoading } = useTestimonials()
  const items = data ?? []
  const reduceMotion = useReducedMotion()
  const t = useT(text)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const autoplay = !reduceMotion && !paused && items.length > 1

  useEffect(() => {
    if (!autoplay) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [autoplay, items.length])

  const go = (delta: number) => setIndex((i) => (i + delta + items.length) % items.length)
  const current = items[index % Math.max(items.length, 1)]

  return (
    <section aria-labelledby="testimonials-heading" className="px-4 pb-14 sm:px-8 sm:pb-20">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.eyebrow}</p>
            <h2 id="testimonials-heading" className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.heading}</h2>
          </div>
          {items.length > 1 && (
            <div className="flex gap-2">
              <SlideButton label={t.previous} onClick={() => go(-1)}><ChevronLeft size={18} aria-hidden /></SlideButton>
              <SlideButton label={t.next} onClick={() => go(1)}><ChevronRight size={18} aria-hidden /></SlideButton>
            </div>
          )}
        </Reveal>

        <div
          className="mt-8 overflow-hidden rounded-lg border border-foreground/12 bg-surface"
          role="region"
          aria-roledescription="carousel"
          aria-label={t.region}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {isLoading || !current ? (
            <div className="p-7 sm:p-12" aria-busy="true">
              <div className="h-7 w-full max-w-3xl animate-pulse rounded bg-chip" />
              <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-chip" />
              <div className="mt-10 h-10 w-48 animate-pulse rounded bg-chip" />
            </div>
          ) : (
            <div aria-live={autoplay ? 'off' : 'polite'} className="relative min-h-[18rem] p-7 sm:min-h-[16rem] sm:p-12">
              <Quote className="absolute top-6 right-6 size-16 text-brand-soft sm:size-24" aria-hidden />
              <AnimatePresence mode="wait" initial={false}>
                <m.figure
                  key={current.id}
                  aria-roledescription="slide"
                  aria-label={t.slide((index % items.length) + 1, items.length)}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <blockquote className="max-w-3xl text-xl leading-snug tracking-[-.03em] sm:text-3xl">“{current.quote}”</blockquote>
                  <figcaption className="mt-8 flex items-center gap-3">
                    {current.avatarUrl ? (
                      <img src={current.avatarUrl} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="grid size-11 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground">{initials(current.name)}</span>
                    )}
                    <span>
                      <span className="block font-semibold">{current.name}</span>
                      <span className="block text-sm text-foreground/55">{current.role}</span>
                    </span>
                  </figcaption>
                </m.figure>
              </AnimatePresence>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={t.show(i + 1)}
                aria-current={i === index % items.length}
                onClick={() => setIndex(i)}
                className="grid size-6 place-items-center"
              >
                <span className={`block h-1.5 rounded-full transition-all ${i === index % items.length ? 'w-6 bg-brand' : 'w-1.5 bg-foreground/25'}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SlideButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-10 place-items-center rounded-full border border-foreground/15 transition hover:border-brand hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {children}
    </button>
  )
}

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
