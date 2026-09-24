import { Link } from 'react-router-dom'
import { FileUser, Inbox, LayoutDashboard, ListChecks, Settings, UserRoundPlus } from 'lucide-react'
import { AppShell, EmptyState } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { buttonVariants } from '@/components/ui/button'
import { useMe } from '@/hooks/useAuth'
import { useMyRequests } from '@/hooks/useCandidate'
import { cn } from '@/lib/utils'

export default function CandidateLayout() {
  return (
    <RequireAuth roles={['candidate']}>
      <CandidateShell />
    </RequireAuth>
  )
}

function CandidateShell() {
  const { data: me } = useMe()
  const hasProfile = Boolean(me?.candidate)
  const { data: requests } = useMyRequests(hasProfile)
  const awaiting = requests?.filter((r) => r.status === 'forwarded_to_candidate').length ?? 0

  return (
    <AppShell
      area="Candidate"
      nav={[
        { to: '/candidate', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/candidate/profile', label: 'My profile', icon: FileUser },
        { to: '/candidate/applications', label: 'Applications', icon: ListChecks },
        { to: '/candidate/requests', label: 'Contact requests', icon: Inbox, badge: awaiting },
        { to: '/candidate/settings', label: 'Settings', icon: Settings },
      ]}
    />
  )
}

/** Shown on candidate pages that need a profile when the user registered but hasn't created one yet. */
export function NoProfile() {
  return (
    <EmptyState
      icon={UserRoundPlus}
      title="Create your profile to get started"
      action={<Link to="/apply" className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover')}>Create your profile</Link>}
    >
      Your profile gives you an applicant number, lets you apply in one click and lets approved companies find you anonymously.
    </EmptyState>
  )
}
