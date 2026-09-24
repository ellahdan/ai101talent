import { Bookmark, Building2, BriefcaseBusiness, Inbox, LayoutDashboard, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Alert } from '@/components/ui/form'
import { useMe } from '@/hooks/useAuth'
import { useCompanyRequests } from '@/hooks/useTalent'

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
  return (
    <AppShell
      area="Company"
      nav={[
        { to: '/company', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/company/search', label: 'Talent search', icon: Search },
        { to: '/company/shortlists', label: 'Shortlists', icon: Bookmark },
        { to: '/company/requests', label: 'Contact requests', icon: Inbox, badge: needsReply },
        { to: '/company/jobs', label: 'Positions', icon: BriefcaseBusiness },
        { to: '/company/profile', label: 'Company profile', icon: Building2 },
      ]}
    />
  )
}

/** Explains why an action is unavailable until the company is verified and approved. Renders nothing when approved. */
export function ApprovalNotice() {
  const { data: me } = useMe()
  const status = me?.company?.status
  if (!me || (status === 'approved' && me.isVerified)) return null
  if (status === 'suspended') return <Alert variant="error">Your company account is suspended, so posting and talent search are unavailable. Contact us for details.</Alert>
  if (!me.isVerified) return <Alert variant="info">Confirm your email address to continue. We sent you a link when you registered (use the banner above to resend it).</Alert>
  return <Alert variant="info">Our team is reviewing your company. You'll be able to post positions and search talent once it's approved. We'll email you.</Alert>
}
