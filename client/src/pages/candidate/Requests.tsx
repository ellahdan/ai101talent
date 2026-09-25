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
import { formatDateTime, formatSalary } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CandidateRequest } from '@/types'
import { NoProfile } from './CandidateLayout'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { candidateText } from '@/i18n/candidate'

const dateTime = (iso: string) => formatDateTime(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function MyRequests() {
  const t = useT(candidateText).requests
  useDocumentTitle(t.title)
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
        title={t.title}
        description={t.description}
      />
      {profile.isPending || (profile.data && isPending) ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : !profile.data ? (
        <NoProfile />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={Inbox} title={t.none}>
          {t.noneText}
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
  const t = useT(candidateText).requests
  const c = useT(common)

  const confirm = () => {
    if (!decision) return
    respond.mutate(
      { id: r.id, decision, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(decision === 'accept' ? t.accepted : t.declined)
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
        <StatusBadge status={r.status} label={t.labels[r.status]} />
      </div>

      <div className="space-y-5 p-5">
        <blockquote className="rounded-md bg-chip p-4 text-sm leading-relaxed whitespace-pre-line">{r.message}</blockquote>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {r.proposedTimes.length > 0 && (
            <div className="flex gap-2.5">
              <dt><CalendarClock size={16} className="mt-0.5 text-foreground/50" aria-label={t.proposedTimes} /></dt>
              <dd>{r.proposedTimes.map(dateTime).join(' · ')}</dd>
            </div>
          )}
          {r.salaryRange && (
            <div className="flex gap-2.5">
              <dt><Wallet size={16} className="mt-0.5 text-foreground/50" aria-label={t.salary} /></dt>
              <dd>{formatSalary(r.salaryRange)}</dd>
            </div>
          )}
          {r.interviewDate && (
            <div className="flex gap-2.5">
              <dt><CalendarClock size={16} className="mt-0.5 text-brand" aria-label={t.interview} /></dt>
              <dd>{t.interviewAt} <strong>{dateTime(r.interviewDate)}</strong></dd>
            </div>
          )}
        </dl>

        {awaiting ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-brand/30 bg-brand-soft/50 p-4">
            <p className="flex flex-1 items-center gap-2 text-sm"><ShieldCheck size={17} className="shrink-0 text-brand" aria-hidden /> {t.acceptHint}</p>
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setDecision('decline')}>{t.decline}</Button>
            <Button type="button" className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover" onClick={() => setDecision('accept')}>{t.accept}</Button>
          </div>
        ) : r.candidateNote ? (
          <p className="text-sm text-foreground/60">{t.yourNote} “{r.candidateNote}”</p>
        ) : null}

        <details className="group rounded-md border border-foreground/12" open={r.messages.length > 0}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
            {t.messages} {r.messages.length > 0 && <span className="text-foreground/50">({r.messages.length})</span>}
          </summary>
          <div className="space-y-3 border-t border-foreground/10 p-4">
            {r.messages.length === 0 && <p className="text-sm text-foreground/55">{t.noMessages}</p>}
            <ul className="space-y-2">
              {r.messages.map((m) => (
                <li key={m.id} className={cn('max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm', m.fromRole === 'candidate' ? 'ml-auto bg-brand-soft' : 'bg-chip')}>
                  <p className="text-xs font-semibold text-foreground/55">{m.fromRole === 'candidate' ? t.you : t.team} · {dateTime(m.at)}</p>
                  <p className="mt-0.5 whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={sendMessage} className="flex gap-2">
              <label htmlFor={`msg-${r.id}`} className="sr-only">{t.messageLabel}</label>
              <input id={`msg-${r.id}`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.write} maxLength={5000} className="h-10 min-w-0 flex-1 rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
              <Button type="submit" disabled={send.isPending || !message.trim()} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover" aria-label={t.send}>
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
        title={decision === 'accept' ? t.acceptTitle(r.company.name) : t.declineTitle(r.company.name)}
        description={decision === 'accept' ? t.acceptText : t.declineText}
      >
        <Field label={t.note} optional>
          {(ids) => <Textarea {...ids} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={decision === 'accept' ? t.acceptPlaceholder : t.declinePlaceholder} />}
        </Field>
        {respond.error && <Alert variant="error" className="mt-4">{respond.error.message}</Alert>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setDecision(null)}>{c.actions.cancel}</Button>
          <Button type="button" onClick={confirm} disabled={respond.isPending} className={cn('h-10 rounded-md px-5', decision === 'accept' ? 'bg-brand text-brand-foreground hover:bg-brand-hover' : 'bg-destructive text-white hover:bg-destructive/90')}>
            {respond.isPending && <Spinner />} {decision === 'accept' ? t.acceptButton : t.declineButton}
          </Button>
        </div>
      </Modal>
    </li>
  )
}
