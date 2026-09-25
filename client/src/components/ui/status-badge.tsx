import { cn } from '@/lib/utils'
import { tx, useT } from '@/i18n'
import { common } from '@/i18n/common'
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

const tonesByStatus: Record<string, Tone> = {
  // Applications
  new: 'info',
  reviewed: 'neutral',
  shortlisted: 'progress',
  interview: 'progress',
  offered: 'success',
  hired: 'success',
  rejected: 'danger',
  // Contact requests
  pending_admin_review: 'warning',
  info_requested: 'warning',
  forwarded_to_candidate: 'info',
  candidate_accepted: 'success',
  candidate_declined: 'neutral',
  introduced: 'progress',
  interviewing: 'progress',
  not_selected: 'neutral',
  closed: 'neutral',
  // Jobs & companies
  pending: 'warning',
  open: 'success',
  approved: 'success',
  suspended: 'danger',
}

type AnyStatus = ApplicationStatus | RequestStatus | JobStatus | CompanyStatus

/** Status pill. Pass `label` to override the default wording for a given audience. */
export function StatusBadge({ status, label, className }: { status: AnyStatus; label?: string; className?: string }) {
  const text = useT(common).status[status] ?? status
  const tone = tonesByStatus[status] ?? 'neutral'
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>{label ?? text}</span>
}

/** Status wording in the current language (callers also use `useT`, so they re-render on change). */
export const statusLabel = (status: AnyStatus) => tx(common).status[status] ?? status
