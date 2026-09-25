import { Router, type Response } from 'express'
import { isValidObjectId, type QueryFilter } from 'mongoose'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { invalidateCache } from '../lib/cache.js'
import { companyStatusMessage, jobStatusMessage } from '../lib/emails.js'
import { badRequest, notFound } from '../lib/errors.js'
import { escapeRegex } from '../lib/html.js'
import { sendMail } from '../lib/mailer.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Company, ContactRequest, Job, User, type CompanyFields, type JobFields } from '../models/index.js'
import { toCompanyProfile } from '../services/companies.js'
import { closeWaitingRequests, releaseWaitingRequests } from '../services/requests.js'
import { applicationCounts, jobFields, populateCompany, toManagedJob, type LeanJob } from '../services/jobs.js'
import type { AdminCompany, AdminSummary } from '../types/index.js'
import { adminCompanyListSchema, adminJobListSchema, adminJobSchema, companyStatusSchema, featuredSchema, jobStatusSchema } from '../validation/job.js'

// Admin back office. Phase 5 covers company and job moderation; later phases add the rest.
export const adminRouter = Router()
adminRouter.use(authorize('admin'))

const byId = (id: string | string[]) => {
  if (Array.isArray(id)) throw notFound()
  if (!isValidObjectId(id)) throw notFound()
  return id
}

adminRouter.get('/summary', async (_req, res) => {
  const [pendingCompanies, pendingJobs, requestsAwaitingReview, requestsNeedingAction] = await Promise.all([
    Company.countDocuments({ status: 'pending' }),
    Job.countDocuments({ status: 'pending' }),
    ContactRequest.countDocuments({ status: 'pending_admin_review' }),
    ContactRequest.countDocuments({ status: { $in: ['pending_admin_review', 'candidate_accepted'] } }),
  ])
  const data: AdminSummary = { pendingCompanies, pendingJobs, requestsAwaitingReview, requestsNeedingAction }
  res.json({ data })
})

// ---- Companies ----------------------------------------------------------------------

async function toAdminCompanies(companies: (CompanyFields & { _id: any; createdAt: Date })[]): Promise<AdminCompany[]> {
  const ids = companies.map((c) => c._id)
  const [users, jobStats, requestStats] = await Promise.all([
    User.find({ _id: { $in: companies.map((c) => c.userId) } }).select('email isVerified').lean(),
    Job.aggregate<{ _id: any; total: number; open: number }>([
      { $match: { companyId: { $in: ids } } },
      { $group: { _id: '$companyId', total: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } } } },
    ]),
    ContactRequest.aggregate<{ _id: any; n: number }>([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', n: { $sum: 1 } } }]),
  ])
  const userById = new Map(users.map((u) => [String(u._id), u]))
  const jobsBy = new Map(jobStats.map((j) => [String(j._id), j]))
  const requestsBy = new Map(requestStats.map((r) => [String(r._id), r.n]))
  return companies.map((c) => {
    const user = userById.get(String(c.userId))
    return {
      ...toCompanyProfile(c as any, user?.email ?? ''),
      isVerified: Boolean(user?.isVerified),
      jobCount: jobsBy.get(String(c._id))?.total ?? 0,
      openJobCount: jobsBy.get(String(c._id))?.open ?? 0,
      requestCount: requestsBy.get(String(c._id)) ?? 0,
    }
  })
}

adminRouter.get('/companies', validate({ query: adminCompanyListSchema }), async (req, res) => {
  const { status, q } = req.query as z.infer<typeof adminCompanyListSchema>
  const filter: QueryFilter<CompanyFields> = {}
  if (status) filter.status = status
  if (q) filter.name = new RegExp(escapeRegex(q), 'i')
  const companies = await Company.find(filter).sort({ status: 1, createdAt: -1 }).limit(500).lean()
  res.json({ data: await toAdminCompanies(companies as any) })
})

adminRouter.patch('/companies/:id/status', validate({ body: companyStatusSchema }), async (req, res) => {
  const { status, note } = req.body as z.infer<typeof companyStatusSchema>
  const company = await Company.findById(byId(req.params.id))
  if (!company) throw notFound('Company not found')
  const previous = company.status
  if (previous === status) throw badRequest(`The company is already ${status}`)

  company.status = status
  company.statusNote = note
  if (status === 'approved') company.approvedAt = new Date()
  await company.save()
  await audit(req, { action: `company.${status}`, targetType: 'Company', targetId: company._id, meta: { from: previous, note } })
  invalidateCache('public:')

  const user = await User.findById(company.userId).select('email isVerified').lean()
  // Contact requests saved while the company waited for approval.
  if (status === 'approved') await releaseWaitingRequests(req, company._id, Boolean(user?.isVerified))
  if (status === 'suspended') await closeWaitingRequests(req, company._id, previous === 'pending' ? 'Company not approved' : 'Company suspended')
  if (user) await sendMail(companyStatusMessage(user.email, company.name, status, note))
  const [data] = await toAdminCompanies([company.toObject() as any])
  res.json({ data })
})

