import { z } from 'zod'
import { Router } from 'express'
import { cached } from '../lib/cache.js'
import { CURATED_SKILLS, CURATED_TOOLS } from '../lib/suggestions.js'
import { validate } from '../middleware/validate.js'
import { Application, Candidate, Company, ContactRequest, Job, Testimonial } from '../models/index.js'
import { publicJobFilter } from '../services/jobs.js'
import type { PopularSkill, PublicStats, Testimonial as TestimonialDto } from '../types/index.js'

export const publicRouter = Router()

const TTL = 60_000

publicRouter.get('/stats', async (_req, res) => {
  const data = await cached('public:stats', TTL, async (): Promise<PublicStats> => {
    const [openPositions, registeredTalents, companies, hiredRequests, hiredApplications] = await Promise.all([
      Job.countDocuments(await publicJobFilter()),
      Candidate.countDocuments(),
      Company.countDocuments({ status: 'approved' }),
      ContactRequest.countDocuments({ status: 'hired' }),
      Application.countDocuments({ status: 'hired' }),
    ])
    return { openPositions, registeredTalents, companies, successfulHires: hiredRequests + hiredApplications }
  })
  res.json({ data })
})

/** Most requested skills across open jobs, so every tag links to at least one listing. */
publicRouter.get('/skills', async (_req, res) => {
  const data = await cached('public:skills', TTL, async (): Promise<PopularSkill[]> => {
    const skills = await Job.aggregate<{ name: string; count: number }>([
      { $match: await publicJobFilter() },
      { $unwind: '$requiredSkills' },
      { $group: { _id: { $toLower: '$requiredSkills' }, name: { $first: '$requiredSkills' }, count: { $sum: 1 } } },
      { $sort: { count: -1, name: 1 } },
      { $limit: 18 },
      { $project: { _id: 0, name: 1, count: 1 } },
    ])
    return skills
  })
  res.json({ data })
})

const suggestQuery = z.object({ type: z.enum(['skills', 'tools']), q: z.string().trim().max(60).default('') })

/** Autocomplete for skill and tool tag inputs: curated list + values already in use. */
publicRouter.get('/suggest', validate({ query: suggestQuery }), async (req, res) => {
  const { type, q } = req.query as unknown as z.infer<typeof suggestQuery>
  const all = await cached(`public:suggest:${type}`, 5 * 60_000, async () => {
    const [fromCandidates, fromJobs] =
      type === 'skills'
        ? await Promise.all([Candidate.distinct('skills.name'), Job.distinct('requiredSkills')])
        : await Promise.all([Candidate.distinct('tools'), Promise.resolve([])])
    const byLower = new Map<string, string>()
    for (const v of [...(type === 'skills' ? CURATED_SKILLS : CURATED_TOOLS), ...(fromCandidates as string[]), ...(fromJobs as string[])]) {
      if (!byLower.has(v.toLowerCase())) byLower.set(v.toLowerCase(), v)
    }
    return [...byLower.values()].sort((a, b) => a.localeCompare(b))
  })

  const needle = q.toLowerCase()
  // Prefix matches first, then other matches.
  const starts = all.filter((v) => v.toLowerCase().startsWith(needle))
  const contains = needle ? all.filter((v) => !v.toLowerCase().startsWith(needle) && v.toLowerCase().includes(needle)) : []
  res.json({ data: [...starts, ...contains].slice(0, 10) })
})

publicRouter.get('/testimonials', async (_req, res) => {
  const data = await cached('public:testimonials', TTL, async (): Promise<TestimonialDto[]> => {
    const items = await Testimonial.find({ active: true }).sort({ order: 1, createdAt: 1 }).limit(12).lean()
    return items.map((t) => ({ id: String(t._id), name: t.name, role: t.role, quote: t.quote, avatarUrl: t.avatarUrl ?? undefined }))
  })
  res.json({ data })
})
