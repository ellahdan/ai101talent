import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { RotateCcw, Search, SlidersHorizontal, UsersRound } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Input, Select } from '@/components/ui/form'
import { Check, FilterChip, FilterGroup, Pagination } from '@/components/ui/filters'
import { TagInput } from '@/components/ui/tag-input'
import { TalentCard, TalentCardSkeleton } from '@/components/talent/TalentCard'
import { LanguageAdder } from '@/components/talent/LanguageAdder'
import { ShortlistDialog } from '@/components/talent/ShortlistDialog'
import { RequestDialog } from '@/components/talent/RequestDialog'
import { ContactGate, useRequestMode } from '@/components/talent/ContactGate'
import { useTalentFacets, useTalentSearch } from '@/hooks/useTalent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WORK_MODES, type AnonymizedCandidate, type Proficiency } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { talentText } from '@/i18n/talent'
import { ApprovalNotice } from './CompanyLayout'
import { useMe } from '@/hooks/useAuth'

/** Company dashboard: full search. Companies not approved yet can browse, but contacting waits for approval. */
export default function TalentSearch() {
  const t = useT(talentText).search
  useDocumentTitle(t.title)
  const { data: me } = useMe()
  const approved = me?.company?.status === 'approved' && me.isVerified
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      {!approved && <div className="mb-6"><ApprovalNotice /></div>}
      <TalentSearchView variant="company" canAct={approved} />
    </>
  )
}

type Dialog = { candidate: AnonymizedCandidate; kind: 'save' | 'request' }

/**
 * Anonymized talent search with filters. `canAct` (shortlists) is false for guests and companies awaiting
 * approval. "Request to speak" is open to guests and unapproved companies too (see useRequestMode).
 */
