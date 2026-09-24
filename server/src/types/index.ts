// Shared API types and enums. Mirrored in client/src/types — keep both files in sync.

export type ApiSuccess<T> = { data: T }
export type ApiFailure = { error: { message: string; code: string; details?: unknown } }

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

// ---- Enums -------------------------------------------------------------

export const ROLES = ['candidate', 'company', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const WORK_MODES = ['remote', 'onsite', 'hybrid'] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const CONTRACT_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship'] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const SENIORITIES = ['junior', 'mid', 'senior', 'lead'] as const
export type Seniority = (typeof SENIORITIES)[number]

export const JOB_STATUSES = ['pending', 'open', 'closed'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const COVER_LETTER_POLICIES = ['none', 'optional', 'required'] as const
export type CoverLetterPolicy = (typeof COVER_LETTER_POLICIES)[number]

export const COMPANY_STATUSES = ['pending', 'approved', 'suspended'] as const
export type CompanyStatus = (typeof COMPANY_STATUSES)[number]

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] as const
export type CompanySize = (typeof COMPANY_SIZES)[number]

export const PROFICIENCIES = ['basic', 'conversational', 'fluent', 'native'] as const
export type Proficiency = (typeof PROFICIENCIES)[number]

export const AVAILABILITIES = ['immediately', 'notice_period'] as const
export type Availability = (typeof AVAILABILITIES)[number]

export const APPLICATION_STATUSES = ['new', 'reviewed', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const REQUEST_STATUSES = [
  'pending_admin_review',
  'info_requested',
  'rejected',
  'forwarded_to_candidate',
  'candidate_accepted',
  'candidate_declined',
  'introduced',
  'interviewing',
  'hired',
  'not_selected',
  'closed',
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

// ---- Auth --------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  role: Role
  isVerified: boolean
  company?: { id: string; name: string; status: CompanyStatus }
  candidate?: { id: string; applicantNumber: string; fullName: string }
}

// ---- Candidates ----------------------------------------------------------

export interface FileInfo {
  originalName: string
  mimeType: string
  size?: number
}

export interface WorkHistoryEntry {
  company: string
  role: string
  startDate: string // YYYY-MM
  endDate?: string // YYYY-MM; absent = current role
  description?: string
}

export interface EducationEntry {
  institution: string
  degree?: string
  field?: string
  year?: number
}

/** The candidate's own full profile (never shown to companies). */
export interface CandidateProfile {
  id: string
  applicantNumber: string
  fullName: string
  email: string
  phone?: string
  location: { country: string; city?: string }
  links: { linkedin?: string; portfolio?: string }
  headline: string
  totalYearsExperience: number
  skills: { name: string; years?: number }[]
  tools: string[]
  languages: LanguageRequirement[]
  workHistory: WorkHistoryEntry[]
  education: EducationEntry[]
  cvFile?: FileInfo
  coverLetter?: { text?: string; file?: FileInfo }
  availability: Availability
  noticePeriodWeeks?: number
  workMode?: WorkMode
  visible: boolean
  consentAt: string
  createdAt: string
  updatedAt: string
}

export interface ApplySubmitResult {
  applicantNumber: string
  candidateId: string
  applicationId?: string
  jobTitle?: string
  user: AuthUser
}

export interface MyApplication {
  id: string
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
  job: { id: string; title: string; companyName: string; location: string; status: JobStatus }
  statusHistory: { status: ApplicationStatus; at: string }[]
}

/** A contact request as the candidate sees it: only after the admin forwarded it, and only the candidate thread. */
export interface CandidateRequest {
  id: string
  status: RequestStatus
  company: { name: string; industry?: string; website?: string; size?: CompanySize }
  roleTitle?: string
  job?: { id: string; title: string }
  message: string
  proposedTimes: string[]
  salaryRange?: SalaryRange
  candidateNote?: string
  interviewDate?: string
  messages: { id: string; fromRole: Role; text: string; at: string }[]
  history: { status: RequestStatus; at: string }[]
  createdAt: string
  updatedAt: string
}

// ---- Talent search (company view: anonymized, never contact details) -------

export const TALENT_SORTS = ['relevance', 'experience', 'newest'] as const
export type TalentSort = (typeof TALENT_SORTS)[number]

export interface AnonymizedCandidate {
  id: string
  applicantNumber: string
  headline: string
  totalYearsExperience: number
  topSkills: { name: string; years?: number }[]
  tools: string[]
  languages: LanguageRequirement[]
  location: { country: string; city?: string }
  workMode?: WorkMode
  availability: Availability
  noticePeriodWeeks?: number
  /** Names of this company's shortlists that contain the candidate. */
  shortlists: string[]
  /** Status of this company's most recent contact request for the candidate, if any. */
  requestStatus?: RequestStatus
}

export interface AnonymizedCandidateDetail extends AnonymizedCandidate {
  skills: { name: string; years?: number }[]
  /** Roles and dates only: employer names and descriptions could identify the person. */
  roles: { role: string; startYear: number; endYear?: number }[]
  education: { degree?: string; field?: string; year?: number }[]
}

export interface TalentFacets {
  countries: string[]
  languages: string[]
}

export interface Shortlist {
  id: string
  name: string
  candidateIds: string[]
  updatedAt: string
}

// ---- Contact requests ------------------------------------------------------

export interface RequestMessage {
  id: string
  fromRole: Role
  text: string
  at: string
}

export interface SharedDetails {
  fullName?: string
  email?: string
  phone?: string
  linkedin?: string
  cvShared?: boolean
  note?: string
  sharedAt?: string
}

/** A contact request as the requesting company sees it: status, admin messages and only what the admin shared. */
export interface CompanyRequest {
  id: string
  status: RequestStatus
  candidate: { id: string; applicantNumber: string; headline: string }
  job?: { id: string; title: string }
  roleTitle?: string
  message: string
  proposedTimes: string[]
  salaryRange?: SalaryRange
  rejectionReason?: string
  messages: RequestMessage[]
  history: { status: RequestStatus; at: string }[]
  sharedDetails?: SharedDetails
  interviewDate?: string
  createdAt: string
  updatedAt: string
}

/** Full request for the admin: both threads, notes and who did what. */
export interface AdminRequest {
  id: string
  status: RequestStatus
  company: { id: string; name: string; status: CompanyStatus; email: string; industry?: string; website?: string; contactName: string }
  candidate: { id: string; applicantNumber: string; fullName: string; headline: string; email: string; phone?: string; linkedin?: string; visible: boolean; hasCv: boolean }
  job?: { id: string; title: string; status: JobStatus }
  roleTitle?: string
  message: string
  forwardedMessage?: string
  proposedTimes: string[]
  salaryRange?: SalaryRange
  candidateNote?: string
  rejectionReason?: string
  companyMessages: RequestMessage[]
  candidateMessages: RequestMessage[]
  history: { status: RequestStatus; at: string; note?: string; byRole?: Role | 'system' }[]
  sharedDetails?: SharedDetails
  interviewDate?: string
  hiredAt?: string
  createdAt: string
  updatedAt: string
}

// ---- Admin back office ------------------------------------------------------

export interface AdminDashboard {
  kpis: {
    candidates: number
    applications: number
    openJobs: number
    pendingCompanies: number
    pendingJobs: number
    requestsAwaitingReview: number
    hires: number
  }
  /** New candidate profiles per week, oldest first (12 weeks, week starting Monday). */
  candidatesPerWeek: { weekStart: string; count: number }[]
  applicationsByStatus: { status: ApplicationStatus; count: number }[]
  requestsByStatus: { status: RequestStatus; count: number }[]
  topSkills: { name: string; count: number }[]
}

/** One row of the admin candidate search (full identity; admins only). */
export interface AdminCandidateRow {
  id: string
  applicantNumber: string
  fullName: string
  email: string
  headline: string
  totalYearsExperience: number
  location: { country: string; city?: string }
  skills: { name: string; years?: number }[]
  tools: string[]
  languages: LanguageRequirement[]
  visible: boolean
  hasCv: boolean
  createdAt: string
  lastActiveAt?: string
  /** Excerpt of the CV text around the first keyword match. */
  cvSnippet?: { text: string; count: number }
}

export interface AdminCandidateSearch extends Paginated<AdminCandidateRow> {
  /** Lower-cased terms the client should highlight. */
  terms: string[]
}

export interface AdminCandidateDetail extends CandidateProfile {
  cvText?: string
  account: { isVerified: boolean; lastLoginAt?: string; createdAt: string }
  lastActiveAt?: string
  applications: { id: string; status: ApplicationStatus; createdAt: string; job: { id: string; title: string; companyName: string } }[]
  requests: { id: string; status: RequestStatus; companyName: string; roleTitle?: string; createdAt: string }[]
}

export interface PipelineCard {
  id: string
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
  candidate: { id: string; applicantNumber: string; fullName: string; headline: string; totalYearsExperience: number; topSkills: string[] }
  coverLetter?: { text?: string; hasFile: boolean }
}

export interface Pipeline {
  job: { id: string; title: string; companyName: string; status: JobStatus }
  applications: PipelineCard[]
}

export interface AuditEntry {
  id: string
  at: string
  action: string
  actor?: { id: string; email?: string; role: Role | 'system' }
  targetType: string
  targetId?: string
  /** Human-readable target, e.g. an applicant number, company name or job title. */
  targetLabel?: string
  meta?: Record<string, unknown>
  ip?: string
}

export interface AdminSettings {
  retentionMonths: number
}

export interface AdminUser {
  id: string
  email: string
  isVerified: boolean
  lastLoginAt?: string
  createdAt: string
}

// ---- Public / landing --------------------------------------------------

export interface SalaryRange {
  min?: number
  max?: number
  currency: string
}

export interface JobSummary {
  id: string
  title: string
  company: { id: string; name: string }
  location: string
  workMode: WorkMode
  contractType: ContractType
  seniority: Seniority
  requiredSkills: string[]
  salaryRange?: SalaryRange
  featured: boolean
  createdAt: string
}

export interface LanguageRequirement {
  name: string
  proficiency: Proficiency
}

export interface JobDetail extends JobSummary {
  description: string // sanitized HTML
  niceToHaveSkills: string[]
  languages: LanguageRequirement[]
  coverLetterPolicy: CoverLetterPolicy
  status: JobStatus
  company: { id: string; name: string; website?: string; industry?: string; size?: CompanySize; description?: string }
}

/** A job as its company (or an admin) sees it: any status, with moderation info and applicant count. */
export interface ManagedJob extends JobDetail {
  moderationNote?: string
  applicationCount: number
  publishedAt?: string
  closedAt?: string
  updatedAt: string
}

// ---- Companies -----------------------------------------------------------

export interface CompanyProfile {
  id: string
  name: string
  email: string
  website?: string
  industry?: string
  size?: CompanySize
  description?: string
  contactPerson: { name: string; title?: string; phone?: string }
  status: CompanyStatus
  statusNote?: string
  approvedAt?: string
  createdAt: string
}

/** Company as listed in the admin back office. */
export interface AdminCompany extends CompanyProfile {
  isVerified: boolean
  jobCount: number
  openJobCount: number
  requestCount: number
}

/** Counts that drive the admin navigation badges. */
export interface AdminSummary {
  pendingCompanies: number
  pendingJobs: number
  requestsAwaitingReview: number
  /** Requests that need an admin action: new, or accepted by the candidate and waiting for an introduction. */
  requestsNeedingAction: number
}

export const JOB_SORTS = ['newest', 'relevance'] as const
export type JobSort = (typeof JOB_SORTS)[number]

/** Filter options for the public jobs list. */
export interface JobFacets {
  locations: string[]
  skills: PopularSkill[]
}

export interface PublicStats {
  openPositions: number
  registeredTalents: number
  companies: number
  successfulHires: number
}

export interface PopularSkill {
  name: string
  count: number
}

export interface Testimonial {
  id: string
  name: string
  role: string
  quote: string
  avatarUrl?: string
}
