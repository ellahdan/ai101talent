import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { clearSessionCookie, readSessionToken } from '../lib/auth.js'
import { forbidden, unauthorized } from '../lib/errors.js'
import { User } from '../models/index.js'
import type { Role } from '../types/index.js'

/** Loads the user from the session cookie if there is one. Never rejects the request. */
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME]
  if (!token) return next()

  const payload = readSessionToken(token)
  const user = payload && (await User.findById(payload.sub).select('email role isVerified tokenVersion').lean())
  if (!payload || !user || user.tokenVersion !== payload.tv) {
    clearSessionCookie(res)
    return next()
  }
  req.user = { id: String(user._id), email: user.email, role: user.role, isVerified: user.isVerified }
  next()
}

/** Requires a logged-in user, optionally with one of the given roles. */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (roles.length && !roles.includes(req.user.role)) return next(forbidden())
    next()
  }
}

/** Requires a verified email address (used for sensitive actions such as searching or contacting). */
export const requireVerified: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized())
  if (!req.user.isVerified) return next(forbidden('Please verify your email address first', 'EMAIL_NOT_VERIFIED'))
  next()
}
