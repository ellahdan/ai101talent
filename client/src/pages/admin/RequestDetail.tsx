import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, CalendarClock, Check, Download, EyeOff, Forward, HelpCircle, Mail, Phone, Send, UserRound, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Spinner, Textarea } from '@/components/ui/form'
import { StatusBadge, statusLabel } from '@/components/ui/status-badge'
import { openRequestCv, useAdminRequest, useRequestAction, type RequestAction } from '@/hooks/useAdminRequests'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime, formatSalary } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminRequest, RequestMessage } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { adminText } from '@/i18n/admin'

const dateTime = (iso: string) => formatDateTime(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

export default function AdminRequestDetail() {
  const { id } = useParams()
  const { data: r, isPending, error } = useAdminRequest(id)
  const t = useT(adminText).request
  const labels = useT(common)
  useDocumentTitle(r ? t.titleFor(r.company.name, r.candidate.applicantNumber) : t.fallbackTitle)

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error || !r) return <Alert variant="error">{error?.message ?? t.notFound}</Alert>

  return (
    <>
      <Link to="/admin/requests" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {t.back}</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-[-.04em] sm:text-3xl">{r.company.name} <span className="text-foreground/40">→</span> {r.candidate.applicantNumber}</h1>
        <StatusBadge status={r.status} label={r.status === 'rejected' ? t.rejected : undefined} className="text-sm" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title={t.actions}><ActionPanel request={r} /></Card>
          <Card title={t.theRequest}>
            <p className="text-sm text-foreground/60">{r.job ? <>{t.position} <Link to={`/jobs/${r.job.id}`} className="font-semibold text-brand">{r.job.title}</Link> ({labels.status[r.job.status]})</> : <>{t.role} <strong className="text-foreground">{r.roleTitle}</strong> {t.notPosted}</>}</p>
            <blockquote className="mt-3 rounded-md bg-chip p-4 text-sm leading-relaxed whitespace-pre-line">{r.message}</blockquote>
            {r.forwardedMessage && r.forwardedMessage !== r.message && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.forwardedAs}</p>
                <blockquote className="mt-2 rounded-md border border-brand/30 bg-brand-soft/40 p-4 text-sm whitespace-pre-line">{r.forwardedMessage}</blockquote>
              </>
            )}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2"><dt><CalendarClock size={15} className="mt-0.5 text-foreground/50" aria-label={t.proposedTimes} /></dt><dd>{r.proposedTimes.map(dateTime).join(' · ')}</dd></div>
              {r.salaryRange && <div className="flex gap-2"><dt><Wallet size={15} className="mt-0.5 text-foreground/50" aria-label={t.salary} /></dt><dd>{formatSalary(r.salaryRange)}</dd></div>}
              {r.interviewDate && <div className="flex gap-2"><dt><CalendarClock size={15} className="mt-0.5 text-brand" aria-label={t.interview} /></dt><dd>{t.interviewAt} <strong>{dateTime(r.interviewDate)}</strong></dd></div>}
            </dl>
            {r.candidateNote && <p className="mt-4 text-sm">{t.candidateNote} “{r.candidateNote}”</p>}
            {r.rejectionReason && <Alert variant="error" className="mt-4">{t.rejectedReason} {r.rejectionReason}</Alert>}
          </Card>
          <Threads request={r} />
        </div>

        <aside className="space-y-6">
          <Card title={t.candidate}>
            <p className="flex items-center gap-2 font-semibold"><UserRound size={16} className="text-brand" aria-hidden /> {r.candidate.fullName}</p>
            <p className="font-mono text-xs text-foreground/55">{r.candidate.applicantNumber}</p>
            <p className="mt-1 text-sm text-foreground/65">{r.candidate.headline}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex gap-2"><dt><Mail size={14} className="mt-0.5 text-foreground/45" aria-label={t.email} /></dt><dd className="break-all">{r.candidate.email}</dd></div>
              {r.candidate.phone && <div className="flex gap-2"><dt><Phone size={14} className="mt-0.5 text-foreground/45" aria-label={t.phone} /></dt><dd>{r.candidate.phone}</dd></div>}
              {r.candidate.linkedin && <div className="flex gap-2"><dt className="text-xs font-bold text-foreground/45">in</dt><dd><a href={r.candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-brand">LinkedIn</a></dd></div>}
            </dl>
            {!r.candidate.visible && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><EyeOff size={13} aria-hidden /> {t.hiddenProfile}</p>}
            {r.candidate.hasCv && (
              <Button type="button" variant="outline" className="mt-4 h-9 w-full rounded-md" onClick={() => openRequestCv(r.id).catch((e) => toast.error(e.message))}>
                <Download data-icon="inline-start" aria-hidden /> {t.openCv}
              </Button>
            )}
          </Card>
          <Card title={t.company}>
            <p className="flex items-center gap-2 font-semibold"><Building2 size={16} className="text-brand" aria-hidden /> {r.company.name}</p>
            <p className="mt-1 text-sm text-foreground/65">{[r.company.industry, r.company.contactName].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-sm break-all">{r.company.email}</p>
            {r.company.status !== 'approved' && <Alert variant="error" className="mt-3">{t.companyIs(r.company.status)}</Alert>}
          </Card>
          <Card title={t.history}>
            <ol className="relative space-y-4 border-l-2 border-brand-soft pl-5">
              {r.history.map((h, i) => (
                <li key={i}>
                  <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-brand" aria-hidden />
                  <p className="text-sm font-semibold">{h.status === 'rejected' ? t.rejected : statusLabel(h.status)} <span className="font-normal text-foreground/50">{t.by(h.byRole ?? t.system)}</span></p>
                  <p className="text-xs text-foreground/55">{dateTime(h.at)}</p>
                  {h.note && <p className="mt-1 text-xs text-foreground/70">“{h.note}”</p>}
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</h2>
      {children}
    </section>
  )
}

// ---- Actions per status ------------------------------------------------------------------

function ActionPanel({ request: r }: { request: AdminRequest }) {
  const action = useRequestAction(r.id)
  const run = (a: RequestAction, success: string, after?: () => void) => action.mutate(a, { onSuccess: () => { toast.success(success); after?.() } })
  const busy = action.isPending
  const t = useT(adminText).request
  const error = action.error && <Alert variant="error" className="mt-3">{action.error.message}</Alert>

  switch (r.status) {
    case 'pending_admin_review':
    case 'info_requested':
      return <ReviewActions request={r} run={run} busy={busy} error={error} />
    case 'forwarded_to_candidate':
      return <Waiting text={t.waitingCandidate} request={r} run={run} busy={busy} error={error} />
    case 'candidate_accepted':
      return <IntroduceActions request={r} run={run} busy={busy} error={error} />
    case 'candidate_declined':
      return <Waiting text={t.declined} request={r} run={run} busy={busy} error={error} />
    case 'introduced':
    case 'interviewing':
      return <OutcomeActions request={r} run={run} busy={busy} error={error} />
    case 'hired':
    case 'not_selected':
      return <Waiting text={t.outcome} request={r} run={run} busy={busy} error={error} />
    default:
      return <p className="text-sm text-foreground/60">{t.closedText}</p>
  }
}

interface ActionProps {
  request: AdminRequest
  run: (a: RequestAction, success: string, after?: () => void) => void
  busy: boolean
  error: ReactNode
}

function ReviewActions({ request: r, run, busy, error }: ActionProps) {
  const [mode, setMode] = useState<'forward' | 'info' | 'reject'>('forward')
  const [forward, setForward] = useState(r.forwardedMessage ?? r.message)
  const [info, setInfo] = useState('')
  const [reason, setReason] = useState('')
  const t = useT(adminText).request
  return (
    <div>
      {r.status === 'info_requested' && <Alert variant="info" className="mb-4">{t.askedInfo}</Alert>}
      <div role="tablist" aria-label={t.decision} className="mb-4 inline-flex rounded-md bg-chip p-0.5 text-sm font-semibold">
        {([['forward', t.forwardTab, Forward], ['info', t.infoTab, HelpCircle], ['reject', t.rejectTab, X]] as const).map(([m, label, Icon]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn('inline-flex items-center gap-1.5 rounded px-3 py-1.5', mode === m ? 'bg-surface shadow-sm' : 'text-foreground/60')}>
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>
      {mode === 'forward' && (
        <>
          <Field label={t.forwardLabel} hint={t.forwardHint}>
            {(ids) => <Textarea {...ids} rows={5} value={forward} onChange={(e) => setForward(e.target.value)} />}
          </Field>
          <Button type="button" disabled={busy || forward.trim().length < 10} onClick={() => run({ kind: 'forward', message: forward.trim() }, t.forwarded)} className="mt-3 h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
            {busy && <Spinner />} {t.forward}
          </Button>
        </>
      )}
      {mode === 'info' && (
        <>
          <Field label={t.question}>{(ids) => <Textarea {...ids} rows={3} value={info} onChange={(e) => setInfo(e.target.value)} placeholder={t.questionPlaceholder} />}</Field>
          <Button type="button" disabled={busy || info.trim().length < 5} onClick={() => run({ kind: 'request-info', message: info.trim() }, t.questionSent, () => setInfo(''))} className="mt-3 h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
            {busy && <Spinner />} {t.ask}
          </Button>
        </>
      )}
      {mode === 'reject' && (
        <>
          <Field label={t.reason}>{(ids) => <Textarea {...ids} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          <Button type="button" disabled={busy || reason.trim().length < 5} onClick={() => run({ kind: 'reject', reason: reason.trim() }, t.rejectedToast)} className="mt-3 h-10 rounded-md bg-destructive px-5 text-white hover:bg-destructive/90">
            {busy && <Spinner />} {t.reject}
          </Button>
        </>
      )}
      {error}
    </div>
  )
}

function IntroduceActions({ request: r, run, busy, error }: ActionProps) {
  const [share, setShare] = useState({ fullName: true, email: true, phone: false, linkedin: Boolean(r.candidate.linkedin), cv: r.candidate.hasCv })
  const [note, setNote] = useState('')
  const [interview, setInterview] = useState('')
  const t = useT(adminText).request
  const options: [keyof typeof share, string, boolean][] = [
    ['fullName', t.shareName(r.candidate.fullName), true],
    ['email', t.shareEmail(r.candidate.email), true],
    ['phone', t.sharePhone(r.candidate.phone), Boolean(r.candidate.phone)],
    ['linkedin', t.linkedin, Boolean(r.candidate.linkedin)],
    ['cv', t.cv, r.candidate.hasCv],
  ]
  return (
    <div>
      <Alert variant="success" className="mb-4">{t.accepted(r.candidateNote, r.company.name)}</Alert>
      <fieldset>
        <legend className="text-sm font-semibold">{t.share}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.map(([key, label, available]) => (
            <label key={key} className={cn('flex items-center gap-2.5 rounded-md border border-foreground/12 px-3 py-2 text-sm', !available && 'opacity-50')}>
              <input type="checkbox" className="size-4 accent-brand" disabled={!available} checked={share[key] && available} onChange={(e) => setShare((s) => ({ ...s, [key]: e.target.checked }))} />
              <span className="min-w-0 truncate">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={t.interviewDate} optional>{(ids) => <Input {...ids} type="datetime-local" className="h-10" value={interview} onChange={(e) => setInterview(e.target.value)} />}</Field>
        <Field label={t.noteBoth} optional>{(ids) => <Input {...ids} className="h-10" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} />}</Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => run({ kind: 'introduce', share, note: note.trim() || undefined, interviewDate: toIso(interview) }, t.introduced)} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
          {busy && <Spinner />} <Check data-icon="inline-start" aria-hidden /> {t.introduce}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => run({ kind: 'outcome', status: 'closed' }, t.closed)} className="h-10 rounded-md">{t.closeWithout}</Button>
      </div>
      {error}
    </div>
  )
}

function OutcomeActions({ request: r, run, busy, error }: ActionProps) {
  const [note, setNote] = useState('')
  const [interview, setInterview] = useState('')
  const t = useT(adminText).request
  const act = (status: 'interviewing' | 'hired' | 'not_selected' | 'closed', label: string) => run({ kind: 'outcome', status, note: note.trim() || undefined, interviewDate: toIso(interview) }, label, () => setNote(''))
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {r.status === 'introduced' && <Field label={t.interviewDate} optional>{(ids) => <Input {...ids} type="datetime-local" className="h-10" value={interview} onChange={(e) => setInterview(e.target.value)} />}</Field>}
        <Field label={t.note} optional>{(ids) => <Input {...ids} className="h-10" value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {r.status === 'introduced' && <Button type="button" variant="outline" disabled={busy} onClick={() => act('interviewing', t.markedInterviewing)} className="h-10 rounded-md">{t.interviewing}</Button>}
        <Button type="button" disabled={busy} onClick={() => act('hired', t.hiredToast)} className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">{t.hired}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => act('not_selected', t.notSelectedToast)} className="h-10 rounded-md">{t.notSelected}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => act('closed', t.closed)} className="h-10 rounded-md">{t.close}</Button>
      </div>
      {error}
    </div>
  )
}

function Waiting({ text, run, busy, error }: ActionProps & { text: string }) {
  const t = useT(adminText).request
  return (
    <div>
      <p className="text-sm text-foreground/65">{text}</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => run({ kind: 'outcome', status: 'closed' }, t.closed)} className="mt-3 h-9 rounded-md">{t.closeRequest}</Button>
      {error}
    </div>
  )
}

// ---- Message threads ------------------------------------------------------------------------

function Threads({ request: r }: { request: AdminRequest }) {
  const [thread, setThread] = useState<'company' | 'candidate'>('company')
  const [text, setText] = useState('')
  const action = useRequestAction(r.id)
  const t = useT(adminText).request
  const candidateReachable = r.history.some((h) => h.status === 'forwarded_to_candidate')
  const messages: RequestMessage[] = thread === 'company' ? r.companyMessages : r.candidateMessages
  const send = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) action.mutate({ kind: 'messages', thread, text: text.trim() }, { onSuccess: () => setText('') })
  }
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface">
      <div role="tablist" aria-label={t.conversation} className="flex border-b border-foreground/10">
        {(['company', 'candidate'] as const).map((side) => (
          <button key={side} type="button" role="tab" aria-selected={thread === side} onClick={() => setThread(side)} className={cn('flex-1 px-4 py-3 text-sm font-semibold', thread === side ? 'border-b-2 border-brand text-foreground' : 'text-foreground/55')}>
            {side === 'company' ? t.withCompany(r.companyMessages.length) : t.withCandidate(r.candidateMessages.length)}
          </button>
        ))}
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs text-foreground/50">{t.separate}</p>
        {messages.length === 0 && <p className="text-sm text-foreground/55">{t.noMessages}</p>}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className={cn('max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm', m.fromRole === 'admin' ? 'ml-auto bg-brand-soft' : 'bg-chip')}>
              <p className="text-xs font-semibold text-foreground/55">{m.fromRole === 'admin' ? t.team : m.fromRole === 'company' ? r.company.name : r.candidate.fullName} · {dateTime(m.at)}</p>
              <p className="mt-0.5 whitespace-pre-line">{m.text}</p>
            </li>
          ))}
        </ul>
        {thread === 'candidate' && !candidateReachable ? (
          <p className="text-sm text-foreground/60">{t.forwardFirst}</p>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <label htmlFor="admin-msg" className="sr-only">{t.messageTo(thread)}</label>
            <input id="admin-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.messagePlaceholder(thread)} maxLength={5000} className="h-10 min-w-0 flex-1 rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
            <Button type="submit" disabled={action.isPending || !text.trim()} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover" aria-label={t.send}>{action.isPending ? <Spinner /> : <Send size={16} aria-hidden />}</Button>
          </form>
        )}
        {action.error && <p className="text-xs text-destructive">{action.error.message}</p>}
      </div>
    </section>
  )
}
