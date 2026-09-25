import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

function useDebounced<T>(value: T, ms = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export function useSuggestions(type: 'skills' | 'tools', query: string) {
  const q = useDebounced(query.trim())
  return useQuery({
    queryKey: ['public', 'suggest', type, q.toLowerCase()],
    queryFn: () => api<string[]>(`/api/public/suggest?type=${type}&q=${encodeURIComponent(q)}`),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

interface ComboboxInputProps {
  type: 'skills' | 'tools'
  /** Values already chosen (hidden from suggestions, case-insensitive). */
  exclude: string[]
  onAdd: (value: string) => void
  placeholder?: string
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/** Text input with an autocomplete list. Enter or comma adds the typed value; arrows pick a suggestion. */
export function ComboboxInput({ type, exclude, onAdd, placeholder, ...aria }: ComboboxInputProps) {
  const c = useT(common)
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const { data } = useSuggestions(type, value)
  const excluded = new Set(exclude.map((e) => e.toLowerCase()))
  const options = (data ?? []).filter((o) => !excluded.has(o.toLowerCase())).slice(0, 8)
  // Only suggest once something is typed, so an empty field never covers the rest of the form.
  const showList = open && value.trim().length > 0 && options.length > 0

  const add = (v: string) => {
    const clean = v.trim().replace(/,+$/, '')
    if (!clean) return
    if (!excluded.has(clean.toLowerCase())) onAdd(clean)
    setValue('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % options.length)
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault()
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1))
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(showList && active >= 0 ? options[active] : value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none transition placeholder:text-foreground/40 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive"
          {...aria}
        />
        <button
          type="button"
          onClick={() => add(value)}
          disabled={!value.trim()}
          aria-label={type === 'skills' ? c.tags.addSkill : c.tags.addTool}
          className="grid size-11 shrink-0 place-items-center rounded-md border border-foreground/15 text-foreground/70 transition hover:border-brand hover:text-brand disabled:opacity-40"
        >
          <Plus size={17} aria-hidden />
        </button>
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-foreground/12 bg-surface py-1 shadow-lg">
          {options.map((o, i) => (
            <li
              key={o}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                add(o)
              }}
              className={cn('cursor-pointer px-3 py-2 text-sm', i === active ? 'bg-brand-soft text-brand-soft-foreground' : 'hover:bg-muted')}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Chips + autocomplete input for a list of strings (e.g. tools). */
export function TagInput({ value, onChange, type, placeholder, ...aria }: { value: string[]; onChange: (v: string[]) => void; type: 'skills' | 'tools'; placeholder?: string; id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) {
  const c = useT(common)
  return (
    <div className="space-y-2.5">
      <ComboboxInput type={type} exclude={value} onAdd={(v) => onChange([...value, v])} placeholder={placeholder} {...aria} />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={c.tags.added}>
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-full bg-chip py-1 pr-1 pl-3 text-sm">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={c.tags.remove(tag)} className="grid size-6 place-items-center rounded-full text-foreground/50 hover:bg-foreground/10 hover:text-foreground">
                <X size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
