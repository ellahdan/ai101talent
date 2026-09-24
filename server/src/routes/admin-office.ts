import { Router, type Request } from 'express'
import { isValidObjectId, type QueryFilter, type Types } from 'mongoose'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { createOneTimeToken, hashPassword } from '../lib/auth.js'
import { toCsv } from '../lib/csv.js'
import { notificationMessage } from '../lib/emails.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { escapeRegex } from '../lib/html.js'
import { sendMail } from '../lib/mailer.js'
import { signedFileUrl } from '../lib/storage.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Application, AuditLog, Candidate, Company, ContactRequest, Job, User, type AuditLogFields, type CandidateFields } from '../models/index.js'
import { toCandidateProfile } from '../services/candidates.js'
import { candidateQuery, highlightTerms, snippet } from '../services/search.js'
import { getSettings, updateSettings } from '../services/settings.js'
import {
  APPLICATION_STATUSES,
  REQUEST_STATUSES,
  type AdminCandidateDetail,
  type AdminCandidateRow,
  type AdminCandidateSearch,
  type AdminDashboard,
  type AdminUser,
  type AuditEntry,
  type Pipeline,
  type Role,
} from '../types/index.js'
import { adminCandidateSearchSchema, applicationStatusSchema, auditQuerySchema, inviteAdminSchema, settingsSchema } from '../validation/admin.js'
import { randomBytes } from 'node:crypto'

// Admin back office: dashboard, candidate search & detail, pipeline, audit log, settings.
export const adminOfficeRouter = Router()
adminOfficeRouter.use(authorize('admin'))

const byId = (id: string | string[], what = 'Not found') => {
  if (Array.isArray(id) || !isValidObjectId(id)) throw notFound(what)
  return id
}
const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

// ---- Dashboard ---------------------------------------------------------------------------

adminOfficeRouter.get('/dashboard', async (_req, res) => {
  const WEEKS = 12
  const monday = new Date()
  monday.setUTCHours(0, 0, 0, 0)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const since = new Date(monday.getTime() - (WEEKS - 1) * 7 * 86_400_000)

  const [candidates, applications, openJobs, pendingCompanies, pendingJobs, requestsAwaitingReview, hiredRequests, hiredApps, perWeek, appStatus, reqStatus, topSkills] = await Promise.all([
    Candidate.countDocuments(),
    Application.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Company.countDocuments({ status: 'pending' }),
    Job.countDocuments({ status: 'pending' }),
    ContactRequest.countDocuments({ status: 'pending_admin_review' }),
    ContactRequest.countDocuments({ status: 'hired' }),
    Application.countDocuments({ status: 'hired' }),
    Candidate.aggregate<{ _id: Date; n: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'week', startOfWeek: 'monday', timezone: 'UTC' } }, n: { $sum: 1 } } },
    ]),
    Application.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ContactRequest.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Candidate.aggregate<{ name: string; count: number }>([
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills.name' }, name: { $first: '$skills.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1, name: 1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: 1, count: 1 } },
    ]),
  ])

  const weekCounts = new Map(perWeek.map((w) => [w._id.toISOString().slice(0, 10), w.n]))
  const byStatus = (rows: { _id: string; n: number }[]) => new Map(rows.map((r) => [r._id, r.n]))
  const apps = byStatus(appStatus)
  const reqs = byStatus(reqStatus)

  const data: AdminDashboard = {
    kpis: { candidates, applications, openJobs, pendingCompanies, pendingJobs, requestsAwaitingReview, hires: hiredRequests + hiredApps },
    candidatesPerWeek: Array.from({ length: WEEKS }, (_, i) => {
      const weekStart = new Date(since.getTime() + i * 7 * 86_400_000).toISOString().slice(0, 10)
      return { weekStart, count: weekCounts.get(weekStart) ?? 0 }
    }),
    applicationsByStatus: APPLICATION_STATUSES.map((status) => ({ status, count: apps.get(status) ?? 0 })),
    requestsByStatus: REQUEST_STATUSES.map((status) => ({ status, count: reqs.get(status) ?? 0 })),
    topSkills,
  }
  res.json({ data })
})

