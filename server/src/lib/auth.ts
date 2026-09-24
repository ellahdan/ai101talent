import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { CookieOptions, Response } from 'express'
import { env } from '../config/env.js'
import type { Role } from '../types/index.js'

const BCRYPT_ROUNDS = 12

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)

// ---- Session JWT (httpOnly cookie) ------------------------------------------

export interface SessionPayload {
  sub: string
  role: Role
  /** Must match User.tokenVersion; bumping it revokes every existing session. */
  tv: number
}

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProduction || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
})

export function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`, algorithm: 'HS256' })
  res.cookie(env.COOKIE_NAME, token, { ...cookieOptions(), maxAge: env.JWT_EXPIRES_IN_DAYS * 86_400_000 })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME, cookieOptions())
}

export function readSessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
    if (typeof decoded === 'string' || !decoded.sub) return null
    return decoded as unknown as SessionPayload
  } catch {
    return null
  }
}

// ---- One-time tokens (email verification, password reset) -----------------
// The raw token goes in the email link; only its SHA-256 hash is stored.

export function createOneTimeToken(ttlMs: number) {
  const token = randomBytes(32).toString('hex')
  return { token, record: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) } }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
