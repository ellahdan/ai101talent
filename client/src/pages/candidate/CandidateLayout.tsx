import { Link } from 'react-router-dom'
import { FileUser, Inbox, LayoutDashboard, ListChecks, Settings, UserRoundPlus } from 'lucide-react'
import { AppShell, EmptyState } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { buttonVariants } from '@/components/ui/button'
import { useMe } from '@/hooks/useAuth'
import { useMyRequests } from '@/hooks/useCandidate'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { candidateText } from '@/i18n/candidate'

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
  const t = useT(candidateText)

  return (
    <AppShell
      area={t.area}
      nav={[
        { to: '/candidate', label: t.nav.dashboard, icon: LayoutDashboard, end: true },
        { to: '/candidate/profile', label: t.nav.profile, icon: FileUser },
        { to: '/candidate/applications', label: t.nav.applications, icon: ListChecks },
        { to: '/candidate/requests', label: t.nav.requests, icon: Inbox, badge: awaiting },
        { to: '/candidate/settings', label: t.nav.settings, icon: Settings },
      ]}
    />
  )
}

/** Shown on candidate pages that need a profile when the user registered but hasn't created one yet. */
export function NoProfile() {
  const t = useT(candidateText).noProfile
  return (
    <EmptyState
      icon={UserRoundPlus}
      title={t.title}
      action={<Link to="/apply" className={cn(buttonVariants({ size: 'lg' }), 'h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover')}>{t.action}</Link>}
    >
      {t.text}
    </EmptyState>
  )
}
