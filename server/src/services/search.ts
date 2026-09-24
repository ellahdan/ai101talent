import type { QueryFilter, SortOrder, Types } from 'mongoose'
import type { z } from 'zod'
import { exactCi } from '../lib/html.js'
import { ContactRequest, Shortlist, type CandidateFields } from '../models/index.js'
import { PROFICIENCIES, type AnonymizedCandidate, type AnonymizedCandidateDetail } from '../types/index.js'
import type { talentSearchSchema } from '../validation/search.js'

type TalentQuery = z.infer<typeof talentSearchSchema>
type LeanCandidate = CandidateFields & { _id: Types.ObjectId; createdAt: Date }

/** Builds the MongoDB filter and sort for a talent search. Only visible candidates who consented are ever included. */
export function talentQuery(q: TalentQuery) {
  return candidateQuery(q, [{ visible: true, consentAt: { $exists: true } }])
}

/** Shared filter/sort builder; `base` adds audience-specific conditions (e.g. visibility for companies). */
export function candidateQuery(q: TalentQuery, base: QueryFilter<CandidateFields>[] = []) {
  const and: QueryFilter<CandidateFields>[] = [...base]

  if (q.q) and.push({ $text: { $search: q.q } })
  if (q.skills.length) {
    if (q.skillsMode === 'all') and.push(...q.skills.map((s) => ({ 'skills.name': exactCi(s) })))
    else and.push({ 'skills.name': { $in: q.skills.map(exactCi) } })
  }
  if (q.minYears != null || q.maxYears != null) {
    and.push({ totalYearsExperience: { ...(q.minYears != null ? { $gte: q.minYears } : {}), ...(q.maxYears != null ? { $lte: q.maxYears } : {}) } })
  }
  for (const lang of q.languages) {
    const levels = lang.min ? PROFICIENCIES.slice(PROFICIENCIES.indexOf(lang.min)) : [...PROFICIENCIES]
    and.push({ languages: { $elemMatch: { name: exactCi(lang.name), proficiency: { $in: levels } } } })
  }
  if (q.country) and.push({ 'location.country': exactCi(q.country) })
  if (q.workMode.length) and.push({ workMode: { $in: q.workMode } })
  if (q.availability) and.push({ availability: q.availability })

  const byRelevance = Boolean(q.q) && (q.sort ?? 'relevance') === 'relevance'
  const sort: Record<string, SortOrder | { $meta: 'textScore' }> = byRelevance
    ? { score: { $meta: 'textScore' }, totalYearsExperience: -1 }
    : q.sort === 'newest'
      ? { createdAt: -1 }
      : { totalYearsExperience: -1, createdAt: -1 }

  return { filter: (and.length ? { $and: and } : {}) as QueryFilter<CandidateFields>, sort, projection: byRelevance ? { score: { $meta: 'textScore' } } : {} }
}

/** Only non-identifying fields are ever selected for companies. */
export const ANONYMIZED_FIELDS = 'applicantNumber headline totalYearsExperience skills tools languages location workMode availability noticePeriodWeeks workHistory education createdAt'

/** This company's shortlist names and latest request status per candidate. */
export async function companyContext(companyId: Types.ObjectId, candidateIds: Types.ObjectId[]) {
  const [lists, requests] = await Promise.all([
    Shortlist.find({ companyId, candidateIds: { $in: candidateIds } }).select('name candidateIds').lean(),
    ContactRequest.find({ companyId, candidateId: { $in: candidateIds } }).sort({ createdAt: -1 }).select('candidateId status').lean(),
  ])
  const shortlists = new Map<string, string[]>()
  for (const l of lists) for (const id of l.candidateIds) shortlists.set(String(id), [...(shortlists.get(String(id)) ?? []), l.name])
  const requestStatus = new Map<string, AnonymizedCandidate['requestStatus']>()
  for (const r of requests) if (!requestStatus.has(String(r.candidateId))) requestStatus.set(String(r.candidateId), r.status)
  return { shortlists, requestStatus }
}

const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

// ---- Keyword highlighting (admin search) -------------------------------------------------

/** Search terms worth highlighting: keyword words (2+ chars, no quotes/operators) and skill names. */
export function highlightTerms(q?: string, skills: string[] = []) {
  const words = (q ?? '')
    .replace(/["'()]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-/, ''))
    .filter((w) => w.length >= 2)
  return [...new Set([...words, ...skills].map((t) => t.toLowerCase()))]
}

/** A ~200-character excerpt of `text` around the first matching term, plus how many matches there are. */
export function snippet(text: string | undefined | null, terms: string[], radius = 100) {
  if (!text || !terms.length) return undefined
  const lower = text.toLowerCase()
  let first = -1
  let count = 0
  for (const term of terms) {
    let i = lower.indexOf(term)
    if (i >= 0 && (first < 0 || i < first)) first = i
    while (i >= 0) {
      count++
      i = lower.indexOf(term, i + term.length)
    }
  }
  if (first < 0) return undefined
  let start = Math.max(0, first - radius)
  let end = Math.min(text.length, first + radius)
  // Snap to word boundaries.
  if (start > 0) start = text.indexOf(' ', start) + 1 || start
  if (end < text.length) end = text.lastIndexOf(' ', end) > first ? text.lastIndexOf(' ', end) : end
  const body = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return { text: `${start > 0 ? '…' : ''}${body}${end < text.length ? '…' : ''}`, count }
}

export function toAnonymized(c: LeanCandidate, ctx: Awaited<ReturnType<typeof companyContext>>): AnonymizedCandidate {
  const skills = [...(c.skills ?? [])].sort((a, b) => (b.years ?? 0) - (a.years ?? 0))
  return {
    id: String(c._id),
    applicantNumber: c.applicantNumber,
    headline: c.headline ?? '',
    totalYearsExperience: c.totalYearsExperience ?? 0,
    topSkills: skills.slice(0, 6).map((s) => ({ name: s.name, years: orUndefined(s.years) })),
    tools: (c.tools ?? []).slice(0, 6),
    languages: (c.languages ?? []).map((l) => ({ name: l.name, proficiency: l.proficiency })),
    location: { country: c.location?.country ?? '', city: orUndefined(c.location?.city) },
    workMode: orUndefined(c.workMode),
    availability: c.availability ?? 'immediately',
    noticePeriodWeeks: orUndefined(c.noticePeriodWeeks),
    shortlists: ctx.shortlists.get(String(c._id)) ?? [],
    requestStatus: ctx.requestStatus.get(String(c._id)),
  }
}

export function toAnonymizedDetail(c: LeanCandidate, ctx: Awaited<ReturnType<typeof companyContext>>): AnonymizedCandidateDetail {
  return {
    ...toAnonymized(c, ctx),
    tools: c.tools ?? [],
    skills: (c.skills ?? []).map((s) => ({ name: s.name, years: orUndefined(s.years) })),
    roles: (c.workHistory ?? []).map((w) => ({ role: w.role, startYear: w.startDate.getUTCFullYear(), endYear: w.endDate?.getUTCFullYear() })),
    education: (c.education ?? []).map((e) => ({ degree: orUndefined(e.degree), field: orUndefined(e.field), year: orUndefined(e.year) })),
  }
}
