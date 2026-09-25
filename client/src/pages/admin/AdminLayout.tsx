import { Building2, BriefcaseBusiness, Inbox, KanbanSquare, LayoutDashboard, ScrollText, Settings, UsersRound } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { useAdminSummary } from '@/hooks/useAdmin'
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

export default function AdminLayout() {
  return (
    <RequireAuth roles={['admin']}>
      <AdminShell />
    </RequireAuth>
  )
}

function AdminShell() {
  const { data } = useAdminSummary()
  const t = useT(adminText)
  return (
    <AppShell
      area={t.area}
      nav={[
        { to: '/admin', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
        { to: '/admin/candidates', label: t.nav.candidates, icon: UsersRound },
        { to: '/admin/pipeline', label: t.nav.pipeline, icon: KanbanSquare },
        { to: '/admin/requests', label: t.nav.requests, icon: Inbox, badge: data?.requestsNeedingAction },
        { to: '/admin/companies', label: t.nav.companies, icon: Building2, badge: data?.pendingCompanies },
        { to: '/admin/jobs', label: t.nav.jobs, icon: BriefcaseBusiness, badge: data?.pendingJobs },
        { to: '/admin/audit', label: t.nav.audit, icon: ScrollText },
        { to: '/admin/settings', label: t.nav.settings, icon: Settings },
      ]}
    />
  )
}
