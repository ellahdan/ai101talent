# AI101 Talents

A talent platform where candidates apply to open positions or create a standalone profile, companies search anonymized candidates and ask to speak with them, and an admin mediates **every** contact between the two.

- **Candidates** apply or create a reusable profile (multi-step form, CV upload), get a unique applicant number (`AI101-000123`), track applications, accept or decline forwarded contact requests, and can export or permanently delete their data.
- **Companies** (and any visitor) can browse anonymized profiles in the public talent search at `/talent`. Contacting a candidate or keeping shortlists requires a company account approved by an admin; positions are reviewed too. Companies never see more than the anonymized profile until a candidate accepts an introduction.
- **Admins** review every request (forward, ask for info, reject, introduce), moderate companies and positions, search all CVs with highlighted matches, run a Kanban pipeline, and audit who viewed which CV.
- **English / German**: every screen is available in both languages via the flag switch in the header (see [Languages](#languages)).

## Tech stack

| | |
| --- | --- |
| Client | React 18, Vite, TypeScript, Tailwind CSS v4, React Router, TanStack Query, React Hook Form + Zod, Framer Motion (LazyMotion), Base UI, TipTap, Recharts, dnd-kit |
| Server | Node.js, Express 5, TypeScript, MongoDB + Mongoose, Zod, JWT (httpOnly cookie), bcrypt, multer, pdf-parse, mammoth, Nodemailer, node-cron, helmet, express-rate-limit |
| Storage | S3-compatible (AWS S3, Cloudflare R2, MinIO) with private signed URLs; local disk in development |

## Project structure

```
client/                 React app (Vite)
  src/pages/            public, candidate/, company/, admin/ areas (lazy-loaded)
  src/components/       ui/ primitives, landing/, layout/, jobs/, talent/, profile/, admin/
  src/hooks/            data hooks (TanStack Query) per area
  src/lib/validation/   Zod schemas mirrored from the server
  src/types/            shared API types (mirror of server/src/types)
server/                 Express API
  src/config/           validated environment variables
  src/db/               MongoDB connection (embedded MongoDB fallback in development)
  src/models/           Mongoose schemas and indexes
  src/middleware/       authenticate/authorize, validate (Zod), rate limits, sanitizing, origin check, uploads, errors
  src/routes/           REST routes under /api/*
  src/services/         domain logic (requests state machine, search, candidates, companies…)
  src/lib/              auth, storage, documents (CV text), mailer + email templates, audit, counters, CSV
  src/jobs/             scheduled jobs (data retention)
  src/scripts/          seed, create-admin, retention
```

Shared API types live in `server/src/types/index.ts` and are mirrored in `client/src/types/index.ts`. Keep both in sync (the same applies to the Zod schemas in `server/src/validation` and `client/src/lib/validation`).

## Getting started

Requires **Node.js 20+**.

```bash
npm install
cp server/.env.example server/.env   # optional in development
cp client/.env.example client/.env   # optional in development
npm run seed -w server -- --yes      # sample data (optional)
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000 (health check: `/api/health`)

In development, Vite proxies `/api` to the server, so the app and API share one origin and the session cookie just works.

- **Database:** with an empty `MONGODB_URI`, the server starts an embedded MongoDB (`mongodb-memory-server`) that keeps its data in `server/.data/mongo`. On Windows this needs the [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) (`winget install Microsoft.VCRedist.2015+.x64`). Or point `MONGODB_URI` at MongoDB Atlas.
- **Emails:** with an empty `SMTP_HOST`, every email (verification, password reset, notifications) is printed to the server console, links included.
- **Files:** uploads go to `server/uploads/` (gitignored).

### Sample data

`npm run seed -w server` **wipes the database** and loads: 1 admin, 3 approved companies (+1 pending), 10 positions (3 featured, 1 pending, 1 closed), 30 candidates with PDF CVs and applicant numbers `AI101-000001`…`000030`, 26 applications across the pipeline, 9 contact requests in every status, shortlists, 4 testimonials and audit-log entries. It asks for confirmation (`-- --yes` skips it) and refuses to run with `NODE_ENV=production` unless `--force` is given.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@ai101talents.example | Admin12345! |
| Company | hiring@northstar.example, talent@lumahealth.example, jobs@mavenstudio.example (recruiting@orbitlogistics.example is pending approval) | Password123! |
| Candidate | candidate01@example.com … candidate30@example.com | Password123! |

These are development logins (override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`). Never seed a production database.

## Scripts

| Script (from the root) | What it does |
| --- | --- |
| `npm run dev` | Starts the API and the web app together (concurrently, with reload) |
| `npm run build` | Builds the server (`server/dist`) and the client (`client/dist`) |
| `npm run typecheck` | Type-checks both workspaces |
| `npm start -w server` | Runs the built server (`node dist/index.js`) |
| `npm run seed -w server` | Resets the database with sample data |
| `npm run create-admin -w server -- --email … --password …` | Creates an admin account (there is no public admin signup; admins can also invite admins from Settings) |
| `npm run retention -w server -- --dry-run` | Shows which inactive profiles the retention job would delete (omit `--dry-run` to delete) |

## Environment variables

All variables are documented in `server/.env.example` and `client/.env.example`. In production the server refuses to start without the required ones.

**Server**

| Variable | Default | Production | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | `production` | Enables secure cookies, trust proxy, required-variable checks |
| `PORT` | `4000` | | HTTP port |
| `CLIENT_URL` | `http://localhost:5173` | **required** | Web app origin: CORS, origin check, links in emails |
| `MONGODB_URI` | *(embedded DB)* | **required** | MongoDB connection string (Atlas) |
| `JWT_SECRET` | *(random per start)* | **required**, 32+ chars | Signs session tokens and file links |
| `JWT_EXPIRES_IN_DAYS` | `7` | | Session length |
| `COOKIE_NAME` | `ai101_session` | | Session cookie name |
| `COOKIE_SAMESITE` | `lax` | | Use `none` only if the web app and API are on different sites (HTTPS required) |
| `SMTP_HOST` | *(console)* | **required** | SMTP server |
| `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASS` | `587` · `false` | | SMTP connection |
| `MAIL_FROM` | `AI101 Talents <no-reply@…>` | | Sender |
| `ADMIN_NOTIFY_EMAIL` | *(all admins)* | | Where admin notifications go |
| `CONTACT_EMAIL` | `hello@ai101talents.com` | | Contact address in email footers |
| `STORAGE_DRIVER` | `local` | `s3` recommended | `local` (disk) or `s3` |
| `STORAGE_LOCAL_DIR` | `uploads` | | Folder for the local driver (relative to `server/`) |
| `STORAGE_SIGNED_URL_TTL` | `300` | | Lifetime of file links, seconds |
| `STORAGE_S3_BUCKET` · `STORAGE_S3_REGION` · `STORAGE_S3_ENDPOINT` · `STORAGE_S3_ACCESS_KEY_ID` · `STORAGE_S3_SECRET_ACCESS_KEY` | | with `s3` | Private bucket credentials (`ENDPOINT` for R2/MinIO; region `auto` for R2) |
| `API_PUBLIC_URL` | *(same origin)* | | Public API URL, used in local-driver file links when the API is on another origin |
| `RETENTION_ENABLED` | `true` | | Run the daily retention job on this instance (enable on exactly one instance) |
| `RETENTION_CRON` | `0 3 * * *` | | Retention schedule (UTC) |
| `SERVE_CLIENT` | `false` | | Serve `client/dist` from the API server (single-service deployment) |

**Client** (`VITE_*` values are public, baked in at build time)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL. Leave empty when the app and API share an origin (dev proxy, `SERVE_CLIENT`, or a reverse proxy) |
| `VITE_CONTACT_EMAIL` | Contact address shown in the footer and legal pages |

## How it works

### Authentication
- Session JWT in an **httpOnly** cookie (`Secure` in production, `SameSite=Lax`). Passwords hashed with **bcrypt** (cost 12).
- Email verification and password reset links carry a random token; only its SHA-256 hash is stored. Links expire (24 h / 1 h) and work once.
- Resetting or changing a password bumps a per-user `tokenVersion`, signing out every other session.
- Roles: `candidate`, `company`, `admin`, enforced by `authorize()` on every protected route. Companies also need a verified email and admin approval (`requireApprovedCompany`).

### Applicant numbers
Generated atomically with `findOneAndUpdate({ _id: 'applicantNumber' }, { $inc: { seq: 1 } }, { upsert: true })` on a `counters` collection: sequential, never duplicated (checked with 200 concurrent requests), never reused. `Candidate.applicantNumber` has a unique index.

### Emails
Nodemailer over SMTP, with shared HTML templates (inbox preview text, Outlook-safe button, privacy/contact footer) and a plain-text version of each. Sent for: email verification, password reset/changed, application or profile confirmation (with applicant number), company approval/suspension, position approved/rejected, every contact-request step (to the relevant party), admin notifications and admin invitations. Email failures are logged, never block a request.

### Data retention
A **node-cron** job (default daily at 03:00 UTC) deletes candidate accounts inactive for longer than the period set in **Admin → Settings** (default 24 months; activity = login, profile update, application or reply to a request). Deletion removes the profile, CV and cover-letter files, applications, contact requests and shortlist entries, exactly like "Delete my account". The audit log keeps an anonymous `candidate.retention_deleted` entry. Run on one instance only (`RETENTION_ENABLED`); preview with `npm run retention -w server -- --dry-run`.

### Languages

The web app is available in English and German. The flag switch in the header (public pages and dashboards) changes the language instantly; the choice is saved in `localStorage` (`ai101-lang`), and first-time visitors get German when their browser prefers it.

- `client/src/i18n/index.tsx`: a small typed layer (no library). `defineText(en, de)` declares both languages side by side and TypeScript rejects a German text whose shape differs from the English one; components read their text with `useT(text)`.
- Shared text lives in `client/src/i18n/*.ts` (common, auth, talent, profile, candidate, company, jobForm, admin); page-specific text is declared in the page file.
- API errors and validation messages arrive in English and are translated through `client/src/i18n/messages.ts` (keyed by the English text). A message missing there is shown in English.
- Dates and numbers use `de-DE` / `en-GB` formatting (`client/src/lib/format.ts`).
- Content entered by users (job descriptions, profiles, messages) and emails sent by the server are not translated.

### Security
- **helmet** security headers; **CORS** limited to `CLIENT_URL` with credentials; state-changing requests from another origin are rejected (`BAD_ORIGIN`), on top of SameSite cookies.
- **Rate limits**: 600 requests/15 min per IP on the API, 20/15 min on login, registration and password flows, 5/h for email resends, 150/15 min talent searches per account (90 per IP for guests) and 20 contact requests/day per company account.
- **Injection**: Zod validation on every input (body, query, params); keys starting with `$` or containing `.` are stripped (Express 5–compatible replacement for express-mongo-sanitize); flat query strings only; regex inputs are escaped.
- **Uploads**: PDF/DOCX only, 5 MB max, content checked by magic bytes, stored privately, served only through signed expiring links, with a sandboxing Content-Security-Policy on the file response. Every CV view and download is audit-logged.
- **Output**: rich-text job descriptions sanitized server-side (`sanitize-html`); CSV exports neutralize formula injection; errors never leak internals in production.
- **Privacy**: the talent search (public) only returns anonymized fields (never name, email, phone, links, employers, CV or CV text); no search filters on age, gender, marital status, nationality, religion or photos; candidates can export (JSON) and delete their data.
- With `SERVE_CLIENT=true`, the web app is served with a strict CSP (`script-src 'self'`, no inline scripts, `frame-ancestors 'none'`).

### Performance & accessibility
Routes are code-split; animation code loads after first paint (`LazyMotion`); charts, the rich-text editor and drag-and-drop only load in the areas that use them; responses are compressed (brotli/gzip) and hashed assets cached for a year. Lighthouse on the production build served by `SERVE_CLIENT` (landing, jobs, login):

| Preset | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Desktop | 99–100 | 96–97 | 96–100 | 100 |
| Mobile (throttled) | 85–89 | 96–97 | 96–100 | 100 |

Accessibility: labelled form controls with linked errors, keyboard navigation (tabs, comboboxes, dialogs, drag-and-drop with a keyboard sensor and a per-card menu), visible focus rings, skip link, `prefers-reduced-motion` support, charts with table views and text summaries.

## Deployment

**Option A: single service (simplest).** One Node process serves the API and the web app on the same origin:

```bash
npm ci
npm run build
# server/.env: NODE_ENV=production, SERVE_CLIENT=true, CLIENT_URL=https://your-domain, MONGODB_URI, JWT_SECRET, SMTP_*, STORAGE_* …
npm start -w server
```

Put it behind HTTPS (Render, Railway, Fly.io, a VPS with Nginx/Caddy…). Leave `VITE_API_URL` empty.

**Option B: separate static app + API.** Deploy `client/dist` to any static host (Netlify, Vercel, Cloudflare Pages) with an SPA fallback to `index.html`, and the API as a Node service. Prefer the same site (e.g. `app.example.com` + `api.example.com`) and keep `COOKIE_SAMESITE=lax`; set `CLIENT_URL` to the app URL and build the client with `VITE_API_URL=https://api.example.com`. On the static host, add security headers equivalent to the CSP above.

**Option C: Vercel (web app) + Render (API), as configured in this repo.** `vercel.json` builds the client and forwards `/api/*` to the Render service, so the browser only talks to the Vercel domain (first-party cookies, `connect-src 'self'`). `render.yaml` is a Render Blueprint for the API.

1. Push the repository to GitHub.
2. Atlas → Network Access: allow `0.0.0.0/0` (Render's free instances have no fixed IP). Use a separate database for staging, e.g. `…mongodb.net/ai101talents_staging?…`.
3. Render → New → Blueprint → pick the repo. Enter `MONGODB_URI` and `CLIENT_URL` (your Vercel URL, e.g. `https://ai101-talents.vercel.app`). Note the service URL (e.g. `https://ai101-talents-api-eubp.onrender.com`).
4. If the Render URL differs from the one in `vercel.json`, update the `/api/:path*` rewrite destination.
5. `npx vercel login`, then from the repo root: `npx vercel --prod`.

The blueprint is a **staging** setup: emails are logged (`EMAIL_TRANSPORT=log`), files live on the instance disk (lost on restart/deploy), and every deploy re-seeds the demo database. For production, remove the seed step from `buildCommand` and set `EMAIL_TRANSPORT=smtp` + `SMTP_*` and `STORAGE_DRIVER=s3` + `STORAGE_S3_*`. The free Render plan sleeps after 15 minutes of inactivity, so the first request afterwards takes ~30–60 s.

Checklist:
- MongoDB Atlas: create a database user, allow your server's IP (Network Access), use a connection string with a database name (`…mongodb.net/ai101talents?…`). Consider putting the API in the same region as the cluster: each round trip adds latency.
- Private S3/R2 bucket (no public access) and `STORAGE_DRIVER=s3`. Local disk only works on a single server with a persistent disk.
- A strong `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- SMTP credentials and a verified sender domain (SPF/DKIM).
- `RETENTION_ENABLED=true` on exactly one instance.
- Create the first admin with `npm run create-admin -w server -- --email … --password …` (then invite others from Settings).
- Have the privacy policy and terms (template texts in `client/src/pages`) reviewed by legal counsel.

## Troubleshooting

- **`Instance closed unexpectedly with code 3221225781`** (Windows, embedded MongoDB): install the Visual C++ Redistributable (see above) or set `MONGODB_URI`.
- **Atlas connection times out**: add your current IP in Atlas → Network Access.
- **Logged out after restarting the dev server**: set `JWT_SECRET` in `server/.env` (otherwise a random secret is generated at each start).
- **`429 Too many requests`** while testing: rate limits are in memory; restart the server to reset them.

## API reference

All responses use `{ "data": … }` on success and `{ "error": { "message", "code" } }` on failure.

### File storage

CVs and cover letters are private. They are only served through short-lived signed URLs (`STORAGE_SIGNED_URL_TTL`, 5 minutes by default), never through public links.

- **Development:** `STORAGE_DRIVER=local` stores files in `server/uploads/` (gitignored), served by `GET /api/files/:key` with an HMAC-signed, expiring query string.
- **Production:** `STORAGE_DRIVER=s3` works with AWS S3, Cloudflare R2 or MinIO (presigned GET URLs). Keep the bucket private.

Uploads are limited to PDF and Word (.docx) files of up to 5 MB. The server checks the file's real content (magic bytes), not only its extension. The text is extracted (pdf-parse / mammoth) into `Candidate.cvText` for keyword search. Scanned PDFs without a text layer are accepted but won't be keyword-searchable.

### Auth endpoints

- Sessions are JWTs in an httpOnly cookie (`Secure` in production). Passwords are hashed with bcrypt (cost 12).
- Each user has a `tokenVersion`; resetting or changing a password bumps it, which signs out every other session.
- Verification and reset links contain a random token; only its SHA-256 hash is stored. Links expire after 24 hours (verification) and 1 hour (reset) and work once.
- Login and password endpoints are rate-limited (20 requests per 15 minutes per IP).

| Endpoint | Description |
| --- | --- |
| `POST /api/auth/register` | Candidate or company account (companies start as `pending`) |
| `POST /api/auth/login` · `POST /api/auth/logout` | Start or end a session |
| `GET /api/auth/me` | Current user with company or candidate summary |
| `POST /api/auth/verify-email` · `POST /api/auth/resend-verification` | Email verification |
| `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | Password reset by email |
| `POST /api/auth/change-password` | Change password while logged in |

### Public API

| Endpoint | Description |
| --- | --- |
| `GET /api/public/stats` | Open positions, registered talents, approved companies, successful hires |
| `GET /api/public/skills` | Most requested skills across open jobs |
| `GET /api/public/testimonials` | Landing page testimonials |
| `GET /api/jobs` | Open jobs. Filters: `q`, `location`, `workMode`, `contractType`, `seniority`, `skills` (comma-separated; a job must require every one), `featured`, `sort` (`relevance` or `newest`), `page`, `limit` |
| `GET /api/jobs/facets` | Locations and skills for the filter UI |
| `GET /api/jobs/:id` | Job detail (open jobs of approved companies only) |

Public data is cached in memory for 60 seconds.

### Candidate API

| Endpoint | Description |
| --- | --- |
| `POST /api/candidates` | Create a profile (multipart: `data` JSON + `cv` + optional `coverLetter`), optionally applying to `jobId`. Creates the account when the visitor isn't logged in (`password`). Assigns the applicant number and emails a confirmation. |
| `GET /api/candidates/me` · `PUT /api/candidates/me` | Own profile; update with an optional CV replacement (the old file is deleted) |
| `GET /api/candidates/me/files/:kind` | Signed download link for own `cv` or `cover-letter` |
| `DELETE /api/candidates/me/cover-letter` | Remove the profile cover letter |
| `GET /api/candidates/me/export` | Everything held about the candidate, as a JSON download |
| `DELETE /api/candidates/me` | Permanently delete account, profile, files, applications and contact requests (password required) |
| `POST /api/applications` · `GET /api/applications/mine` | Apply with an existing profile; list own applications |
| `GET /api/requests/mine` | Contact requests forwarded to the candidate (never pending ones, never the company's thread) |
| `POST /api/requests/:id/respond` · `POST /api/requests/:id/messages` | Accept/decline a forwarded request; message the admin team |
| `GET /api/public/suggest?type=skills\|tools&q=` | Autocomplete for tag inputs |

### Company API

Companies register as `pending`. They can edit their profile right away, but posting positions (and, from phase 6, searching talent) requires a confirmed email **and** admin approval.

| Endpoint | Description |
| --- | --- |
| `GET /api/companies/me` · `PUT /api/companies/me` | Own company profile |
| `GET /api/companies/me/jobs` · `GET /api/companies/me/jobs/:id` | Own positions (any status) with applicant counts and moderation notes |
| `POST /api/companies/me/jobs` | Submit a position. It stays `pending` until an admin approves it |
| `PUT /api/companies/me/jobs/:id` | Edit a position. Editing a live position sends it back to review (hidden until approved) |
| `POST /api/companies/me/jobs/:id/close` · `…/reopen` | Close a position; request reopening (goes through review) |

Job descriptions are rich text (TipTap in the browser) and are sanitized on the server before storage.

### Admin API (moderation)

| Endpoint | Description |
| --- | --- |
| `GET /api/admin/summary` | Counts for pending companies, pending positions and requests awaiting review |
| `GET /api/admin/companies?status=&q=` · `PATCH /api/admin/companies/:id/status` | List companies; approve, reject/suspend or reinstate (the company is emailed, with an optional note) |
| `GET /api/admin/jobs?status=&q=` · `GET /api/admin/jobs/:id` | List and read positions of any status |
| `POST /api/admin/jobs` · `PUT /api/admin/jobs/:id` | Create (published immediately) or edit a position for any approved company |
| `PATCH /api/admin/jobs/:id/status` | Approve (`open`), reject or close (`closed`, with a note), reopen |
| `PATCH /api/admin/jobs/:id/featured` | Feature on the landing page |

Suspending a company hides all its positions from the public job board.

### Talent search and shortlists

The talent search is **public**: visitors can browse and filter profiles at `/talent` (and open `/talent/:id`) without an account. When a guest clicks "Request to speak" or "Save", they are asked to register a company (or log in). Approved companies are redirected to the same search inside their dashboard (`/company/search`), where results also show their shortlists and request statuses. Contact requests and shortlists still require a verified, approved company.

Everyone only ever sees **anonymized** candidates who are visible and gave consent: applicant number, headline, years of experience, skills, tools, languages, location, availability and preferred work mode. Name, email, phone, links, employer names, CV and CV text are never returned. There are deliberately no filters on age, gender, marital status, nationality, religion or photos.

| Endpoint | Description |
| --- | --- |
| `GET /api/search/candidates` | Filters: `q` (profiles and CV text, MongoDB `$text`), `skills` + `skillsMode=all\|any`, `minYears`, `maxYears`, `languages=French:fluent,English` (minimum level), `country`, `workMode`, `availability`; `sort=relevance\|experience\|newest`; `page`, `limit` |
| `GET /api/search/candidates/:id` | Anonymized profile (skills, role titles and years, languages, education without institution) |
| `GET /api/search/facets` | Countries and languages for the filters |
| `GET/POST /api/shortlists` · `PATCH/DELETE /api/shortlists/:id` | Named, private shortlists |
| `GET /api/shortlists/:id/candidates` · `POST …/candidates` · `DELETE …/candidates/:candidateId` | Shortlist contents |

Search is limited to 150 requests per 15 minutes per logged-in account, and 90 per 15 minutes per IP address for guests, who also get at most 12 results per page. `robots.txt` asks search engines not to index `/talent`.

### Admin-mediated contact requests

Companies never contact candidates directly. Every request follows this flow, and every change is timestamped in the request's `history` and in the audit log:

```
company "Request to speak" → pending_admin_review ─┬→ info_requested ⇄ (company replies) → pending_admin_review
                                                    ├→ rejected (reason emailed to the company)
                                                    └→ forwarded_to_candidate (admin may edit the message)
                                                           ├→ candidate_declined → closed
                                                           └→ candidate_accepted → introduced (admin picks what to share)
                                                                                     → interviewing → hired | not_selected → closed
```

- Two separate threads per request: admin ↔ company and admin ↔ candidate. Companies and candidates never see each other's thread.
- Companies see the status and admin messages only. Candidate contact details and the CV reach them only if the admin shares them at the introduction step. Shared CV downloads are logged.
- Candidates only see a request once it has been forwarded to them.
- Recording a hire updates the landing page's "successful hires" stat.
- Companies can send up to 20 requests per day, and only one active request per candidate.

| Endpoint | Who | Description |
| --- | --- | --- |
| `POST /api/requests` | company | Request to speak (position or role title, message, proposed times, optional salary) |
| `GET /api/requests/company` · `GET /api/requests/company/:id` | company | Own requests: status, admin messages, shared details |
| `POST /api/requests/company/:id/messages` | company | Message the admin team (answers an info request) |
| `GET /api/requests/company/:id/cv` | company | Signed CV link, only if shared (logged) |
| `GET /api/requests/mine` · `POST /api/requests/:id/respond` · `POST /api/requests/:id/messages` | candidate | Forwarded requests; accept or decline; message the admin team |
| `GET /api/admin/requests?group=action\|active\|closed` · `GET /api/admin/requests/:id` | admin | Queue and full request (both parties, both threads, history) |
| `POST /api/admin/requests/:id/forward` · `…/request-info` · `…/reject` | admin | Review decisions |
| `POST /api/admin/requests/:id/introduce` | admin | Share chosen details (name, email, phone, LinkedIn, CV) and an optional interview date |
| `POST /api/admin/requests/:id/outcome` | admin | `interviewing`, `hired`, `not_selected` or `closed` |
| `POST /api/admin/requests/:id/messages` · `GET …/cv` | admin | Message either side; open the CV (logged) |

### Admin back office

| Page | What it does |
| --- | --- |
| Dashboard | KPIs (candidates, applications, open positions, hires, and pending companies, positions and requests) and charts (Recharts): new profiles per week, applications by stage, requests by status, top skills. Every chart has a table view. |
| Candidates | Search **all** profiles (including hidden ones) by keyword across profile and CV text, skills, tools, years, languages, country, applicant number, job applied to and visibility. Matches are highlighted, with a CV excerpt. **CSV export** of the current results (up to 5,000 rows, logged). |
| Candidate detail | Full profile, contact details, extracted CV text (highlighted), CV/cover letter viewing, applications and contact requests. Opening it is logged as a CV view. |
| Pipeline | Kanban per position (New → Reviewed → Shortlisted → Interview → Offered → Hired / Not selected) with drag and drop (mouse, touch, keyboard) and a per-card menu. Every move is recorded in the application's history and the audit log. |
| Contact requests · Companies · Positions | Mediation queue and moderation (phases 5–6). |
| Audit log | Who viewed or downloaded which CV, every request status change, exports, moderation and settings changes. Filters: action, target type, actor role, date range. |
| Settings | Data-retention period (6–120 months, default 24), admin invitations (the invitee sets a password through a 72-hour link) and your own password. |

| Endpoint | Description |
| --- | --- |
| `GET /api/admin/dashboard` | KPIs and chart series |
| `GET /api/admin/candidates` · `GET /api/admin/candidates/export` | Search / CSV export (same filters as talent search plus `tools`, `applicantNumber`, `jobId`, `visibility`) |
| `GET /api/admin/candidates/:id` · `GET …/files/:kind` | Full record (logs `cv.viewed`); signed CV/cover letter link, shown inline (logs `cv.downloaded`) |
| `GET /api/admin/pipeline/:jobId` · `PATCH /api/admin/applications/:id/status` | Kanban data; move an application |
| `GET /api/admin/audit` · `GET /api/admin/audit/actions` | Audit log (paginated, filterable); filter options |
| `GET/PUT /api/admin/settings` · `GET/POST /api/admin/admins` | Retention setting; list and invite admins |

CSV cells that start with `=`, `+`, `-` or `@` are prefixed with `'` so spreadsheet apps never run them as formulas.

## Build status

All eight phases are complete:

- [x] Phase 1: monorepo and landing page migration
- [x] Phase 2: server foundation, models and auth
- [x] Phase 3: public jobs and landing page data
- [x] Phase 4: candidate flow
- [x] Phase 5: companies and jobs
- [x] Phase 6: talent search and admin-mediated requests
- [x] Phase 7: admin back office
- [x] Phase 8: emails, retention job, security hardening, performance and documentation
