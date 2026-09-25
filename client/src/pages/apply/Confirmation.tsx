import { useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { Check, Copy, MailCheck, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApplySubmitResult } from '@/types'
import { useT } from '@/i18n'
import { profileText } from '@/i18n/profile'

export function Confirmation({ result }: { result: Pick<ApplySubmitResult, 'applicantNumber' | 'jobTitle'> }) {
  const [copied, setCopied] = useState(false)
  const t = useT(profileText).confirmation
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.applicantNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <section className="px-4 py-12 sm:px-8 sm:py-20">
      <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-xl text-center">
        <m.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }} className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-brand-foreground">
          <Check size={28} aria-hidden />
        </m.div>
        <h1 className="mt-6 text-3xl font-medium tracking-[-.05em] sm:text-5xl" tabIndex={-1}>
          {result.jobTitle ? t.sent : t.ready}
        </h1>
        <p className="mt-3 text-foreground/65">{result.jobTitle ? <>{t.received} <strong className="text-foreground">{result.jobTitle}</strong>.</> : t.discover}</p>

        <div className="mt-8 rounded-lg bg-ink p-6 text-ink-foreground">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-bright">{t.number}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-wide sm:text-4xl" aria-live="polite">{result.applicantNumber}</p>
          <button type="button" onClick={copy} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? t.copied : t.copy}
          </button>
        </div>

        <ul className="mt-8 space-y-3 text-left text-sm">
          <li className="flex gap-3 rounded-md border border-foreground/12 p-4"><MailCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {t.emailed}</li>
          <li className="flex gap-3 rounded-md border border-foreground/12 p-4"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {t.reviewed}</li>
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/candidate" className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover')}>{t.dashboard}</Link>
          <Link to="/jobs" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-11 rounded-md px-5')}>{t.more}</Link>
        </div>
      </m.div>
    </section>
  )
}
