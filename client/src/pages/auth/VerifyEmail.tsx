import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { dashboardPath, meQueryKey, useMe } from '@/hooks/useAuth'
import { AuthCard } from './AuthCard'
import { useT } from '@/i18n'
import { authText } from '@/i18n/auth'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const t = useT(authText).verify
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
    <AuthCard title={t.title}>
      {!token && <Alert variant="error">{t.missing}</Alert>}
      {verify.isPending && <p className="flex items-center gap-2 text-sm text-foreground/60"><Spinner /> {t.confirming}</p>}
      {verify.isError && (
        <Alert variant="error">
          {verify.error.message}. {me ? t.useBanner : t.logInForLink}
        </Alert>
      )}
      {verify.isSuccess && (
        <div className="space-y-6">
          <Alert variant="success">{t.done}</Alert>
          <Link to={continueTo} className={cn(buttonVariants(), 'h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
            {me ? t.dashboard : t.logIn}
          </Link>
        </div>
      )}
    </AuthCard>
  )
}
