import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BriefcaseBusiness, ExternalLink, Pencil, Plus, RotateCcw, XCircle } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMe } from '@/hooks/useAuth'
import { useJobAction, useMyJobs } from '@/hooks/useCompany'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { jobMeta, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ManagedJob } from '@/types'
import { ApprovalNotice } from './CompanyLayout'

export default function CompanyJobs() {
  useDocumentTitle('Positions')
  const { data: me } = useMe()
  const canPost = me?.company?.status === 'approved' && me.isVerified
  const { data, isPending, error } = useMyJobs()
  const action = useJobAction()
  const [closing, setClosing] = useState<ManagedJob | null>(null)

  const run = (job: ManagedJob, kind: 'close' | 'reopen') =>
    action.mutate(
      { id: job.id, action: kind },
      {
        onSuccess: () => {
          setClosing(null)
          toast.success(kind === 'close' ? 'Position closed' : 'Reopen requested. Our team will review it.')
        },
        onError: (e) => toast.error(e.message),
      },
    )

  const postButton = canPost ? (
    <Link to="/company/jobs/new" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}><Plus data-icon="inline-start" aria-hidden /> Post a position</Link>
  ) : null

  return (
    <>
      <PageHeader title="Positions" description="New and edited positions are reviewed by our team before they go live." actions={postButton} />
      <div className="mb-6"><ApprovalNotice /></div>
      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No positions yet" action={postButton}>Post a position and our team will review it, usually quickly.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.map((job) => (
            <li key={job.id} className="rounded-lg border border-foreground/12 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{job.title}{job.featured && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand-soft-foreground">Featured</span>}</p>
                  <p className="text-sm text-foreground/60">{job.location} · {jobMeta(job)}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'} · {job.publishedAt ? `published ${timeAgo(job.publishedAt)}` : `submitted ${timeAgo(job.createdAt)}`}
                  </p>
                </div>
                <StatusBadge status={job.status} label={job.status === 'pending' ? 'Awaiting review' : undefined} />
              </div>
              {job.moderationNote && (
                <Alert variant={job.status === 'closed' ? 'error' : 'info'} className="mt-4">
                  <strong>Note from our team:</strong> {job.moderationNote}
                </Alert>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
                {job.status === 'open' && (
                  <Link to={`/jobs/${job.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><ExternalLink data-icon="inline-start" aria-hidden /> View listing</Link>
                )}
                {job.status !== 'closed' && canPost && (
                  <Link to={`/company/jobs/${job.id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><Pencil data-icon="inline-start" aria-hidden /> Edit</Link>
                )}
                {job.status !== 'closed' && (
                  <Button type="button" variant="outline" className="h-9 rounded-md text-destructive" onClick={() => setClosing(job)}><XCircle data-icon="inline-start" aria-hidden /> Close</Button>
                )}
                {job.status === 'closed' && canPost && (
                  <Button type="button" variant="outline" className="h-9 rounded-md" disabled={action.isPending} onClick={() => run(job, 'reopen')}><RotateCcw data-icon="inline-start" aria-hidden /> Request reopening</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={closing !== null} onOpenChange={(o) => !o && setClosing(null)} title={`Close “${closing?.title ?? ''}”?`} description="The position disappears from the job board and stops accepting applications. You can request to reopen it later.">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setClosing(null)}>Cancel</Button>
          <Button type="button" className="h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90" disabled={action.isPending} onClick={() => closing && run(closing, 'close')}>
            {action.isPending && <Spinner />} Close position
          </Button>
        </div>
      </Modal>
    </>
  )
}
