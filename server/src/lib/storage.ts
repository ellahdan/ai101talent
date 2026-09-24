import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

/**
 * Private file storage. Files are never public: they are read through short-lived signed URLs.
 * - s3: any S3-compatible service (AWS S3, Cloudflare R2, MinIO) with presigned GET URLs.
 * - local: files on disk, served by GET /api/files/:key with an HMAC-signed, expiring query string.
 */
export interface StoredFile {
  key: string
  mimeType: string
  originalName: string
  size: number
}

/** attachment = download; inline = display in the browser (e.g. an admin viewing a PDF CV). */
export type Disposition = 'attachment' | 'inline'

interface Driver {
  put(key: string, body: Buffer, mimeType: string): Promise<void>
  signedUrl(key: string, downloadName: string, ttlSeconds: number, disposition: Disposition): Promise<string>
  remove(key: string): Promise<void>
  read(key: string): Promise<Buffer>
}

// ---- Local disk ------------------------------------------------------------------

const serverRoot = fileURLToPath(new URL('../../', import.meta.url))
const localRoot = isAbsolute(env.STORAGE_LOCAL_DIR) ? env.STORAGE_LOCAL_DIR : join(serverRoot, env.STORAGE_LOCAL_DIR)

/** Resolves a key inside the storage root, rejecting path traversal. */
export function localPath(key: string) {
  const full = normalize(join(localRoot, key))
  if (!full.startsWith(normalize(localRoot) + sep)) throw new Error('Invalid storage key')
  return full
}

// The disposition is signed too, so a download link can't be turned into an inline one (or vice versa).
const signature = (key: string, exp: number, name: string, disposition: Disposition) =>
  createHmac('sha256', `files:${env.JWT_SECRET}`).update(`${key}\n${exp}\n${name}\n${disposition}`).digest('hex')

/** Checks a local signed link. Returns false if expired or tampered with. */
export function verifyLocalSignature(key: string, exp: number, name: string, disposition: Disposition, sig: string) {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false
  const expected = Buffer.from(signature(key, exp, name, disposition), 'hex')
  const given = Buffer.from(sig, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}

const localDriver: Driver = {
  async put(key, body) {
    const path = localPath(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
  },
  async signedUrl(key, downloadName, ttl, disposition) {
    const exp = Math.floor(Date.now() / 1000) + ttl
    const qs = new URLSearchParams({ exp: String(exp), name: downloadName, ...(disposition === 'inline' ? { d: 'inline' } : {}), sig: signature(key, exp, downloadName, disposition) })
    return `${env.API_PUBLIC_URL}/api/files/${encodeURIComponent(key)}?${qs}`
  },
  async remove(key) {
    await rm(localPath(key), { force: true })
  },
  read: (key) => readFile(localPath(key)),
}

// ---- S3-compatible -------------------------------------------------------------------

function s3Driver(): Driver {
  const client = new S3Client({
    region: env.STORAGE_S3_REGION,
    endpoint: env.STORAGE_S3_ENDPOINT,
    forcePathStyle: Boolean(env.STORAGE_S3_ENDPOINT),
    credentials: { accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!, secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY! },
  })
  const Bucket = env.STORAGE_S3_BUCKET!
  return {
    async put(key, body, mimeType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: mimeType }))
    },
    signedUrl(key, downloadName, ttl, disposition) {
      const header = `${disposition}; filename="${downloadName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key, ResponseContentDisposition: header }), { expiresIn: ttl })
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }))
    },
    async read(key) {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }))
      return Buffer.from(await res.Body!.transformToByteArray())
    },
  }
}

const driver = env.STORAGE_DRIVER === 's3' ? s3Driver() : localDriver

// ---- Public API ------------------------------------------------------------------------

const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

export async function saveFile(folder: string, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }): Promise<StoredFile> {
  const key = `${folder}/${randomUUID()}${EXTENSIONS[file.mimetype] ?? ''}`
  await driver.put(key, file.buffer, file.mimetype)
  return { key, mimeType: file.mimetype, originalName: file.originalname.slice(0, 200), size: file.size }
}

export const signedFileUrl = (file: { key: string; originalName: string }, opts: { inline?: boolean; ttl?: number } = {}) =>
  driver.signedUrl(file.key, file.originalName, opts.ttl ?? env.STORAGE_SIGNED_URL_TTL, opts.inline ? 'inline' : 'attachment')

/** Deletes a stored file; missing files are ignored. */
export async function deleteFile(key: string | undefined | null) {
  if (!key) return
  try {
    await driver.remove(key)
  } catch (err) {
    console.error('[storage] failed to delete', key, err)
  }
}

export const readFileBuffer = (key: string) => driver.read(key)
