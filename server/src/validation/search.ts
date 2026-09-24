import { z } from 'zod'
import { AVAILABILITIES, PROFICIENCIES, REQUEST_STATUSES, TALENT_SORTS, WORK_MODES } from '../types/index.js'
import { objectIdSchema } from './candidate.js'

const csv = <T extends string>(item: z.ZodType<T, string>, max = 20) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(item).max(max))

/** "French:fluent" → { name: 'French', min: 'fluent' }; a bare name means any level. */
const languageFilter = z
  .string()
  .max(80)
  .transform((v) => {
    const [name, min] = v.split(':').map((s) => s.trim())
    return { name, min: (PROFICIENCIES as readonly string[]).includes(min) ? (min as (typeof PROFICIENCIES)[number]) : undefined }
  })
  .refine((l) => l.name.length > 0, 'Invalid language filter')

const years = z.coerce.number().min(0).max(60).optional()

// Deliberately no filters on age, gender, marital status, nationality, religion or photos: search is about skills and experience.
export const talentSearchBase = z.object({
    q: z.string().trim().max(200).optional(),
    skills: csv(z.string().trim().max(60)),
    skillsMode: z.enum(['all', 'any']).default('all'),
    minYears: years,
    maxYears: years,
    languages: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',').filter(Boolean) : []))
      .pipe(z.array(languageFilter).max(10)),
    country: z.string().trim().max(80).optional(),
    workMode: csv(z.enum(WORK_MODES)),
    availability: z.enum(AVAILABILITIES).optional(),
    sort: z.enum(TALENT_SORTS).optional(),
    page: z.coerce.number().int().min(1).max(500).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const yearsInRange = (f: { minYears?: number; maxYears?: number }) => f.minYears == null || f.maxYears == null || f.minYears <= f.maxYears
export const yearsRangeError = { message: 'Minimum years must not exceed maximum', path: ['maxYears'] }

export const talentSearchSchema = talentSearchBase.refine(yearsInRange, yearsRangeError)

export const shortlistNameSchema = z.object({ name: z.string().trim().min(1, 'Name the shortlist').max(80) })
export const shortlistCandidateSchema = z.object({ candidateId: objectIdSchema })

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const money = z.coerce.number().int().min(0).max(10_000_000).optional()

export const createRequestSchema = z
  .object({
    candidateId: objectIdSchema,
    jobId: objectIdSchema.optional(),
    roleTitle: optionalText(140),
    message: z.string().trim().min(30, 'Tell the candidate a bit more (30+ characters)').max(5000),
    proposedTimes: z
      .array(z.coerce.date())
      .min(1, 'Propose at least one interview time')
      .max(5)
      .refine((dates) => dates.every((d) => d.getTime() > Date.now()), 'Proposed times must be in the future'),
    salaryRange: z
      .object({ min: money, max: money, currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('EUR') })
      .refine((s) => s.min == null || s.max == null || s.min <= s.max, { message: 'The minimum must not exceed the maximum', path: ['max'] })
      .optional(),
  })
  .refine((r) => r.jobId || r.roleTitle, { message: 'Choose one of your positions or enter a role title', path: ['roleTitle'] })

export const threadMessageSchema = z.object({ text: z.string().trim().min(1, 'Write a message').max(5000) })

// ---- Admin mediation ----------------------------------------------------------------

export const adminRequestListSchema = z.object({ status: z.enum(REQUEST_STATUSES).optional(), group: z.enum(['action', 'active', 'closed']).optional() })
export const forwardSchema = z.object({ message: z.string().trim().min(10, 'The message for the candidate is too short').max(5000) })
export const reasonSchema = z.object({ reason: z.string().trim().min(5, 'Explain the reason to the company').max(2000) })
export const infoRequestSchema = z.object({ message: z.string().trim().min(5, 'Tell the company what you need').max(5000) })
export const introduceSchema = z.object({
  share: z.object({ fullName: z.boolean(), email: z.boolean(), phone: z.boolean(), linkedin: z.boolean(), cv: z.boolean() }),
  note: optionalText(2000),
  interviewDate: z.coerce.date().optional(),
})
export const outcomeSchema = z.object({
  status: z.enum(['interviewing', 'hired', 'not_selected', 'closed']),
  note: optionalText(2000),
  interviewDate: z.coerce.date().optional(),
})
export const adminMessageSchema = z.object({ thread: z.enum(['company', 'candidate']), text: z.string().trim().min(1, 'Write a message').max(5000) })
