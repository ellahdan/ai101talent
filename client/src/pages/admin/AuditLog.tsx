import { Link, useSearchParams } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Alert, Input, Select, Spinner } from '@/components/ui/form'
import { Pagination } from '@/components/ui/filters'
import { useAuditLog, useAuditOptions } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import type { AuditEntry } from '@/types'
import { formatDateTime, formatNumber } from '@/lib/format'
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

/** Where an audit entry's target lives in the back office, if anywhere. */
function targetHref(e: AuditEntry) {
  if (!e.targetId) return undefined
  switch (e.targetType) {
    case 'Candidate':
      return `/admin/candidates/${e.targetId}`
    case 'ContactRequest':
      return `/admin/requests/${e.targetId}`
    case 'Job':
      return `/admin/jobs/${e.targetId}/edit`
    default:
      return undefined
  }
}

const QUICK = [
  { value: '', key: 'all' },
  { value: 'cv.', key: 'cv' },
  { value: 'request.', key: 'request' },
  { value: 'application.', key: 'application' },
  { value: 'company.', key: 'company' },
  { value: 'job.', key: 'job' },
] as const

/** Compact, readable summary of an entry's metadata. */
function details(e: AuditEntry) {
  const m = e.meta ?? {}
  if (typeof m.from === 'string' || typeof m.to === 'string') return `${String(m.from ?? '—').replace(/_/g, ' ')} → ${String(m.to ?? '').replace(/_/g, ' ')}${m.note ? ` · “${m.note}”` : ''}`
  const parts = Object.entries(m)
    .filter(([k, v]) => v != null && k !== 'applicantNumber' && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
  return parts.join(' · ')
}

export default function AdminAuditLog() {
  const t = useT(adminText).audit
  useDocumentTitle(t.title)
  const [params, setParams] = useSearchParams()
  const { data, isPending, error, isPlaceholderData } = useAuditLog(params)
  const options = useAuditOptions()
  const get = (k: string) => params.get(k) ?? ''
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-5 grid gap-3 rounded-lg border border-foreground/12 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select aria-label={t.action} className="h-10" value={get('action')} onChange={(e) => update({ action: e.target.value || null })}>
          {QUICK.map((q) => <option key={q.value} value={q.value}>{t.quick[q.key]}</option>)}
          <optgroup label={t.exact}>
            {options.data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </optgroup>
        </Select>
        <Select aria-label={t.targetType} className="h-10" value={get('targetType')} onChange={(e) => update({ targetType: e.target.value || null })}>
          <option value="">{t.allTargets}</option>
          {options.data?.targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
        <Select aria-label={t.actorRole} className="h-10" value={get('actorRole')} onChange={(e) => update({ actorRole: e.target.value || null })}>
          <option value="">{t.anyActor}</option>
          <option value="admin">{t.admins}</option>
          <option value="company">{t.companies}</option>
          <option value="candidate">{t.candidates}</option>
          <option value="system">{t.system}</option>
        </Select>
        <Input type="date" aria-label={t.from} className="h-10" value={get('from')} onChange={(e) => update({ from: e.target.value || null })} />
        <Input type="date" aria-label={t.to} className="h-10" value={get('to')} onChange={(e) => update({ to: e.target.value ? `${e.target.value}T23:59:59` : null })} />
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title={t.none} />
      ) : (
        <>
          <p className="mb-2 text-sm text-foreground/60">{t.entries(formatNumber(data.total), data.total)}</p>
          <div className={cn('overflow-x-auto rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-xs text-foreground/55">
                  <th scope="col" className="px-4 py-3 font-semibold">{t.when}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.who}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.action}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.target}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.details}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => {
                  const href = targetHref(e)
                  const label = e.targetLabel ?? e.targetType
                  return (
                    <tr key={e.id} className="border-b border-foreground/5 align-top last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-foreground/70"><time dateTime={e.at}>{formatDateTime(e.at, { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                      <td className="px-4 py-2.5">
                        <span className="block max-w-56 truncate">{e.actor?.email ?? (e.actor?.role === 'system' ? t.system : t.deletedUser)}</span>
                        <span className="text-xs text-foreground/50">{e.actor?.role}{e.ip ? ` · ${e.ip}` : ''}</span>
                      </td>
                      <td className="px-4 py-2.5"><code className="rounded bg-chip px-1.5 py-0.5 text-xs">{e.action}</code></td>
                      <td className="px-4 py-2.5">
                        {href ? <Link to={href} className="font-medium text-brand hover:underline">{label}</Link> : <span>{label}</span>}
                        <span className="block text-xs text-foreground/50">{e.targetType}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground/65">{details(e)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p > 1 ? String(p) : null })} />}
        </>
      )}
    </>
  )
}