// ---- Jobs -------------------------------------------------------------------------------

async function respondWithJob(res: Response, jobId: unknown, status = 200) {
  const job = await Job.findById(jobId).populate(populateCompany).lean<LeanJob>()
  const counts = await applicationCounts([job!._id])
  res.status(status).json({ data: toManagedJob(job!, counts.get(String(job!._id)) ?? 0) })
}

adminRouter.get('/jobs', validate({ query: adminJobListSchema }), async (req, res) => {
  const { status, companyId, q } = req.query as z.infer<typeof adminJobListSchema>
  const filter: QueryFilter<JobFields> = {}
  if (status) filter.status = status
  if (companyId) filter.companyId = companyId
  if (q) filter.title = new RegExp(escapeRegex(q), 'i')
  const jobs = await Job.find(filter).sort({ status: 1, updatedAt: -1 }).limit(500).populate(populateCompany).lean<LeanJob[]>()
  const counts = await applicationCounts(jobs.map((j) => j._id))
  res.json({ data: jobs.map((j) => toManagedJob(j, counts.get(String(j._id)) ?? 0)) })
})

adminRouter.get('/jobs/:id', async (req, res) => {
  if (!(await Job.exists({ _id: byId(req.params.id) }))) throw notFound('Position not found')
  await respondWithJob(res, req.params.id)
})

/** Admin-created jobs are published straight away. */
adminRouter.post('/jobs', validate({ body: adminJobSchema }), async (req, res) => {
  const { companyId, featured, ...input } = req.body as z.infer<typeof adminJobSchema>
  const company = await Company.findById(companyId)
  if (!company) throw badRequest('Company not found')
  if (company.status !== 'approved') throw badRequest('Jobs can only be published for approved companies')
  const job = await Job.create({ ...jobFields(input), companyId, featured, status: 'open', publishedAt: new Date(), createdBy: req.user!.id })
  await audit(req, { action: 'job.created', targetType: 'Job', targetId: job._id, meta: { title: job.title, byAdmin: true } })
  invalidateCache('public:')
  await respondWithJob(res, job._id, 201)
})

adminRouter.put('/jobs/:id', validate({ body: adminJobSchema }), async (req, res) => {
  const { companyId, featured, ...input } = req.body as z.infer<typeof adminJobSchema>
  const job = await Job.findById(byId(req.params.id))
  if (!job) throw notFound('Position not found')
  if (String(job.companyId) !== companyId && !(await Company.exists({ _id: companyId }))) throw badRequest('Company not found')
  job.set({ ...jobFields(input), companyId, featured })
  await job.save()
  await audit(req, { action: 'job.updated', targetType: 'Job', targetId: job._id, meta: { byAdmin: true } })
  invalidateCache('public:')
  await respondWithJob(res, job._id)
})

/** Approve (pending → open), reject (pending → closed with a note), close, reopen or send back to review. */
adminRouter.patch('/jobs/:id/status', validate({ body: jobStatusSchema }), async (req, res) => {
  const { status, note } = req.body as z.infer<typeof jobStatusSchema>
  const job = await Job.findById(byId(req.params.id)).populate<{ companyId: { _id: any; name: string; status: string; userId: any } }>('companyId', 'name status userId')
  if (!job) throw notFound('Position not found')
  const previous = job.status
  if (previous === status) throw badRequest(`The position is already ${status}`)
  if (status === 'open' && job.companyId.status !== 'approved') throw badRequest('Approve the company before publishing its positions')

  job.status = status
  job.moderationNote = note
  if (status === 'open') {
    job.publishedAt ??= new Date()
    job.closedAt = undefined
  }
  if (status === 'closed') job.closedAt = new Date()
  await job.save()

  const outcome = status === 'open' ? (previous === 'closed' ? 'reopened' : 'approved') : status === 'closed' ? (previous === 'pending' ? 'rejected' : 'closed') : null
  await audit(req, { action: outcome ? `job.${outcome}` : 'job.status_changed', targetType: 'Job', targetId: job._id, meta: { from: previous, to: status, note } })
  invalidateCache('public:')
  const owner = await User.findById(job.companyId.userId).select('email').lean()
  if (owner && outcome) await sendMail(jobStatusMessage(owner.email, job.title, String(job._id), outcome, note))
  await respondWithJob(res, job._id)
})

adminRouter.patch('/jobs/:id/featured', validate({ body: featuredSchema }), async (req, res) => {
  const { featured } = req.body as z.infer<typeof featuredSchema>
  const job = await Job.findById(byId(req.params.id))
  if (!job) throw notFound('Position not found')
  job.featured = featured
  await job.save()
  await audit(req, { action: featured ? 'job.featured' : 'job.unfeatured', targetType: 'Job', targetId: job._id })
  invalidateCache('public:')
  await respondWithJob(res, job._id)
})
