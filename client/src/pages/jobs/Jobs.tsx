import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Select } from '@/components/ui/form'
import { Check, FilterChip, FilterGroup, Pagination } from '@/components/ui/filters'
import { JobCard, JobCardSkeleton } from '@/components/jobs/JobCard'
import { useJobFacets, useJobs } from '@/hooks/useJobs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { contractTypeLabel, seniorityLabel, workModeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CONTRACT_TYPES, SENIORITIES, WORK_MODES } from '@/types'

const LIST_KEYS = ['workMode', 'contractType', 'seniority', 'skills'] as const
type ListKey = (typeof LIST_KEYS)[number]

export default function Jobs() {
  useDocumentTitle('Open positions')
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useJobs(params)
  const facets = useJobFacets()

  const q = params.get('q') ?? ''
  const list = (key: ListKey) => (params.get(key) ?? '').split(',').filter(Boolean)
  const activeCount = LIST_KEYS.reduce((n, k) => n + list(k).length, 0) + (params.get('location') ? 1 : 0)

  /** Updates URL params; any filter change goes back to page 1. */
  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (resetPage) next.delete('page')
    setParams(next)
  }
  const toggle = (key: ListKey, value: string) => {
    const current = list(key)
    const lower = value.toLowerCase()
    const next = current.some((v) => v.toLowerCase() === lower) ? current.filter((v) => v.toLowerCase() !== lower) : [...current, value]
    update({ [key]: next.join(',') || null })
  }
  const isOn = (key: ListKey, value: string) => list(key).some((v) => v.toLowerCase() === value.toLowerCase())
  const clearAll = () => setParams(q ? { q } : {})

  const goToPage = (page: number) => {
    update({ page: page > 1 ? String(page) : null }, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filters = (
    <div className="space-y-7">
      <FilterGroup title="Location">
        <Select aria-label="Location" value={params.get('location') ?? ''} onChange={(e) => update({ location: e.target.value || null })}>
          <option value="">Anywhere</option>
          {facets.data?.locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      </FilterGroup>
      <FilterGroup title="Work mode">
        {WORK_MODES.map((m) => <Check key={m} label={workModeLabel[m]} checked={isOn('workMode', m)} onChange={() => toggle('workMode', m)} />)}
      </FilterGroup>
      <FilterGroup title="Contract type">
        {CONTRACT_TYPES.map((c) => <Check key={c} label={contractTypeLabel[c]} checked={isOn('contractType', c)} onChange={() => toggle('contractType', c)} />)}
      </FilterGroup>
      <FilterGroup title="Seniority">
        {SENIORITIES.map((s) => <Check key={s} label={seniorityLabel[s]} checked={isOn('seniority', s)} onChange={() => toggle('seniority', s)} />)}
      </FilterGroup>
      <FilterGroup title="Skills" hint="Jobs must require every selected skill.">
        <div className="flex flex-wrap gap-2">
          {facets.isPending && Array.from({ length: 8 }, (_, i) => <span key={i} className="h-8 w-20 animate-pulse rounded-full bg-chip" />)}
          {/* Show selected skills even when they are not among the facets (e.g. from a shared link). */}
          {[...new Map([...list('skills').map((s) => [s.toLowerCase(), s] as const), ...(facets.data?.skills ?? []).map((s) => [s.name.toLowerCase(), s.name] as const)]).values()].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={isOn('skills', name)}
              onClick={() => toggle('skills', name)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
                isOn('skills', name) ? 'border-brand bg-brand text-brand-foreground' : 'border-foreground/15 hover:border-brand hover:text-brand',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  )

  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">Open positions</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">Find your next role.</h1>
        <SearchBox initial={q} onSearch={(value) => update({ q: value || null, sort: null })} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Filters: sidebar on desktop, collapsible panel on mobile */}
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold">Filters</h2>
                {activeCount > 0 && <button type="button" onClick={clearAll} className="text-sm font-semibold text-brand">Clear all</button>}
              </div>
              {filters}
            </div>
          </aside>

          <section aria-labelledby="results-heading" aria-busy={isPending || isPlaceholderData}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="results-heading" className="text-sm text-foreground/65" aria-live="polite">
                {data ? <><strong className="text-foreground">{data.total}</strong> open position{data.total === 1 ? '' : 's'}{q && <> for “{q}”</>}</> : 'Loading positions…'}
              </h2>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="h-10 rounded-md px-3 lg:hidden" aria-expanded={filtersOpen} aria-controls="mobile-filters" onClick={() => setFiltersOpen((o) => !o)}>
                  <SlidersHorizontal data-icon="inline-start" aria-hidden /> Filters{activeCount > 0 && ` (${activeCount})`}
                </Button>
                {q && (
                  <Select aria-label="Sort by" className="h-10 w-auto" value={params.get('sort') ?? 'relevance'} onChange={(e) => update({ sort: e.target.value === 'relevance' ? null : e.target.value })}>
                    <option value="relevance">Most relevant</option>
                    <option value="newest">Newest</option>
                  </Select>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {filtersOpen && (
                <m.div id="mobile-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
                  <div className="mt-4 rounded-lg border border-foreground/12 bg-surface p-5">
                    {filters}
                    <div className="mt-6 flex gap-2">
                      <Button type="button" className="h-10 flex-1 rounded-md bg-brand text-brand-foreground hover:bg-brand-hover" onClick={() => setFiltersOpen(false)}>Show results</Button>
                      {activeCount > 0 && <Button type="button" variant="outline" className="h-10 rounded-md" onClick={clearAll}>Clear all</Button>}
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            <ActiveFilters params={params} list={list} onRemove={toggle} onClearLocation={() => update({ location: null })} />

            {isError ? (
              <div className="mt-6 space-y-3">
                <Alert variant="error">{error.message}</Alert>
                <Button type="button" variant="outline" className="rounded-md" onClick={() => refetch()}><RotateCcw data-icon="inline-start" aria-hidden /> Try again</Button>
              </div>
            ) : isPending ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <JobCardSkeleton key={i} />)}</div>
            ) : data.items.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-foreground/20 bg-surface p-10 text-center">
                <p className="font-semibold">No positions match your search.</p>
                <p className="mt-1 text-sm text-foreground/60">Try fewer filters or a different keyword.</p>
                <Button type="button" variant="outline" className="mt-5 rounded-md" onClick={() => setParams({})}>Clear search and filters</Button>
              </div>
            ) : (
              <>
                <ul className={cn('mt-6 grid gap-4 transition-opacity md:grid-cols-2', isPlaceholderData && 'opacity-60')}>
                  {data.items.map((job) => <li key={job.id}><JobCard job={job} /></li>)}
                </ul>
                {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" onSubmit={submit} className="mt-6 flex max-w-3xl items-center gap-3 rounded-lg border border-foreground/12 bg-surface p-2 pl-4 shadow-sm focus-within:border-brand/60">
      <Search className="shrink-0 text-brand" size={20} aria-hidden />
      <input
        aria-label="Search jobs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by role, skill, or keyword"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-foreground/45 sm:text-base"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => { setValue(''); onSearch('') }} className="grid size-8 place-items-center rounded-md text-foreground/50 hover:text-foreground">
          <X size={16} aria-hidden />
        </button>
      )}
      <Button type="submit" className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">Search</Button>
    </form>
  )
}

function ActiveFilters({ params, list, onRemove, onClearLocation }: { params: URLSearchParams; list: (k: ListKey) => string[]; onRemove: (k: ListKey, v: string) => void; onClearLocation: () => void }) {
  const labels: Record<ListKey, (v: string) => string> = {
    workMode: (v) => workModeLabel[v as keyof typeof workModeLabel] ?? v,
    contractType: (v) => contractTypeLabel[v as keyof typeof contractTypeLabel] ?? v,
    seniority: (v) => seniorityLabel[v as keyof typeof seniorityLabel] ?? v,
    skills: (v) => v,
  }
  const chips = LIST_KEYS.flatMap((k) => list(k).map((v) => ({ key: k, value: v, label: labels[k](v) })))
  const location = params.get('location')
  if (!chips.length && !location) return null
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
      {location && <FilterChip label={location} onRemove={onClearLocation} />}
      {chips.map((c) => <FilterChip key={`${c.key}-${c.value}`} label={c.label} onRemove={() => onRemove(c.key, c.value)} />)}
    </ul>
  )
}

