import { Router, type Request } from 'express'
import { isValidObjectId, type QueryFilter } from 'mongoose'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { notificationMessage } from '../lib/emails.js'
import { badRequest, notFound } from '../lib/errors.js'
import { sendMail } from '../lib/mailer.js'
import { signedFileUrl } from '../lib/storage.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Candidate, ContactRequest, User, type ContactRequestFields } from '../models/index.js'
import { pushMessage, toAdminRequest, transition } from '../services/requests.js'
import type { RequestStatus, Role } from '../types/index.js'
import { adminMessageSchema, adminRequestListSchema, forwardSchema, infoRequestSchema, introduceSchema, outcomeSchema, reasonSchema } from '../validation/search.js'

// Admin mediation of contact requests: company → admin review → candidate → admin introduction.
export const adminRequestsRouter = Router()
adminRequestsRouter.use(authorize('admin'))

const GROUPS: Record<'action' | 'active' | 'closed', RequestStatus[]> = {
  action: ['pending_admin_review', 'candidate_accepted'],
  active: ['info_requested', 'forwarded_to_candidate', 'introduced', 'interviewing'],
  closed: ['rejected', 'candidate_declined', 'hired', 'not_selected', 'closed'],
}

const populate = [
  { path: 'companyId', select: 'name status industry website contactPerson userId', populate: { path: 'userId', select: 'email' } },
  { path: 'candidateId', select: 'applicantNumber fullName headline email phone links visible cvFile' },
  { path: 'jobId', select: 'title status' },
]

async function load(req: Request) {
  if (!isValidObjectId(req.params.id)) throw notFound('Request not found')
  const request = await ContactRequest.findById(req.params.id)
  if (!request) throw notFound('Request not found')
  return request
}

/** Serializes one or more requests, resolving who performed each history step. */
async function serialize(requests: any[]) {
  const actorIds = [...new Set(requests.flatMap((r) => r.history.map((h: any) => String(h.by)).filter(Boolean)))]
  const actors = await User.find({ _id: { $in: actorIds } }).select('role').lean()
  const roles = new Map<string, Role>(actors.map((a) => [String(a._id), a.role]))
  return requests.map((r) => toAdminRequest(r, roles))
}

async function respond(res: any, requestId: unknown) {
  const request = await ContactRequest.findById(requestId).populate(populate).lean()
  const [data] = await serialize([request])
  res.json({ data })
}

/** Contact details of both parties for emails. */
async function parties(requestId: unknown) {
  const r = await ContactRequest.findById(requestId).populate(populate).lean<any>()
  return {
    companyEmail: r.companyId?.userId?.email as string | undefined,
    companyName: r.companyId?.name as string,
    candidateEmail: r.candidateId?.email as string | undefined,
    candidateName: r.candidateId?.fullName as string | undefined,
    applicantNumber: r.candidateId?.applicantNumber as string,
    role: (r.jobId?.title ?? r.roleTitle ?? 'a role') as string,
  }
}

adminRequestsRouter.get('/', validate({ query: adminRequestListSchema }), async (req, res) => {
  const { status, group } = req.query as z.infer<typeof adminRequestListSchema>
  const filter: QueryFilter<ContactRequestFields> = {}
  if (status) filter.status = status
  else if (group) filter.status = { $in: GROUPS[group] }
  const requests = await ContactRequest.find(filter).sort({ updatedAt: -1 }).limit(300).populate(populate).lean()
  res.json({ data: await serialize(requests) })
})

adminRequestsRouter.get('/:id', async (req, res) => {
  const request = await load(req)
  await respond(res, request._id)
})

/** Approve and forward to the candidate, optionally with an edited message. */
adminRequestsRouter.post('/:id/forward', validate({ body: forwardSchema }), async (req, res) => {
  const { message } = req.body as z.infer<typeof forwardSchema>
  const request = await load(req)
  const candidate = await Candidate.findById(request.candidateId).select('visible').lean()
  if (!candidate) throw badRequest('The candidate deleted their profile')
  request.forwardedMessage = message
  await transition(req, request, 'forwarded_to_candidate', message === request.message ? undefined : 'Message edited before forwarding')
  const p = await parties(request._id)
  if (p.candidateEmail) {
    await sendMail(
      notificationMessage(p.candidateEmail, `${p.companyName} would like to speak with you`, 'A company would like to speak with you', [
        `${p.companyName} asked to speak with you about ${p.role}. Our team reviewed the request and thinks it's worth your time.`,
        'Your contact details have not been shared. Accept or decline from your dashboard.',
      ], { label: 'Review the request', path: `/candidate/requests#${request._id}` }),
    )
  }
  await respond(res, request._id)
})

adminRequestsRouter.post('/:id/request-info', validate({ body: infoRequestSchema }), async (req, res) => {
  const { message } = req.body as z.infer<typeof infoRequestSchema>
  const request = await load(req)
  pushMessage(request, 'company', req.user!.id, 'admin', message)
  await transition(req, request, 'info_requested', message)
  const p = await parties(request._id)
  if (p.companyEmail) {
    await sendMail(notificationMessage(p.companyEmail, `More information needed: request for ${p.applicantNumber}`, 'We need a bit more information', [message, 'Reply from your dashboard and we will continue the review.'], { label: 'Reply', path: '/company/requests' }))
  }
  await respond(res, request._id)
})

