import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Clock, ExternalLink, FileText, Globe2, Languages, MapPin } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useJob } from '@/hooks/useJobs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { contractTypeLabel, formatSalary, proficiencyLabel, seniorityLabel, timeAgo, workModeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CoverLetterPolicy } from '@/types'
import { defineText, useT } from '@/i18n'
import { common } from '@/i18n/common'

const text = defineText(
  {
    titleAt: (title: string, company: string) => `${title} at ${company}`,
    closed: 'This position is no longer open.',
    loadFailed: 'We couldn’t load this position.',
    browse: 'Browse open positions',
    all: 'All positions',
    apply: 'Apply now',
    skills: 'Skills',
    required: 'Required',
    niceToHave: 'Nice to have',
    salary: 'Salary',
    languages: 'Languages',
    coverLetter: 'Cover letter',
    coverLetterPolicy: { required: 'Cover letter required', optional: 'Cover letter optional', none: 'No cover letter needed' } satisfies Record<CoverLetterPolicy, string>,
    privacy: 'Your contact details stay private until you accept an introduction.',
    about: (company: string) => `About ${company}`,
    industry: 'Industry: ',
    size: 'Size: ',
    website: 'Website',
    newTab: '(opens in a new tab)',
  },
  {
    titleAt: (title: string, company: string) => `${title} bei ${company}`,
    closed: 'Diese Stelle ist nicht mehr offen.',
    loadFailed: 'Wir konnten diese Stelle nicht laden.',
    browse: 'Offene Stellen durchsuchen',
    all: 'Alle Stellen',
    apply: 'Jetzt bewerben',
    skills: 'Fähigkeiten',
    required: 'Erforderlich',
    niceToHave: 'Wünschenswert',
    salary: 'Gehalt',
    languages: 'Sprachen',
    coverLetter: 'Anschreiben',
    coverLetterPolicy: { required: 'Anschreiben erforderlich', optional: 'Anschreiben optional', none: 'Kein Anschreiben nötig' },
    privacy: 'Ihre Kontaktdaten bleiben privat, bis Sie einer Vorstellung zustimmen.',
    about: (company: string) => `Über ${company}`,
    industry: 'Branche: ',
    size: 'Größe: ',
    website: 'Website',
    newTab: '(öffnet in neuem Tab)',
  },
)

export default function JobDetail() {
  const { id } = useParams()
  const { data: job, isPending, error } = useJob(id)
  const t = useT(text)
  const c = useT(common)
  useDocumentTitle(job ? t.titleAt(job.title, job.company.name) : undefined)

  if (isPending) return <DetailSkeleton />
  if (error || !job) {
    return (
      <section className="px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{(error as { status?: number })?.status === 404 ? t.closed : t.loadFailed}</h1>
          <p className="mt-4 text-foreground/60">{error?.message}</p>
          <Link to="/jobs" className={cn(buttonVariants(), 'mt-8 rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>{t.browse}</Link>
        </div>
      </section>
    )
  }

  const applyHref = `/apply?job=${job.id}`

  return (
    <article className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {t.all}</Link>

        <header className="mt-6 flex flex-col gap-6 border-b border-foreground/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-md bg-brand-soft text-brand"><BriefcaseBusiness size={22} aria-hidden /></div>
              <p className="font-semibold text-foreground/70">{job.company.name}</p>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-medium tracking-[-.05em] sm:text-5xl">{job.title}</h1>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/65">
              <li className="flex items-center gap-1.5"><MapPin size={15} aria-hidden /> {job.location}</li>
              <li className="flex items-center gap-1.5"><Globe2 size={15} aria-hidden /> {workModeLabel[job.workMode]}</li>
              <li className="flex items-center gap-1.5"><BriefcaseBusiness size={15} aria-hidden /> {contractTypeLabel[job.contractType]} · {seniorityLabel[job.seniority]}</li>
              <li className="flex items-center gap-1.5"><Clock size={15} aria-hidden /> {c.posted(timeAgo(job.createdAt))}</li>
            </ul>
          </div>
          <Link to={applyHref} className={cn(buttonVariants({ size: 'lg' }), 'h-11 shrink-0 rounded-md bg-brand px-6 text-brand-foreground hover:bg-brand-hover')}>
            {t.apply} <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {/* Description HTML is sanitized on the server before it is stored. */}
            <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.description }} />

            <section className="mt-10" aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="text-xl font-semibold tracking-[-.02em]">{t.skills}</h2>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.required}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => (
                  <Link key={s} to={`/jobs?skills=${encodeURIComponent(s)}`} className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-soft-foreground hover:border-brand">{s}</Link>
                ))}
              </div>
              {job.niceToHaveSkills.length > 0 && (
                <>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.niceToHave}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.niceToHaveSkills.map((s) => <span key={s} className="rounded-full bg-chip px-3 py-1.5 text-sm">{s}</span>)}
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-foreground/12 bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.salary}</p>
              <p className="mt-1 text-2xl font-medium tracking-[-.03em]">{formatSalary(job.salaryRange)}</p>
              <dl className="mt-5 space-y-3 border-t border-foreground/10 pt-5 text-sm">
                {job.languages.length > 0 && (
                  <div className="flex gap-2.5">
                    <dt><Languages size={16} className="mt-0.5 text-foreground/50" aria-label={t.languages} /></dt>
                    <dd>{job.languages.map((l) => `${l.name} (${proficiencyLabel[l.proficiency]})`).join(', ')}</dd>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <dt><FileText size={16} className="mt-0.5 text-foreground/50" aria-label={t.coverLetter} /></dt>
                  <dd>{t.coverLetterPolicy[job.coverLetterPolicy]}</dd>
                </div>
              </dl>
              <Link to={applyHref} className={cn(buttonVariants({ size: 'lg' }), 'mt-6 h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>{t.apply}</Link>
              <p className="mt-3 text-center text-xs text-foreground/55">{t.privacy}</p>
            </div>

            <div className="rounded-lg border border-foreground/12 p-6">
              <p className="flex items-center gap-2 font-semibold"><Building2 size={17} className="text-brand" aria-hidden /> {t.about(job.company.name)}</p>
              {job.company.description && <p className="mt-3 text-sm leading-relaxed text-foreground/65">{job.company.description}</p>}
              <dl className="mt-4 space-y-1.5 text-sm text-foreground/65">
                {job.company.industry && <div><dt className="inline">{t.industry}</dt><dd className="inline">{job.company.industry}</dd></div>}
                {job.company.size && <div><dt className="inline">{t.size}</dt><dd className="inline">{c.employees(job.company.size)}</dd></div>}
              </dl>
              {job.company.website && (
                <a href={job.company.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {t.website} <ExternalLink size={14} aria-hidden /><span className="sr-only">{t.newTab}</span>
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14" aria-busy="true">
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-28 animate-pulse rounded bg-chip" />
        <div className="mt-8 size-12 animate-pulse rounded-md bg-chip" />
        <div className="mt-5 h-12 w-2/3 animate-pulse rounded bg-chip" />
        <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-chip" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse rounded bg-chip" style={{ width: `${90 - (i % 3) * 15}%` }} />)}</div>
          <div className="h-64 animate-pulse rounded-lg bg-chip" />
        </div>
      </div>
    </div>
  )
}
