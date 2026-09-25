import { useId } from 'react'
import { LANGS, useLang, useT, type Lang } from '@/i18n'
import { common } from '@/i18n/common'
import { cn } from '@/lib/utils'

/** English / German switch shown as two flags. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang()
  const t = useT(common).language
  return (
    <div role="radiogroup" aria-label={t.label} className={cn('inline-flex items-center gap-0.5 rounded-md border border-foreground/12 p-0.5', className)}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          aria-label={t[l]}
          title={t[l]}
          onClick={() => setLang(l)}
          className={cn(
            'grid h-7 w-8 place-items-center rounded transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            lang === l ? 'bg-brand-soft ring-1 ring-brand/50' : 'opacity-55 grayscale-[35%] hover:bg-muted hover:opacity-100 hover:grayscale-0',
          )}
        >
          <Flag lang={l} />
        </button>
      ))}
    </div>
  )
}

function Flag({ lang }: { lang: Lang }) {
  return lang === 'de' ? <GermanFlag /> : <UkFlag />
}

const flagClass = 'block h-3.5 w-5 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,.12)]'

function GermanFlag() {
  return (
    <svg viewBox="0 0 5 3" preserveAspectRatio="none" className={flagClass} aria-hidden>
      <rect width="5" height="1" fill="#000" />
      <rect y="1" width="5" height="1" fill="#DD0000" />
      <rect y="2" width="5" height="1" fill="#FFCE00" />
    </svg>
  )
}

function UkFlag() {
  // Ids must be unique: the toggle appears twice (desktop and mobile menu).
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={flagClass} aria-hidden>
      <clipPath id={`${id}-s`}><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id={`${id}-t`}><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}
