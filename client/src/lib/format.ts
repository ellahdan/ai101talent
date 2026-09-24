import type { ContractType, JobSummary, Proficiency, SalaryRange, Seniority, WorkMode } from '@/types'

export const workModeLabel: Record<WorkMode, string> = { remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid' }
export const contractTypeLabel: Record<ContractType, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
}
export const seniorityLabel: Record<Seniority, string> = { junior: 'Junior', mid: 'Mid-level', senior: 'Senior', lead: 'Lead' }

export function formatSalary(range?: SalaryRange) {
  if (!range || (range.min == null && range.max == null)) return 'Salary on request'
  const fmt = new Intl.NumberFormat('en', { style: 'currency', currency: range.currency, maximumFractionDigits: 0, notation: 'compact' })
  if (range.min != null && range.max != null) return `${fmt.format(range.min)}–${fmt.format(range.max)}`
  return range.min != null ? `From ${fmt.format(range.min)}` : `Up to ${fmt.format(range.max!)}`
}

export function jobMeta(job: Pick<JobSummary, 'workMode' | 'contractType' | 'seniority'>) {
  return `${workModeLabel[job.workMode]} · ${contractTypeLabel[job.contractType]} · ${seniorityLabel[job.seniority]}`
}

export function isRecent(date: string, days = 14) {
  return Date.now() - new Date(date).getTime() < days * 86_400_000
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "today", "3 days ago", "2 weeks ago"… */
export function timeAgo(date: string) {
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days < 1) return 'today'
  if (days < 14) return relative.format(-days, 'day')
  if (days < 60) return relative.format(-Math.round(days / 7), 'week')
  return relative.format(-Math.round(days / 30), 'month')
}

export const proficiencyLabel: Record<Proficiency, string> = { basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent', native: 'Native' }
