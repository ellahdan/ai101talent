import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** On/off toggle with a visible label and optional description. */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {description && <p id={`${id}-desc`} className="mt-0.5 text-sm text-foreground/60">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          checked ? 'bg-brand' : 'bg-foreground/20',
        )}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}
