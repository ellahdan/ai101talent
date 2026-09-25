import { Router, type RequestHandler } from 'express'
import { isValidObjectId } from 'mongoose'
import type { z } from 'zod'
import { cached } from '../lib/cache.js'
import { notFound } from '../lib/errors.js'
import { searchLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { Candidate, Company, type CompanyDoc } from '../models/index.js'
import { ANONYMIZED_FIELDS, companyContext, talentQuery, toAnonymized, toAnonymizedDetail } from '../services/search.js'
import type { AnonymizedCandidate, Paginated, TalentFacets } from '../types/index.js'
import { talentSearchSchema } from '../validation/search.js'

// Anonymized talent search. Anyone can browse; name, email, phone, links, employers and CV are never selected.
// Contacting a candidate still requires an approved company account (see routes/requests.ts).
export const searchRouter = Router()

/** Guests see at most this many results per page, to make bulk scraping slower. */
const GUEST_PAGE_LIMIT = 12

/**
 * Puts the viewer's company on res.locals.company (unless suspended), so results can show its own
 * shortlists and request statuses. Everyone else browses as a guest. Never rejects the request.
 */
const talentViewer: RequestHandler = async (req, res, next) => {
  if (req.user?.role === 'company') {
    const company = await Company.findOne({ userId: req.user.id, status: { $ne: 'suspended' } })
    if (company) res.locals.company = company
  }
  next()
}

searchRouter.use(searchLimiter, talentViewer)

/** Shortlists and request statuses for an approved company; empty for guests. */
const viewerContext = (company: CompanyDoc | undefined, ids: Parameters<typeof companyContext>[1]) =>
  company ? companyContext(company._id, ids) : Promise.resolve({ shortlists: new Map<string, string[]>(), requestStatus: new Map() })

searchRouter.get('/candidates', validate({ query: talentSearchSchema }), async (req, res) => {
  const company: CompanyDoc | undefined = res.locals.company
  const { filter, sort, projection } = talentQuery(req.query as unknown as z.infer<typeof talentSearchSchema>)
  const { page } = req.query as unknown as { page: number }
  const requested = (req.query as unknown as { limit: number }).limit
  const limit = company ? requested : Math.min(requested, GUEST_PAGE_LIMIT)

  const [total, candidates] = await Promise.all([
    Candidate.countDocuments(filter),
    Candidate.find(filter, projection).select(ANONYMIZED_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
  ])
  const ctx = await viewerContext(company, candidates.map((c) => c._id))
  const data: Paginated<AnonymizedCandidate> = {
    items: candidates.map((c) => toAnonymized(c as any, ctx)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
  res.json({ data })
})

/** Filter options: countries and languages present among searchable candidates. */
searchRouter.get('/facets', async (_req, res) => {
  const data = await cached('search:facets', 5 * 60_000, async (): Promise<TalentFacets> => {
    const searchable = { visible: true, consentAt: { $exists: true } }
    const [countries, languages] = await Promise.all([Candidate.distinct('location.country', searchable), Candidate.distinct('languages.name', searchable)])
    const clean = (values: unknown[]) => [...new Set((values as string[]).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return { countries: clean(countries), languages: clean(languages) }
  })
  res.json({ data })
})

searchRouter.get('/candidates/:id', async (req, res) => {
  const company: CompanyDoc | undefined = res.locals.company
  if (!isValidObjectId(req.params.id)) throw notFound('Candidate not found')
  const candidate = await Candidate.findOne({ _id: req.params.id, visible: true, consentAt: { $exists: true } }).select(ANONYMIZED_FIELDS).lean()
  if (!candidate) throw notFound('This profile is no longer available')
  const ctx = await viewerContext(company, [candidate._id])
  res.json({ data: toAnonymizedDetail(candidate as any, ctx) })
})
