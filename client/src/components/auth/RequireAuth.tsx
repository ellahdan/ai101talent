import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { dashboardPath, useMe } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/form'
import type { Role } from '@/types'

/** Renders children only for a logged-in user with one of the allowed roles. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { data: user, isPending } = useMe()
  const location = useLocation()

  if (isPending) {
    return <div className="grid min-h-[60vh] place-items-center text-foreground/50" aria-busy="true"><Spinner className="size-6" /></div>
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />
  return <>{children}</>
}
