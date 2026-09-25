import { useEffect } from 'react'
import { toast } from 'sonner'
import { useMe } from '@/hooks/useAuth'
import { useCreateRequest } from '@/hooks/useTalent'
import { ApiError } from '@/lib/api'
import { clearRequestDraft, readRequestDraft } from '@/lib/requestDraft'
import { useT } from '@/i18n'
import { talentText } from '@/i18n/talent'

// One attempt per page load, even if the effect runs twice (StrictMode) or the session changes again.
let attempted = false

/** Errors that retrying cannot fix (invalid input, profile gone, request already open): drop the draft. */
const PERMANENT = new Set([400, 404, 409, 422])

/**
 * Sends a "Request to speak" written before the visitor had an account, as soon as they are signed in
 * with a company account (after registering or logging in). Renders nothing.
 */
export function DraftRequestSender() {
  const { data: me } = useMe()
  const create = useCreateRequest()
  const t = useT(talentText).request

  useEffect(() => {
    if (attempted || me?.role !== 'company' || me.company?.status === 'suspended') return
    const draft = readRequestDraft()
    if (!draft) return
    attempted = true
    create.mutate(
      { candidateId: draft.candidateId, roleTitle: draft.roleTitle || undefined, message: draft.message, proposedTimes: draft.proposedTimes },
      {
        onSuccess: (request) => {
          clearRequestDraft()
          toast.success(request.status === 'awaiting_company_approval' ? t.savedPending : t.sent, { duration: 8000 })
        },
        onError: (err) => {
          if (err instanceof ApiError && PERMANENT.has(err.status)) clearRequestDraft()
          toast.error(`${t.draftFailed(draft.applicantNumber)} ${err.message}`, { duration: 10000 })
        },
      },
    )
  }, [me, create, t])

  return null
}
