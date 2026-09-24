import { Router } from 'express'
import { isValidObjectId } from 'mongoose'
import type { z } from 'zod'
import { cached } from '../lib/cache.js'
import { notFound } from '../lib/errors.js'
import { authorize } from '../middleware/auth.js'
import { searchLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { Candidate, type CompanyDoc } from '../models/index.js'
import { requireApprovedCompany } from '../services/companies.js'
import { ANONYMIZED_FIELDS, companyContext, talentQuery, toAnonymized, toAnonymizedDetail } from '../services/search.js'
import type { AnonymizedCandidate, Paginated, TalentFacets } from '../types/index.js'
import { talentSearchSchema } from '../validation/search.js'

// Anonymized talent search for approved companies. Name, email, phone, links and CV are never selected.
export const searchRouter = Router()
searchRouter.use(authorize('company'), requireApprovedCompany, searchLimiter)

searchRouter.get('/candidates', validate({ query: talentSearchSchema }), async (req, res) => {
  const company: CompanyDoc = res.locals.company
  const { filter, sort, projection } = talentQuery(req.query as unknown as z.infer<typeof talentSearchSchema>)
  const { page, limit } = req.query as unknown as { page: number; limit: number }

  const [total, candidates] = await Promise.all([
    Candidate.countDocuments(filter),
    Candidate.find(filter, projection).select(ANONYMIZED_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ])
  const ctx = await companyContext(company._id, candidates.map((c) => c._id))
  const data: Paginated<AnonymizedCandidate> = {
    items: candidates.map((c) => toAnonymized(c as any, ctx)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
  res.json({ data })
})

/** Filter options: countries and languages present among visible candidates. */
searchRouter.get('/facets', async (_req, res) => {
  const data = await cached('search:facets', 5 * 60_000, async (): Promise<TalentFacets> => {
    const visible = { visible: true }
    const [countries, languages] = await Promise.all([Candidate.distinct('location.country', visible), Candidate.distinct('languages.name', visible)])
    const clean = (values: unknown[]) => [...new Set((values as string[]).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return { countries: clean(countries), languages: clean(languages) }
  })
  res.json({ data })
})

searchRouter.get('/candidates/:id', async (req, res) => {
  const company: CompanyDoc = res.locals.company
  if (!isValidObjectId(req.params.id)) throw notFound('Candidate not found')
  const candidate = await Candidate.findOne({ _id: req.params.id, visible: true, consentAt: { $exists: true } }).select(ANONYMIZED_FIELDS).lean()
  if (!candidate) throw notFound('This profile is no longer available')
  const ctx = await companyContext(company._id, [candidate._id])
  res.json({ data: toAnonymizedDetail(candidate as any, ctx) })
})
