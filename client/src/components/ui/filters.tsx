import { useId, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</legend>
      <div className="space-y-2.5">{children}</div>
      {hint && <p className="mt-2 text-xs text-foreground/50">{hint}</p>}
    </fieldset>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2.5">
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="size-4 rounded accent-brand" />
      <label htmlFor={id} className="text-sm">{label}</label>
    </div>
  )
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-soft-foreground hover:bg-brand-soft/70">
        {label} <X size={13} aria-hidden />
      </button>
    </li>
  )
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  // Current page, its neighbours, first and last; gaps become "…".
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const btn = 'grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={cn(btn, 'border-foreground/15')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} aria-hidden /></button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-foreground/40" aria-hidden>…</span>}
          <button type="button" onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined} className={cn(btn, p === page ? 'border-brand bg-brand text-brand-foreground' : 'border-foreground/15 hover:border-brand')}>
            {p}
          </button>
        </span>
      ))}
      <button type="button" className={cn(btn, 'border-foreground/15')} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} aria-hidden /></button>
    </nav>
  )
}
