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
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

const TABS: (RequestGroup | 'all')[] = ['action', 'active', 'closed', 'all']

export default function AdminRequests() {
  const t = useT(adminText).requests
  useDocumentTitle(t.title)
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((value) => value === params.get('group')) ? params.get('group') : 'action') as RequestGroup | 'all'
  const { data, isPending, error, isPlaceholderData } = useAdminRequests(tab === 'all' ? undefined : tab)
  const summary = useAdminSummary()

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div role="tablist" aria-label={t.filter} className="mb-5 inline-flex flex-wrap gap-1 rounded-lg bg-chip p-1">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setParams(value === 'action' ? {} : { group: value }, { replace: true })}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', tab === value ? 'bg-surface font-semibold shadow-sm' : 'text-foreground/65 hover:text-foreground')}
          >
            {t.tabs[value]}
            {value === 'action' && summary.data?.requestsNeedingAction ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground">{summary.data.requestsNeedingAction}</span> : null}
          </button>
        ))}
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title={tab === 'action' ? t.nothing : t.none}>{tab === 'action' ? t.nothingText : undefined}</EmptyState>
      ) : (
        <ul className={cn('divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.map((r) => (
            <li key={r.id}>
              <Link to={`/admin/requests/${r.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.company.name} <span className="font-normal text-foreground/50">→</span> {r.candidate.fullName} <span className="font-mono text-xs font-normal text-foreground/55">{r.candidate.applicantNumber}</span>
                  </p>
                  <p className="text-sm text-foreground/60">{r.job?.title ?? r.roleTitle ?? t.noRole} · {t.updated(timeAgo(r.updatedAt))}</p>
                  {t.next[r.status] && <p className="mt-1 text-xs font-semibold text-brand-soft-foreground">{t.next[r.status]}</p>}
                </div>
                <StatusBadge status={r.status} label={r.status === 'rejected' ? t.rejected : undefined} />
                <ArrowRight size={16} className="text-foreground/40" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
