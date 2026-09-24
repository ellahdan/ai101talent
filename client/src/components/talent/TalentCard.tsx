import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Clock, Languages, MapPin, MessageSquarePlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import type { AnonymizedCandidate, RequestStatus } from '@/types'

/** Statuses where the company already has a live request (can't send another). */
export const ACTIVE_REQUEST: RequestStatus[] = ['pending_admin_review', 'info_requested', 'forwarded_to_candidate', 'candidate_accepted', 'introduced', 'interviewing']

export const availabilityText = (c: Pick<AnonymizedCandidate, 'availability' | 'noticePeriodWeeks'>) =>
  c.availability === 'immediately' ? 'Available now' : `Notice: ${c.noticePeriodWeeks ?? '?'} weeks`

interface TalentCardProps {
  candidate: AnonymizedCandidate
  onSave: (c: AnonymizedCandidate) => void
  onRequest: (c: AnonymizedCandidate) => void
}

/** Anonymized candidate summary: applicant number instead of a name, no contact details. */
export function TalentCard({ candidate: c, onSave, onRequest }: TalentCardProps) {
  const activeRequest = c.requestStatus && ACTIVE_REQUEST.includes(c.requestStatus)
  const place = [c.location.city, c.location.country].filter(Boolean).join(', ')
  return (
    <article className="flex h-full flex-col rounded-lg border border-foreground/12 bg-surface p-5 transition hover:border-brand/50 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><UserRound size={20} aria-hidden /></div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">
              <Link to={`/company/candidates/${c.id}`} className="hover:text-brand">{c.headline || 'Candidate'}</Link>
            </h3>
            <p className="font-mono text-xs text-foreground/55">{c.applicantNumber}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-xs font-semibold">{c.totalYearsExperience} yrs</span>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-foreground/65">
        <li className="flex items-center gap-2"><MapPin size={14} aria-hidden /> {place || 'Location not given'}{c.workMode ? ` · prefers ${workModeLabel[c.workMode].toLowerCase()}` : ''}</li>
        <li className="flex items-center gap-2"><Clock size={14} aria-hidden /> {availabilityText(c)}</li>
        <li className="flex items-center gap-2"><Languages size={14} aria-hidden /> {c.languages.map((l) => `${l.name} (${proficiencyLabel[l.proficiency]})`).join(', ')}</li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Top skills">
        {c.topSkills.map((s) => (
          <span key={s.name} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-foreground">
            {s.name}{s.years != null && <span className="font-normal opacity-75"> · {s.years}y</span>}
          </span>
        ))}
      </div>
      {c.tools.length > 0 && <p className="mt-2.5 text-xs text-foreground/55">Tools: {c.tools.join(', ')}</p>}

      <div className="flex-1" />
      {(c.shortlists.length > 0 || c.requestStatus) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {c.shortlists.map((s) => <span key={s} className="inline-flex items-center gap-1 rounded-full bg-chip px-2 py-0.5"><BookmarkCheck size={12} aria-hidden /> {s}</span>)}
          {c.requestStatus && <StatusBadge status={c.requestStatus} label={c.requestStatus === 'rejected' ? 'Request not forwarded' : undefined} />}
        </div>
      )}
      <div className="mt-4 flex gap-2 border-t border-foreground/10 pt-4">
        <Button type="button" variant="outline" className="h-9 flex-1 rounded-md" onClick={() => onSave(c)}>
          {c.shortlists.length ? <BookmarkCheck data-icon="inline-start" aria-hidden className="text-brand" /> : <Bookmark data-icon="inline-start" aria-hidden />} Save
        </Button>
        <Button type="button" className="h-9 flex-1 rounded-md bg-brand text-brand-foreground hover:bg-brand-hover" disabled={activeRequest} onClick={() => onRequest(c)} title={activeRequest ? 'You already have an open request for this candidate' : undefined}>
          <MessageSquarePlus data-icon="inline-start" aria-hidden /> {activeRequest ? 'Requested' : 'Request to speak'}
        </Button>
      </div>
    </article>
  )
}

export function TalentCardSkeleton() {
  return (
    <div className="rounded-lg border border-foreground/12 bg-surface p-5" aria-hidden>
      <div className="flex gap-3"><div className="size-11 animate-pulse rounded-full bg-chip" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-chip" /><div className="h-3 w-1/3 animate-pulse rounded bg-chip" /></div></div>
      <div className="mt-5 space-y-2">{[70, 50, 80].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-chip" style={{ width: `${w}%` }} />)}</div>
      <div className="mt-5 flex gap-2">{[60, 80, 50].map((w) => <div key={w} className="h-6 animate-pulse rounded-full bg-chip" style={{ width: w }} />)}</div>
      <div className="mt-6 h-9 border-t border-foreground/10" />
    </div>
  )
}
