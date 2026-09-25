import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Alert, Spinner } from '@/components/ui/form'
import { emptyJob, JobForm, jobToForm } from '@/components/jobs/JobForm'
import { useMe } from '@/hooks/useAuth'
import { useMyJob, useSaveJob } from '@/hooks/useCompany'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApprovalNotice } from './CompanyLayout'
import { useT } from '@/i18n'
import { companyText } from '@/i18n/company'

export default function JobEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const existing = useMyJob(id)
  const save = useSaveJob(id)
  const t = useT(companyText).editor
  useDocumentTitle(id ? t.edit : t.post)

  const canPost = me?.company?.status === 'approved' && me.isVerified
  if (!canPost) {
    return (
      <>
        <PageHeader title={id ? t.edit : t.post} />
        <ApprovalNotice />
      </>
    )
  }
  if (id && existing.isPending) return <Spinner className="size-6 text-foreground/50" />
  if (id && existing.error) return <Alert variant="error">{existing.error.message}</Alert>
  if (existing.data?.status === 'closed') return <Navigate to="/company/jobs" replace />

  const wasOpen = existing.data?.status === 'open'

  return (
    <>
      <Link to="/company/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {t.back}</Link>
      <PageHeader title={id ? t.edit : t.post} description={t.description} />
      {wasOpen && <Alert variant="info" className="mb-6">{t.live}</Alert>}
      <JobForm
        defaultValues={existing.data ? jobToForm(existing.data) : emptyJob}
        submitting={save.isPending}
        error={save.error?.message}
        submitLabel={id ? t.saveSubmit : t.submit}
        onSubmit={({ companyId: _c, featured: _f, ...values }) =>
          save.mutate(values, {
            onSuccess: () => {
              toast.success(t.submitted)
              navigate('/company/jobs')
            },
          })
        }
      />
    </>
  )
}
