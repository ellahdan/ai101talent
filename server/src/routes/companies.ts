import { Router, type Request, type Response } from 'express'
import { isValidObjectId } from 'mongoose'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { invalidateCache } from '../lib/cache.js'
import { badRequest, notFound } from '../lib/errors.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Job, type CompanyDoc } from '../models/index.js'
import { myCompany, requireApprovedCompany, toCompanyProfile } from '../services/companies.js'
import { applicationCounts, jobFields, populateCompany, toManagedJob, type LeanJob } from '../services/jobs.js'
import { notifyAdmins } from '../services/notifications.js'
import { companyDetailsSchema } from '../validation/auth.js'
import { jobInputSchema } from '../validation/job.js'

// The logged-in company's own profile and job postings.
export const companiesRouter = Router()
companiesRouter.use(authorize('company'))

companiesRouter.get('/me', async (req, res) => {
  const company = await myCompany(req)
  res.json({ data: toCompanyProfile(company, req.user!.email) })
})

companiesRouter.put('/me', validate({ body: companyDetailsSchema }), async (req, res) => {
  const company = await myCompany(req)
  company.set(req.body as z.infer<typeof companyDetailsSchema>)
  await company.save()
  invalidateCache('public:')
  res.json({ data: toCompanyProfile(company, req.user!.email) })
})

// ---- Job postings ----------------------------------------------------------------

async function ownJob(req: Request, res: Response) {
  const company: CompanyDoc = res.locals.company ?? (await myCompany(req))
  if (!isValidObjectId(req.params.id)) throw notFound('Position not found')
  const job = await Job.findOne({ _id: req.params.id, companyId: company._id })
  if (!job) throw notFound('Position not found')
  return { job, company }
}

async function respondWithJob(res: Response, jobId: unknown, status = 200) {
  const job = await Job.findById(jobId).populate(populateCompany).lean<LeanJob>()
  const counts = await applicationCounts([job!._id])
  res.status(status).json({ data: toManagedJob(job!, counts.get(String(job!._id)) ?? 0) })
}

companiesRouter.get('/me/jobs', async (req, res) => {
  const company = await myCompany(req)
  const jobs = await Job.find({ companyId: company._id }).sort({ createdAt: -1 }).populate(populateCompany).lean<LeanJob[]>()
  const counts = await applicationCounts(jobs.map((j) => j._id))
  res.json({ data: jobs.map((j) => toManagedJob(j, counts.get(String(j._id)) ?? 0)) })
})

companiesRouter.get('/me/jobs/:id', async (req, res) => {
  const { job } = await ownJob(req, res)
  await respondWithJob(res, job._id)
})

/** New postings always wait for admin approval. */
companiesRouter.post('/me/jobs', requireApprovedCompany, validate({ body: jobInputSchema }), async (req, res) => {
  const company: CompanyDoc = res.locals.company
  const job = await Job.create({ ...jobFields(req.body as z.infer<typeof jobInputSchema>), companyId: company._id, status: 'pending', createdBy: req.user!.id })
  await audit(req, { action: 'job.created', targetType: 'Job', targetId: job._id, meta: { title: job.title } })
  await notifyAdmins(`New position to review: ${job.title}`, [`${company.name} submitted "${job.title}" for approval.`], { label: 'Review positions', path: '/admin/jobs?status=pending' })
  await respondWithJob(res, job._id, 201)
})

/** Editing a published posting sends it back for review, so every live listing has been checked. */
companiesRouter.put('/me/jobs/:id', requireApprovedCompany, validate({ body: jobInputSchema }), async (req, res) => {
  const { job, company } = await ownJob(req, res)
  if (job.status === 'closed') throw badRequest('Reopen this position before editing it', 'JOB_CLOSED')
  const wasOpen = job.status === 'open'
  job.set({ ...jobFields(req.body as z.infer<typeof jobInputSchema>), status: 'pending', moderationNote: undefined })
  await job.save()
  await audit(req, { action: 'job.updated', targetType: 'Job', targetId: job._id, meta: { resubmitted: wasOpen } })
  if (wasOpen) invalidateCache('public:')
  await notifyAdmins(`Position updated: ${job.title}`, [`${company.name} edited "${job.title}". It is waiting for review${wasOpen ? ' and hidden until approved' : ''}.`], { label: 'Review positions', path: '/admin/jobs?status=pending' })
  await respondWithJob(res, job._id)
})

companiesRouter.post('/me/jobs/:id/close', async (req, res) => {
  const { job } = await ownJob(req, res)
  if (job.status === 'closed') throw badRequest('This position is already closed')
  job.status = 'closed'
  job.closedAt = new Date()
  await job.save()
  await audit(req, { action: 'job.closed', targetType: 'Job', targetId: job._id })
  invalidateCache('public:')
  await respondWithJob(res, job._id)
})

/** Reopening goes through review again. */
companiesRouter.post('/me/jobs/:id/reopen', requireApprovedCompany, async (req, res) => {
  const { job, company } = await ownJob(req, res)
  if (job.status !== 'closed') throw badRequest('Only closed positions can be reopened')
  job.status = 'pending'
  job.closedAt = undefined
  await job.save()
  await audit(req, { action: 'job.reopen_requested', targetType: 'Job', targetId: job._id })
  await notifyAdmins(`Reopen requested: ${job.title}`, [`${company.name} asked to reopen "${job.title}".`], { label: 'Review positions', path: '/admin/jobs?status=pending' })
  await respondWithJob(res, job._id)
})
