import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { AppError } from '../lib/errors.js'

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } })
}

/** Converts every error into the `{ error: { message, code } }` envelope. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } })
    return
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Some fields are invalid', code: 'VALIDATION_ERROR', details: err.flatten() } })
    return
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { message: `Invalid ${err.path}`, code: 'INVALID_ID' } })
    return
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ error: { message: 'Some fields are invalid', code: 'VALIDATION_ERROR', details: Object.keys(err.errors) } })
    return
  }
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: { message: 'This record already exists', code: 'DUPLICATE' } })
    return
  }
  // Body parser errors (malformed JSON, payload too large)
  if (typeof err === 'object' && err && 'type' in err && typeof (err as { status?: number }).status === 'number') {
    const status = (err as { status: number }).status
    res.status(status).json({ error: { message: status === 413 ? 'Request is too large' : 'Malformed request', code: 'BAD_REQUEST' } })
    return
  }

  console.error('[error]', err)
  res.status(500).json({
    error: { message: env.isProduction ? 'Something went wrong' : String((err as Error)?.message ?? err), code: 'INTERNAL_ERROR' },
  })
}
