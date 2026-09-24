import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Inbox } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAdminRequests, type RequestGroup } from '@/hooks/useAdminRequests'
import { useAdminSummary } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const TABS: { value: RequestGroup | 'all'; label: string }[] = [
  { value: 'action', label: 'Needs action' },
  { value: 'active', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

/** What the admin should do next, per status. */
const nextStep: Partial<Record<string, string>> = {
  pending_admin_review: 'Review and forward, ask for info or reject',
  candidate_accepted: 'Candidate accepted: make the introduction',
  info_requested: 'Waiting for the company',
  forwarded_to_candidate: 'Waiting for the candidate',
  introduced: 'Record the interview or outcome',
  interviewing: 'Record the outcome',
}

export default function AdminRequests() {
  useDocumentTitle('Contact requests')
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.value === params.get('group')) ? params.get('group') : 'action') as RequestGroup | 'all'
  const { data, isPending, error, isPlaceholderData } = useAdminRequests(tab === 'all' ? undefined : tab)
  const summary = useAdminSummary()

  return (
    <>
      <PageHeader title="Contact requests" description="Every contact goes through you: review company requests, forward them, and introduce both sides when the candidate accepts." />
      <div role="tablist" aria-label="Filter requests" className="mb-5 inline-flex flex-wrap gap-1 rounded-lg bg-chip p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams(t.value === 'action' ? {} : { group: t.value }, { replace: true })}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', tab === t.value ? 'bg-surface font-semibold shadow-sm' : 'text-foreground/65 hover:text-foreground')}
          >
            {t.label}
            {t.value === 'action' && summary.data?.requestsNeedingAction ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">{summary.data.requestsNeedingAction}</span> : null}
          </button>
        ))}
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title={tab === 'action' ? 'Nothing needs your attention' : 'No requests here'}>{tab === 'action' ? 'New requests and accepted introductions appear here.' : undefined}</EmptyState>
      ) : (
        <ul className={cn('divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.map((r) => (
            <li key={r.id}>
              <Link to={`/admin/requests/${r.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.company.name} <span className="font-normal text-foreground/50">→</span> {r.candidate.fullName} <span className="font-mono text-xs font-normal text-foreground/55">{r.candidate.applicantNumber}</span>
                  </p>
                  <p className="text-sm text-foreground/60">{r.job?.title ?? r.roleTitle ?? 'Role not specified'} · updated {timeAgo(r.updatedAt)}</p>
                  {nextStep[r.status] && <p className="mt-1 text-xs font-semibold text-brand-soft-foreground">{nextStep[r.status]}</p>}
                </div>
                <StatusBadge status={r.status} label={r.status === 'rejected' ? 'Rejected' : undefined} />
                <ArrowRight size={16} className="text-foreground/40" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
