import { Bookmark, Building2, BriefcaseBusiness, Inbox, LayoutDashboard, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Alert } from '@/components/ui/form'
import { useMe } from '@/hooks/useAuth'
import { useCompanyRequests } from '@/hooks/useTalent'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { companyText } from '@/i18n/company'

export default function CompanyLayout() {
  return (
    <RequireAuth roles={['company']}>
      <CompanyShell />
    </RequireAuth>
  )
}

function CompanyShell() {
  const { data: requests } = useCompanyRequests()
  // Requests where our team is waiting for the company's answer.
  const needsReply = requests?.filter((r) => r.status === 'info_requested').length ?? 0
  const t = useT(companyText)
  return (
    <AppShell
      area={t.area}
      nav={[
        { to: '/company', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
        { to: '/company/search', label: t.nav.search, icon: Search },
        { to: '/company/shortlists', label: t.nav.shortlists, icon: Bookmark },
        { to: '/company/requests', label: t.nav.requests, icon: Inbox, badge: needsReply },
        { to: '/company/jobs', label: t.nav.jobs, icon: BriefcaseBusiness },
        { to: '/company/profile', label: t.nav.profile, icon: Building2 },
      ]}
    />
  )
}

/** Explains why an action is unavailable until the company is verified and approved. Renders nothing when approved. */
export function ApprovalNotice() {
  const { data: me } = useMe()
  const t = useT(common).approval
  const status = me?.company?.status
  if (!me || (status === 'approved' && me.isVerified)) return null
  if (status === 'suspended') return <Alert variant="error">{t.suspended}</Alert>
  if (!me.isVerified) return <Alert variant="info">{t.unverified}</Alert>
  return <Alert variant="info">{t.pending}</Alert>
}
