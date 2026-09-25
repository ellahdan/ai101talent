import { Router, type Request, type Response } from 'express'
import { isValidObjectId, type Types } from 'mongoose'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js'
import { signedFileUrl } from '../lib/storage.js'
import { contactRequestLimiter } from '../middleware/security.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Candidate, ContactRequest, Job, type CompanyDoc } from '../models/index.js'
import { myCompany, requireActiveCompany } from '../services/companies.js'
import { ACTIVE_STATUSES, pushMessage, toCompanyRequest, transition } from '../services/requests.js'
import { createRequestSchema } from '../validation/search.js'
import { notifyAdmins } from '../services/notifications.js'
import type { CandidateRequest, RequestStatus } from '../types/index.js'
import { messageSchema, respondSchema } from '../validation/candidate.js'

// Contact requests: candidate and company sides. Admin mediation lives in admin-requests.ts.
export const requestsRouter = Router()

/** Statuses the candidate may see in the history (earlier admin/company steps stay private). */
const CANDIDATE_VISIBLE: RequestStatus[] = ['forwarded_to_candidate', 'candidate_accepted', 'candidate_declined', 'introduced', 'interviewing', 'hired', 'not_selected', 'closed']

async function myCandidateId(req: Request) {
  const candidate = await Candidate.findOne({ userId: req.user!.id }).select('_id applicantNumber').lean()
  if (!candidate) throw notFound('You have not created a profile yet', 'NO_PROFILE')
  return candidate
}

/** Loads a request that has been forwarded to this candidate, or 404s (the candidate must not learn about others). */
async function forwardedRequest(req: Request) {
  if (!isValidObjectId(req.params.id)) throw notFound('Request not found')
  const candidate = await myCandidateId(req)
  const request = await ContactRequest.findOne({ _id: req.params.id, candidateId: candidate._id, 'history.status': 'forwarded_to_candidate' })
  if (!request) throw notFound('Request not found')
  return { request, candidate }
}

