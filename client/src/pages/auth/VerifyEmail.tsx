import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { dashboardPath, meQueryKey, useMe } from '@/hooks/useAuth'
import { AuthCard } from './AuthCard'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const verify = useMutation({
    mutationFn: (t: string) => api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: t }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  })

  // Verify once on mount (StrictMode runs effects twice in development).
  const started = useRef(false)
  useEffect(() => {
    if (token && !started.current) {
      started.current = true
      verify.mutate(token)
    }
  }, [token, verify])

  const continueTo = me ? dashboardPath(me.role) : '/login'

  return (
    <AuthCard title="Confirm your email">
      {!token && <Alert variant="error">This link is missing its token. Open the link from your email again.</Alert>}
      {verify.isPending && <p className="flex items-center gap-2 text-sm text-foreground/60"><Spinner /> Confirming your email…</p>}
      {verify.isError && (
        <Alert variant="error">
          {verify.error.message}. {me ? 'Use the banner at the top of the page to send a new link.' : 'Log in to request a new link.'}
        </Alert>
      )}
      {verify.isSuccess && (
        <div className="space-y-6">
          <Alert variant="success">Your email is confirmed. Thank you!</Alert>
          <Link to={continueTo} className={cn(buttonVariants(), 'h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
            {me ? 'Go to your dashboard' : 'Log in'}
          </Link>
        </div>
      )}
    </AuthCard>
  )
}
