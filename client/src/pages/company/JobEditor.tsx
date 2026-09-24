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

export default function JobEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const existing = useMyJob(id)
  const save = useSaveJob(id)
  useDocumentTitle(id ? 'Edit position' : 'Post a position')

  const canPost = me?.company?.status === 'approved' && me.isVerified
  if (!canPost) {
    return (
      <>
        <PageHeader title={id ? 'Edit position' : 'Post a position'} />
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
      <Link to="/company/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Positions</Link>
      <PageHeader title={id ? 'Edit position' : 'Post a position'} description="Our team reviews every position before it's published, so candidates always see accurate listings." />
      {wasOpen && <Alert variant="info" className="mb-6">This position is live. Saving changes sends it back to review, and it's hidden from the job board until approved again.</Alert>}
      <JobForm
        defaultValues={existing.data ? jobToForm(existing.data) : emptyJob}
        submitting={save.isPending}
        error={save.error?.message}
        submitLabel={id ? 'Save and submit for review' : 'Submit for review'}
        onSubmit={({ companyId: _c, featured: _f, ...values }) =>
          save.mutate(values, {
            onSuccess: () => {
              toast.success('Submitted. Our team will review it and email you.')
              navigate('/company/jobs')
            },
          })
        }
      />
    </>
  )
}