function toCandidateRequest(r: any): CandidateRequest {
  return {
    id: String(r._id),
    status: r.status,
    company: { name: r.companyId?.name ?? 'A company', industry: r.companyId?.industry ?? undefined, website: r.companyId?.website ?? undefined, size: r.companyId?.size ?? undefined },
    roleTitle: r.roleTitle ?? undefined,
    job: r.jobId ? { id: String(r.jobId._id), title: r.jobId.title } : undefined,
    message: r.forwardedMessage ?? r.message,
    proposedTimes: (r.proposedTimes ?? []).map((d: Date) => d.toISOString()),
    candidateNote: r.candidateNote ?? undefined,
    interviewDate: r.interviewDate?.toISOString(),
    messages: r.messages.filter((m: any) => m.thread === 'candidate').map((m: any) => ({ id: String(m._id), fromRole: m.fromRole, text: m.text, at: m.at.toISOString() })),
    history: r.history.filter((h: any) => CANDIDATE_VISIBLE.includes(h.status)).map((h: any) => ({ status: h.status, at: h.at.toISOString() })),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

const populate = [
  { path: 'companyId', select: 'name industry website size' },
  { path: 'jobId', select: 'title' },
]

requestsRouter.get('/mine', authorize('candidate'), async (req, res) => {
  const candidate = await myCandidateId(req)
  const requests = await ContactRequest.find({ candidateId: candidate._id, 'history.status': 'forwarded_to_candidate' }).sort({ updatedAt: -1 }).populate(populate).lean()
  res.json({ data: requests.map(toCandidateRequest) })
})

requestsRouter.post('/:id/respond', authorize('candidate'), validate({ body: respondSchema }), async (req, res) => {
  const { decision, note } = req.body as z.infer<typeof respondSchema>
  const { request, candidate } = await forwardedRequest(req)
  if (request.status !== 'forwarded_to_candidate') throw badRequest('You have already responded to this request', 'ALREADY_RESPONDED')

  request.candidateNote = note
  await transition(req, request, decision === 'accept' ? 'candidate_accepted' : 'candidate_declined', note)
  await notifyAdmins(
    `${candidate.applicantNumber} ${decision === 'accept' ? 'accepted' : 'declined'} a contact request`,
    [`Candidate ${candidate.applicantNumber} ${decision === 'accept' ? 'accepted' : 'declined'} the request.`, note ? `Their note: "${note}"` : 'No note was added.'],
    { label: 'Open the request', path: `/admin/requests/${request._id}` },
  )

  await Candidate.updateOne({ _id: candidate._id }, { lastActiveAt: new Date() })
  await request.populate(populate)
  res.json({ data: toCandidateRequest(request.toObject()) })
})

requestsRouter.post('/:id/messages', authorize('candidate'), validate({ body: messageSchema }), async (req, res) => {
  const { text } = req.body as z.infer<typeof messageSchema>
  const { request, candidate } = await forwardedRequest(req)
  request.messages.push({ thread: 'candidate', from: req.user!.id, fromRole: 'candidate', to: 'admin', text, at: new Date() })
  await request.save()
  await notifyAdmins(`New message from ${candidate.applicantNumber}`, [text], { label: 'Open the request', path: `/admin/requests/${request._id}` })
  await Candidate.updateOne({ _id: candidate._id }, { lastActiveAt: new Date() })
  await request.populate(populate)
  res.json({ data: toCandidateRequest(request.toObject()) })
})

// ---- Company side ------------------------------------------------------------------------

const companyPopulate = [
  { path: 'candidateId', select: 'applicantNumber headline' },
  { path: 'jobId', select: 'title' },
]

async function companyRequest(req: Request, res: Response) {
  const company: CompanyDoc = res.locals.company ?? (await myCompany(req))
  if (!isValidObjectId(req.params.id)) throw notFound('Request not found')
  const request = await ContactRequest.findOne({ _id: req.params.id, companyId: company._id })
  if (!request) throw notFound('Request not found')
  return { request, company }
}

/**
 * "Request to speak": goes to the admin team first, never directly to the candidate.
 * Companies not approved yet (or with an unconfirmed email) can send too: the request waits in
 * awaiting_company_approval and enters the review queue once the company is approved.
 */
requestsRouter.post('/', authorize('company'), requireActiveCompany, contactRequestLimiter, validate({ body: createRequestSchema }), async (req, res) => {
  const company: CompanyDoc = res.locals.company
  const input = req.body as z.infer<typeof createRequestSchema>

  const candidate = await Candidate.findOne({ _id: input.candidateId, visible: true }).select('applicantNumber').lean()
  if (!candidate) throw notFound('This profile is no longer available')
  let job: { _id: Types.ObjectId; title: string } | null = null
  if (input.jobId) {
    job = await Job.findOne({ _id: input.jobId, companyId: company._id }).select('title').lean()
    if (!job) throw badRequest('Choose one of your own positions', 'INVALID_JOB')
  }
  if (await ContactRequest.exists({ companyId: company._id, candidateId: candidate._id, status: { $in: ACTIVE_STATUSES } })) {
    throw conflict('You already have an open request for this candidate', 'REQUEST_EXISTS')
  }

  const ready = company.status === 'approved' && Boolean(req.user!.isVerified)
  const status: RequestStatus = ready ? 'pending_admin_review' : 'awaiting_company_approval'
  const request = await ContactRequest.create({
    companyId: company._id,
    candidateId: candidate._id,
    jobId: job?._id,
    roleTitle: input.roleTitle ?? job?.title,
    message: input.message,
    proposedTimes: input.proposedTimes,
    status,
    history: [{ status, by: req.user!.id, at: new Date() }],
  })
  await audit(req, { action: 'request.created', targetType: 'ContactRequest', targetId: request._id, meta: { to: status, applicantNumber: candidate.applicantNumber } })
  const waitingNote = ready ? [] : [`${company.name} is not approved yet${req.user!.isVerified ? '' : ' and has not confirmed its email'}. The request waits until it is.`]
  await notifyAdmins(`${ready ? 'New contact request' : 'Contact request waiting for company approval'}: ${company.name} → ${candidate.applicantNumber}`, [`${company.name} would like to speak with ${candidate.applicantNumber}${job ? ` about "${job.title}"` : ''}.`, ...waitingNote, input.message], {
    label: 'Review the request',
    path: `/admin/requests/${request._id}`,
  })
  await request.populate(companyPopulate)
  res.status(201).json({ data: toCompanyRequest(request.toObject()) })
})

requestsRouter.get('/company', authorize('company'), async (req, res) => {
  const company = await myCompany(req)
  const requests = await ContactRequest.find({ companyId: company._id }).sort({ updatedAt: -1 }).populate(companyPopulate).lean()
  res.json({ data: requests.map(toCompanyRequest) })
})

requestsRouter.get('/company/:id', authorize('company'), async (req, res) => {
  const { request } = await companyRequest(req, res)
  await request.populate(companyPopulate)
  res.json({ data: toCompanyRequest(request.toObject()) })
})

/** Company → admin message. Answering an info request puts the request back in the review queue. */
requestsRouter.post('/company/:id/messages', authorize('company'), validate({ body: messageSchema }), async (req, res) => {
  const { text } = req.body as z.infer<typeof messageSchema>
  const { request, company } = await companyRequest(req, res)
  if (request.status === 'rejected' || request.status === 'closed') throw badRequest('This request is closed')
  pushMessage(request, 'company', req.user!.id, 'company', text)
  if (request.status === 'info_requested') await transition(req, request, 'pending_admin_review', 'Company replied')
  else await request.save()
  await notifyAdmins(`Message from ${company.name}`, [text], { label: 'Open the request', path: `/admin/requests/${request._id}` })
  await request.populate(companyPopulate)
  res.json({ data: toCompanyRequest(request.toObject()) })
})

/** CV download for the company, only if the admin shared it at the introduction step. Logged. */
requestsRouter.get('/company/:id/cv', authorize('company'), async (req, res) => {
  const { request } = await companyRequest(req, res)
  if (!request.sharedDetails?.cvShared) throw forbidden('The CV has not been shared for this request')
  const candidate = await Candidate.findById(request.candidateId).select('cvFile applicantNumber').lean()
  if (!candidate?.cvFile?.key) throw notFound('CV not available')
  await audit(req, { action: 'cv.downloaded', targetType: 'Candidate', targetId: candidate._id, meta: { applicantNumber: candidate.applicantNumber, requestId: String(request._id), by: 'company' } })
  res.json({ data: { url: await signedFileUrl(candidate.cvFile) } })
})
