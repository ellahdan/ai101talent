import { Link, useSearchParams } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Alert, Input, Select, Spinner } from '@/components/ui/form'
import { Pagination } from '@/components/ui/filters'
import { useAuditLog, useAuditOptions } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import type { AuditEntry } from '@/types'

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
  { value: '', label: 'All actions' },
  { value: 'cv.', label: 'CV views & downloads' },
  { value: 'request.', label: 'Contact requests' },
  { value: 'application.', label: 'Applications' },
  { value: 'company.', label: 'Companies' },
  { value: 'job.', label: 'Positions' },
]

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
  useDocumentTitle('Audit log')
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
      <PageHeader title="Audit log" description="Who viewed or downloaded which CV, every contact-request status change, and other sensitive actions." />
      <div className="mb-5 grid gap-3 rounded-lg border border-foreground/12 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select aria-label="Action" className="h-10" value={get('action')} onChange={(e) => update({ action: e.target.value || null })}>
          {QUICK.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
          <optgroup label="Exact action">
            {options.data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </optgroup>
        </Select>
        <Select aria-label="Target type" className="h-10" value={get('targetType')} onChange={(e) => update({ targetType: e.target.value || null })}>
          <option value="">All targets</option>
          {options.data?.targetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select aria-label="Actor role" className="h-10" value={get('actorRole')} onChange={(e) => update({ actorRole: e.target.value || null })}>
          <option value="">Any actor</option>
          <option value="admin">Admins</option>
          <option value="company">Companies</option>
          <option value="candidate">Candidates</option>
          <option value="system">System</option>
        </Select>
        <Input type="date" aria-label="From date" className="h-10" value={get('from')} onChange={(e) => update({ from: e.target.value || null })} />
        <Input type="date" aria-label="To date" className="h-10" value={get('to')} onChange={(e) => update({ to: e.target.value ? `${e.target.value}T23:59:59` : null })} />
      </div>

      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No entries match these filters" />
      ) : (
        <>
          <p className="mb-2 text-sm text-foreground/60">{data.total.toLocaleString()} entr{data.total === 1 ? 'y' : 'ies'}</p>
          <div className={cn('overflow-x-auto rounded-lg border border-foreground/12 bg-surface transition-opacity', isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-left text-xs text-foreground/55">
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Who</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => {
                  const href = targetHref(e)
                  const label = e.targetLabel ?? e.targetType
                  return (
                    <tr key={e.id} className="border-b border-foreground/5 align-top last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-foreground/70"><time dateTime={e.at}>{new Date(e.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                      <td className="px-4 py-2.5">
                        <span className="block max-w-56 truncate">{e.actor?.email ?? (e.actor?.role === 'system' ? 'System' : 'Deleted user')}</span>
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
