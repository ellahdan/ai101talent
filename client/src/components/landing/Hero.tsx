import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight, Search } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTypewriter } from '@/hooks/useTypewriter'
import { usePublicStats } from '@/hooks/usePublicData'
import { CountUp } from './CountUp'

const examples = {
  jobs: ['React developer, 3+ years', 'Data analyst, French', 'Remote product designer', 'Python, machine learning'],
  talent: ['React developer, 3+ years', 'Data analyst, French', 'DevOps engineer, AWS', 'B2B marketing lead'],
}

export function Hero() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [mode, setMode] = useState<'jobs' | 'talent'>('jobs')
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const staticPlaceholder = mode === 'jobs' ? 'Search by role, skill, or keyword' : 'Search by skill or job title'

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    navigate(mode === 'jobs' ? `/jobs${params}` : `/company/search${params}`)
  }

  return (
    <section className="relative isolate overflow-hidden bg-ink px-4 pb-12 pt-12 text-ink-foreground sm:px-8 sm:pb-20 sm:pt-20">
      <HeroBackground />
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-medium text-brand-bright">The human-first talent marketplace</p>
          <h1 className="max-w-2xl text-[clamp(2.7rem,10vw,6.4rem)] font-medium leading-[.96] tracking-[-.07em]">How work<br /><span className="text-brand-bright">gets done.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-xl">Find the right people for your next project, or find meaningful work that moves your career forward.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/jobs" className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover')}>
              Find a Job <ArrowRight data-icon="inline-end" />
            </Link>
            <Link to="/register?role=company" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-11 rounded-md border-white/25 bg-white/5 px-5 text-white hover:bg-white/15 hover:text-white dark:border-white/25 dark:bg-white/5 dark:hover:bg-white/15')}>
              Hire Talent
            </Link>
          </div>
        </div>

        <form onSubmit={onSubmit} role="search" className="mt-9 max-w-3xl rounded-lg bg-surface p-2 text-foreground shadow-2xl sm:mt-12">
          <div className="flex border-b border-foreground/10" role="tablist" aria-label="Search for">
            {(['jobs', 'talent'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`flex-1 px-3 py-3 text-left text-sm font-semibold ${mode === m ? 'border-b-2 border-brand text-brand dark:text-brand-bright' : 'text-foreground/55'}`}
              >
                {m === 'jobs' ? 'Find work' : 'Find talent'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 px-2 py-4 sm:px-3">
            <Search className="shrink-0 text-brand" size={20} aria-hidden />
            <div className="relative min-w-0 flex-1">
              <input
                aria-label={mode === 'jobs' ? 'Search jobs' : 'Search talent'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={reduceMotion || focused ? staticPlaceholder : ''}
                className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/45 sm:text-base"
              />
              {!reduceMotion && !focused && query === '' && <TypedExamples phrases={examples[mode]} />}
            </div>
            <Button type="submit" className="rounded-md bg-brand text-brand-foreground hover:bg-brand-hover" aria-label="Search">
              <span className="hidden sm:inline">Search</span>
              <ArrowRight className="sm:hidden" aria-hidden />
            </Button>
          </div>
        </form>

        <HeroStats />
      </div>
    </section>
  )
}

function HeroStats() {
  const { data, isLoading } = usePublicStats()
  const items = [
    { label: 'Open positions', value: data?.openPositions },
    { label: 'Registered talents', value: data?.registeredTalents },
    { label: 'Companies', value: data?.companies },
    { label: 'Successful hires', value: data?.successfulHires },
  ]
  return (
    <dl className="mt-12 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 sm:mt-16 sm:grid-cols-4" aria-busy={isLoading}>
      {items.map((item) => (
        <Stat key={item.label} label={item.label} value={isLoading || item.value == null ? null : <CountUp value={item.value} />} />
      ))}
    </dl>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-xs uppercase tracking-[.14em] opacity-60">{label}</dt>
      <dd className="text-3xl font-medium">{value ?? <span className="block h-9 w-20 animate-pulse rounded bg-white/10" />}</dd>
    </div>
  )
}

function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-drift absolute -top-40 right-[-12%] size-[32rem] rounded-full bg-brand/25 blur-3xl sm:size-[40rem]" />
      <div className="animate-drift-slow absolute bottom-[-14rem] left-[-10%] size-[26rem] rounded-full bg-brand-bright/15 blur-3xl sm:size-[34rem]" />
      <div className="animate-drift absolute top-1/3 right-1/4 size-40 rounded-full bg-brand-bright/10 blur-2xl [animation-delay:-6s]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_70%_20%,black,transparent_70%)]" />
    </div>
  )
}

/**
 * The animated example searches. Kept in its own component so each keystroke re-renders only this span,
 * and started once the page has loaded so it doesn't compete with the first render.
 */
function TypedExamples({ phrases }: { phrases: string[] }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const start = () => setReady(true)
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    const id = idle(start, { timeout: 2500 })
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id)
  }, [])
  const typed = useTypewriter(phrases, ready)
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center truncate text-sm text-foreground/45 sm:text-base">
      {typed}<span className="animate-caret ml-px inline-block h-[1.1em] w-px bg-brand" />
    </span>
  )
}
