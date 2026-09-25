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
import { jobMeta, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { JOB_STATUSES, type JobStatus, type ManagedJob } from '@/types'
import { StatusTabs } from './StatusTabs'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { adminText } from '@/i18n/admin'

type Decision = { job: ManagedJob; status: JobStatus; title: string; description: string; confirm: string; danger?: boolean; noteRequired?: boolean }

export default function AdminJobs() {
  const admin = useT(adminText)
  const t = admin.jobs
  useDocumentTitle(t.title)
  const [params] = useSearchParams()
  const status = (JOB_STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as JobStatus) : undefined
  const [q, setQ] = useState('')
  const { data, isPending, error, isPlaceholderData } = useAdminJobs(status, q.trim() || undefined)
  const summary = useAdminSummary()
  const featured = useSetFeatured()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const approve = (job: ManagedJob) => setDecision({ job, status: 'open', title: t.publishTitle(job.title), description: t.publishText(job.company.name), confirm: t.publish })
  const reject = (job: ManagedJob) =>
    setDecision({ job, status: 'closed', title: t.rejectTitle(job.title), description: t.rejectText(job.company.name), confirm: t.reject, danger: true, noteRequired: true })
  const close = (job: ManagedJob) => setDecision({ job, status: 'closed', title: t.closeTitle(job.title), description: t.closeText, confirm: t.closePosition, danger: true })
  const reopen = (job: ManagedJob) => setDecision({ job, status: 'open', title: t.reopenTitle(job.title), description: t.reopenText, confirm: t.reopen })

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<Link to="/admin/jobs/new" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}><Plus data-icon="inline-start" aria-hidden /> {t.new}</Link>}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs<JobStatus>
          options={[{ value: '', label: admin.tabs.all }, { value: 'pending', label: t.awaiting }, { value: 'open', label: t.open }, { value: 'closed', label: t.closed }]}
          counts={{ pending: summary.data?.pendingJobs }}
        />
        <label className="relative">
          <span className="sr-only">{t.search}</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/40" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} className="h-10 w-64 rounded-md border border-foreground/15 bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
        </label>
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title={t.none}>{status === 'pending' ? t.nothingPending : t.tryAnother}</EmptyState>
      ) : (
        <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')}>
          {data.map((job) => (
            <li key={job.id} className="rounded-lg border border-foreground/12 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-sm text-foreground/60">{job.company.name} · {job.location} · {jobMeta(job)}</p>
                  <p className="mt-1 text-xs text-foreground/50">{t.meta(job.applicationCount, timeAgo(job.updatedAt))}</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.featured && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"><Star size={12} aria-hidden /> {t.featured}</span>}
                  <StatusBadge status={job.status} label={job.status === 'pending' ? t.awaiting : undefined} />
                </div>
              </div>
              {job.moderationNote && <p className="mt-2 text-xs text-foreground/60">{t.note} “{job.moderationNote}”</p>}

              <button type="button" onClick={() => setExpanded(expanded === job.id ? null : job.id)} aria-expanded={expanded === job.id} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                {expanded === job.id ? t.hideDetails : t.showDetails} <ChevronDown size={15} className={cn('transition', expanded === job.id && 'rotate-180')} aria-hidden />
              </button>
              {expanded === job.id && (
                <div className="mt-3 space-y-3 rounded-md bg-chip/60 p-4">
                  <div className="prose-job" dangerouslySetInnerHTML={{ __html: job.description }} />
                  <p className="text-sm"><strong>{t.required}</strong> {job.requiredSkills.join(', ')}{job.niceToHaveSkills.length > 0 && <> · <strong>{t.niceToHave}</strong> {job.niceToHaveSkills.join(', ')}</>}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
                {job.status === 'pending' && (
                  <>
                    <Button type="button" className="h-9 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover" onClick={() => approve(job)}><Check data-icon="inline-start" aria-hidden /> {t.approve}</Button>
                    <Button type="button" variant="outline" className="h-9 rounded-md text-destructive" onClick={() => reject(job)}><X data-icon="inline-start" aria-hidden /> {t.reject}</Button>
                  </>
                )}
                {job.status === 'open' && (
                  <>
                    <Link to={`/jobs/${job.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><ExternalLink data-icon="inline-start" aria-hidden /> {t.view}</Link>
                    <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => close(job)}>{t.close}</Button>
                  </>
                )}
                {job.status === 'closed' && <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => reopen(job)}><RotateCcw data-icon="inline-start" aria-hidden /> {t.reopen}</Button>}
                <Link to={`/admin/jobs/${job.id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9 rounded-md')}><Pencil data-icon="inline-start" aria-hidden /> {t.edit}</Link>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md"
                  aria-pressed={job.featured}
                  disabled={featured.isPending}
                  onClick={() => featured.mutate({ id: job.id, featured: !job.featured }, { onSuccess: (j) => toast.success(j.featured ? t.featuredOn : t.featuredOff) })}
                >
                  <Star data-icon="inline-start" aria-hidden className={job.featured ? 'fill-current text-amber-500' : ''} /> {job.featured ? t.unfeature : t.feature}
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
  const t = useT(adminText).jobs
  const c = useT(common)
  const submit = () => {
    if (decision.noteRequired && !note.trim()) return setNoteError(t.noteRequired)
    mutation.mutate({ id: decision.job.id, status: decision.status, note: note.trim() || undefined }, { onSuccess: () => { toast.success(t.done); onClose() } })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={decision.title} description={decision.description}>
      <Field label={t.noteLabel} optional={!decision.noteRequired} error={noteError} hint={t.noteHint}>
        {(ids) => <Textarea {...ids} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {mutation.error && <Alert variant="error" className="mt-4">{mutation.error.message}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{c.actions.cancel}</Button>
        <Button type="button" onClick={submit} disabled={mutation.isPending} className={decision.danger ? 'h-10 rounded-md bg-destructive px-5 text-white hover:bg-destructive/90' : 'h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover'}>
          {mutation.isPending && <Spinner />} {decision.confirm}
        </Button>
      </div>
    </Modal>
  )
}
