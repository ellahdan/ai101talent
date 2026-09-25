import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness } from 'lucide-react'
import { isRecent, jobMeta } from '@/lib/format'
import type { JobSummary } from '@/types'
import { defineText, useT } from '@/i18n'

const text = defineText({ new: 'New', featured: 'Featured', view: 'View opportunity' }, { new: 'Neu', featured: 'Empfohlen', view: 'Stelle ansehen' })

export function JobCard({ job, href = `/jobs/${job.id}` }: { job: JobSummary; href?: string }) {
  const t = useT(text)
  return (
    <article className="relative flex h-full flex-col rounded-lg border border-foreground/12 bg-surface p-5 transition hover:-translate-y-1 hover:border-brand/60 hover:shadow-lg focus-within:border-brand/60">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"><BriefcaseBusiness size={20} aria-hidden /></div>
        {(isRecent(job.createdAt) || job.featured) && (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-foreground">{isRecent(job.createdAt) ? t.new : t.featured}</span>
        )}
      </div>
      <h3 className="mt-7 text-lg font-semibold">
        {/* The stretched link makes the whole card clickable while keeping one accessible link. */}
        <Link to={href} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50">{job.title}</Link>
      </h3>
      <p className="mt-1 text-sm text-foreground/55">{job.company.name} · {job.location}</p>
      <p className="mt-5 text-sm text-foreground/65">{jobMeta(job)}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {job.requiredSkills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-chip px-2.5 py-1 text-xs">{skill}</span>)}
      </div>
      {/* Pushes the footer to the bottom so cards in a row line up. */}
      <div className="flex-1" />
      <span aria-hidden className="mt-6 flex w-full items-center justify-between border-t border-foreground/10 pt-4 text-sm font-semibold text-brand">{t.view} <ArrowRight size={16} /></span>
    </article>
  )
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-foreground/12 bg-surface p-5" aria-hidden>
      <div className="flex justify-between"><div className="size-11 animate-pulse rounded-md bg-chip" /><div className="h-6 w-12 animate-pulse rounded-full bg-chip" /></div>
      <div className="mt-7 h-5 w-3/4 animate-pulse rounded bg-chip" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-chip" />
      <div className="mt-5 h-4 w-2/3 animate-pulse rounded bg-chip" />
      <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-chip" />
      <div className="mt-5 flex gap-2">{[16, 20, 14].map((w) => <div key={w} className="h-6 animate-pulse rounded-full bg-chip" style={{ width: `${w * 4}px` }} />)}</div>
      <div className="mt-6 h-9 border-t border-foreground/10" />
    </div>
  )
}