// ---- Candidate search (all candidates, full identity) ----------------------------------------

type AdminSearch = z.infer<typeof adminCandidateSearchSchema>

async function adminCandidateFilter(q: AdminSearch) {
  const base: QueryFilter<CandidateFields>[] = []
  if (q.visibility !== 'all') base.push({ visible: q.visibility === 'visible' })
  if (q.tools.length) base.push(...q.tools.map((t) => ({ tools: new RegExp(`^${escapeRegex(t)}$`, 'i') })))
  if (q.applicantNumber) base.push({ applicantNumber: new RegExp(escapeRegex(q.applicantNumber.trim().toUpperCase()), 'i') })
  if (q.jobId) base.push({ _id: { $in: await Application.distinct('candidateId', { jobId: q.jobId }) } })
  return candidateQuery(q, base)
}

function toRow(c: any, terms: string[]): AdminCandidateRow {
  return {
    id: String(c._id),
    applicantNumber: c.applicantNumber,
    fullName: c.fullName,
    email: c.email,
    headline: c.headline ?? '',
    totalYearsExperience: c.totalYearsExperience ?? 0,
    location: { country: c.location?.country ?? '', city: orUndefined(c.location?.city) },
    skills: (c.skills ?? []).map((s: any) => ({ name: s.name, years: orUndefined(s.years) })),
    tools: c.tools ?? [],
    languages: (c.languages ?? []).map((l: any) => ({ name: l.name, proficiency: l.proficiency })),
    visible: Boolean(c.visible),
    hasCv: Boolean(c.cvFile?.key),
    createdAt: c.createdAt.toISOString(),
    lastActiveAt: c.lastActiveAt?.toISOString(),
    cvSnippet: snippet(c.cvText, terms),
  }
}

const ROW_FIELDS = 'applicantNumber fullName email headline totalYearsExperience location skills tools languages visible cvFile createdAt lastActiveAt'

adminOfficeRouter.get('/candidates', validate({ query: adminCandidateSearchSchema }), async (req, res) => {
  const q = req.query as unknown as AdminSearch
  const { filter, sort, projection } = await adminCandidateFilter(q)
  const terms = highlightTerms(q.q, q.skills)
  const [total, rows] = await Promise.all([
    Candidate.countDocuments(filter),
    Candidate.find(filter, projection).select(`${ROW_FIELDS} ${terms.length ? '+cvText' : ''}`).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
  ])
  const data: AdminCandidateSearch = { items: rows.map((c) => toRow(c, terms)), page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)), terms }
  res.json({ data })
})

/** CSV export of the current search (up to 5,000 rows). Logged. */
adminOfficeRouter.get('/candidates/export', validate({ query: adminCandidateSearchSchema }), async (req, res) => {
  const q = req.query as unknown as AdminSearch
  const { filter, sort, projection } = await adminCandidateFilter(q)
  const rows = await Candidate.find(filter, projection).select(`${ROW_FIELDS} phone links availability noticePeriodWeeks workMode`).sort(sort).limit(5000).lean()
  await audit(req, { action: 'candidates.exported', targetType: 'Candidate', meta: { count: rows.length, filters: req.originalUrl.split('?')[1] ?? '' } })

  const csv = toCsv(
    ['Applicant number', 'Full name', 'Email', 'Phone', 'Country', 'City', 'Headline', 'Years of experience', 'Skills', 'Tools', 'Languages', 'Availability', 'Work mode', 'LinkedIn', 'Visible', 'Created', 'Last active'],
    rows.map((c) => [
      c.applicantNumber,
      c.fullName,
      c.email,
      c.phone,
      c.location?.country,
      c.location?.city,
      c.headline,
      c.totalYearsExperience,
      c.skills.map((s) => (s.years != null ? `${s.name} (${s.years}y)` : s.name)).join('; '),
      c.tools.join('; '),
      c.languages.map((l) => `${l.name} (${l.proficiency})`).join('; '),
      c.availability === 'notice_period' ? `Notice ${c.noticePeriodWeeks ?? '?'} weeks` : 'Immediately',
      c.workMode,
      c.links?.linkedin,
      c.visible ? 'yes' : 'no',
      c.createdAt.toISOString().slice(0, 10),
      c.lastActiveAt?.toISOString().slice(0, 10),
    ]),
  )
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="ai101-candidates-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
})

