import { Link } from 'react-router-dom'
import { Building2, BriefcaseBusiness, FileStack, Handshake, Inbox, ListChecks, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Alert } from '@/components/ui/form'
import { statusLabel } from '@/components/ui/status-badge'
import { ChartCard, ColumnChart, HorizontalBars } from '@/components/admin/Charts'
import { useAdminDashboard } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { getLocale, useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

const weekLabel = (iso: string) => formatDate(`${iso}T00:00:00Z`, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export default function AdminDashboard() {
  const t = useT(adminText).dashboard
  const compact = new Intl.NumberFormat(getLocale(), { notation: 'compact' })
  useDocumentTitle(t.title)
  const { data, isPending, error } = useAdminDashboard()

  const k = data?.kpis
  const tiles = [
    { label: t.candidates, value: k?.candidates, icon: UsersRound, to: '/admin/candidates' },
    { label: t.applications, value: k?.applications, icon: FileStack, to: '/admin/pipeline' },
    { label: t.openJobs, value: k?.openJobs, icon: BriefcaseBusiness, to: '/admin/jobs?status=open' },
    { label: t.hires, value: k?.hires, icon: Handshake },
    { label: t.pendingCompanies, value: k?.pendingCompanies, icon: Building2, to: '/admin/companies?status=pending', attention: true },
    { label: t.pendingJobs, value: k?.pendingJobs, icon: ListChecks, to: '/admin/jobs?status=pending', attention: true },
    { label: t.pendingRequests, value: k?.requestsAwaitingReview, icon: Inbox, to: '/admin/requests', attention: true },
  ]

  return (
    <>
      <PageHeader title={t.heading} description={t.description} />
      {error && <Alert variant="error" className="mb-6">{error.message}</Alert>}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7" aria-busy={isPending}>
        {tiles.map(({ label, value, icon: Icon, to, attention }) => {
          const needsAction = attention && (value ?? 0) > 0
          const body = (
            <>
              <Icon size={18} className="text-brand" aria-hidden />
              <p className="mt-3 text-2xl font-semibold tabular-nums">{value == null ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-chip" /> : compact.format(value)}</p>
              <p className="mt-0.5 text-xs text-foreground/60">{label}</p>
            </>
          )
          const cls = cn('block h-full rounded-lg border p-4 transition', needsAction ? 'border-brand/50 bg-brand-soft/50' : 'border-foreground/12 bg-surface', to && 'hover:border-brand/60')
          return <li key={label}>{to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>
        })}
      </ul>

      {data && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard title={t.newProfiles} subtitle={t.perWeek} valueLabel={t.profiles} data={data.candidatesPerWeek.map((w) => ({ label: weekLabel(w.weekStart), value: w.count }))}>
            <ColumnChart valueLabel={t.profiles} data={data.candidatesPerWeek.map((w) => ({ label: weekLabel(w.weekStart), value: w.count }))} />
          </ChartCard>
          <ChartCard title={t.byStage} subtitle={t.allPositions} valueLabel={t.applications} data={data.applicationsByStatus.map((s) => ({ label: statusLabel(s.status), value: s.count }))}>
            <HorizontalBars valueLabel={t.applications} data={data.applicationsByStatus.map((s) => ({ label: statusLabel(s.status), value: s.count }))} />
          </ChartCard>
          <ChartCard title={t.requestsByStatus} subtitle={t.allTime} valueLabel={t.requests} data={data.requestsByStatus.map((s) => ({ label: s.status === 'rejected' ? t.rejected : statusLabel(s.status), value: s.count }))}>
            <HorizontalBars labelWidth={170} valueLabel={t.requests} data={data.requestsByStatus.map((s) => ({ label: s.status === 'rejected' ? t.rejected : statusLabel(s.status), value: s.count }))} />
          </ChartCard>
          <ChartCard title={t.topSkills} subtitle={t.topSkillsSub} valueLabel={t.profiles} data={data.topSkills.map((s) => ({ label: s.name, value: s.count }))}>
            <HorizontalBars valueLabel={t.profiles} data={data.topSkills.map((s) => ({ label: s.name, value: s.count }))} />
          </ChartCard>
        </div>
      )}
    </>
  )
}
