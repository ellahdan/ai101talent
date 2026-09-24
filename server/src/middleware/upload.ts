import type { RequestHandler } from 'express'
import multer from 'multer'
import { DOCX, MAX_DOCUMENT_BYTES, PDF } from '../lib/documents.js'
import { badRequest } from '../lib/errors.js'

const ALLOWED = new Map([
  [PDF, /\.pdf$/i],
  [DOCX, /\.docx$/i],
])

const documents = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 2, fields: 20, fieldSize: 200_000 },
  fileFilter: (_req, file, cb) => {
    const ext = ALLOWED.get(file.mimetype)
    if (!ext || !ext.test(file.originalname)) return cb(badRequest('Files must be PDF or Word (.docx) documents', 'INVALID_FILE_TYPE'))
    cb(null, true)
  },
})

/**
 * Accepts multipart forms with an optional `cv` and `coverLetter` file (PDF/DOCX, max 5 MB each)
 * and a `data` field holding the JSON payload, which replaces req.body for the Zod validator.
 */
export const documentUpload: RequestHandler = (req, res, next) => {
  documents.fields([{ name: 'cv', maxCount: 1 }, { name: 'coverLetter', maxCount: 1 }])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Files must be 5 MB or smaller' : 'Invalid upload'
      return next(badRequest(message, err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD'))
    }
    if (err) return next(err)
    if (typeof req.body?.data === 'string') {
      try {
        req.body = JSON.parse(req.body.data)
      } catch {
        return next(badRequest('Malformed form data'))
      }
    }
    next()
  })
}

export function uploadedFiles(req: Parameters<RequestHandler>[0]) {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>
  return { cv: files.cv?.[0], coverLetter: files.coverLetter?.[0] }
}
