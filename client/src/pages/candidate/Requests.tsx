import { useEffect, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, CalendarClock, Inbox, Send, ShieldCheck, Wallet } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Field, Spinner, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMyProfile, useMyRequests, useRespondToRequest, useSendRequestMessage } from '@/hooks/useCandidate'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatSalary } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CandidateRequest } from '@/types'
import { NoProfile } from './CandidateLayout'

/** Wording from the candidate's point of view. */
const candidateLabels: Partial<Record<CandidateRequest['status'], string>> = { forwarded_to_candidate: 'Awaiting your reply', candidate_accepted: 'You accepted', candidate_declined: 'You declined' }

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function MyRequests() {
  useDocumentTitle('Contact requests')
  const profile = useMyProfile()
  const { data, isPending, error } = useMyRequests(Boolean(profile.data))
  const { hash } = useLocation()

  // Scroll to a request linked from the dashboard (/candidate/requests#id).
  useEffect(() => {
    if (hash && data) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, data])

  return (
    <>
      <PageHeader
        title="Contact requests"
        description="Companies can't contact you directly. Our team reviews each request and only forwards the relevant ones. Your details are shared only if you accept."
      />
      {profile.isPending || (profile.data && isPending) ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : !profile.data ? (
        <NoProfile />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={Inbox} title="No requests yet">
          When a company asks to speak with you and our team approves it, the request appears here.
        </EmptyState>
      ) : (
        <ul className="space-y-5">
          {data.map((r) => <RequestCard key={r.id} request={r} />)}
        </ul>
      )}
    </>
  )
}

function RequestCard({ request: r }: { request: CandidateRequest }) {
  const respond = useRespondToRequest()
  const send = useSendRequestMessage()
  const [decision, setDecision] = useState<'accept' | 'decline' | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const awaiting = r.status === 'forwarded_to_candidate'

  const confirm = () => {
    if (!decision) return
    respond.mutate(
      { id: r.id, decision, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(decision === 'accept' ? 'Thanks! Our team will arrange the introduction.' : 'Request declined. The company will not see your details.')
          setDecision(null)
          setNote('')
        },
      },
    )
  }
  const sendMessage = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    send.mutate({ id: r.id, text: message.trim() }, { onSuccess: () => setMessage('') })
  }

  return (
    <li id={r.id} className={cn('scroll-mt-24 rounded-lg border bg-surface', awaiting ? 'border-brand/50' : 'border-foreground/12')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-brand-soft text-brand"><Building2 size={20} aria-hidden /></div>
          <div>
            <p className="font-semibold">{r.company.name}</p>
            <p className="text-sm text-foreground/60">{[r.job?.title ?? r.roleTitle, r.company.industry].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <StatusBadge status={r.status} label={candidateLabels[r.status]} />
      </div>

      <div className="space-y-5 p-5">
        <blockquote className="rounded-md bg-chip p-4 text-sm leading-relaxed whitespace-pre-line">{r.message}</blockquote>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {r.proposedTimes.length > 0 && (
            <div className="flex gap-2.5">
              <dt><CalendarClock size={16} className="mt-0.5 text-foreground/50" aria-label="Proposed times" /></dt>
              <dd>{r.proposedTimes.map(dateTime).join(' · ')}</dd>
            </div>
          )}
          {r.salaryRange && (
            <div className="flex gap-2.5">
              <dt><Wallet size={16} className="mt-0.5 text-foreground/50" aria-label="Salary range" /></dt>
              <dd>{formatSalary(r.salaryRange)}</dd>
            </div>
          )}
          {r.interviewDate && (
            <div className="flex gap-2.5">
              <dt><CalendarClock size={16} className="mt-0.5 text-brand" aria-label="Interview" /></dt>
              <dd>Interview: <strong>{dateTime(r.interviewDate)}</strong></dd>
            </div>
          )}
        </dl>

        {awaiting ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-brand/30 bg-brand-soft/50 p-4">
            <p className="flex flex-1 items-center gap-2 text-sm"><ShieldCheck size={17} className="shrink-0 text-brand" aria-hidden /> Accepting lets our team introduce you. We decide with you what to share.</p>
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setDecision('decline')}>Decline</Button>
            <Button type="button" className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover" onClick={() => setDecision('accept')}>Accept</Button>
          </div>
        ) : r.candidateNote ? (
          <p className="text-sm text-foreground/60">Your note: “{r.candidateNote}”</p>
        ) : null}

        <details className="group rounded-md border border-foreground/12" open={r.messages.length > 0}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
            Messages with the AI101 team {r.messages.length > 0 && <span className="text-foreground/50">({r.messages.length})</span>}
          </summary>
          <div className="space-y-3 border-t border-foreground/10 p-4">
            {r.messages.length === 0 && <p className="text-sm text-foreground/55">No messages yet. Ask us anything about this request.</p>}
            <ul className="space-y-2">
              {r.messages.map((m) => (
                <li key={m.id} className={cn('max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm', m.fromRole === 'candidate' ? 'ml-auto bg-brand-soft' : 'bg-chip')}>
                  <p className="text-xs font-semibold text-foreground/55">{m.fromRole === 'candidate' ? 'You' : 'AI101 team'} · {dateTime(m.at)}</p>
                  <p className="mt-0.5 whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={sendMessage} className="flex gap-2">
              <label htmlFor={`msg-${r.id}`} className="sr-only">Message to the AI101 team</label>
              <input id={`msg-${r.id}`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write to the AI101 team…" maxLength={5000} className="h-10 min-w-0 flex-1 rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
              <Button type="submit" disabled={send.isPending || !message.trim()} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover" aria-label="Send message">
                {send.isPending ? <Spinner /> : <Send size={16} aria-hidden />}
              </Button>
            </form>
            {send.error && <p className="text-xs text-destructive">{send.error.message}</p>}
          </div>
        </details>
      </div>

      <Modal
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={decision === 'accept' ? `Accept ${r.company.name}'s request?` : `Decline ${r.company.name}'s request?`}
        description={decision === 'accept' ? 'Our team will contact you to arrange the introduction and agree on what to share with the company.' : "The company won't see your details. You can add a short note for our team."}
      >
        <Field label="Note for the AI101 team" optional>
          {(ids) => <Textarea {...ids} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={decision === 'accept' ? 'e.g. Weekday mornings work best for me' : 'e.g. Not looking to relocate'} />}
        </Field>
        {respond.error && <Alert variant="error" className="mt-4">{respond.error.message}</Alert>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setDecision(null)}>Cancel</Button>
          <Button type="button" onClick={confirm} disabled={respond.isPending} className={cn('h-10 rounded-md px-5', decision === 'accept' ? 'bg-brand text-brand-foreground hover:bg-brand-hover' : 'bg-destructive text-white hover:bg-destructive/90')}>
            {respond.isPending && <Spinner />} {decision === 'accept' ? 'Accept request' : 'Decline request'}
          </Button>
        </div>
      </Modal>
    </li>
  )
}
