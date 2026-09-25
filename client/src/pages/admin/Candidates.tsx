import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, EyeOff, FileSearch, RotateCcw, Search, SlidersHorizontal, UsersRound } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Input, Select, Spinner } from '@/components/ui/form'
import { FilterChip, Pagination } from '@/components/ui/filters'
import { Highlight } from '@/components/ui/highlight'
import { TagInput } from '@/components/ui/tag-input'
import { LanguageAdder } from '@/components/talent/LanguageAdder'
import { cleanQuery, useAdminCandidates } from '@/hooks/useAdminOffice'
import { useAdminJobs } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { proficiencyLabel, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Proficiency } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { adminText } from '@/i18n/admin'

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export default function AdminCandidates() {
  const t = useT(adminText).candidates
  const c_ = useT(common)
  useDocumentTitle(t.title)
  const [params, setParams] = useSearchParams()
  const [moreOpen, setMoreOpen] = useState(false)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAdminCandidates(params)
  const jobs = useAdminJobs()

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
  const removeFrom = (k: string, v: string) => update({ [k]: list(k).filter((x) => x !== v).join(',') || null })

  const terms = data?.terms ?? []
  const exportHref = `${API}/api/admin/candidates/export${cleanQuery(params) ? `?${cleanQuery(params)}` : ''}`
  const jobTitle = jobs.data?.find((j) => j.id === get('jobId'))?.title
  const chips: { label: string; clear: () => void }[] = [
    ...list('skills').map((s) => ({ label: t.skill(s), clear: () => removeFrom('skills', s) })),
    ...list('tools').map((s) => ({ label: t.tool(s), clear: () => removeFrom('tools', s) })),
    ...list('languages').map((l) => {
      const [name, min] = l.split(':')
      return { label: `${name}${min ? ` (${proficiencyLabel[min as Proficiency]}+)` : ''}`, clear: () => removeFrom('languages', l) }
    }),
    ...(get('minYears') || get('maxYears') ? [{ label: t.yearsChip(get('minYears') || '0', get('maxYears') || '∞'), clear: () => update({ minYears: null, maxYears: null }) }] : []),
    ...(get('country') ? [{ label: t.country(get('country')), clear: () => update({ country: null }) }] : []),
    ...(get('jobId') ? [{ label: t.appliedTo(jobTitle ?? t.position), clear: () => update({ jobId: null }) }] : []),
    ...(get('applicantNumber') ? [{ label: t.number(get('applicantNumber')), clear: () => update({ applicantNumber: null }) }] : []),
  ]

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <a href={exportHref} download className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-md px-4')}>
            <Download data-icon="inline-start" aria-hidden /> {t.exportCsv}{data ? ` (${Math.min(data.total, 5000)})` : ''}
          </a>
        }
      />

      <div className="rounded-lg border border-foreground/12 bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_200px_auto]">
          <KeywordField initial={get('q')} onSearch={(q) => update({ q: q || null, sort: null })} />
          <Input aria-label={t.applicantNumber} placeholder={t.applicantPlaceholder} className="h-10" defaultValue={get('applicantNumber')} key={get('applicantNumber')} onBlur={(e) => update({ applicantNumber: e.target.value.trim() || null })} onKeyDown={(e) => e.key === 'Enter' && update({ applicantNumber: e.currentTarget.value.trim() || null })} />
          <Select aria-label={t.appliedToLabel} className="h-10" value={get('jobId')} onChange={(e) => update({ jobId: e.target.value || null })}>
            <option value="">{t.anyApplication}</option>
            {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company.name}</option>)}
          </Select>
          <Button type="button" variant="outline" className="h-10 rounded-md" aria-expanded={moreOpen} aria-controls="more-filters" onClick={() => setMoreOpen((o) => !o)}>
            <SlidersHorizontal data-icon="inline-start" aria-hidden /> {t.moreFilters}
          </Button>
        </div>
        {moreOpen && (
          <div id="more-filters" className="mt-4 grid gap-4 border-t border-foreground/10 pt-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.skills}</p>
              <TagInput type="skills" value={list('skills')} onChange={(v) => update({ skills: v.join(',') || null })} placeholder={t.skillsPlaceholder} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.tools}</p>
              <TagInput type="tools" value={list('tools')} onChange={(v) => update({ tools: v.join(',') || null })} placeholder={t.toolsPlaceholder} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.languages}</p>
              <LanguageAdder options={['English', 'French', 'German', 'Spanish', 'Portuguese', 'Italian', 'Dutch', 'Arabic', 'Swahili', 'Hindi']} onAdd={(v) => !list('languages').includes(v) && update({ languages: [...list('languages'), v].join(',') })} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.years}</p>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={60} aria-label={t.minYears} placeholder={t.min} className="h-10" value={get('minYears')} onChange={(e) => update({ minYears: e.target.value || null })} />
                <span className="text-foreground/40">–</span>
                <Input type="number" min={0} max={60} aria-label={t.maxYears} placeholder={t.max} className="h-10" value={get('maxYears')} onChange={(e) => update({ maxYears: e.target.value || null })} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.countryLabel}</p>
              <Input aria-label={t.countryLabel} className="h-10" placeholder={t.countryPlaceholder} defaultValue={get('country')} key={get('country')} onBlur={(e) => update({ country: e.target.value.trim() || null })} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.visibility}</p>
              <Select aria-label={t.visibility} className="h-10" value={get('visibility') || 'all'} onChange={(e) => update({ visibility: e.target.value === 'all' ? null : e.target.value })}>
                <option value="all">{t.allProfiles}</option>
                <option value="visible">{t.visible}</option>
                <option value="hidden">{t.hidden}</option>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/65" aria-live="polite">{data ? <><strong className="text-foreground">{data.total}</strong> {t.count(data.total)}</> : c_.form.searching}</p>
        <Select aria-label={t.sortBy} className="h-10 w-auto" value={get('sort') || (get('q') ? 'relevance' : 'newest')} onChange={(e) => update({ sort: e.target.value })}>
          {get('q') && <option value="relevance">{t.relevant}</option>}
          <option value="newest">{t.newest}</option>
          <option value="experience">{t.experienced}</option>
        </Select>
      </div>
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t.activeFilters}>
          {chips.map((c) => <FilterChip key={c.label} label={c.label} onRemove={c.clear} />)}
          <li><button type="button" onClick={() => setParams(get('q') ? { q: get('q') } : {})} className="px-2 py-1.5 text-xs font-semibold text-brand">{c_.actions.clearAll}</button></li>
        </ul>
      )}

      {isError ? (
        <div className="mt-6 space-y-3">
          <Alert variant="error">{error.message}</Alert>
          <Button type="button" variant="outline" className="rounded-md" onClick={() => refetch()}><RotateCcw data-icon="inline-start" aria-hidden /> {c_.actions.tryAgain}</Button>
        </div>
      ) : isPending ? (
        <Spinner className="mt-6 size-6 text-foreground/50" />
      ) : data.items.length === 0 ? (
        <div className="mt-6"><EmptyState icon={UsersRound} title={t.noMatch}>{t.noMatchText}</EmptyState></div>
      ) : (
        <>
          <ul className={cn('mt-4 divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
            {data.items.map((c) => (
              <li key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/candidates/${c.id}${terms.length ? `?terms=${encodeURIComponent(terms.join(','))}` : ''}`} className="font-semibold hover:text-brand">{c.fullName}</Link>
                    <span className="ml-2 font-mono text-xs text-foreground/55">{c.applicantNumber}</span>
                    {!c.visible && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-xs"><EyeOff size={11} aria-hidden /> {t.hiddenBadge}</span>}
                    <p className="text-sm text-foreground/70"><Highlight text={c.headline} terms={terms} /> · {t.yrs(c.totalYearsExperience)} · {[c.location.city, c.location.country].filter(Boolean).join(', ')}</p>
                    <p className="text-xs text-foreground/50">{c.email} · {t.joined(timeAgo(c.createdAt))}{c.lastActiveAt ? ` · ${t.active(timeAgo(c.lastActiveAt))}` : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.skills.map((s) => {
                    const hit = terms.includes(s.name.toLowerCase())
                    return <span key={s.name} className={cn('rounded-full px-2.5 py-0.5 text-xs', hit ? 'bg-amber-200 font-semibold dark:bg-amber-400/35' : 'bg-chip')}>{s.name}{s.years != null && ` · ${c_.yearsTiny(s.years)}`}</span>
                  })}
                  {c.tools.length > 0 && <span className="px-1 py-0.5 text-xs text-foreground/55"><Highlight text={t.tools_(c.tools.join(', '))} terms={terms} /></span>}
                </div>
                {c.cvSnippet && (
                  <p className="mt-3 flex gap-2 rounded-md bg-chip/70 p-3 text-sm leading-relaxed text-foreground/80">
                    <FileSearch size={15} className="mt-0.5 shrink-0 text-foreground/45" aria-label={t.cvExcerpt} />
                    <span><Highlight text={c.cvSnippet.text} terms={terms} /> <span className="text-xs text-foreground/50">{t.matches(c.cvSnippet.count)}</span></span>
                  </p>
                )}
              </li>
            ))}
          </ul>
          {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: p > 1 ? String(p) : null }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
        </>
      )}
    </>
  )
}

function KeywordField({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const t = useT(adminText).candidates
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" onSubmit={submit} className="relative">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/40" aria-hidden />
      <input aria-label={t.keywords} value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.keywordsPlaceholder} className="h-10 w-full rounded-md border border-foreground/15 bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
    </form>
  )
}
