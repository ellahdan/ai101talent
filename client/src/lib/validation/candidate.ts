import { z } from 'zod'
import { AVAILABILITIES, PROFICIENCIES, WORK_MODES } from '@/types'
import { emailSchema, passwordSchema } from './auth'

// Mirrors server/src/validation/candidate.ts — keep the rules in sync.

const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined))
  .pipe(z.string().url('Enter a valid URL').optional())
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM')
const years = z.coerce.number().min(0, 'Must be 0 or more').max(60, 'Must be 60 or less')

/** True when no two items share the same (case-insensitive) name. */
const uniqueNames = (items: { name: string }[]) => new Set(items.map((i) => i.name.toLowerCase())).size === items.length

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id')

export const profileSchema = z.object({
  fullName: text(2, 120, 'Enter your full name'),
  email: emailSchema,
  phone: optionalText(40),
  location: z.object({ country: text(2, 80, 'Enter your country'), city: optionalText(80) }),
  links: z.object({ linkedin: optionalUrl, portfolio: optionalUrl }).default({}),
  headline: text(2, 160, 'Add a headline, e.g. "Frontend Developer"'),
  totalYearsExperience: years,
  skills: z
    .array(z.object({ name: text(1, 60, 'Enter a skill'), years: years.optional() }))
    .min(1, 'Add at least one skill')
    .max(40, 'Add at most 40 skills')
    .refine(uniqueNames, 'Each skill can only be added once'),
  tools: z.array(text(1, 60, 'Enter a tool')).max(40, 'Add at most 40 tools').default([]),
  languages: z
    .array(z.object({ name: text(1, 60, 'Enter a language'), proficiency: z.enum(PROFICIENCIES) }))
    .min(1, 'Add at least one language')
    .max(15)
    .refine(uniqueNames, 'Each language can only be added once'),
  workHistory: z
    .array(
      z
        .object({
          company: text(1, 120, 'Enter the company'),
          role: text(1, 120, 'Enter your role'),
          startDate: month,
          endDate: month.optional().or(z.literal('').transform(() => undefined)),
          description: optionalText(4000),
        })
        .refine((w) => !w.endDate || w.endDate >= w.startDate, { message: 'End date must be after the start date', path: ['endDate'] }),
    )
    .max(20)
    .default([]),
  education: z
    .array(
      z.object({
        institution: text(1, 160, 'Enter the institution'),
        degree: optionalText(120),
        field: optionalText(120),
        year: z.coerce.number().int().min(1950).max(2100).optional().or(z.literal('').transform(() => undefined)),
      }),
    )
    .max(10)
    .default([]),
  availability: z.enum(AVAILABILITIES),
  noticePeriodWeeks: z.coerce.number().int().min(0).max(52).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  visible: z.boolean(),
  coverLetterText: optionalText(10000),
})

/** First submission of the apply/profile form. `password` is required when the visitor has no account yet. */
export const submitProfileSchema = profileSchema.extend({
  consent: z.literal(true, { message: 'You must agree to continue' }),
  jobId: objectIdSchema.optional(),
  password: passwordSchema.optional(),
})

export const applySchema = z.object({ jobId: objectIdSchema, coverLetterText: optionalText(10000) })
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password').max(200) })
export const respondSchema = z.object({ decision: z.enum(['accept', 'decline']), note: optionalText(2000) })
export const messageSchema = z.object({ text: text(1, 5000, 'Write a message') })
