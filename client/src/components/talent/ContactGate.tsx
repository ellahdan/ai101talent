import { Link } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Alert } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { dashboardPath, useMe } from '@/hooks/useAuth'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { talentText } from '@/i18n/talent'
import { cn } from '@/lib/utils'
import type { AnonymizedCandidate } from '@/types'

/**
 * Shown instead of the contact / shortlist dialogs to anyone who can browse talent but not act on it:
 * guests are asked to register a company (or log in), companies awaiting approval see why they have to wait.
 */
export function ContactGate({ candidate, reason, onClose }: { candidate: AnonymizedCandidate; reason: 'contact' | 'save'; onClose: () => void }) {
  const { data: me } = useMe()
  const c = useT(common)
  const t = useT(talentText).gate
  // After logging in, the public profile sends approved companies to the same candidate in their dashboard.
  const next = encodeURIComponent(`/talent/${candidate.id}`)

  let body
  if (!me) {
    body = (
      <>
        <p className="text-sm leading-relaxed text-foreground/70">{t.guest}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to={`/register?role=company&next=${next}`} className={cn(buttonVariants(), 'h-11 rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
            <UserPlus data-icon="inline-start" aria-hidden /> {t.register}
          </Link>
          <Link to={`/login?next=${next}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-md')}>
            <LogIn data-icon="inline-start" aria-hidden /> {t.login}
          </Link>
        </div>
      </>
    )
  } else if (me.role === 'company') {
    const status = me.company?.status
    const message = status === 'suspended' ? c.approval.suspended : !me.isVerified ? c.approval.unverified : c.approval.pending
    body = <Alert variant={status === 'suspended' ? 'error' : 'info'}>{message}</Alert>
  } else {
    body = (
      <>
        <p className="text-sm leading-relaxed text-foreground/70">{t.wrongRole}</p>
        <Link to={dashboardPath(me.role)} className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 h-11 w-full rounded-md')}>{t.dashboard}</Link>
      </>
    )
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={reason === 'contact' ? t.contactTitle : t.saveTitle}
      description={<>{t.candidateRef(candidate.applicantNumber)}{candidate.headline ? ` · ${candidate.headline}` : ''}</>}
    >
      {body}
    </Modal>
  )
}
