import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useFeaturedJobs } from '@/hooks/usePublicData'
import { Reveal } from '@/components/Reveal'
import { JobCard, JobCardSkeleton } from '@/components/jobs/JobCard'
import { defineText, useT } from '@/i18n'

const text = defineText(
  { eyebrow: 'Featured opportunities', heading: 'Work your way.', browseAll: 'Browse all', none: 'No featured opportunities right now.', seeAll: 'See all open positions' },
  { eyebrow: 'Ausgewählte Stellen', heading: 'Arbeiten Sie auf Ihre Art.', browseAll: 'Alle ansehen', none: 'Derzeit gibt es keine ausgewählten Stellen.', seeAll: 'Alle offenen Stellen ansehen' },
)

export function FeaturedJobs() {
  const { data, isLoading, isFallback } = useFeaturedJobs()
  const jobs = data ?? []
  const t = useT(text)

  return (
    <section id="jobs" aria-labelledby="jobs-heading" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.eyebrow}</p>
            <h2 id="jobs-heading" className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.heading}</h2>
          </div>
          <Link to="/jobs" className="hidden items-center gap-1 text-sm font-semibold text-brand sm:flex">{t.browseAll} <ArrowRight size={15} aria-hidden /></Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3" aria-busy={isLoading}>
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => <JobCardSkeleton key={i} />)
            : jobs.map((job, i) => (
                <Reveal key={job.id} delay={Math.min(i, 5) * 0.06} className="h-full">
                  {/* Fallback jobs (API unavailable) have no detail page. */}
                  <JobCard job={job} href={isFallback ? '/jobs' : undefined} />
                </Reveal>
              ))}
        </div>

        {!isLoading && jobs.length === 0 && (
          <p className="mt-8 rounded-lg border border-dashed border-foreground/20 bg-surface p-8 text-center text-sm text-foreground/60">
            {t.none} <Link to="/jobs" className="font-semibold text-brand">{t.seeAll}</Link>
          </p>
        )}
        <Link to="/jobs" className="mt-6 flex items-center gap-1 text-sm font-semibold text-brand sm:hidden">{t.browseAll} <ArrowRight size={15} aria-hidden /></Link>
      </div>
    </section>
  )
}
