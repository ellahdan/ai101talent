import { z } from 'zod'
import { CONTRACT_TYPES, COVER_LETTER_POLICIES, PROFICIENCIES, SENIORITIES, WORK_MODES } from '@/types'

// Mirrors server/src/validation/job.ts (the server also sanitizes the description HTML).

const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max)
const uniqueCi = (items: string[]) => new Set(items.map((i) => i.toLowerCase())).size === items.length
const skillList = (min: number, message: string) =>
  z.array(text(1, 60, 'Enter a skill')).min(min, message).max(20, 'Add at most 20 skills').refine(uniqueCi, 'Each skill can only be listed once')

export const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()


export const jobInputSchema = z.object({
  title: text(3, 140, 'Enter a job title'),
  description: z.string().max(30000, 'The description is too long').refine((html) => plainText(html).length >= 50, 'Describe the role in at least a few sentences (50+ characters)'),
  location: text(2, 120, 'Enter a location, e.g. "Lisbon, Portugal" or "Remote (EU)"'),
  workMode: z.enum(WORK_MODES),
  contractType: z.enum(CONTRACT_TYPES),
  seniority: z.enum(SENIORITIES),
  requiredSkills: skillList(1, 'Add at least one required skill'),
  niceToHaveSkills: skillList(0, ''),
  languages: z.array(z.object({ name: text(1, 60, 'Enter a language'), proficiency: z.enum(PROFICIENCIES) })).max(10),
  coverLetterPolicy: z.enum(COVER_LETTER_POLICIES),
})

export const adminJobSchema = jobInputSchema.extend({
  companyId: z.string().regex(/^[a-f0-9]{24}$/, 'Choose a company'),
  featured: z.boolean(),
})

export type JobFormValues = z.input<typeof adminJobSchema>
