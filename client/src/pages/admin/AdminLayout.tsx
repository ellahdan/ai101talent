import { Building2, BriefcaseBusiness, Inbox, KanbanSquare, LayoutDashboard, ScrollText, Settings, UsersRound } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { useAdminSummary } from '@/hooks/useAdmin'

export default function AdminLayout() {
  return (
    <RequireAuth roles={['admin']}>
      <AdminShell />
    </RequireAuth>
  )
}

function AdminShell() {
  const { data } = useAdminSummary()
  return (
    <AppShell
      area="Admin"
      nav={[
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/admin/candidates', label: 'Candidates', icon: UsersRound },
        { to: '/admin/pipeline', label: 'Pipeline', icon: KanbanSquare },
        { to: '/admin/requests', label: 'Contact requests', icon: Inbox, badge: data?.requestsNeedingAction },
        { to: '/admin/companies', label: 'Companies', icon: Building2, badge: data?.pendingCompanies },
        { to: '/admin/jobs', label: 'Positions', icon: BriefcaseBusiness, badge: data?.pendingJobs },
        { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
      ]}
    />
  )
}
