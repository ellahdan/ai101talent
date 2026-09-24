import type { z } from 'zod'
import type { Types } from 'mongoose'
import { invalidateCache } from '../lib/cache.js'
import { deleteFile } from '../lib/storage.js'
import { Application, AuditLog, Candidate, ContactRequest, Shortlist, User, type CandidateDoc } from '../models/index.js'
import type { CandidateProfile, FileInfo } from '../types/index.js'
import type { profileSchema } from '../validation/candidate.js'

type ProfileInput = z.infer<typeof profileSchema>

/**
 * Permanently deletes a candidate account: profile, files, applications, contact requests, shortlist
 * entries and the login. Audit entries are kept for accountability but stripped of identifying metadata.
 * Used by "delete my account" and by the data-retention job.
 */
export async function deleteCandidateAccount(userId: Types.ObjectId | string) {
  const candidate = await Candidate.findOne({ userId })
  if (candidate) {
    const applications = await Application.find({ candidateId: candidate._id }).select('coverLetter').lean()
    const keys = [candidate.cvFile?.key, candidate.coverLetter?.file?.key, ...applications.map((a) => a.coverLetter?.file?.key)]
    await Promise.all([
      Application.deleteMany({ candidateId: candidate._id }),
      ContactRequest.deleteMany({ candidateId: candidate._id }),
      Shortlist.updateMany({}, { $pull: { candidateIds: candidate._id } }),
      AuditLog.updateMany({ targetId: candidate._id }, { $unset: { meta: 1 } }),
    ])
    await candidate.deleteOne()
    await Promise.all(keys.map(deleteFile))
  }
  await User.deleteOne({ _id: userId })
  invalidateCache('public:stats')
}

const toMonth = (d?: Date | null) => (d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` : undefined)
const fromMonth = (m?: string) => (m ? new Date(`${m}-01T00:00:00.000Z`) : undefined)
const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

function fileInfo(f?: { originalName: string; mimeType: string; size?: number | null } | null): FileInfo | undefined {
  return f ? { originalName: f.originalName, mimeType: f.mimeType, size: orUndefined(f.size) } : undefined
}

/** Maps validated form input to Candidate document fields (files and identity fields are handled by the caller). */
export function profileFields(input: ProfileInput) {
  return {
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    links: input.links,
    headline: input.headline,
    totalYearsExperience: input.totalYearsExperience,
    skills: input.skills,
    tools: input.tools,
    languages: input.languages,
    workHistory: input.workHistory.map((w) => ({ ...w, startDate: fromMonth(w.startDate), endDate: fromMonth(w.endDate) })),
    education: input.education,
    availability: input.availability,
    noticePeriodWeeks: input.availability === 'notice_period' ? input.noticePeriodWeeks : undefined,
    workMode: input.workMode,
    visible: input.visible,
  }
}

export function toCandidateProfile(c: CandidateDoc): CandidateProfile {
  return {
    id: String(c._id),
    applicantNumber: c.applicantNumber,
    fullName: c.fullName,
    email: c.email,
    phone: orUndefined(c.phone),
    location: { country: c.location?.country ?? '', city: orUndefined(c.location?.city) },
    links: { linkedin: orUndefined(c.links?.linkedin), portfolio: orUndefined(c.links?.portfolio) },
    headline: c.headline ?? '',
    totalYearsExperience: c.totalYearsExperience ?? 0,
    skills: c.skills.map((s) => ({ name: s.name, years: orUndefined(s.years) })),
    tools: [...c.tools],
    languages: c.languages.map((l) => ({ name: l.name, proficiency: l.proficiency })),
    workHistory: c.workHistory.map((w) => ({
      company: w.company,
      role: w.role,
      startDate: toMonth(w.startDate)!,
      endDate: toMonth(w.endDate),
      description: orUndefined(w.description),
    })),
    education: c.education.map((e) => ({ institution: e.institution, degree: orUndefined(e.degree), field: orUndefined(e.field), year: orUndefined(e.year) })),
    cvFile: fileInfo(c.cvFile),
    coverLetter: c.coverLetter?.text || c.coverLetter?.file ? { text: orUndefined(c.coverLetter.text), file: fileInfo(c.coverLetter.file) } : undefined,
    availability: c.availability ?? 'immediately',
    noticePeriodWeeks: orUndefined(c.noticePeriodWeeks),
    workMode: orUndefined(c.workMode),
    visible: c.visible ?? true,
    consentAt: c.consentAt.toISOString(),
    createdAt: (c.get('createdAt') as Date).toISOString(),
    updatedAt: (c.get('updatedAt') as Date).toISOString(),
  }
}
