import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BriefcaseBusiness, Check, ChevronDown, ExternalLink, Pencil, Plus, RotateCcw, Search, Star, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Field, Spinner, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAdminJobs, useAdminSummary, useSetFeatured, useSetJobStatus } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatSalary, jobMeta, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { JOB_STATUSES, type JobStatus, type ManagedJob } from '@/types'
import { StatusTabs } from './StatusTabs'

type Decision = { job: ManagedJob; status: JobStatus; title: string; description: string; confirm: string; danger?: boolean; noteRequired?: boolean }

export default function AdminJobs() {
  useDocumentTitle('Positions')
  const [params] = useSearchParams()
  const status = (JOB_STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as JobStatus) : undefined
  const [q, setQ] = useState('')
  const { data, isPending, error, isPlaceholderData } = useAdminJobs(status, q.trim() || undefined)
  const summary = useAdminSummary()
  const featured = useSetFeatured()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const approve = (job: ManagedJob) => setDecision({ job, status: 'open', title: `Publish “${job.title}”?`, description: `It becomes visible on the job board and ${job.company.name} is notified.`, confirm: 'Publish' })
  const reject = (job: ManagedJob) =>
    setDecision({ job, status: 'closed', title: `Reject “${job.title}”?`, description: `${job.company.name} is emailed your note and can edit and resubmit.`, confirm: 'Reject', danger: true, noteRequired: true })
  const close = (job: ManagedJob) => setDecision({ job, status: 'closed', title: `Close “${job.title}”?`, description: 'It disappears from the job board and stops accepting applications.', confirm: 'Close position', danger: true })
  const reopen = (job: ManagedJob) => setDecision({ job, status: 'open', title: `Reopen “${job.title}”?`, description: 'It becomes visible on the job board again.', confirm: 'Reopen' })

  return (
    <>
      <PageHeader
        title="Positions"
        description="Review new and edited postings, feature the best ones and close stale ones."
        actions={<Link to="/admin/jobs/new" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}><Plus data-icon="inline-start" aria-hidden /> New position</Link>}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs<JobStatus>
          options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Awaiting review' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
          counts={{ pending: summary.data?.pendingJobs }}
        />
        <label className="relative">
          <span className="sr-only">Search positions</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/40" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title" className="h-10 w-64 rounded-md border border-foreground/15 bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
        </label>
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No positions here">{status === 'pending' ? 'Nothing is waiting for review.' : 'Try another filter.'}</EmptyState>
      ) : (
        <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.map((job) => (
            <li key={job.id} className="rounded-lg border border-foreground/12 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-sm text-foreground/60">{job.company.name} · {job.location} · {jobMeta(job)}</p>
                  <p className="mt-1 text-xs text-foreground/50">{formatSalary(job.salaryRange)} · {job.applicationCount} applicants · updated {timeAgo(job.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.featured && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"><Star size={12} aria-hidden /> Featured</span>}
                  <StatusBadge status={job.status} label={job.status === 'pending' ? 'Awaiting review' : undefined} />
                </div>
              </div>
              {job.moderationNote && <p className="mt-2 text-xs text-foreground/60">Note: “{job.moderationNote}”</p>}

              <button type="button" onClick={() => setExpanded(expanded === job.id ? null : job.id)} aria-expanded={expanded === job.id} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                {expanded === job.id ? 'Hide details' : 'Show details'} <ChevronDown size={15} className={cn('transition', expanded === job.id && 'rotate-180')} aria-hidden />
              </button>
              {expanded === job.id && (
                <div className="mt-3 space-y-3 rounded-md bg-chip/60 p-4">
                  <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.description }} />
                  <p className="text-sm"><strong>Required:</strong> {job.requiredSkills.join(', ')}{job.niceToHaveSkills.length > 0 && <> · <strong>Nice to have:</strong> {job.niceToHaveSkills.join(', ')}</>}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
                {job.status === 'pending' && (
                  <>
                    <Button type="button" className="h-9 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover" onClick={() => approve(job)}><Check data-icon="inline-start" aria-hidden /> Approve</Button>
                    <Button type="button" variant="outline" className="h-9 rounded-md text-destructive" onClick={() => reject(job)}><X data-icon="inline-start" aria-hidden /> Reject</Button>
                  </>
                )}
                {job.status === 'open' && (
                  <>
                    <Link to={`/jobs/${job.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><ExternalLink data-icon="inline-start" aria-hidden /> View</Link>
                    <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => close(job)}>Close</Button>
                  </>
                )}
                {job.status === 'closed' && <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => reopen(job)}><RotateCcw data-icon="inline-start" aria-hidden /> Reopen</Button>}
                <Link to={`/admin/jobs/${job.id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><Pencil data-icon="inline-start" aria-hidden /> Edit</Link>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md"
                  aria-pressed={job.featured}
                  disabled={featured.isPending}
                  onClick={() => featured.mutate({ id: job.id, featured: !job.featured }, { onSuccess: (j) => toast.success(j.featured ? 'Featured on the landing page' : 'No longer featured') })}
                >
                  <Star data-icon="inline-start" aria-hidden className={job.featured ? 'fill-current text-amber-500' : ''} /> {job.featured ? 'Unfeature' : 'Feature'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decision && <DecisionDialog key={decision.job.id + decision.status} decision={decision} onClose={() => setDecision(null)} />}
    </>
  )
}

function DecisionDialog({ decision, onClose }: { decision: Decision; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string>()
  const mutation = useSetJobStatus()
  const submit = () => {
    if (decision.noteRequired && !note.trim()) return setNoteError('Tell the company what to change')
    mutation.mutate({ id: decision.job.id, status: decision.status, note: note.trim() || undefined }, { onSuccess: () => { toast.success('Done. The company has been notified.'); onClose() } })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={decision.title} description={decision.description}>
      <Field label="Note to the company" optional={!decision.noteRequired} error={noteError} hint="Included in the email and shown on their dashboard.">
        {(ids) => <Textarea {...ids} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {mutation.error && <Alert variant="error" className="mt-4">{mutation.error.message}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={submit} disabled={mutation.isPending} className={decision.danger ? 'h-10 rounded-md bg-destructive px-5 text-white hover:bg-destructive/90' : 'h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover'}>
          {mutation.isPending && <Spinner />} {decision.confirm}
        </Button>
      </div>
    </Modal>
  )
}
