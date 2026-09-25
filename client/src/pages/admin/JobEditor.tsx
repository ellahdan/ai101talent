import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { emptyJob, JobForm, jobToForm } from '@/components/jobs/JobForm'
import { useAdminCompanies, useAdminJob, useSaveAdminJob } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

export default function AdminJobEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const job = useAdminJob(id)
  const companies = useAdminCompanies('approved')
  const save = useSaveAdminJob(id)
  const t = useT(adminText).jobEditor
  useDocumentTitle(id ? t.edit : t.new)

  if ((id && job.isPending) || companies.isPending) return <Spinner className="size-6 text-foreground/50" />
  if (job.error || companies.error) return <Alert variant="error">{(job.error ?? companies.error)!.message}</Alert>

  // Keep the current company selectable even if it's no longer approved.
  const options = companies.data.map((c) => ({ id: c.id, name: c.name }))
  if (job.data && !options.some((o) => o.id === job.data.company.id)) options.unshift({ id: job.data.company.id, name: t.notApproved(job.data.company.name) })

  return (
    <>
      <Link to="/admin/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {t.back}</Link>
      <PageHeader
        title={id ? t.edit : t.new}
        description={id ? t.editText : t.newText}
        actions={job.data && <StatusBadge status={job.data.status} />}
      />
      <JobForm
        companies={options}
        defaultValues={job.data ? jobToForm(job.data) : emptyJob}
        submitting={save.isPending}
        error={save.error?.message}
        submitLabel={id ? t.save : t.publish}
        onSubmit={(values) =>
          save.mutate(values, {
            onSuccess: () => {
              toast.success(id ? t.saved : t.published)
              navigate('/admin/jobs')
            },
          })
        }
      />
    </>
  )
}
