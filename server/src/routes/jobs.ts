import { Router } from 'express'
import { isValidObjectId, type QueryFilter, type SortOrder } from 'mongoose'
import { z } from 'zod'
import { cached } from '../lib/cache.js'
import { notFound } from '../lib/errors.js'
import { exactCi } from '../lib/html.js'
import { validate } from '../middleware/validate.js'
import { Job, type JobFields } from '../models/index.js'
import { populateCompany, publicJobFilter, toJobDetail, toJobSummary, type LeanJob } from '../services/jobs.js'
import { CONTRACT_TYPES, JOB_SORTS, SENIORITIES, WORK_MODES, type JobFacets, type Paginated, type JobSummary } from '../types/index.js'

export const jobsRouter = Router()

/** "a,b,c" -> ['a','b','c'] validated against an enum (or free text when no enum). */
const csv = <T extends string>(item: z.ZodType<T, string>) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(item).max(20))

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  workMode: csv(z.enum(WORK_MODES)),
  contractType: csv(z.enum(CONTRACT_TYPES)),
  seniority: csv(z.enum(SENIORITIES)),
  skills: csv(z.string().max(60)),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(JOB_SORTS).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

jobsRouter.get('/', validate({ query: listQuery }), async (req, res) => {
  const query = req.query as unknown as z.infer<typeof listQuery>
  const filter: QueryFilter<JobFields> = await publicJobFilter()

  if (query.q) filter.$text = { $search: query.q }
  if (query.location) filter.location = exactCi(query.location)
  if (query.workMode.length) filter.workMode = { $in: query.workMode }
  if (query.contractType.length) filter.contractType = { $in: query.contractType }
  if (query.seniority.length) filter.seniority = { $in: query.seniority }
  // Jobs must require every selected skill (case-insensitive).
  if (query.skills.length) filter.requiredSkills = { $all: query.skills.map(exactCi) }
  if (query.featured === 'true') filter.featured = true

  const byRelevance = Boolean(query.q) && query.sort !== 'newest'
  const sort: Record<string, SortOrder | { $meta: 'textScore' }> = byRelevance
    ? { score: { $meta: 'textScore' }, publishedAt: -1 }
    : query.featured === 'true'
      ? { publishedAt: -1 }
      : { featured: -1, publishedAt: -1 }

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter, byRelevance ? { score: { $meta: 'textScore' } } : {})
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate(populateCompany)
      .lean<LeanJob[]>(),
  ])

  const data: Paginated<JobSummary> = {
    items: jobs.map(toJobSummary),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
  res.json({ data })
})

/** Filter options for the jobs page: locations and skills of currently open jobs. */
jobsRouter.get('/facets', async (_req, res) => {
  const data = await cached('public:facets', 60_000, async (): Promise<JobFacets> => {
    const match = await publicJobFilter()
    const [locations, skills] = await Promise.all([
      Job.distinct('location', match),
      Job.aggregate<{ _id: string; name: string; count: number }>([
        { $match: match },
        { $unwind: '$requiredSkills' },
        { $group: { _id: { $toLower: '$requiredSkills' }, name: { $first: '$requiredSkills' }, count: { $sum: 1 } } },
        { $sort: { count: -1, name: 1 } },
        { $limit: 40 },
      ]),
    ])
    return {
      locations: (locations as string[]).sort((a, b) => a.localeCompare(b)),
      skills: skills.map((s) => ({ name: s.name, count: s.count })),
    }
  })
  res.json({ data })
})

jobsRouter.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw notFound('This job does not exist or is no longer open')
  const job = await Job.findOne({ _id: req.params.id, ...(await publicJobFilter()) })
    .populate(populateCompany)
    .lean<LeanJob>()
  if (!job) throw notFound('This job does not exist or is no longer open')
  res.json({ data: toJobDetail(job) })
})
