import { cn } from '@/lib/utils'
import type { ApplicationStatus, CompanyStatus, JobStatus, RequestStatus } from '@/types'

type Tone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-chip text-foreground/70',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
  progress: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200',
  success: 'bg-brand-soft text-brand-soft-foreground',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-200',
}

const statuses: Record<string, [string, Tone]> = {
  // Applications
  new: ['New', 'info'],
  reviewed: ['Reviewed', 'neutral'],
  shortlisted: ['Shortlisted', 'progress'],
  interview: ['Interview', 'progress'],
  offered: ['Offered', 'success'],
  hired: ['Hired', 'success'],
  rejected: ['Not selected', 'danger'],
  // Contact requests
  pending_admin_review: ['Awaiting review', 'warning'],
  info_requested: ['Info requested', 'warning'],
  forwarded_to_candidate: ['Forwarded to candidate', 'info'],
  candidate_accepted: ['Candidate accepted', 'success'],
  candidate_declined: ['Candidate declined', 'neutral'],
  introduced: ['Introduced', 'progress'],
  interviewing: ['Interviewing', 'progress'],
  not_selected: ['Not selected', 'neutral'],
  closed: ['Closed', 'neutral'],
  // Jobs & companies
  pending: ['Pending approval', 'warning'],
  open: ['Open', 'success'],
  approved: ['Approved', 'success'],
  suspended: ['Suspended', 'danger'],
}

type AnyStatus = ApplicationStatus | RequestStatus | JobStatus | CompanyStatus

/** Status pill. Pass `label` to override the default wording for a given audience. */
export function StatusBadge({ status, label, className }: { status: AnyStatus; label?: string; className?: string }) {
  const [text, tone] = statuses[status] ?? [status, 'neutral']
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>{label ?? text}</span>
}

export const statusLabel = (status: AnyStatus) => statuses[status]?.[0] ?? status
