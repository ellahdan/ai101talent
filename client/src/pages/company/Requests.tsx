import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarClock, Download, Inbox, Mail, MessageSquareWarning, Phone, Send, UserRound, Wallet } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge, statusLabel } from '@/components/ui/status-badge'
import { openSharedCv, useCompanyRequestMessage, useCompanyRequests } from '@/hooks/useTalent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatSalary, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CompanyRequest } from '@/types'

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const companyLabel = (r: CompanyRequest) => (r.status === 'rejected' ? 'Not forwarded' : undefined)

export default function CompanyRequests() {
  useDocumentTitle('Contact requests')
  const { data, isPending, error } = useCompanyRequests()
  return (
    <>
      <PageHeader title="Contact requests" description="Our team reviews each request, asks the candidate, and introduces you if they accept. You'll see status updates and messages from us here." />
      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={Inbox} title="No requests yet" action={<Link to="/company/search" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>Search talent</Link>}>
          Find a candidate in talent search and click "Request to speak".
        </EmptyState>
      ) : (
        <ul className="space-y-4">{data.map((r) => <RequestCard key={r.id} request={r} />)}</ul>
      )}
    </>
  )
}

function RequestCard({ request: r }: { request: CompanyRequest }) {
  const send = useCompanyRequestMessage()
  const [text, setText] = useState('')
  const needsReply = r.status === 'info_requested'
  const closed = r.status === 'rejected' || r.status === 'closed'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send.mutate({ id: r.id, text: text.trim() }, { onSuccess: (u) => { setText(''); if (u.status === 'pending_admin_review' && needsReply) toast.success('Thanks! Your request is back in review.') } })
  }

  return (
    <li className={cn('rounded-lg border bg-surface', needsReply ? 'border-amber-400/60' : 'border-foreground/12')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground/10 p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand"><UserRound size={20} aria-hidden /></div>
          <div>
            <p className="font-semibold"><Link to={`/company/candidates/${r.candidate.id}`} className="hover:text-brand">{r.candidate.headline || 'Candidate'}</Link> <span className="font-mono text-sm font-normal text-foreground/55">{r.candidate.applicantNumber}</span></p>
            <p className="text-sm text-foreground/60">{r.job?.title ?? r.roleTitle} · sent {timeAgo(r.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={r.status} label={companyLabel(r)} />
      </div>

      <div className="space-y-5 p-5">
        <ol className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-foreground/55" aria-label="Status history">
          {r.history.map((h, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>→</span>}
              <span><span className="font-semibold text-foreground/75">{h.status === 'rejected' ? 'Not forwarded' : statusLabel(h.status)}</span> {new Date(h.at).toLocaleDateString()}</span>
            </li>
          ))}
        </ol>

        {needsReply && <Alert variant="info"><strong>Our team needs more information.</strong> Reply below: your request goes back into review automatically.</Alert>}
        {r.status === 'rejected' && r.rejectionReason && <Alert variant="error"><strong>Not forwarded:</strong> {r.rejectionReason}</Alert>}

        {r.sharedDetails && (
          <div className="rounded-md border border-brand/40 bg-brand-soft/50 p-4">
            <p className="text-sm font-semibold">Introduction: details shared by the candidate</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {r.sharedDetails.fullName && <div className="flex gap-2"><dt><UserRound size={15} className="mt-0.5 text-foreground/50" aria-label="Name" /></dt><dd>{r.sharedDetails.fullName}</dd></div>}
              {r.sharedDetails.email && <div className="flex gap-2"><dt><Mail size={15} className="mt-0.5 text-foreground/50" aria-label="Email" /></dt><dd><a href={`mailto:${r.sharedDetails.email}`} className="text-brand underline-offset-4 hover:underline">{r.sharedDetails.email}</a></dd></div>}
              {r.sharedDetails.phone && <div className="flex gap-2"><dt><Phone size={15} className="mt-0.5 text-foreground/50" aria-label="Phone" /></dt><dd>{r.sharedDetails.phone}</dd></div>}
              {r.sharedDetails.linkedin && <div className="flex gap-2"><dt className="text-xs font-semibold text-foreground/50">in</dt><dd><a href={r.sharedDetails.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline-offset-4 hover:underline">LinkedIn profile</a></dd></div>}
              {r.interviewDate && <div className="flex gap-2"><dt><CalendarClock size={15} className="mt-0.5 text-foreground/50" aria-label="Interview" /></dt><dd>Interview: <strong>{dateTime(r.interviewDate)}</strong></dd></div>}
            </dl>
            {r.sharedDetails.note && <p className="mt-3 text-sm text-foreground/70">“{r.sharedDetails.note}”</p>}
            {r.sharedDetails.cvShared && (
              <Button type="button" variant="outline" className="mt-4 h-9 rounded-md" onClick={() => openSharedCv(r.id).catch((e) => toast.error(e.message))}>
                <Download data-icon="inline-start" aria-hidden /> Download CV
              </Button>
            )}
          </div>
        )}

        <details className="rounded-md border border-foreground/12">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Your request</summary>
          <div className="space-y-3 border-t border-foreground/10 p-4 text-sm">
            <p className="whitespace-pre-line">{r.message}</p>
            <p className="flex items-center gap-2 text-foreground/65"><CalendarClock size={15} aria-hidden /> {r.proposedTimes.map(dateTime).join(' · ')}</p>
            {r.salaryRange && <p className="flex items-center gap-2 text-foreground/65"><Wallet size={15} aria-hidden /> {formatSalary(r.salaryRange)}</p>}
          </div>
        </details>

        <div className="rounded-md border border-foreground/12">
          <p className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
            <MessageSquareWarning size={16} className="text-brand" aria-hidden /> Messages with the AI101 team {r.messages.length > 0 && <span className="text-foreground/50">({r.messages.length})</span>}
          </p>
          <div className="space-y-3 border-t border-foreground/10 p-4">
            {r.messages.length === 0 && <p className="text-sm text-foreground/55">No messages yet.</p>}
            <ul className="space-y-2">
              {r.messages.map((m) => (
                <li key={m.id} className={cn('max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm', m.fromRole === 'company' ? 'ml-auto bg-brand-soft' : 'bg-chip')}>
                  <p className="text-xs font-semibold text-foreground/55">{m.fromRole === 'company' ? 'You' : 'AI101 team'} · {dateTime(m.at)}</p>
                  <p className="mt-0.5 whitespace-pre-line">{m.text}</p>
                </li>
              ))}
            </ul>
            {!closed && (
              <form onSubmit={submit} className="flex gap-2">
                <label htmlFor={`cmsg-${r.id}`} className="sr-only">Message to the AI101 team</label>
                <input id={`cmsg-${r.id}`} value={text} onChange={(e) => setText(e.target.value)} placeholder={needsReply ? 'Answer our question…' : 'Write to the AI101 team…'} maxLength={5000} className="h-10 min-w-0 flex-1 rounded-md border border-foreground/15 bg-surface px-3 text-sm outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40" />
                <Button type="submit" disabled={send.isPending || !text.trim()} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover" aria-label="Send message">{send.isPending ? <Spinner /> : <Send size={16} aria-hidden />}</Button>
              </form>
            )}
            {send.error && <p className="text-xs text-destructive">{send.error.message}</p>}
          </div>
        </div>
      </div>
    </li>
  )
}
