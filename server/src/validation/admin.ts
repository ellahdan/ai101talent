import { z } from 'zod'
import { APPLICATION_STATUSES, ROLES } from '../types/index.js'
import { emailSchema } from './auth.js'
import { objectIdSchema } from './candidate.js'
import { talentSearchBase, yearsInRange, yearsRangeError } from './search.js'

const csv = (max = 20) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(z.string().max(60)).max(max))

/** Admin candidate search: the company filters plus tools, applicant number, job applied to and visibility. */
export const adminCandidateSearchSchema = talentSearchBase
  .extend({
    tools: csv(),
    applicantNumber: z.string().trim().max(20).optional(),
    jobId: objectIdSchema.optional(),
    visibility: z.enum(['all', 'visible', 'hidden']).default('all'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(yearsInRange, yearsRangeError)

export const applicationStatusSchema = z.object({ status: z.enum(APPLICATION_STATUSES), note: z.string().trim().max(1000).optional().transform((v) => v || undefined) })

export const auditQuerySchema = z.object({
  action: z.string().trim().max(60).optional(),
  targetType: z.string().trim().max(40).optional(),
  actorRole: z.enum([...ROLES, 'system']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const settingsSchema = z.object({ retentionMonths: z.coerce.number().int().min(6, 'At least 6 months').max(120, 'At most 120 months') })
export const inviteAdminSchema = z.object({ email: emailSchema })
