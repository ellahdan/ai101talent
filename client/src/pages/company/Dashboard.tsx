import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BriefcaseBusiness, Check, Clock, MailCheck, Plus, Search, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { meQueryKey, useMe } from '@/hooks/useAuth'
import { useMyCompany, useMyJobs } from '@/hooks/useCompany'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function CompanyDashboard() {
  useDocumentTitle('Company dashboard')
  const { data: me } = useMe()
  const company = useMyCompany()
  const jobs = useMyJobs()
  const queryClient = useQueryClient()

  // The session caches the company status; refresh it if an admin has changed it since.
  useEffect(() => {
    if (company.data && me?.company && company.data.status !== me.company.status) queryClient.invalidateQueries({ queryKey: meQueryKey })
  }, [company.data, me?.company, queryClient])

  if (company.isPending) return <Spinner className="size-6 text-foreground/50" />
  if (company.error) return <Alert variant="error">{company.error.message}</Alert>
  const c = company.data

  if (c.status !== 'approved') {
    const verified = Boolean(me?.isVerified)
    return (
      <>
        <PageHeader title={c.name} description="Thanks for registering. Here's what happens next." />
        {c.status === 'suspended' ? (
          <Alert variant="error">
            Your company account is suspended{c.statusNote ? `: ${c.statusNote}` : '.'} Posting positions and searching talent are unavailable. Contact us if you have questions.
          </Alert>
        ) : (
          <ol className="grid gap-4 md:grid-cols-3">
            <Step done={verified} icon={MailCheck} title="Confirm your email">
              {verified ? 'Done, thank you.' : 'Use the link we emailed you, or resend it from the banner above.'}
            </Step>
            <Step done={false} current={verified} icon={ShieldCheck} title="Our team reviews your company">
              We check every company before it can contact candidates. We'll email you as soon as you're approved.
            </Step>
            <Step done={false} icon={Search} title="Post positions and search talent">
              Publish open positions and browse anonymized candidate profiles.
            </Step>
          </ol>
        )}
        <p className="mt-6 text-sm text-foreground/60">
          Meanwhile, you can <Link to="/company/profile" className="font-semibold text-brand">complete your company profile</Link>. It helps our review.
        </p>
      </>
    )
  }

  const list = jobs.data ?? []
  const open = list.filter((j) => j.status === 'open').length
  const pending = list.filter((j) => j.status === 'pending').length
  const applicants = list.reduce((n, j) => n + j.applicationCount, 0)

  return (
    <>
      <PageHeader
        title={c.name}
        description="Your positions and activity at a glance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/company/search" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-md px-4')}><Search data-icon="inline-start" aria-hidden /> Search talent</Link>
            <Link to="/company/jobs/new" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}><Plus data-icon="inline-start" aria-hidden /> Post a position</Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={BriefcaseBusiness} label="Open positions" value={jobs.isPending ? '…' : open} />
        <Stat icon={Clock} label="Awaiting review" value={jobs.isPending ? '…' : pending} />
        <Stat icon={Users} label="Applicants" value={jobs.isPending ? '…' : applicants} />
      </div>

      <section className="mt-8" aria-labelledby="recent-jobs">
        <div className="flex items-center justify-between">
          <h2 id="recent-jobs" className="text-lg font-semibold tracking-[-.02em]">Recent positions</h2>
          <Link to="/company/jobs" className="text-sm font-semibold text-brand">Manage all</Link>
        </div>
        {jobs.isPending ? (
          <Spinner className="mt-4 size-5 text-foreground/50" />
        ) : list.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-foreground/20 p-6 text-center text-sm text-foreground/60">
            You haven't posted a position yet. <Link to="/company/jobs/new" className="font-semibold text-brand">Post your first position</Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface">
            {list.slice(0, 5).map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{j.title}</p>
                  <p className="text-sm text-foreground/60">{j.location} · {j.applicationCount} applicant{j.applicationCount === 1 ? '' : 's'} · updated {timeAgo(j.updatedAt)}</p>
                </div>
                <StatusBadge status={j.status} label={j.status === 'pending' ? 'Awaiting review' : undefined} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-foreground/12 bg-surface p-6">
      <Icon size={20} className="text-brand" aria-hidden />
      <p className="mt-4 text-3xl font-medium">{value}</p>
      <p className="mt-1 text-sm text-foreground/60">{label}</p>
    </div>
  )
}

function Step({ done, current, icon: Icon, title, children }: { done: boolean; current?: boolean; icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <li className={cn('rounded-lg border p-6', current ? 'border-brand/50 bg-brand-soft/50' : 'border-foreground/12 bg-surface')}>
      <div className={cn('grid size-10 place-items-center rounded-md', done ? 'bg-brand text-brand-foreground' : 'bg-brand-soft text-brand')}>
        {done ? <Check size={20} aria-hidden /> : <Icon size={20} aria-hidden />}
      </div>
      <p className="mt-5 font-semibold">{title}{done && <span className="sr-only"> (completed)</span>}{current && <span className="sr-only"> (in progress)</span>}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">{children}</p>
    </li>
  )
}