/** Full candidate record. Showing the CV text counts as viewing the CV, so it's logged. */
adminOfficeRouter.get('/candidates/:id', async (req, res) => {
  const candidate = await Candidate.findById(byId(req.params.id, 'Candidate not found')).select('+cvText')
  if (!candidate) throw notFound('Candidate not found')
  const [user, applications, requests] = await Promise.all([
    User.findById(candidate.userId).select('isVerified lastLoginAt createdAt').lean(),
    Application.find({ candidateId: candidate._id }).sort({ createdAt: -1 }).populate<{ jobId: any }>({ path: 'jobId', select: 'title companyId', populate: { path: 'companyId', select: 'name' } }).lean(),
    ContactRequest.find({ candidateId: candidate._id }).sort({ createdAt: -1 }).populate<{ companyId: any }>('companyId', 'name').select('status companyId roleTitle createdAt').lean(),
  ])
  await audit(req, { action: 'cv.viewed', targetType: 'Candidate', targetId: candidate._id, meta: { applicantNumber: candidate.applicantNumber } })

  const data: AdminCandidateDetail = {
    ...toCandidateProfile(candidate),
    cvText: orUndefined(candidate.cvText),
    lastActiveAt: candidate.lastActiveAt?.toISOString(),
    account: { isVerified: Boolean(user?.isVerified), lastLoginAt: user?.lastLoginAt?.toISOString(), createdAt: (user?.createdAt ?? candidate.get('createdAt')).toISOString() },
    applications: applications.filter((a) => a.jobId).map((a) => ({ id: String(a._id), status: a.status, createdAt: a.createdAt.toISOString(), job: { id: String(a.jobId._id), title: a.jobId.title, companyName: a.jobId.companyId?.name ?? '' } })),
    requests: requests.map((r) => ({ id: String(r._id), status: r.status, companyName: r.companyId?.name ?? '', roleTitle: orUndefined(r.roleTitle), createdAt: r.createdAt.toISOString() })),
  }
  res.json({ data })
})

adminOfficeRouter.get('/candidates/:id/files/:kind', async (req, res) => {
  const candidate = await Candidate.findById(byId(req.params.id, 'Candidate not found')).select('cvFile coverLetter applicantNumber').lean()
  const file = req.params.kind === 'cv' ? candidate?.cvFile : req.params.kind === 'cover-letter' ? candidate?.coverLetter?.file : undefined
  if (!candidate || !file?.key) throw notFound('File not found')
  await audit(req, { action: req.params.kind === 'cv' ? 'cv.downloaded' : 'cover_letter.downloaded', targetType: 'Candidate', targetId: candidate._id, meta: { applicantNumber: candidate.applicantNumber } })
  res.json({ data: { url: await signedFileUrl(file, { inline: true }) } })
})

// ---- Applications pipeline (Kanban) --------------------------------------------------------

adminOfficeRouter.get('/pipeline/:jobId', async (req, res) => {
  const job = await Job.findById(byId(req.params.jobId, 'Position not found')).populate<{ companyId: { name: string } }>('companyId', 'name').lean()
  if (!job) throw notFound('Position not found')
  const applications = await Application.find({ jobId: job._id })
    .sort({ updatedAt: -1 })
    .populate<{ candidateId: any }>('candidateId', 'applicantNumber fullName headline totalYearsExperience skills')
    .lean()
  const data: Pipeline = {
    job: { id: String(job._id), title: job.title, companyName: job.companyId?.name ?? '', status: job.status },
    applications: applications
      .filter((a) => a.candidateId)
      .map((a) => ({
        id: String(a._id),
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        candidate: {
          id: String(a.candidateId._id),
          applicantNumber: a.candidateId.applicantNumber,
          fullName: a.candidateId.fullName,
          headline: a.candidateId.headline ?? '',
          totalYearsExperience: a.candidateId.totalYearsExperience ?? 0,
          topSkills: (a.candidateId.skills ?? []).slice(0, 3).map((s: any) => s.name),
        },
        coverLetter: a.coverLetter?.text || a.coverLetter?.file?.key ? { text: orUndefined(a.coverLetter.text), hasFile: Boolean(a.coverLetter.file?.key) } : undefined,
      })),
  }
  res.json({ data })
})

