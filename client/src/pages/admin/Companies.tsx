import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Check, Globe, Mail, MailWarning, Phone, Search, UserRound } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Field, Spinner, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAdminCompanies, useAdminSummary, useSetCompanyStatus } from '@/hooks/useAdmin'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { COMPANY_STATUSES, type AdminCompany, type CompanyStatus } from '@/types'
import { StatusTabs } from './StatusTabs'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { adminText } from '@/i18n/admin'

export default function AdminCompanies() {
  const admin = useT(adminText)
  const t = admin.companies
  const labels = useT(common)
  useDocumentTitle(t.title)
  const [params] = useSearchParams()
  const status = (COMPANY_STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as CompanyStatus) : undefined
  const [q, setQ] = useState('')
  const { data, isPending, error, isPlaceholderData } = useAdminCompanies(status, q.trim() || undefined)
  const summary = useAdminSummary()
  const [action, setAction] = useState<{ company: AdminCompany; status: CompanyStatus } | null>(null)

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StatusTabs<CompanyStatus>
          options={[{ value: '', label: admin.tabs.all }, { value: 'pending', label: t.pending }, { value: 'approved', label: t.approved }, { value: 'suspended', label: t.suspended }]}
          counts={{ pending: summary.data?.pendingCompanies }}
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
        <EmptyState icon={Building2} title={t.none}>{status === 'pending' ? t.nothingPending : t.tryAnother}</EmptyState>
      ) : (
        <ul className={`space-y-3 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.map((c) => (
            <li key={c.id} className="rounded-lg border border-foreground/12 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{c.name}</p>
                  <p className="text-sm text-foreground/60">{[c.industry, c.size && labels.employees(c.size)].filter(Boolean).join(' · ') || t.noDetails} · {t.registered(timeAgo(c.createdAt))}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Info icon={UserRound} label={t.contact}>{c.contactPerson.name}{c.contactPerson.title ? `, ${c.contactPerson.title}` : ''}</Info>
                <Info icon={c.isVerified ? Mail : MailWarning} label={t.email}>{c.email} {c.isVerified ? '' : <span className="text-amber-700 dark:text-amber-300">{t.notConfirmed}</span>}</Info>
                {c.contactPerson.phone && <Info icon={Phone} label={t.phone}>{c.contactPerson.phone}</Info>}
                {c.website && <Info icon={Globe} label={t.website}><a href={c.website} target="_blank" rel="noopener noreferrer" className="text-brand underline-offset-4 hover:underline">{c.website.replace(/^https?:\/\//, '')}</a></Info>}
              </dl>
              {c.description && <p className="mt-3 text-sm leading-relaxed text-foreground/70">{c.description}</p>}
              <p className="mt-3 text-xs text-foreground/50">{t.counts(c.openJobCount, c.jobCount, c.requestCount)}</p>
              {c.statusNote && <p className="mt-2 text-xs text-foreground/60">{t.lastNote} “{c.statusNote}”</p>}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
                {c.status !== 'approved' && (
                  <Button type="button" className="h-9 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover" onClick={() => setAction({ company: c, status: 'approved' })}>
                    <Check data-icon="inline-start" aria-hidden /> {c.status === 'suspended' ? t.reinstate : t.approve}
                  </Button>
                )}
                {c.status !== 'suspended' && (
                  <Button type="button" variant="outline" className="h-9 rounded-md text-destructive" onClick={() => setAction({ company: c, status: 'suspended' })}>
                    {c.status === 'pending' ? t.reject : t.suspend}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {action && <StatusDialog key={`${action.company.id}-${action.status}`} company={action.company} status={action.status} onClose={() => setAction(null)} />}
    </>
  )
}

function Info({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt><Icon size={15} className="mt-0.5 text-foreground/45" aria-label={label} /></dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function StatusDialog({ company, status, onClose }: { company: AdminCompany; status: CompanyStatus; onClose: () => void }) {
  const [note, setNote] = useState('')
  const mutation = useSetCompanyStatus()
  const approving = status === 'approved'
  const t = useT(adminText).companies
  const c = useT(common)
  const submit = () =>
    mutation.mutate(
      { id: company.id, status, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(approving ? t.approvedToast(company.name) : company.status === 'pending' ? t.rejectedToast(company.name) : t.suspendedToast(company.name))
          onClose()
        },
      },
    )
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={approving ? t.approveTitle(company.name) : company.status === 'pending' ? t.rejectTitle(company.name) : t.suspendTitle(company.name)}
      description={approving ? t.approveText : t.suspendText}
    >
      {!company.isVerified && approving && <Alert variant="info" className="mb-4">{t.unverified}</Alert>}
      <Field label={t.note} optional hint={t.noteHint}>
        {(ids) => <Textarea {...ids} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {mutation.error && <Alert variant="error" className="mt-4">{mutation.error.message}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{c.actions.cancel}</Button>
        <Button type="button" onClick={submit} disabled={mutation.isPending} className={approving ? 'h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover' : 'h-10 rounded-md bg-destructive px-5 text-white hover:bg-destructive/90'}>
          {mutation.isPending && <Spinner />} {approving ? t.approve : t.confirm}
        </Button>
      </div>
    </Modal>
  )
}
