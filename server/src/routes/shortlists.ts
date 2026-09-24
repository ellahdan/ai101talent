import { Router, type Request, type Response } from 'express'
import { isValidObjectId } from 'mongoose'
import type { z } from 'zod'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Candidate, Shortlist, type CompanyDoc } from '../models/index.js'
import { requireApprovedCompany } from '../services/companies.js'
import { ANONYMIZED_FIELDS, companyContext, toAnonymized } from '../services/search.js'
import type { Shortlist as ShortlistDto } from '../types/index.js'
import { shortlistCandidateSchema, shortlistNameSchema } from '../validation/search.js'

// Named shortlists of anonymized candidates, private to each company.
export const shortlistsRouter = Router()
shortlistsRouter.use(authorize('company'), requireApprovedCompany)

const MAX_LISTS = 50
const MAX_PER_LIST = 200

const toDto = (s: { _id: unknown; name: string; candidateIds: unknown[]; updatedAt: Date }): ShortlistDto => ({
  id: String(s._id),
  name: s.name,
  candidateIds: s.candidateIds.map(String),
  updatedAt: s.updatedAt.toISOString(),
})

async function ownList(req: Request, res: Response) {
  const company: CompanyDoc = res.locals.company
  if (!isValidObjectId(req.params.id)) throw notFound('Shortlist not found')
  const list = await Shortlist.findOne({ _id: req.params.id, companyId: company._id })
  if (!list) throw notFound('Shortlist not found')
  return list
}

shortlistsRouter.get('/', async (_req, res) => {
  const lists = await Shortlist.find({ companyId: (res.locals.company as CompanyDoc)._id }).sort({ updatedAt: -1 }).lean()
  res.json({ data: lists.map(toDto) })
})

shortlistsRouter.post('/', validate({ body: shortlistNameSchema }), async (req, res) => {
  const company: CompanyDoc = res.locals.company
  if ((await Shortlist.countDocuments({ companyId: company._id })) >= MAX_LISTS) throw badRequest(`You can have up to ${MAX_LISTS} shortlists`)
  const { name } = req.body as z.infer<typeof shortlistNameSchema>
  if (await Shortlist.exists({ companyId: company._id, name })) throw conflict('You already have a shortlist with this name')
  const list = await Shortlist.create({ companyId: company._id, name, candidateIds: [] })
  res.status(201).json({ data: toDto(list) })
})

shortlistsRouter.patch('/:id', validate({ body: shortlistNameSchema }), async (req, res) => {
  const list = await ownList(req, res)
  list.name = (req.body as z.infer<typeof shortlistNameSchema>).name
  await list.save()
  res.json({ data: toDto(list) })
})

shortlistsRouter.delete('/:id', async (req, res) => {
  const list = await ownList(req, res)
  await list.deleteOne()
  res.json({ data: { deleted: true } })
})

/** The list's candidates, anonymized. Profiles that were hidden or deleted since are skipped. */
shortlistsRouter.get('/:id/candidates', async (req, res) => {
  const list = await ownList(req, res)
  const candidates = await Candidate.find({ _id: { $in: list.candidateIds }, visible: true }).select(ANONYMIZED_FIELDS).lean()
  const ctx = await companyContext(list.companyId, candidates.map((c) => c._id))
  // Keep the order in which candidates were added.
  const order = new Map(list.candidateIds.map((id, i) => [String(id), i]))
  candidates.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0))
  res.json({ data: { shortlist: toDto(list), candidates: candidates.map((c) => toAnonymized(c as any, ctx)) } })
})

shortlistsRouter.post('/:id/candidates', validate({ body: shortlistCandidateSchema }), async (req, res) => {
  const list = await ownList(req, res)
  const { candidateId } = req.body as z.infer<typeof shortlistCandidateSchema>
  if (!(await Candidate.exists({ _id: candidateId, visible: true }))) throw notFound('This profile is no longer available')
  if (list.candidateIds.length >= MAX_PER_LIST) throw badRequest(`A shortlist can hold up to ${MAX_PER_LIST} candidates`)
  const updated = await Shortlist.findByIdAndUpdate(list._id, { $addToSet: { candidateIds: candidateId } }, { returnDocument: 'after' }).lean()
  res.json({ data: toDto(updated!) })
})

shortlistsRouter.delete('/:id/candidates/:candidateId', async (req, res) => {
  const list = await ownList(req, res)
  const updated = await Shortlist.findByIdAndUpdate(list._id, { $pull: { candidateIds: req.params.candidateId } }, { returnDocument: 'after' }).lean()
  res.json({ data: toDto(updated!) })
})
