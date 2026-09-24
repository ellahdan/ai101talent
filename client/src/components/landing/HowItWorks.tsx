import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, m } from 'framer-motion'

const audiences = {
  candidates: {
    label: 'For Candidates',
    eyebrow: 'A better way to be found',
    heading: 'Get seen for what you can actually do.',
    steps: [
      ['01', 'Create your profile', 'Apply to a role or build one reusable profile with your skills, experience and CV.'],
      ['02', 'Get discovered', 'Approved companies search anonymized profiles. Your contact details stay private.'],
      ['03', 'Say yes on your terms', 'We review every request and only introduce you when you accept.'],
    ],
  },
  companies: {
    label: 'For Companies',
    eyebrow: 'A better way to hire',
    heading: 'Get more done with the right people.',
    steps: [
      ['01', 'Post your need', 'Tell us what you need and when you need it.'],
      ['02', 'Meet your match', 'Discover people with the skills to make it happen.'],
      ['03', 'Work with confidence', 'Clear profiles, thoughtful introductions, better outcomes.'],
    ],
  },
} as const

type Audience = keyof typeof audiences
const order: Audience[] = ['candidates', 'companies']

export function HowItWorks() {
  const [active, setActive] = useState<Audience>('candidates')
  const tabRefs = useRef<Record<Audience, HTMLButtonElement | null>>({ candidates: null, companies: null })
  const content = audiences[active]

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = order[(order.indexOf(active) + 1) % order.length]
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section id="how" aria-labelledby="how-heading" className="border-y border-foreground/10 bg-brand-soft px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand-soft-foreground">{content.eyebrow}</p>
            <h2 id="how-heading" className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{content.heading}</h2>
            <div role="tablist" aria-label="How it works for" className="mt-8 inline-flex rounded-full bg-surface p-1 shadow-sm" onKeyDown={onKeyDown}>
              {order.map((key) => (
                <button
                  key={key}
                  ref={(el) => { tabRefs.current[key] = el }}
                  type="button"
                  role="tab"
                  id={`how-tab-${key}`}
                  aria-selected={active === key}
                  aria-controls="how-panel"
                  tabIndex={active === key ? 0 : -1}
                  onClick={() => setActive(key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/50 ${active === key ? 'bg-ink text-ink-foreground' : 'text-foreground/60 hover:text-foreground'}`}
                >
                  {audiences[key].label}
                </button>
              ))}
            </div>
          </div>

          <div id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${active}`}>
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={active} className="grid gap-3 sm:grid-cols-3" initial="hidden" animate="show" exit="exit" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
                {content.steps.map(([num, title, text]) => (
                  <m.div
                    key={num}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-lg bg-surface p-5"
                  >
                    <span className="text-sm font-semibold text-brand">{num}</span>
                    <h3 className="mt-12 font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/60">{text}</p>
                  </m.div>
                ))}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
