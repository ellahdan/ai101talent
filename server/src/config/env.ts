import { randomBytes } from 'node:crypto'
import cron from 'node-cron'
import { z } from 'zod'

const optional = z.string().trim().optional().transform((v) => (v ? v : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  MONGODB_URI: optional,

  JWT_SECRET: optional,
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_NAME: z.string().default('ai101_session'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  // smtp = send through SMTP_*; log = print emails to the server log (staging/demo only, users can't verify accounts).
  EMAIL_TRANSPORT: z.enum(['smtp', 'log']).default('smtp'),
  MAIL_FROM: z.string().default('AI101 Talents <no-reply@ai101talents.com>'),
  ADMIN_NOTIFY_EMAIL: optional,
  // Number of reverse proxies in front of the API (Render = 1; Vercel rewrite + Render = 2). Used for client IPs and rate limits.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  // Public contact address shown in email footers.
  CONTACT_EMAIL: z.string().email().default('hello@ai101talents.com'),

  // Data retention job (node-cron). Disable on all but one instance when running several servers.
  RETENTION_ENABLED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  RETENTION_CRON: z.string().default('0 3 * * *'),

  // Serve the built client (client/dist) from this server, for single-service deployments.
  SERVE_CLIENT: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  // Public base URL of the API, used for signed links to locally stored files.
  // Empty = same origin as the client (Vite proxy in development).
  API_PUBLIC_URL: z.string().default(''),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('uploads'),
  STORAGE_SIGNED_URL_TTL: z.coerce.number().int().min(30).max(3600).default(300),
  STORAGE_S3_BUCKET: optional,
  STORAGE_S3_REGION: z.string().default('auto'),
  STORAGE_S3_ENDPOINT: optional,
  STORAGE_S3_ACCESS_KEY_ID: optional,
  STORAGE_S3_SECRET_ACCESS_KEY: optional,
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('[config] Invalid environment variables:')
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

const raw = parsed.data
const isProduction = raw.NODE_ENV === 'production'

if (isProduction) {
  const required = raw.EMAIL_TRANSPORT === 'log' ? (['MONGODB_URI', 'JWT_SECRET'] as const) : (['MONGODB_URI', 'JWT_SECRET', 'SMTP_HOST'] as const)
  const missing = required.filter((key) => !raw[key])
  if (raw.EMAIL_TRANSPORT === 'log') console.warn('[config] EMAIL_TRANSPORT=log: emails are only written to the log (staging/demo mode)')
  if (missing.length) {
    console.error(`[config] Missing required production variables: ${missing.join(', ')}`)
    process.exit(1)
  }
  if (raw.STORAGE_DRIVER === 'local') {
    console.warn('[config] STORAGE_DRIVER=local in production: files stay on this server’s disk. Use s3 for multi-instance or ephemeral hosting.')
  }
  if (raw.JWT_SECRET!.length < 32) {
    console.error('[config] JWT_SECRET must be at least 32 characters in production')
    process.exit(1)
  }
}

let jwtSecret = raw.JWT_SECRET
if (!jwtSecret) {
  // Development only: sessions reset whenever the server restarts.
  jwtSecret = randomBytes(32).toString('hex')
  console.warn('[config] JWT_SECRET is not set; using a random secret (sessions reset on restart)')
}

if (!cron.validate(raw.RETENTION_CRON)) {
  console.error(`[config] RETENTION_CRON is not a valid cron expression: ${raw.RETENTION_CRON}`)
  process.exit(1)
}

if (raw.STORAGE_DRIVER === 's3') {
  const missing = (['STORAGE_S3_BUCKET', 'STORAGE_S3_ACCESS_KEY_ID', 'STORAGE_S3_SECRET_ACCESS_KEY'] as const).filter((key) => !raw[key])
  if (missing.length) {
    console.error(`[config] STORAGE_DRIVER=s3 requires: ${missing.join(', ')}`)
    process.exit(1)
  }
}

export const env = { ...raw, JWT_SECRET: jwtSecret, isProduction }
