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

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export default function AdminCandidates() {
  useDocumentTitle('Candidates')
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
    ...list('skills').map((s) => ({ label: `Skill: ${s}`, clear: () => removeFrom('skills', s) })),
    ...list('tools').map((s) => ({ label: `Tool: ${s}`, clear: () => removeFrom('tools', s) })),
    ...list('languages').map((l) => {
      const [name, min] = l.split(':')
      return { label: `${name}${min ? ` (${proficiencyLabel[min as Proficiency]}+)` : ''}`, clear: () => removeFrom('languages', l) }
    }),
    ...(get('minYears') || get('maxYears') ? [{ label: `${get('minYears') || 0}–${get('maxYears') || '∞'} years`, clear: () => update({ minYears: null, maxYears: null }) }] : []),
    ...(get('country') ? [{ label: `Country: ${get('country')}`, clear: () => update({ country: null }) }] : []),
    ...(get('jobId') ? [{ label: `Applied to: ${jobTitle ?? 'position'}`, clear: () => update({ jobId: null }) }] : []),
    ...(get('applicantNumber') ? [{ label: `No. ${get('applicantNumber')}`, clear: () => update({ applicantNumber: null }) }] : []),
  ]

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Search every profile, including hidden ones, and the full text of their CVs."
        actions={
          <a href={exportHref} download className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-md px-4')}>
            <Download data-icon="inline-start" aria-hidden /> Export CSV{data ? ` (${Math.min(data.total, 5000)})` : ''}
          </a>
        }
      />

      <div className="rounded-lg border border-foreground/12 bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_200px_auto]">
          <KeywordField initial={get('q')} onSearch={(q) => update({ q: q || null, sort: null })} />
          <Input aria-label="Applicant number" placeholder="Applicant no., e.g. 000014" className="h-10" defaultValue={get('applicantNumber')} key={get('applicantNumber')} onBlur={(e) => update({ applicantNumber: e.target.value.trim() || null })} onKeyDown={(e) => e.key === 'Enter' && update({ applicantNumber: e.currentTarget.value.trim() || null })} />
          <Select aria-label="Applied to" className="h-10" value={get('jobId')} onChange={(e) => update({ jobId: e.target.value || null })}>
            <option value="">Any or no application</option>
            {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company.name}</option>)}
          </Select>
          <Button type="button" variant="outline" className="h-10 rounded-md" aria-expanded={moreOpen} aria-controls="more-filters" onClick={() => setMoreOpen((o) => !o)}>
            <SlidersHorizontal data-icon="inline-start" aria-hidden /> More filters
          </Button>
        </div>
        {moreOpen && (
          <div id="more-filters" className="mt-4 grid gap-4 border-t border-foreground/10 pt-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Skills</p>
              <TagInput type="skills" value={list('skills')} onChange={(v) => update({ skills: v.join(',') || null })} placeholder="e.g. Python" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Tools</p>
              <TagInput type="tools" value={list('tools')} onChange={(v) => update({ tools: v.join(',') || null })} placeholder="e.g. Figma" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Languages</p>
              <LanguageAdder options={['English', 'French', 'German', 'Spanish', 'Portuguese', 'Italian', 'Dutch', 'Arabic', 'Swahili', 'Hindi']} onAdd={(v) => !list('languages').includes(v) && update({ languages: [...list('languages'), v].join(',') })} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Years of experience</p>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={60} aria-label="Minimum years" placeholder="Min" className="h-10" value={get('minYears')} onChange={(e) => update({ minYears: e.target.value || null })} />
                <span className="text-foreground/40">–</span>
                <Input type="number" min={0} max={60} aria-label="Maximum years" placeholder="Max" className="h-10" value={get('maxYears')} onChange={(e) => update({ maxYears: e.target.value || null })} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Country</p>
              <Input aria-label="Country" className="h-10" placeholder="e.g. France" defaultValue={get('country')} key={get('country')} onBlur={(e) => update({ country: e.target.value.trim() || null })} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Visibility</p>
              <Select aria-label="Visibility" className="h-10" value={get('visibility') || 'all'} onChange={(e) => update({ visibility: e.target.value === 'all' ? null : e.target.value })}>
                <option value="all">All profiles</option>
                <option value="visible">Visible in company search</option>
                <option value="hidden">Hidden from company search</option>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/65" aria-live="polite">{data ? <><strong className="text-foreground">{data.total}</strong> candidate{data.total === 1 ? '' : 's'}</> : 'Searching…'}</p>
        <Select aria-label="Sort by" className="h-10 w-auto" value={get('sort') || (get('q') ? 'relevance' : 'newest')} onChange={(e) => update({ sort: e.target.value })}>
          {get('q') && <option value="relevance">Most relevant</option>}
          <option value="newest">Newest</option>
          <option value="experience">Most experienced</option>
        </Select>
      </div>
      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((c) => <FilterChip key={c.label} label={c.label} onRemove={c.clear} />)}
          <li><button type="button" onClick={() => setParams(get('q') ? { q: get('q') } : {})} className="px-2 py-1.5 text-xs font-semibold text-brand">Clear all</button></li>
        </ul>
      )}

      {isError ? (
        <div className="mt-6 space-y-3">
          <Alert variant="error">{error.message}</Alert>
          <Button type="button" variant="outline" className="rounded-md" onClick={() => refetch()}><RotateCcw data-icon="inline-start" aria-hidden /> Try again</Button>
        </div>
      ) : isPending ? (
        <Spinner className="mt-6 size-6 text-foreground/50" />
      ) : data.items.length === 0 ? (
        <div className="mt-6"><EmptyState icon={UsersRound} title="No candidates match">Try fewer filters or other keywords.</EmptyState></div>
      ) : (
        <>
          <ul className={cn('mt-4 divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
            {data.items.map((c) => (
              <li key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/candidates/${c.id}${terms.length ? `?terms=${encodeURIComponent(terms.join(','))}` : ''}`} className="font-semibold hover:text-brand">{c.fullName}</Link>
                    <span className="ml-2 font-mono text-xs text-foreground/55">{c.applicantNumber}</span>
                    {!c.visible && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5 text-xs"><EyeOff size={11} aria-hidden /> Hidden</span>}
                    <p className="text-sm text-foreground/70"><Highlight text={c.headline} terms={terms} /> · {c.totalYearsExperience} yrs · {[c.location.city, c.location.country].filter(Boolean).join(', ')}</p>
                    <p className="text-xs text-foreground/50">{c.email} · joined {timeAgo(c.createdAt)}{c.lastActiveAt ? ` · active ${timeAgo(c.lastActiveAt)}` : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.skills.map((s) => {
                    const hit = terms.includes(s.name.toLowerCase())
                    return <span key={s.name} className={cn('rounded-full px-2.5 py-0.5 text-xs', hit ? 'bg-amber-200 font-semibold dark:bg-amber-400/35' : 'bg-chip')}>{s.name}{s.years != null && ` · ${s.years}y`}</span>
                  })}
                  {c.tools.length > 0 && <span className="px-1 py-0.5 text-xs text-foreground/55"><Highlight text={`Tools: ${c.tools.join(', ')}`} terms={terms} /></span>}
                </div>
                {c.cvSnippet && (
                  <p className="mt-3 flex gap-2 rounded-md bg-chip/70 p-3 text-sm leading-relaxed text-foreground/80">
                    <FileSearch size={15} className="mt-0.5 shrink-0 text-foreground/45" aria-label="CV excerpt" />
                    <span><Highlight text={c.cvSnippet.text} terms={terms} /> <span className="text-xs text-foreground/50">({c.cvSnippet.count} match{c.cvSnippet.count === 1 ? '' : 'es'} in CV)</span></span>
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
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value.trim())
  }
  return (
    <form role="search" onSubmit={submit} className="relative">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/40" aria-hidden />
      <input aria-label="Keywords (profile and CV text)" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Keywords in profiles and CVs — press Enter" className="h-10 w-full rounded-md border border-foreground/15 bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
    </form>
  )
}