adminRequestsRouter.post('/:id/reject', validate({ body: reasonSchema }), async (req, res) => {
  const { reason } = req.body as z.infer<typeof reasonSchema>
  const request = await load(req)
  request.rejectionReason = reason
  await transition(req, request, 'rejected', reason)
  const p = await parties(request._id)
  if (p.companyEmail) {
    await sendMail(notificationMessage(p.companyEmail, `Your request for ${p.applicantNumber} was not forwarded`, 'Your request was not forwarded', [`We reviewed your request to speak with ${p.applicantNumber} and decided not to forward it.`, `Reason: ${reason}`], { label: 'Your requests', path: '/company/requests' }))
  }
  await respond(res, request._id)
})

/** Introduce the company and candidate, sharing only the details the admin picked. */
adminRequestsRouter.post('/:id/introduce', validate({ body: introduceSchema }), async (req, res) => {
  const { share, note, interviewDate } = req.body as z.infer<typeof introduceSchema>
  const request = await load(req)
  const candidate = await Candidate.findById(request.candidateId).select('fullName email phone links cvFile applicantNumber').lean()
  if (!candidate) throw badRequest('The candidate deleted their profile')
  if (share.cv && !candidate.cvFile?.key) throw badRequest('This candidate has no CV to share')
  if (!Object.values(share).some(Boolean)) throw badRequest('Share at least one detail so the company can reach the candidate')

  request.sharedDetails = {
    fullName: share.fullName ? candidate.fullName : undefined,
    email: share.email ? candidate.email : undefined,
    phone: share.phone ? (candidate.phone ?? undefined) : undefined,
    linkedin: share.linkedin ? (candidate.links?.linkedin ?? undefined) : undefined,
    cvShared: share.cv,
    note,
    sharedAt: new Date(),
  }
  if (interviewDate) request.interviewDate = interviewDate
  await transition(req, request, 'introduced', note)
  await audit(req, { action: 'request.details_shared', targetType: 'ContactRequest', targetId: request._id, meta: { applicantNumber: candidate.applicantNumber, shared: Object.keys(share).filter((k) => share[k as keyof typeof share]) } })

  const p = await parties(request._id)
  const sd = request.sharedDetails
  if (p.companyEmail) {
    await sendMail(
      notificationMessage(p.companyEmail, `Introduction: ${p.applicantNumber}`, "You've been introduced", [
        `${p.applicantNumber} accepted your request about ${p.role}. Here are the details they agreed to share:`,
        [sd.fullName && `Name: ${sd.fullName}`, sd.email && `Email: ${sd.email}`, sd.phone && `Phone: ${sd.phone}`, sd.linkedin && `LinkedIn: ${sd.linkedin}`, sd.cvShared && 'CV: available from your dashboard'].filter(Boolean).join(' · '),
        ...(interviewDate ? [`Interview: ${interviewDate.toUTCString()}`] : []),
        ...(note ? [note] : []),
      ], { label: 'Open the request', path: '/company/requests' }),
    )
  }
  if (p.candidateEmail) {
    await sendMail(notificationMessage(p.candidateEmail, `You've been introduced to ${p.companyName}`, "You've been introduced", [`We've introduced you to ${p.companyName} for ${p.role}. They will contact you directly.`, ...(interviewDate ? [`Interview: ${interviewDate.toUTCString()}`] : []), ...(note ? [note] : [])], { label: 'Open your requests', path: '/candidate/requests' }))
  }
  await respond(res, request._id)
})

/** Record what happened after the introduction: interviewing, hired, not selected or closed. */
adminRequestsRouter.post('/:id/outcome', validate({ body: outcomeSchema }), async (req, res) => {
  const { status, note, interviewDate } = req.body as z.infer<typeof outcomeSchema>
  const request = await load(req)
  if (interviewDate) request.interviewDate = interviewDate
  await transition(req, request, status, note)
  if (status !== 'closed') {
    const p = await parties(request._id)
    const text = { interviewing: 'Interviews are under way', hired: 'Congratulations on the hire!', not_selected: 'The process has ended without a hire' }[status]
    for (const [to, path] of [[p.companyEmail, '/company/requests'], [p.candidateEmail, '/candidate/requests']] as const) {
      if (to) await sendMail(notificationMessage(to, `Update: ${p.role}`, text, [`Status update for ${p.role}: ${text.toLowerCase()}.`, ...(interviewDate ? [`Interview: ${interviewDate.toUTCString()}`] : []), ...(note ? [note] : [])], { label: 'Open', path }))
    }
  }
  await respond(res, request._id)
})

adminRequestsRouter.post('/:id/messages', validate({ body: adminMessageSchema }), async (req, res) => {
  const { thread, text } = req.body as z.infer<typeof adminMessageSchema>
  const request = await load(req)
  if (thread === 'candidate' && !request.history.some((h) => h.status === 'forwarded_to_candidate')) {
    throw badRequest("Forward the request before messaging the candidate: they don't know about it yet")
  }
  pushMessage(request, thread, req.user!.id, 'admin', text)
  await request.save()
  const p = await parties(request._id)
  const to = thread === 'company' ? p.companyEmail : p.candidateEmail
  if (to) await sendMail(notificationMessage(to, 'New message from the AI101 Talents team', 'You have a new message', [text], { label: 'Reply', path: thread === 'company' ? '/company/requests' : `/candidate/requests#${request._id}` }))
  await respond(res, request._id)
})

/** Admin CV access (logged). */
adminRequestsRouter.get('/:id/cv', async (req, res) => {
  const request = await load(req)
  const candidate = await Candidate.findById(request.candidateId).select('cvFile applicantNumber').lean()
  if (!candidate?.cvFile?.key) throw notFound('CV not available')
  await audit(req, { action: 'cv.downloaded', targetType: 'Candidate', targetId: candidate._id, meta: { applicantNumber: candidate.applicantNumber, requestId: String(request._id) } })
  res.json({ data: { url: await signedFileUrl(candidate.cvFile, { inline: true }) } })
})