adminOfficeRouter.patch('/applications/:id/status', validate({ body: applicationStatusSchema }), async (req, res) => {
  const { status, note } = req.body as z.infer<typeof applicationStatusSchema>
  const application = await Application.findById(byId(req.params.id, 'Application not found'))
  if (!application) throw notFound('Application not found')
  const from = application.status
  if (from === status) throw badRequest(`The application is already "${status}"`)
  application.status = status
  application.statusHistory.push({ status, by: req.user!.id as unknown as Types.ObjectId, note, at: new Date() })
  await application.save()
  await audit(req, { action: 'application.status_changed', targetType: 'Application', targetId: application._id, meta: { from, to: status, note } })
  res.json({ data: { id: String(application._id), status: application.status, updatedAt: application.updatedAt.toISOString() } })
})

adminOfficeRouter.get('/applications/:id/cover-letter', async (req, res) => {
  const application = await Application.findById(byId(req.params.id, 'Application not found')).lean()
  if (!application?.coverLetter?.file?.key) throw notFound('No cover letter file')
  await audit(req, { action: 'cover_letter.downloaded', targetType: 'Application', targetId: application._id })
  res.json({ data: { url: await signedFileUrl(application.coverLetter.file, { inline: true }) } })
})

// ---- Audit log ----------------------------------------------------------------------------------

/** Resolves readable labels (applicant numbers, company names, job titles) for a page of entries. */
async function targetLabels(entries: { targetType: string; targetId?: Types.ObjectId | null; meta?: any }[]) {
  const ids = (type: string) => entries.filter((e) => e.targetType === type && e.targetId).map((e) => e.targetId!)
  const [candidates, companies, jobs, requests, users, applications] = await Promise.all([
    Candidate.find({ _id: { $in: ids('Candidate') } }).select('applicantNumber').lean(),
    Company.find({ _id: { $in: ids('Company') } }).select('name').lean(),
    Job.find({ _id: { $in: ids('Job') } }).select('title').lean(),
    ContactRequest.find({ _id: { $in: ids('ContactRequest') } }).populate<{ companyId: any; candidateId: any }>([{ path: 'companyId', select: 'name' }, { path: 'candidateId', select: 'applicantNumber' }]).select('companyId candidateId').lean(),
    User.find({ _id: { $in: ids('User') } }).select('email').lean(),
    Application.find({ _id: { $in: ids('Application') } }).populate<{ jobId: any; candidateId: any }>([{ path: 'jobId', select: 'title' }, { path: 'candidateId', select: 'applicantNumber' }]).select('jobId candidateId').lean(),
  ])
  const labels = new Map<string, string>()
  for (const c of candidates) labels.set(String(c._id), c.applicantNumber)
  for (const c of companies) labels.set(String(c._id), c.name)
  for (const j of jobs) labels.set(String(j._id), j.title)
  for (const r of requests) labels.set(String(r._id), `${r.companyId?.name ?? '?'} → ${r.candidateId?.applicantNumber ?? 'deleted profile'}`)
  for (const u of users) labels.set(String(u._id), u.email)
  for (const a of applications) labels.set(String(a._id), `${a.candidateId?.applicantNumber ?? 'deleted'} · ${a.jobId?.title ?? 'deleted position'}`)
  return (e: { targetId?: Types.ObjectId | null; meta?: any }) => (e.targetId ? labels.get(String(e.targetId)) : undefined) ?? e.meta?.applicantNumber ?? e.meta?.title
}

