import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { RotateCcw, Search, SlidersHorizontal, UsersRound } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Input, Select } from '@/components/ui/form'
import { Check, FilterChip, FilterGroup, Pagination } from '@/components/ui/filters'
import { TagInput } from '@/components/ui/tag-input'
import { TalentCard, TalentCardSkeleton } from '@/components/talent/TalentCard'
import { LanguageAdder } from '@/components/talent/LanguageAdder'
import { ShortlistDialog } from '@/components/talent/ShortlistDialog'
import { RequestDialog } from '@/components/talent/RequestDialog'
import { useTalentFacets, useTalentSearch } from '@/hooks/useTalent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WORK_MODES, type AnonymizedCandidate, type Proficiency } from '@/types'
import { ApprovalNotice } from './CompanyLayout'
import { useMe } from '@/hooks/useAuth'

export default function TalentSearch() {
  useDocumentTitle('Talent search')
  const { data: me } = useMe()
  const approved = me?.company?.status === 'approved' && me.isVerified
  return approved ? <SearchPage /> : (
    <>
      <PageHeader title="Talent search" />
      <ApprovalNotice />
    </>
  )
}

function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [saving, setSaving] = useState<AnonymizedCandidate | null>(null)
  const [requesting, setRequesting] = useState<AnonymizedCandidate | null>(null)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useTalentSearch(params)
  const facets = useTalentFacets()

  const get = (k: string) => params.get(k) ?? ''
  const list = (k: string) => get(k).split(',').filter(Boolean)
  const update = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (resetPage) next.delete('page')
    setParams(next)
  }
  const toggleList = (k: string, v: string) => {
    const cur = list(k)
    update({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') || null })
  }
  const clearAll = () => setParams(get('q') ? { q: get('q') } : {})

  const languages = list('languages').map((l) => {
    const [name, min] = l.split(':')
    return { raw: l, name, min: min as Proficiency | undefined }
  })
  const activeCount = list('skills').length + languages.length + list('workMode').length + ['minYears', 'maxYears', 'country', 'availability'].filter((k) => get(k)).length

  const filters = (
    <div className="space-y-7">
      <FilterGroup title="Skills">
        <TagInput type="skills" value={list('skills')} onChange={(v) => update({ skills: v.join(',') || null })} placeholder="e.g. React" aria-describedby="skills-mode" />
        {list('skills').length > 1 && (
          <div id="skills-mode" role="radiogroup" aria-label="Skill matching" className="inline-flex rounded-md bg-chip p-0.5 text-xs font-semibold">
            {(['all', 'any'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={(get('skillsMode') || 'all') === m} onClick={() => update({ skillsMode: m === 'all' ? null : 'any' })} className={cn('rounded px-2.5 py-1', (get('skillsMode') || 'all') === m ? 'bg-surface shadow-sm' : 'text-foreground/60')}>
                Match {m}
              </button>
            ))}
          </div>
        )}
      </FilterGroup>
      <FilterGroup title="Years of experience">
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={60} aria-label="Minimum years" placeholder="Min" className="h-10" value={get('minYears')} onChange={(e) => update({ minYears: e.target.value || null })} />
          <span className="text-foreground/40">–</span>
          <Input type="number" min={0} max={60} aria-label="Maximum years" placeholder="Max" className="h-10" value={get('maxYears')} onChange={(e) => update({ maxYears: e.target.value || null })} />
        </div>
      </FilterGroup>
      <FilterGroup title="Languages">
        <LanguageAdder options={facets.data?.languages ?? []} onAdd={(v) => !list('languages').includes(v) && update({ languages: [...list('languages'), v].join(',') })} />
      </FilterGroup>
      <FilterGroup title="Location">
        <Select aria-label="Country" value={get('country')} onChange={(e) => update({ country: e.target.value || null })}>
          <option value="">Any country</option>
          {facets.data?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </FilterGroup>
      <FilterGroup title="Preferred work mode">
        {WORK_MODES.map((m) => <Check key={m} label={workModeLabel[m]} checked={list('workMode').includes(m)} onChange={() => toggleList('workMode', m)} />)}
      </FilterGroup>
      <FilterGroup title="Availability">
        <Select aria-label="Availability" value={get('availability')} onChange={(e) => update({ availability: e.target.value || null })}>
          <option value="">Any</option>
          <option value="immediately">Available immediately</option>
          <option value="notice_period">With a notice period</option>
        </Select>
      </FilterGroup>
    </div>
  )

  return (
    <>
      <PageHeader title="Talent search" description="Profiles are anonymized. When you find someone interesting, request to speak and our team will handle the introduction." />
      <KeywordBox initial={get('q')} onSearch={(q) => update({ q: q || null, sort: null })} />

      <div className="mt-6 grid gap-8 xl:grid-cols-[250px_1fr]">
        <aside aria-label="Filters" className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              {activeCount > 0 && <button type="button" onClick={clearAll} className="text-sm font-semibold text-brand">Clear all</button>}
            </div>
            {filters}
          </div>
        </aside>

        <section aria-labelledby="talent-results" aria-busy={isPending || isPlaceholderData} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="talent-results" className="text-sm text-foreground/65" aria-live="polite">
              {data ? <><strong className="text-foreground">{data.total}</strong> candidate{data.total === 1 ? '' : 's'}</> : 'Searching…'}
            </h2>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-10 rounded-md px-3 xl:hidden" aria-expanded={filtersOpen} aria-controls="talent-filters" onClick={() => setFiltersOpen((o) => !o)}>
                <SlidersHorizontal data-icon="inline-start" aria-hidden /> Filters{activeCount > 0 && ` (${activeCount})`}
              </Button>
              <Select aria-label="Sort by" className="h-10 w-auto" value={get('sort') || (get('q') ? 'relevance' : 'experience')} onChange={(e) => update({ sort: e.target.value })}>
                {get('q') && <option value="relevance">Most relevant</option>}
                <option value="experience">Most experienced</option>
                <option value="newest">Newest profiles</option>
              </Select>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <m.div id="talent-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden xl:hidden">
                <div className="mt-4 rounded-lg border border-foreground/12 bg-surface p-5">{filters}</div>
              </m.div>
            )}
          </AnimatePresence>

          {activeCount > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
              {list('skills').map((s) => <FilterChip key={s} label={s} onRemove={() => toggleList('skills', s)} />)}
              {languages.map((l) => <FilterChip key={l.raw} label={`${l.name}${l.min ? ` (${proficiencyLabel[l.min]}+)` : ''}`} onRemove={() => toggleList('languages', l.raw)} />)}
              {(get('minYears') || get('maxYears')) && <FilterChip label={`${get('minYears') || 0}–${get('maxYears') || '∞'} years`} onRemove={() => update({ minYears: null, maxYears: null })} />}
              {get('country') && <FilterChip label={get('country')} onRemove={() => update({ country: null })} />}
              {list('workMode').map((m) => <FilterChip key={m} label={workModeLabel[m as keyof typeof workModeLabel]} onRemove={() => toggleList('workMode', m)} />)}
              {get('availability') && <FilterChip label={get('availability') === 'immediately' ? 'Available now' : 'Notice period'} onRemove={() => update({ availability: null })} />}
            </ul>
          )}

          {isError ? (
            <div className="mt-6 space-y-3">
              <Alert variant="error">{error.message}</Alert>
              <Button type="button" variant="outline" className="rounded-md" onClick={() => refetch()}><RotateCcw data-icon="inline-start" aria-hidden /> Try again</Button>
            </div>
          ) : isPending ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <TalentCardSkeleton key={i} />)}</div>
          ) : data.items.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={UsersRound} title="No candidates match" action={<Button type="button" variant="outline" className="rounded-md" onClick={() => setParams({})}>Clear search and filters</Button>}>
                Try fewer skills, "match any", or a wider experience range.
              </EmptyState>
            </div>
          ) : (
            <>
              <ul className={cn('mt-6 grid gap-4 transition-opacity md:grid-cols-2 2xl:grid-cols-3', isPlaceholderData && 'opacity-60')}>
                {data.items.map((c) => <li key={c.id}><TalentCard candidate={c} onSave={setSaving} onRequest={setRequesting} /></li>)}
              </ul>
              {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: p > 1 ? String(p) : null }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
            </>
          )}
        </section>
      </div>

      {saving && <ShortlistDialog candidate={saving} onClose={() => setSaving(null)} />}
      {requesting && <RequestDialog candidate={requesting} onClose={() => setRequesting(null)} />}
    </>
  )
}

function KeywordBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" onSubmit={submit} className="flex max-w-3xl items-center gap-3 rounded-lg border border-foreground/12 bg-surface p-2 pl-4 shadow-sm focus-within:border-brand/60">
      <Search className="shrink-0 text-brand" size={20} aria-hidden />
      <input aria-label="Keyword" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Keywords from profiles and CVs, e.g. GDPR, Kubernetes, fintech" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-foreground/45 sm:text-base" />
      <Button type="submit" className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">Search</Button>
    </form>
  )
}
