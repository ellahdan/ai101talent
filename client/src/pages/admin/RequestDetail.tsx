import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Building2, CalendarClock, Check, Download, EyeOff, Forward, HelpCircle, Mail, Phone, Send, UserRound, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Spinner, Textarea } from '@/components/ui/form'
import { StatusBadge, statusLabel } from '@/components/ui/status-badge'
import { openRequestCv, useAdminRequest, useRequestAction, type RequestAction } from '@/hooks/useAdminRequests'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatSalary } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AdminRequest, RequestMessage } from '@/types'

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

export default function AdminRequestDetail() {
  const { id } = useParams()
  const { data: r, isPending, error } = useAdminRequest(id)
  useDocumentTitle(r ? `Request: ${r.company.name} → ${r.candidate.applicantNumber}` : 'Request')

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error || !r) return <Alert variant="error">{error?.message ?? 'Request not found'}</Alert>

  return (
    <>
      <Link to="/admin/requests" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Contact requests</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-[-.04em] sm:text-3xl">{r.company.name} <span className="text-foreground/40">→</span> {r.candidate.applicantNumber}</h1>
        <StatusBadge status={r.status} label={r.status === 'rejected' ? 'Rejected' : undefined} className="text-sm" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Actions"><ActionPanel request={r} /></Card>
          <Card title="The request">
            <p className="text-sm text-foreground/60">{r.job ? <>Position: <Link to={`/jobs/${r.job.id}`} className="font-semibold text-brand">{r.job.title}</Link> ({r.job.status})</> : <>Role: <strong className="text-foreground">{r.roleTitle}</strong> (not a posted job)</>}</p>
            <blockquote className="mt-3 rounded-md bg-chip p-4 text-sm leading-relaxed whitespace-pre-line">{r.message}</blockquote>
            {r.forwardedMessage && r.forwardedMessage !== r.message && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Forwarded to the candidate as</p>
                <blockquote className="mt-2 rounded-md border border-brand/30 bg-brand-soft/40 p-4 text-sm whitespace-pre-line">{r.forwardedMessage}</blockquote>
              </>
            )}
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2"><dt><CalendarClock size={15} className="mt-0.5 text-foreground/50" aria-label="Proposed times" /></dt><dd>{r.proposedTimes.map(dateTime).join(' · ')}</dd></div>
              {r.salaryRange && <div className="flex gap-2"><dt><Wallet size={15} className="mt-0.5 text-foreground/50" aria-label="Salary" /></dt><dd>{formatSalary(r.salaryRange)}</dd></div>}
              {r.interviewDate && <div className="flex gap-2"><dt><CalendarClock size={15} className="mt-0.5 text-brand" aria-label="Interview" /></dt><dd>Interview: <strong>{dateTime(r.interviewDate)}</strong></dd></div>}
            </dl>
            {r.candidateNote && <p className="mt-4 text-sm">Candidate's note: “{r.candidateNote}”</p>}
            {r.rejectionReason && <Alert variant="error" className="mt-4">Rejected: {r.rejectionReason}</Alert>}
          </Card>
          <Threads request={r} />
        </div>

        <aside className="space-y-6">
          <Card title="Candidate">
            <p className="flex items-center gap-2 font-semibold"><UserRound size={16} className="text-brand" aria-hidden /> {r.candidate.fullName}</p>
            <p className="font-mono text-xs text-foreground/55">{r.candidate.applicantNumber}</p>
            <p className="mt-1 text-sm text-foreground/65">{r.candidate.headline}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex gap-2"><dt><Mail size={14} className="mt-0.5 text-foreground/45" aria-label="Email" /></dt><dd className="break-all">{r.candidate.email}</dd></div>
              {r.candidate.phone && <div className="flex gap-2"><dt><Phone size={14} className="mt-0.5 text-foreground/45" aria-label="Phone" /></dt><dd>{r.candidate.phone}</dd></div>}
              {r.candidate.linkedin && <div className="flex gap-2"><dt className="text-xs font-bold text-foreground/45">in</dt><dd><a href={r.candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-brand">LinkedIn</a></dd></div>}
            </dl>
            {!r.candidate.visible && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><EyeOff size={13} aria-hidden /> Profile is currently hidden from search</p>}
            {r.candidate.hasCv && (
              <Button type="button" variant="outline" className="mt-4 h-9 w-full rounded-md" onClick={() => openRequestCv(r.id).catch((e) => toast.error(e.message))}>
                <Download data-icon="inline-start" aria-hidden /> Open CV (logged)
              </Button>
            )}
          </Card>
          <Card title="Company">
            <p className="flex items-center gap-2 font-semibold"><Building2 size={16} className="text-brand" aria-hidden /> {r.company.name}</p>
            <p className="mt-1 text-sm text-foreground/65">{[r.company.industry, r.company.contactName].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-sm break-all">{r.company.email}</p>
            {r.company.status !== 'approved' && <Alert variant="error" className="mt-3">This company is {r.company.status}.</Alert>}
          </Card>
          <Card title="History">
            <ol className="relative space-y-4 border-l-2 border-brand-soft pl-5">
              {r.history.map((h, i) => (
                <li key={i}>
                  <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-brand" aria-hidden />
                  <p className="text-sm font-semibold">{h.status === 'rejected' ? 'Rejected' : statusLabel(h.status)} <span className="font-normal text-foreground/50">by {h.byRole ?? 'system'}</span></p>
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
  const error = action.error && <Alert variant="error" className="mt-3">{action.error.message}</Alert>

  switch (r.status) {
    case 'pending_admin_review':
    case 'info_requested':
      return <ReviewActions request={r} run={run} busy={busy} error={error} />
    case 'forwarded_to_candidate':
      return <Waiting text="Waiting for the candidate to accept or decline." request={r} run={run} busy={busy} error={error} />
    case 'candidate_accepted':
      return <IntroduceActions request={r} run={run} busy={busy} error={error} />
    case 'candidate_declined':
      return <Waiting text="The candidate declined. Close the request when you've let the company know." request={r} run={run} busy={busy} error={error} />
    case 'introduced':
    case 'interviewing':
      return <OutcomeActions request={r} run={run} busy={busy} error={error} />
    case 'hired':
    case 'not_selected':
      return <Waiting text="The process has an outcome. You can close the request." request={r} run={run} busy={busy} error={error} />
    default:
      return <p className="text-sm text-foreground/60">This request is closed. No further actions.</p>
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
  return (
    <div>
      {r.status === 'info_requested' && <Alert variant="info" className="mb-4">You asked the company for more information. You can still decide now.</Alert>}
      <div role="tablist" aria-label="Decision" className="mb-4 inline-flex rounded-md bg-chip p-0.5 text-sm font-semibold">
        {([['forward', 'Forward to candidate', Forward], ['info', 'Ask for info', HelpCircle], ['reject', 'Reject', X]] as const).map(([m, label, Icon]) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn('inline-flex items-center gap-1.5 rounded px-3 py-1.5', mode === m ? 'bg-surface shadow-sm' : 'text-foreground/60')}>
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>
      {mode === 'forward' && (
        <>
          <Field label="Message the candidate will see" hint="Edit to remove anything inappropriate or identifying. The company's original stays on record.">
            {(ids) => <Textarea {...ids} rows={5} value={forward} onChange={(e) => setForward(e.target.value)} />}
          </Field>
          <Button type="button" disabled={busy || forward.trim().length < 10} onClick={() => run({ kind: 'forward', message: forward.trim() }, 'Forwarded. The candidate has been emailed.')} className="mt-3 h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
            {busy && <Spinner />} Forward to candidate
          </Button>
        </>
      )}
      {mode === 'info' && (
        <>
          <Field label="Question for the company">{(ids) => <Textarea {...ids} rows={3} value={info} onChange={(e) => setInfo(e.target.value)} placeholder="e.g. Can you confirm the salary range and whether the role is remote?" />}</Field>
          <Button type="button" disabled={busy || info.trim().length < 5} onClick={() => run({ kind: 'request-info', message: info.trim() }, 'Question sent to the company', () => setInfo(''))} className="mt-3 h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
            {busy && <Spinner />} Ask the company
          </Button>
        </>
      )}
      {mode === 'reject' && (
        <>
          <Field label="Reason (sent to the company)">{(ids) => <Textarea {...ids} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          <Button type="button" disabled={busy || reason.trim().length < 5} onClick={() => run({ kind: 'reject', reason: reason.trim() }, 'Request rejected. The company has been emailed.')} className="mt-3 h-10 rounded-md bg-destructive px-5 text-white hover:bg-destructive/90">
            {busy && <Spinner />} Reject request
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
  const options: [keyof typeof share, string, boolean][] = [
    ['fullName', `Name (${r.candidate.fullName})`, true],
    ['email', `Email (${r.candidate.email})`, true],
    ['phone', `Phone${r.candidate.phone ? ` (${r.candidate.phone})` : ''}`, Boolean(r.candidate.phone)],
    ['linkedin', 'LinkedIn', Boolean(r.candidate.linkedin)],
    ['cv', 'CV', r.candidate.hasCv],
  ]
  return (
    <div>
      <Alert variant="success" className="mb-4">The candidate accepted{r.candidateNote ? `: “${r.candidateNote}”` : '.'} Choose what to share with {r.company.name}.</Alert>
      <fieldset>
        <legend className="text-sm font-semibold">Share with the company</legend>
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
        <Field label="Interview date" optional>{(ids) => <Input {...ids} type="datetime-local" className="h-10" value={interview} onChange={(e) => setInterview(e.target.value)} />}</Field>
        <Field label="Note to both sides" optional>{(ids) => <Input {...ids} className="h-10" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tuesdays work best" />}</Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => run({ kind: 'introduce', share, note: note.trim() || undefined, interviewDate: toIso(interview) }, 'Introduction sent to both sides')} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
          {busy && <Spinner />} <Check data-icon="inline-start" aria-hidden /> Introduce
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => run({ kind: 'outcome', status: 'closed' }, 'Request closed')} className="h-10 rounded-md">Close without introducing</Button>
      </div>
      {error}
    </div>
  )
}

function OutcomeActions({ request: r, run, busy, error }: ActionProps) {
  const [note, setNote] = useState('')
  const [interview, setInterview] = useState('')
  const act = (status: 'interviewing' | 'hired' | 'not_selected' | 'closed', label: string) => run({ kind: 'outcome', status, note: note.trim() || undefined, interviewDate: toIso(interview) }, label, () => setNote(''))
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {r.status === 'introduced' && <Field label="Interview date" optional>{(ids) => <Input {...ids} type="datetime-local" className="h-10" value={interview} onChange={(e) => setInterview(e.target.value)} />}</Field>}
        <Field label="Note" optional>{(ids) => <Input {...ids} className="h-10" value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {r.status === 'introduced' && <Button type="button" variant="outline" disabled={busy} onClick={() => act('interviewing', 'Marked as interviewing')} className="h-10 rounded-md">Interviewing</Button>}
        <Button type="button" disabled={busy} onClick={() => act('hired', 'Hire recorded. Congratulations!')} className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">Hired</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => act('not_selected', 'Marked as not selected')} className="h-10 rounded-md">Not selected</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => act('closed', 'Request closed')} className="h-10 rounded-md">Close</Button>
      </div>
      {error}
    </div>
  )
}

function Waiting({ text, run, busy, error }: ActionProps & { text: string }) {
  return (
    <div>
      <p className="text-sm text-foreground/65">{text}</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => run({ kind: 'outcome', status: 'closed' }, 'Request closed')} className="mt-3 h-9 rounded-md">Close request</Button>
      {error}
    </div>
  )
}

// ---- Message threads ------------------------------------------------------------------------

function Threads({ request: r }: { request: AdminRequest }) {
  const [thread, setThread] = useState<'company' | 'candidate'>('company')
  const [text, setText] = useState('')
  const action = useRequestAction(r.id)
  const candidateReachable = r.history.some((h) => h.status === 'forwarded_to_candidate')
  const messages: RequestMessage[] = thread === 'company' ? r.companyMessages : r.candidateMessages
  const send = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) action.mutate({ kind: 'messages', thread, text: text.trim() }, { onSuccess: () => setText('') })
  }
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface">
      <div role="tablist" aria-label="Conversation" className="flex border-b border-foreground/10">
        {(['company', 'candidate'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={thread === t} onClick={() => setThread(t)} className={cn('flex-1 px-4 py-3 text-sm font-semibold', thread === t ? 'border-b-2 border-brand text-foreground' : 'text-foreground/55')}>
            With the {t} ({(t === 'company' ? r.companyMessages : r.candidateMessages).length})
          </button>
        ))}
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs text-foreground/50">The company and the candidate never see each other's conversation.</p>
        {messages.length === 0 && <p className="text-sm text-foreground/55">No messages yet.</p>}
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className={cn('max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm', m.fromRole === 'admin' ? 'ml-auto bg-brand-soft' : 'bg-chip')}>
              <p className="text-xs font-semibold text-foreground/55">{m.fromRole === 'admin' ? 'AI101 team' : m.fromRole === 'company' ? r.company.name : r.candidate.fullName} · {dateTime(m.at)}</p>
              <p className="mt-0.5 whitespace-pre-line">{m.text}</p>
            </li>
          ))}
        </ul>
        {thread === 'candidate' && !candidateReachable ? (
          <p className="text-sm text-foreground/60">Forward the request first: the candidate doesn't know about it yet.</p>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <label htmlFor="admin-msg" className="sr-only">Message to the {thread}</label>
            <input id="admin-msg" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message to the ${thread} (they are emailed)…`} maxLength={5000} className="h-10 min-w-0 flex-1 rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
            <Button type="submit" disabled={action.isPending || !text.trim()} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover" aria-label="Send message">{action.isPending ? <Spinner /> : <Send size={16} aria-hidden />}</Button>
          </form>
        )}
        {action.error && <p className="text-xs text-destructive">{action.error.message}</p>}
      </div>
    </section>
  )
}
