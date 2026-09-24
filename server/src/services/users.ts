import type { Types } from 'mongoose'
import { createOneTimeToken } from '../lib/auth.js'
import { verifyEmailMessage } from '../lib/emails.js'
import { sendMail } from '../lib/mailer.js'
import { Candidate, Company, type UserDoc } from '../models/index.js'
import type { AuthUser, Role } from '../types/index.js'

const VERIFY_TTL = 24 * 60 * 60_000

interface UserLike {
  _id: Types.ObjectId | string
  email: string
  role: Role
  isVerified: boolean
}

/** Builds the `AuthUser` returned by /api/auth/me, including the company or candidate summary. */
export async function toAuthUser(user: UserLike): Promise<AuthUser> {
  const result: AuthUser = { id: String(user._id), email: user.email, role: user.role, isVerified: user.isVerified }

  if (user.role === 'company') {
    const company = await Company.findOne({ userId: user._id }).select('name status').lean()
    if (company) result.company = { id: String(company._id), name: company.name, status: company.status }
  } else if (user.role === 'candidate') {
    const candidate = await Candidate.findOne({ userId: user._id }).select('applicantNumber fullName').lean()
    if (candidate) result.candidate = { id: String(candidate._id), applicantNumber: candidate.applicantNumber, fullName: candidate.fullName }
  }
  return result
}

/** Creates a fresh verification token and emails the link. */
export async function sendVerification(user: UserDoc) {
  const { token, record } = createOneTimeToken(VERIFY_TTL)
  user.emailVerification = record
  await user.save()
  await sendMail(verifyEmailMessage(user.email, token))
}
