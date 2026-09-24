import type { RequestHandler } from 'express'
import { rateLimit, type Options } from 'express-rate-limit'

// ---- Rate limiting --------------------------------------------------------------

function limiter(windowMs: number, limit: number, extra: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { message: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMITED' } })
    },
    ...extra,
  })
}

/** Baseline limit for every API route. */
export const apiLimiter = limiter(15 * 60_000, 600)
/** Login, registration and password flows. */
export const authLimiter = limiter(15 * 60_000, 20)
/** Resending emails. */
export const emailLimiter = limiter(60 * 60_000, 5)

/** Limits per logged-in account rather than per IP (use after authentication). */
const perAccount = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user?.id ?? 'anonymous'}`,
    handler: (_req, res) => {
      res.status(429).json({ error: { message, code: 'RATE_LIMITED' } })
    },
  })

/** Talent search: generous for normal browsing, blocks scraping. */
export const searchLimiter = perAccount(15 * 60_000, 150, 'You are searching very quickly. Please wait a few minutes and try again.')
/** Contact requests: each one is reviewed by a person. */
export const contactRequestLimiter = perAccount(24 * 60 * 60_000, 20, 'You have reached the limit of 20 contact requests per day. Please try again tomorrow.')

// ---- NoSQL injection protection -------------------------------------------------
// express-mongo-sanitize is not compatible with Express 5 (req.query is read-only),
// so this does the same job: strip keys that start with "$" or contain ".".

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue
      clean[key] = sanitize(v)
    }
    return clean
  }
  return value
}

export const mongoSanitize: RequestHandler = (req, _res, next) => {
  if (req.body) req.body = sanitize(req.body)
  if (req.params) req.params = sanitize(req.params) as typeof req.params
  Object.defineProperty(req, 'query', { value: sanitize(req.query), writable: true, configurable: true })
  next()
}
