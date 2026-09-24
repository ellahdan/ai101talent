import type { Request } from 'express'
import type { Types } from 'mongoose'
import { audit } from '../lib/audit.js'
import { invalidateCache } from '../lib/cache.js'
import { badRequest } from '../lib/errors.js'
import type { ContactRequestDoc } from '../models/index.js'
import type { AdminRequest, CompanyRequest, RequestMessage, RequestStatus, Role, SharedDetails } from '../types/index.js'

/**
 * Allowed status changes. Every contact goes company → admin review → candidate → admin introduction.
 * Candidate decisions (accept/decline) are made on the candidate endpoints; everything else is the admin's.
 */
export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending_admin_review: ['forwarded_to_candidate', 'rejected', 'info_requested', 'closed'],
  info_requested: ['pending_admin_review', 'forwarded_to_candidate', 'rejected', 'closed'],
  forwarded_to_candidate: ['candidate_accepted', 'candidate_declined', 'closed'],
  candidate_accepted: ['introduced', 'closed'],
  candidate_declined: ['closed'],
  introduced: ['interviewing', 'hired', 'not_selected', 'closed'],
  interviewing: ['hired', 'not_selected', 'closed'],
  hired: ['closed'],
  not_selected: ['closed'],
  rejected: [],
  closed: [],
}

/** Statuses in which a company already has a live request for a candidate (no duplicates allowed). */
export const ACTIVE_STATUSES: RequestStatus[] = ['pending_admin_review', 'info_requested', 'forwarded_to_candidate', 'candidate_accepted', 'introduced', 'interviewing']

/** Validates and applies a status change, records it in the history and the audit log. */
export async function transition(req: Request, request: ContactRequestDoc, to: RequestStatus, note?: string) {
  const from = request.status
  if (!TRANSITIONS[from].includes(to)) throw badRequest(`A request that is "${from.replace(/_/g, ' ')}" can't move to "${to.replace(/_/g, ' ')}"`, 'INVALID_TRANSITION')
  request.status = to
  request.history.push({ status: to, by: req.user!.id as unknown as Types.ObjectId, note, at: new Date() })
  if (to === 'hired') {
    request.hiredAt = new Date()
    invalidateCache('public:stats')
  }
  await request.save()
  await audit(req, { action: 'request.status_changed', targetType: 'ContactRequest', targetId: request._id, meta: { from, to, note } })
}

export function pushMessage(request: ContactRequestDoc, thread: 'company' | 'candidate', from: string, fromRole: Role, text: string) {
  const to: Role = fromRole === 'admin' ? thread : 'admin'
  request.messages.push({ thread, from: from as unknown as Types.ObjectId, fromRole, to, text, at: new Date() })
}

// ---- Views -------------------------------------------------------------------------

const iso = (d?: Date | null) => d?.toISOString()
const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

function salary(r: any) {
  const s = r.salaryRange
  return s && (s.min != null || s.max != null) ? { min: orUndefined(s.min), max: orUndefined(s.max), currency: s.currency ?? 'EUR' } : undefined
}
const messages = (r: any, thread: 'company' | 'candidate'): RequestMessage[] =>
  r.messages.filter((m: any) => m.thread === thread).map((m: any) => ({ id: String(m._id), fromRole: m.fromRole, text: m.text, at: m.at.toISOString() }))

function shared(s: any): SharedDetails | undefined {
  if (!s?.sharedAt) return undefined
  return { fullName: orUndefined(s.fullName), email: orUndefined(s.email), phone: orUndefined(s.phone), linkedin: orUndefined(s.linkedin), cvShared: Boolean(s.cvShared), note: orUndefined(s.note), sharedAt: iso(s.sharedAt) }
}

/** What the requesting company may see. Expects candidateId and jobId populated. */
export function toCompanyRequest(r: any): CompanyRequest {
  return {
    id: String(r._id),
    status: r.status,
    candidate: { id: String(r.candidateId?._id ?? r.candidateId), applicantNumber: r.candidateId?.applicantNumber ?? 'Deleted profile', headline: r.candidateId?.headline ?? '' },
    job: r.jobId?._id ? { id: String(r.jobId._id), title: r.jobId.title } : undefined,
    roleTitle: orUndefined(r.roleTitle),
    message: r.message,
    proposedTimes: (r.proposedTimes ?? []).map((d: Date) => d.toISOString()),
    salaryRange: salary(r),
    rejectionReason: orUndefined(r.rejectionReason),
    messages: messages(r, 'company'),
    history: r.history.map((h: any) => ({ status: h.status, at: h.at.toISOString() })),
    sharedDetails: shared(r.sharedDetails),
    interviewDate: iso(r.interviewDate),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

/** Full view for the admin. Expects companyId (+ userId email), candidateId and jobId populated. */
export function toAdminRequest(r: any, actorRoles: Map<string, Role>): AdminRequest {
  const c = r.companyId
  const cand = r.candidateId
  return {
    id: String(r._id),
    status: r.status,
    company: { id: String(c._id), name: c.name, status: c.status, email: c.userId?.email ?? '', industry: orUndefined(c.industry), website: orUndefined(c.website), contactName: c.contactPerson?.name ?? '' },
    candidate: cand
      ? { id: String(cand._id), applicantNumber: cand.applicantNumber, fullName: cand.fullName, headline: cand.headline ?? '', email: cand.email, phone: orUndefined(cand.phone), linkedin: orUndefined(cand.links?.linkedin), visible: Boolean(cand.visible), hasCv: Boolean(cand.cvFile?.key) }
      : { id: '', applicantNumber: 'Deleted', fullName: 'Deleted profile', headline: '', email: '', visible: false, hasCv: false },
    job: r.jobId?._id ? { id: String(r.jobId._id), title: r.jobId.title, status: r.jobId.status } : undefined,
    roleTitle: orUndefined(r.roleTitle),
    message: r.message,
    forwardedMessage: orUndefined(r.forwardedMessage),
    proposedTimes: (r.proposedTimes ?? []).map((d: Date) => d.toISOString()),
    salaryRange: salary(r),
    candidateNote: orUndefined(r.candidateNote),
    rejectionReason: orUndefined(r.rejectionReason),
    companyMessages: messages(r, 'company'),
    candidateMessages: messages(r, 'candidate'),
    history: r.history.map((h: any) => ({ status: h.status, at: h.at.toISOString(), note: orUndefined(h.note), byRole: h.by ? actorRoles.get(String(h.by)) : 'system' })),
    sharedDetails: shared(r.sharedDetails),
    interviewDate: iso(r.interviewDate),
    hiredAt: iso(r.hiredAt),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