adminOfficeRouter.get('/audit', validate({ query: auditQuerySchema }), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof auditQuerySchema>
  const filter: QueryFilter<AuditLogFields> = {}
  if (q.action) filter.action = q.action.endsWith('.') ? new RegExp(`^${escapeRegex(q.action)}`) : q.action
  if (q.targetType) filter.targetType = q.targetType
  if (q.actorRole) filter.actorRole = q.actorRole
  if (q.from || q.to) filter.at = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }

  const [total, entries] = await Promise.all([AuditLog.countDocuments(filter), AuditLog.find(filter).sort({ at: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean()])
  const actors = await User.find({ _id: { $in: entries.map((e) => e.actorId).filter(Boolean) } }).select('email role').lean()
  const actorById = new Map(actors.map((a) => [String(a._id), a]))
  const label = await targetLabels(entries as any)

  const items: AuditEntry[] = entries.map((e) => {
    const actor = e.actorId ? actorById.get(String(e.actorId)) : undefined
    return {
      id: String(e._id),
      at: e.at.toISOString(),
      action: e.action,
      actor: e.actorId ? { id: String(e.actorId), email: actor?.email, role: (actor?.role ?? e.actorRole ?? 'system') as Role | 'system' } : { id: '', role: 'system' },
      targetType: e.targetType,
      targetId: e.targetId ? String(e.targetId) : undefined,
      targetLabel: label(e as any),
      meta: orUndefined(e.meta as Record<string, unknown>),
      ip: orUndefined(e.ip),
    }
  })
  res.json({ data: { items, page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) } })
})

adminOfficeRouter.get('/audit/actions', async (_req, res) => {
  const [actions, targetTypes] = await Promise.all([AuditLog.distinct('action'), AuditLog.distinct('targetType')])
  res.json({ data: { actions: (actions as string[]).sort(), targetTypes: (targetTypes as string[]).sort() } })
})

// ---- Settings & admin accounts --------------------------------------------------------------------

adminOfficeRouter.get('/settings', async (_req, res) => {
  res.json({ data: await getSettings() })
})

adminOfficeRouter.put('/settings', validate({ body: settingsSchema }), async (req, res) => {
  const values = req.body as z.infer<typeof settingsSchema>
  const before = await getSettings()
  const data = await updateSettings(values, req.user!.id)
  await audit(req, { action: 'settings.updated', targetType: 'Setting', meta: { before, after: data } })
  res.json({ data })
})

const toAdminUser = (u: any): AdminUser => ({ id: String(u._id), email: u.email, isVerified: u.isVerified, lastLoginAt: u.lastLoginAt?.toISOString(), createdAt: u.createdAt.toISOString() })

adminOfficeRouter.get('/admins', async (_req, res) => {
  const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).lean()
  res.json({ data: admins.map(toAdminUser) })
})

/**
 * Invites a new admin: the account gets a random password and the invitee receives a link (valid 72 h)
 * to choose their own. Admins are never created through public signup.
 */
adminOfficeRouter.post('/admins', validate({ body: inviteAdminSchema }), async (req: Request, res) => {
  const { email } = req.body as z.infer<typeof inviteAdminSchema>
  if (await User.exists({ email })) throw conflict('An account with this email already exists')
  const { token, record } = createOneTimeToken(72 * 60 * 60_000)
  const user = await User.create({ email, role: 'admin', isVerified: false, passwordHash: await hashPassword(randomBytes(24).toString('hex')), passwordReset: record })
  await audit(req, { action: 'admin.invited', targetType: 'User', targetId: user._id, meta: { email } })
  await sendMail(
    notificationMessage(email, "You've been invited to the AI101 Talents back office", 'Set up your admin account', [
      `${req.user!.email} invited you to manage AI101 Talents as an administrator.`,
      'Choose your password with the link below. It is valid for 72 hours.',
    ], { label: 'Choose a password', path: `/reset-password?token=${token}` }),
  )
  res.status(201).json({ data: toAdminUser(user) })
})
