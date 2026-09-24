import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { emptyJob, JobForm, jobToForm } from '@/components/jobs/JobForm'
import { useAdminCompanies, useAdminJob, useSaveAdminJob } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AdminJobEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const job = useAdminJob(id)
  const companies = useAdminCompanies('approved')
  const save = useSaveAdminJob(id)
  useDocumentTitle(id ? 'Edit position' : 'New position')

  if ((id && job.isPending) || companies.isPending) return <Spinner className="size-6 text-foreground/50" />
  if (job.error || companies.error) return <Alert variant="error">{(job.error ?? companies.error)!.message}</Alert>

  // Keep the current company selectable even if it's no longer approved.
  const options = companies.data.map((c) => ({ id: c.id, name: c.name }))
  if (job.data && !options.some((o) => o.id === job.data.company.id)) options.unshift({ id: job.data.company.id, name: `${job.data.company.name} (not approved)` })

  return (
    <>
      <Link to="/admin/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Positions</Link>
      <PageHeader
        title={id ? 'Edit position' : 'New position'}
        description={id ? 'Admin edits keep the current status.' : 'Positions created by admins are published immediately.'}
        actions={job.data && <StatusBadge status={job.data.status} />}
      />
      <JobForm
        companies={options}
        defaultValues={job.data ? jobToForm(job.data) : emptyJob}
        submitting={save.isPending}
        error={save.error?.message}
        submitLabel={id ? 'Save changes' : 'Publish position'}
        onSubmit={(values) =>
          save.mutate(values, {
            onSuccess: () => {
              toast.success(id ? 'Position saved' : 'Position published')
              navigate('/admin/jobs')
            },
          })
        }
      />
    </>
  )
}
