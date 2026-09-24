import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { forbidden } from '../lib/errors.js'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Defense in depth against cross-site request forgery (on top of SameSite cookies):
 * state-changing browser requests must come from the client's origin. Requests without an Origin
 * header (server-to-server, CLI tools) are allowed; they carry no ambient browser cookies.
 */
export const sameOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE.has(req.method)) return next()
  const origin = req.get('origin')
  if (!origin || origin === env.CLIENT_URL || (env.API_PUBLIC_URL && origin === new URL(env.API_PUBLIC_URL).origin)) return next()
  next(forbidden('Cross-site request blocked', 'BAD_ORIGIN'))
}
