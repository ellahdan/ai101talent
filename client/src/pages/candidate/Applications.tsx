import { Link } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge, statusLabel } from '@/components/ui/status-badge'
import { useMyApplications, useMyProfile } from '@/hooks/useCandidate'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { NoProfile } from './CandidateLayout'

export default function MyApplications() {
  useDocumentTitle('My applications')
  const profile = useMyProfile()
  const { data, isPending, error } = useMyApplications(Boolean(profile.data))

  return (
    <>
      <PageHeader title="Applications" description="Track where each application stands. We update statuses as our team reviews them." />
      {profile.isPending || (profile.data && isPending) ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : !profile.data ? (
        <NoProfile />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={ListChecks} title="No applications yet" action={<Link to="/jobs" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>Browse open positions</Link>}>
          When you apply to a position it appears here with its status.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id} className="rounded-lg border border-foreground/12 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.job.status === 'open' ? (
                    <Link to={`/jobs/${a.job.id}`} className="font-semibold hover:text-brand">{a.job.title}</Link>
                  ) : (
                    <p className="font-semibold">{a.job.title} <span className="text-xs font-normal text-foreground/50">(position closed)</span></p>
                  )}
                  <p className="text-sm text-foreground/60">{a.job.companyName} · {a.job.location}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <ol className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-xs text-foreground/55" aria-label="Status history">
                {a.statusHistory.map((h, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden>→</span>}
                    <span><span className="font-semibold text-foreground/75">{statusLabel(h.status)}</span> {new Date(h.at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
