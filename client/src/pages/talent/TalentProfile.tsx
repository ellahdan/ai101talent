import { Navigate, useParams } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'
import { CandidateProfile } from '@/pages/company/CandidateView'

/** Public anonymized profile. Approved companies are sent to the same profile in their dashboard. */
export default function TalentProfile() {
  const { id } = useParams()
  const { data: me, isPending } = useMe()

  if (me?.role === 'company' && me.company?.status === 'approved' && me.isVerified) return <Navigate to={`/company/candidates/${id}`} replace />
  if (isPending) return <div className="min-h-screen" aria-busy="true" />

  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <CandidateProfile id={id} canAct={false} searchHref="/talent" />
      </div>
    </div>
  )
}
