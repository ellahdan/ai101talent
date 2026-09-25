import type { Request, RequestHandler } from 'express'
import { forbidden } from '../lib/errors.js'
import { Company, type CompanyDoc } from '../models/index.js'
import type { CompanyProfile } from '../types/index.js'

const orUndefined = <T>(v: T | null | undefined) => (v == null ? undefined : v)

type CompanyLike = Pick<CompanyDoc, '_id' | 'name' | 'status'> & Record<string, any>

export function toCompanyProfile(c: CompanyLike, email: string): CompanyProfile {
  return {
    id: String(c._id),
    name: c.name,
    email,
    website: orUndefined(c.website),
    industry: orUndefined(c.industry),
    size: orUndefined(c.size),
    description: orUndefined(c.description),
    contactPerson: { name: c.contactPerson?.name ?? '', title: orUndefined(c.contactPerson?.title), phone: orUndefined(c.contactPerson?.phone) },
    status: c.status,
    statusNote: orUndefined(c.statusNote),
    approvedAt: c.approvedAt?.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }
}

/** The logged-in company's document (throws 403 if the account has none). */
export async function myCompany(req: Request) {
  const company = await Company.findOne({ userId: req.user!.id })
  if (!company) throw forbidden('No company is linked to this account')
  return company
}

/**
 * Allows only verified, admin-approved companies (posting jobs, searching talent, contacting candidates).
 * Puts the company document on res.locals.company.
 */
/**
 * Allows any company that is not suspended, approved or not. Used for contact requests, which wait
 * until the company is approved. Puts the company document on res.locals.company.
 */
export const requireActiveCompany: RequestHandler = async (req, res, next) => {
  const company = await myCompany(req)
  if (company.status === 'suspended') return next(forbidden('Your company account is suspended. Contact us for details.', 'COMPANY_SUSPENDED'))
  res.locals.company = company
  next()
}

export const requireApprovedCompany: RequestHandler = async (req, res, next) => {
  if (!req.user?.isVerified) return next(forbidden('Please verify your email address first', 'EMAIL_NOT_VERIFIED'))
  const company = await myCompany(req)
  if (company.status === 'pending') return next(forbidden('Your company is waiting for approval by our team', 'COMPANY_PENDING'))
  if (company.status === 'suspended') return next(forbidden('Your company account is suspended. Contact us for details.', 'COMPANY_SUSPENDED'))
  res.locals.company = company
  next()
}
