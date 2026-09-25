import { z } from 'zod'
import { sanitizeRichText } from '../lib/html.js'
import { COMPANY_STATUSES, CONTRACT_TYPES, COVER_LETTER_POLICIES, JOB_STATUSES, PROFICIENCIES, SENIORITIES, WORK_MODES } from '../types/index.js'
import { objectIdSchema } from './candidate.js'

// The client mirrors these rules in client/src/lib/validation/job.ts (without HTML sanitizing).

const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const uniqueCi = (items: string[]) => new Set(items.map((i) => i.toLowerCase())).size === items.length
const skillList = (min: number, message: string) =>
  z.array(text(1, 60, 'Enter a skill')).min(min, message).max(20, 'Add at most 20 skills').refine(uniqueCi, 'Each skill can only be listed once')

/** Visible text of an HTML fragment (for length checks). */
export const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()


export const jobInputSchema = z.object({
  title: text(3, 140, 'Enter a job title'),
  description: z
    .string()
    .max(30000, 'The description is too long')
    .transform(sanitizeRichText)
    .refine((html) => plainText(html).length >= 50, 'Describe the role in at least a few sentences (50+ characters)'),
  location: text(2, 120, 'Enter a location, e.g. "Lisbon, Portugal" or "Remote (EU)"'),
  workMode: z.enum(WORK_MODES),
  contractType: z.enum(CONTRACT_TYPES),
  seniority: z.enum(SENIORITIES),
  requiredSkills: skillList(1, 'Add at least one required skill'),
  niceToHaveSkills: skillList(0, '').default([]),
  languages: z.array(z.object({ name: text(1, 60, 'Enter a language'), proficiency: z.enum(PROFICIENCIES) })).max(10).default([]),
  coverLetterPolicy: z.enum(COVER_LETTER_POLICIES).default('optional'),
})

export const adminJobSchema = jobInputSchema.extend({
  companyId: objectIdSchema,
  featured: z.boolean().default(false),
})

export const jobStatusSchema = z.object({ status: z.enum(JOB_STATUSES), note: optionalText(1000) })
export const featuredSchema = z.object({ featured: z.boolean() })
export const companyStatusSchema = z.object({ status: z.enum(COMPANY_STATUSES), note: optionalText(1000) })

export const adminCompanyListSchema = z.object({ status: z.enum(COMPANY_STATUSES).optional(), q: z.string().trim().max(100).optional() })
export const adminJobListSchema = z.object({
  status: z.enum(JOB_STATUSES).optional(),
  companyId: objectIdSchema.optional(),
  q: z.string().trim().max(100).optional(),
})
