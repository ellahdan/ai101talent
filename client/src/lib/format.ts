import type { ContractType, JobSummary, Proficiency, Seniority, WorkMode } from '@/types'
import { getLocale, tx } from '@/i18n'
import { common } from '@/i18n/common'

type Common = typeof common.en

/**
 * A label map that always answers in the current language. Components that read it also call
 * `useT`, so they re-render when the language changes.
 */
function localized<K extends string>(pick: (c: Common) => Record<K, string>) {
  return new Proxy({} as Record<K, string>, {
    get: (_target, key) => pick(tx(common))[key as K],
    has: (_target, key) => key in pick(tx(common)),
    ownKeys: () => Reflect.ownKeys(pick(tx(common))),
    getOwnPropertyDescriptor: (_target, key) => ({ enumerable: true, configurable: true, value: pick(tx(common))[key as K] }),
  })
}

export const workModeLabel = localized<WorkMode>((c) => c.workMode)
export const contractTypeLabel = localized<ContractType>((c) => c.contractType)
export const seniorityLabel = localized<Seniority>((c) => c.seniority)
export const proficiencyLabel = localized<Proficiency>((c) => c.proficiency)

export function jobMeta(job: Pick<JobSummary, 'workMode' | 'contractType' | 'seniority'>) {
  return `${workModeLabel[job.workMode]} · ${contractTypeLabel[job.contractType]} · ${seniorityLabel[job.seniority]}`
}

export function isRecent(date: string, days = 14) {
  return Date.now() - new Date(date).getTime() < days * 86_400_000
}

/** "today", "3 days ago", "2 weeks ago"… in the current language. */
export function timeAgo(date: string) {
  const relative = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days < 1) return tx(common).today
  if (days < 14) return relative.format(-days, 'day')
  if (days < 60) return relative.format(-Math.round(days / 7), 'week')
  return relative.format(-Math.round(days / 30), 'month')
}

/** Date in the current language, e.g. "3 Mar 2026" / "3. März 2026". */
export function formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(date).toLocaleDateString(getLocale(), options)
}

/** Date and time in the current language. */
export function formatDateTime(date: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) {
  return new Date(date).toLocaleString(getLocale(), options)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getLocale()).format(value)
}
