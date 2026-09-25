import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useT } from '@/i18n'
import { talentText } from '@/i18n/talent'
import { PublicTalentHeader, TalentSearchView } from '@/pages/company/TalentSearch'

/** Public talent search: anyone can browse anonymized profiles; contacting asks them to register a company. */
export default function Talent() {
  const t = useT(talentText).search
  useDocumentTitle(t.publicEyebrow)
  const { data: me, isPending } = useMe()
  const { search } = useLocation()

  // Approved companies use the full search in their dashboard (same filters).
  if (me?.role === 'company' && me.company?.status === 'approved' && me.isVerified) return <Navigate to={`/company/search${search}`} replace />
  if (isPending) return <div className="min-h-screen" aria-busy="true" />

  return (
    <div className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <PublicTalentHeader />
        <TalentSearchView variant="public" canAct={false} />
      </div>
    </div>
  )
}
