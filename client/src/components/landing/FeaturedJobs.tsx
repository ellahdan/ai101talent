import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useFeaturedJobs } from '@/hooks/usePublicData'
import { Reveal } from '@/components/Reveal'
import { JobCard, JobCardSkeleton } from '@/components/jobs/JobCard'

export function FeaturedJobs() {
  const { data, isLoading, isFallback } = useFeaturedJobs()
  const jobs = data ?? []

  return (
    <section id="jobs" aria-labelledby="jobs-heading" className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">Featured opportunities</p>
            <h2 id="jobs-heading" className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">Work your way.</h2>
          </div>
          <Link to="/jobs" className="hidden items-center gap-1 text-sm font-semibold text-brand sm:flex">Browse all <ArrowRight size={15} aria-hidden /></Link>
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
            No featured opportunities right now. <Link to="/jobs" className="font-semibold text-brand">See all open positions</Link>
          </p>
        )}
        <Link to="/jobs" className="mt-6 flex items-center gap-1 text-sm font-semibold text-brand sm:hidden">Browse all <ArrowRight size={15} aria-hidden /></Link>
      </div>
    </section>
  )
}