export function TalentSearchView({ variant, canAct }: { variant: 'company' | 'public'; canAct: boolean }) {
  const t = useT(talentText).search
  const c = useT(common)
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useTalentSearch(params)
  const facets = useTalentFacets()
  const isPublic = variant === 'public'
  const requestMode = useRequestMode()
  const profileHref = (id: string) => (isPublic ? `/talent/${id}` : `/company/candidates/${id}`)

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
      <FilterGroup title={t.skills}>
        <TagInput type="skills" value={list('skills')} onChange={(v) => update({ skills: v.join(',') || null })} placeholder={t.skillsPlaceholder} aria-describedby="skills-mode" />
        {list('skills').length > 1 && (
          <div id="skills-mode" role="radiogroup" aria-label={t.skillMatching} className="inline-flex rounded-md bg-chip p-0.5 text-xs font-semibold">
            {(['all', 'any'] as const).map((mode) => (
              <button key={mode} type="button" role="radio" aria-checked={(get('skillsMode') || 'all') === mode} onClick={() => update({ skillsMode: mode === 'all' ? null : 'any' })} className={cn('rounded px-2.5 py-1', (get('skillsMode') || 'all') === mode ? 'bg-surface shadow-sm' : 'text-foreground/60')}>
                {mode === 'all' ? t.matchAll : t.matchAny}
              </button>
            ))}
          </div>
        )}
      </FilterGroup>
      <FilterGroup title={t.years}>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={60} aria-label={t.minYears} placeholder={t.min} className="h-10" value={get('minYears')} onChange={(e) => update({ minYears: e.target.value || null })} />
          <span className="text-foreground/40">–</span>
          <Input type="number" min={0} max={60} aria-label={t.maxYears} placeholder={t.max} className="h-10" value={get('maxYears')} onChange={(e) => update({ maxYears: e.target.value || null })} />
        </div>
      </FilterGroup>
      <FilterGroup title={t.languages}>
        <LanguageAdder options={facets.data?.languages ?? []} onAdd={(v) => !list('languages').includes(v) && update({ languages: [...list('languages'), v].join(',') })} />
      </FilterGroup>
      <FilterGroup title={t.location}>
        <Select aria-label={t.country} value={get('country')} onChange={(e) => update({ country: e.target.value || null })}>
          <option value="">{t.anyCountry}</option>
          {facets.data?.countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </Select>
      </FilterGroup>
      <FilterGroup title={t.workMode}>
        {WORK_MODES.map((mode) => <Check key={mode} label={workModeLabel[mode]} checked={list('workMode').includes(mode)} onChange={() => toggleList('workMode', mode)} />)}
      </FilterGroup>
      <FilterGroup title={t.availability}>
        <Select aria-label={t.availability} value={get('availability')} onChange={(e) => update({ availability: e.target.value || null })}>
          <option value="">{t.any}</option>
          <option value="immediately">{c.availability.immediately}</option>
          <option value="notice_period">{c.availability.noticePeriod}</option>
        </Select>
      </FilterGroup>
    </div>
  )

  // The company area has a sidebar menu, so filters collapse at a wider breakpoint there.
  const wide = isPublic ? 'lg' : 'xl'
  const cardGrid = isPublic ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3'

  return (
    <>
      <KeywordBox initial={get('q')} onSearch={(q) => update({ q: q || null, sort: null })} />

      <div className={cn('mt-6 grid gap-8', isPublic ? 'lg:grid-cols-[260px_1fr]' : 'xl:grid-cols-[250px_1fr]')}>
        <aside aria-label={c.actions.filters} className={cn('hidden', isPublic ? 'lg:block' : 'xl:block')}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 pb-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">{c.actions.filters}</h2>
              {activeCount > 0 && <button type="button" onClick={clearAll} className="text-sm font-semibold text-brand">{c.actions.clearAll}</button>}
            </div>
            {filters}
          </div>
        </aside>

        <section aria-labelledby="talent-results" aria-busy={isPending || isPlaceholderData} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="talent-results" className="text-sm text-foreground/65" aria-live="polite">
              {data ? <><strong className="text-foreground">{data.total}</strong> {t.count(data.total)}</> : c.form.searching}
            </h2>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className={cn('h-10 rounded-md px-3', wide === 'lg' ? 'lg:hidden' : 'xl:hidden')} aria-expanded={filtersOpen} aria-controls="talent-filters" onClick={() => setFiltersOpen((o) => !o)}>
                <SlidersHorizontal data-icon="inline-start" aria-hidden /> {c.actions.filters}{activeCount > 0 && ` (${activeCount})`}
              </Button>
              <Select aria-label={t.sortBy} className="h-10 w-auto" value={get('sort') || (get('q') ? 'relevance' : 'experience')} onChange={(e) => update({ sort: e.target.value })}>
                {get('q') && <option value="relevance">{t.relevant}</option>}
                <option value="experience">{t.experienced}</option>
                <option value="newest">{t.newest}</option>
              </Select>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <m.div id="talent-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={cn('overflow-hidden', wide === 'lg' ? 'lg:hidden' : 'xl:hidden')}>
                <div className="mt-4 rounded-lg border border-foreground/12 bg-surface p-5">{filters}</div>
              </m.div>
            )}
          </AnimatePresence>

          {activeCount > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.activeFilters}>
              {list('skills').map((s) => <FilterChip key={s} label={s} onRemove={() => toggleList('skills', s)} />)}
              {languages.map((l) => <FilterChip key={l.raw} label={`${l.name}${l.min ? ` (${proficiencyLabel[l.min]}+)` : ''}`} onRemove={() => toggleList('languages', l.raw)} />)}
              {(get('minYears') || get('maxYears')) && <FilterChip label={t.yearsChip(get('minYears') || '0', get('maxYears') || '∞')} onRemove={() => update({ minYears: null, maxYears: null })} />}
              {get('country') && <FilterChip label={get('country')} onRemove={() => update({ country: null })} />}
              {list('workMode').map((mode) => <FilterChip key={mode} label={workModeLabel[mode as keyof typeof workModeLabel]} onRemove={() => toggleList('workMode', mode)} />)}
              {get('availability') && <FilterChip label={get('availability') === 'immediately' ? c.availability.now : t.noticeChip} onRemove={() => update({ availability: null })} />}
            </ul>
          )}

          {isError ? (
            <div className="mt-6 space-y-3">
              <Alert variant="error">{error.message}</Alert>
              <Button type="button" variant="outline" className="rounded-md" onClick={() => refetch()}><RotateCcw data-icon="inline-start" aria-hidden /> {c.actions.tryAgain}</Button>
            </div>
          ) : isPending ? (
            <div className={cn('mt-6 grid gap-4', cardGrid)}>{Array.from({ length: 6 }, (_, i) => <TalentCardSkeleton key={i} />)}</div>
          ) : data.items.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={UsersRound} title={t.noMatch} action={<Button type="button" variant="outline" className="rounded-md" onClick={() => setParams({})}>{t.clear}</Button>}>
                {t.noMatchHint}
              </EmptyState>
            </div>
          ) : (
            <>
              <ul className={cn('mt-6 grid gap-4 transition-opacity', cardGrid, isPlaceholderData && 'opacity-60')}>
                {data.items.map((candidate) => (
                  <li key={candidate.id}>
                    <TalentCard
                      candidate={candidate}
                      href={profileHref(candidate.id)}
                      onSave={(cand) => setDialog({ candidate: cand, kind: 'save' })}
                      onRequest={(cand) => setDialog({ candidate: cand, kind: 'request' })}
                    />
                  </li>
                ))}
              </ul>
              {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: p > 1 ? String(p) : null }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
            </>
          )}
        </section>
      </div>

      {dialog?.kind === 'save' && (canAct ? <ShortlistDialog candidate={dialog.candidate} onClose={() => setDialog(null)} /> : <ContactGate candidate={dialog.candidate} reason="save" onClose={() => setDialog(null)} />)}
      {dialog?.kind === 'request' &&
        (requestMode === 'blocked' ? <ContactGate candidate={dialog.candidate} reason="contact" onClose={() => setDialog(null)} /> : <RequestDialog candidate={dialog.candidate} mode={requestMode} onClose={() => setDialog(null)} />)}
    </>
  )
}

/** Heading of the public talent page, with the call to action for companies. */
export function PublicTalentHeader() {
  const t = useT(talentText).search
  const { data: me } = useMe()
  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.publicEyebrow}</p>
      <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.publicHeading}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/65 sm:text-base">{t.publicLead}</p>
      {!me && (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link to="/register?role=company" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>{t.registerCta}</Link>
          <Link to="/login?next=%2Ftalent" className="text-sm font-semibold text-brand">{t.loginCta}</Link>
        </div>
      )}
    </div>
  )
}

function KeywordBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const t = useT(talentText).search
  const c = useT(common)
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" onSubmit={submit} className="flex max-w-3xl items-center gap-3 rounded-lg border border-foreground/12 bg-surface p-2 pl-4 shadow-sm focus-within:border-brand/60">
      <Search className="shrink-0 text-brand" size={20} aria-hidden />
      <input aria-label={t.keyword} value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.keywordPlaceholder} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-foreground/45 sm:text-base" />
      <Button type="submit" className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">{c.actions.search}</Button>
    </form>
  )
}
