import type { QueryFilter, Types } from 'mongoose'
import { Application, Company, type JobFields } from '../models/index.js'
import type { JobDetail, JobSummary, ManagedJob } from '../types/index.js'
import type { z } from 'zod'
import type { jobInputSchema } from '../validation/job.js'

interface PopulatedCompany {
  _id: Types.ObjectId
  name: string
  website?: string | null
  industry?: string | null
  size?: JobDetail['company']['size'] | null
  description?: string | null
}

// Lean job document with companyId populated.
type LeanJob = Record<string, any> & { _id: Types.ObjectId; companyId: PopulatedCompany }

const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

export function toJobSummary(job: LeanJob): JobSummary {
  return {
    id: String(job._id),
    title: job.title,
    company: { id: String(job.companyId._id), name: job.companyId.name },
    location: job.location,
    workMode: job.workMode,
    contractType: job.contractType,
    seniority: job.seniority,
    requiredSkills: job.requiredSkills ?? [],
    featured: Boolean(job.featured),
    createdAt: (job.publishedAt ?? job.createdAt).toISOString(),
  }
}

export function toJobDetail(job: LeanJob): JobDetail {
  const c = job.companyId
  return {
    ...toJobSummary(job),
    description: job.description,
    niceToHaveSkills: job.niceToHaveSkills ?? [],
    languages: (job.languages ?? []).map((l: { name: string; proficiency: JobDetail['languages'][number]['proficiency'] }) => ({ name: l.name, proficiency: l.proficiency })),
    coverLetterPolicy: job.coverLetterPolicy ?? 'optional',
    status: job.status,
    company: {
      id: String(c._id),
      name: c.name,
      website: orUndefined(c.website),
      industry: orUndefined(c.industry),
      size: orUndefined(c.size),
      description: orUndefined(c.description),
    },
  }
}

export function toManagedJob(job: LeanJob, applicationCount: number): ManagedJob {
  return {
    ...toJobDetail(job),
    // Unpublished jobs have no publishedAt; show their creation date instead.
    createdAt: (job.createdAt as Date).toISOString(),
    moderationNote: job.moderationNote ?? undefined,
    applicationCount,
    publishedAt: job.publishedAt?.toISOString(),
    closedAt: job.closedAt?.toISOString(),
    updatedAt: (job.updatedAt as Date).toISOString(),
  }
}

/** Maps validated job input to document fields. Salaries are no longer used: saving a job clears any old value. */
export function jobFields(input: z.infer<typeof jobInputSchema>) {
  return { ...input, salaryRange: undefined }
}

/** Number of applications per job id. */
export async function applicationCounts(jobIds: Types.ObjectId[]) {
  const rows = await Application.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { jobId: { $in: jobIds } } }, { $group: { _id: '$jobId', n: { $sum: 1 } } }])
  return new Map(rows.map((r) => [String(r._id), r.n]))
}

/** Public listings only include open jobs from approved companies. */
export async function publicJobFilter(): Promise<QueryFilter<JobFields>> {
  const approved = (await Company.distinct('_id', { status: 'approved' })) as Types.ObjectId[]
  return { status: 'open', companyId: { $in: approved } }
}

export const populateCompany = { path: 'companyId', select: 'name website industry size description' } as const

export type { LeanJob }
