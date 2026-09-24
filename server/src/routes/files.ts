import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Router } from 'express'
import { forbidden, notFound } from '../lib/errors.js'
import { localPath, verifyLocalSignature } from '../lib/storage.js'

/** Serves locally stored files through signed, expiring links (local storage driver only). */
export const filesRouter = Router()

const TYPES: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

filesRouter.get('/:key', async (req, res) => {
  const key = req.params.key
  const exp = Number(req.query.exp)
  const name = String(req.query.name ?? '')
  const sig = String(req.query.sig ?? '')
  const disposition = req.query.d === 'inline' ? 'inline' : 'attachment'
  if (!/^[a-f0-9]{64}$/.test(sig) || !verifyLocalSignature(key, exp, name, disposition, sig)) throw forbidden('This download link is invalid or has expired', 'INVALID_LINK')

  let path: string
  try {
    path = localPath(key)
    await stat(path)
  } catch {
    throw notFound('File not found')
  }

  const ext = key.split('.').pop() ?? ''
  res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream')
  res.setHeader('Content-Disposition', `${disposition}; filename="${name.replace(/["\r\n]/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Uploaded documents are untrusted: when shown inline, nothing in them may run scripts or reach our origin.
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'none'")
  createReadStream(path).pipe(res)
})
