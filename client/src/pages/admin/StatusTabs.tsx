import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Status filter tabs that live in the URL (?status=…). */
export function StatusTabs<T extends string>({ options, counts }: { options: { value: T | ''; label: string }[]; counts?: Partial<Record<T, number>> }) {
  const [params, setParams] = useSearchParams()
  const current = params.get('status') ?? ''
  return (
    <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg bg-chip p-1">
      {options.map((o) => {
        const active = current === o.value
        const count = o.value ? counts?.[o.value as T] : undefined
        return (
          <button
            key={o.value || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (o.value) next.set('status', o.value)
              else next.delete('status')
              setParams(next, { replace: true })
            }}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition', active ? 'bg-surface font-semibold shadow-sm' : 'text-foreground/65 hover:text-foreground')}
          >
            {o.label}
            {count ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
