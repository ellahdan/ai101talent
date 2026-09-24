import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MailWarning } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useMe } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/form'

/** Reminds logged-in users with an unverified email, with a resend button. */
export function VerifyBanner() {
  const { data: user } = useMe()
  const resend = useMutation({
    mutationFn: () => api('/api/auth/resend-verification', { method: 'POST' }),
    onSuccess: () => toast.success('Verification email sent. Check your inbox.'),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not send the email'),
  })

  if (!user || user.isVerified) return null
  return (
    <div className="border-b border-foreground/10 bg-brand-soft px-4 py-2.5 text-sm text-brand-soft-foreground sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <MailWarning size={16} aria-hidden />
        <span>Please confirm your email address ({user.email}) to unlock every feature.</span>
        <button type="button" onClick={() => resend.mutate()} disabled={resend.isPending} className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 disabled:opacity-60">
          {resend.isPending && <Spinner className="size-3.5" />} Resend email
        </button>
      </div>
    </div>
  )
}
