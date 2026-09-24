import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { authenticate } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { sameOrigin } from './middleware/origin.js'
import { apiLimiter, mongoSanitize } from './middleware/security.js'
import { authRouter } from './routes/auth.js'
import { jobsRouter } from './routes/jobs.js'
import { publicRouter } from './routes/public.js'
import { candidatesRouter } from './routes/candidates.js'
import { applicationsRouter } from './routes/applications.js'
import { requestsRouter } from './routes/requests.js'
import { filesRouter } from './routes/files.js'
import { companiesRouter } from './routes/companies.js'
import { adminRouter } from './routes/admin.js'
import { adminRequestsRouter } from './routes/admin-requests.js'
import { adminOfficeRouter } from './routes/admin-office.js'
import { searchRouter } from './routes/search.js'
import { shortlistsRouter } from './routes/shortlists.js'

/** Content-Security-Policy for the web app when this server also serves it (SERVE_CLIENT=true). */
const appCsp = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    // Tailwind ships a stylesheet; Framer Motion and charts set inline style attributes.
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    fontSrc: ["'self'", 'data:'],
    // Only the API is fetched; file downloads are navigations to signed URLs, not fetches.
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: env.isProduction ? [] : null,
  },
}

export function createApp() {
  const app = express()

  // Behind a reverse proxy (Render, Railway, Nginx…) this makes req.ip and rate limiting use the client IP.
  if (env.isProduction) app.set('trust proxy', env.TRUST_PROXY)
  app.disable('x-powered-by')
  // Flat query strings only (no nested objects), so `?a[$gt]=` can't become an operator.
  app.set('query parser', 'simple')

  app.use(compression())
  app.use(helmet({ contentSecurityPolicy: env.SERVE_CLIENT ? appCsp : undefined }))
  app.use('/api', cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(mongoSanitize)
  app.use('/api', apiLimiter, sameOrigin, authenticate)

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down', time: new Date().toISOString() } })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/public', publicRouter)
  app.use('/api/jobs', jobsRouter)
  app.use('/api/candidates', candidatesRouter)
  app.use('/api/applications', applicationsRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/files', filesRouter)
  app.use('/api/companies', companiesRouter)
  app.use('/api/search', searchRouter)
  app.use('/api/shortlists', shortlistsRouter)
  app.use('/api/admin/requests', adminRequestsRouter)
  app.use('/api/admin', adminOfficeRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api', notFoundHandler)

  if (env.SERVE_CLIENT) serveClient(app)

  app.use(errorHandler)
  return app
}

/** Serves client/dist with long-lived caching for hashed assets and an SPA fallback to index.html. */
function serveClient(app: express.Express) {
  const dist = fileURLToPath(new URL('../../client/dist', import.meta.url))
  if (!existsSync(dist)) {
    console.warn(`[server] SERVE_CLIENT=true but ${dist} does not exist. Run "npm run build" first.`)
    return
  }
  app.use('/assets', express.static(`${dist}/assets`, { immutable: true, maxAge: '1y', index: false }))
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(`${dist}/index.html`)
  })
  console.log(`[server] serving the web app from ${dist}`)
}
