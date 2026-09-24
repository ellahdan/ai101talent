// Resets the database and loads sample data.
// Usage: npm run seed -w server            (asks for confirmation)
//        npm run seed -w server -- --yes   (no prompt, e.g. in CI)
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'
import mongoose, { type Types } from 'mongoose'
import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../db/connect.js'
import { hashPassword } from '../lib/auth.js'
import { nextApplicantNumber } from '../lib/counters.js'
import { sanitizeRichText } from '../lib/html.js'
import { deleteFile, saveFile } from '../lib/storage.js'
import { textToPdf } from './pdf.js'
import {
  Application,
  AuditLog,
  Candidate,
  type CandidateDoc,
  Company,
  ContactRequest,
  Counter,
  Job,
  Setting,
  Shortlist,
  Testimonial,
  User,
} from '../models/index.js'
import type { ApplicationStatus, RequestStatus } from '../types/index.js'
import { candidates, companies, jobs, testimonials, type SeedCandidate, type SeedJob } from './seed-data.js'

const { values: args } = parseArgs({ options: { yes: { type: 'boolean', default: false }, force: { type: 'boolean', default: false } } })

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@ai101talents.example'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!'
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Password123!'

const DAY = 86_400_000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function confirm() {
  if (env.isProduction && !args.force) {
    console.error('Refusing to seed in production. Pass --force if you really mean it.')
    process.exit(1)
  }
  const target = mongoose.connection.db!.databaseName
  const host = mongoose.connection.host
  console.log(`\nThis will DELETE all data in database "${target}" on ${host} and load sample data.`)
  if (args.yes) return
  if (!process.stdin.isTTY) {
    console.error('Not an interactive terminal. Re-run with --yes to confirm.')
    process.exit(1)
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Type "yes" to continue: ')
  rl.close()
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

async function wipe() {
  const models: mongoose.Model<any>[] = [Application, AuditLog, Candidate, Company, ContactRequest, Counter, Job, Setting, Shortlist, Testimonial, User]
  // Remove stored documents first so no orphaned files are left behind.
  const [candidateFiles, applicationFiles] = await Promise.all([
    Candidate.find().select('cvFile.key coverLetter.file.key').lean(),
    Application.find().select('coverLetter.file.key').lean(),
  ])
  const keys = [...candidateFiles.flatMap((c) => [c.cvFile?.key, c.coverLetter?.file?.key]), ...applicationFiles.map((a) => a.coverLetter?.file?.key)]
  await Promise.all(keys.map(deleteFile))
  await Promise.all(models.map((m) => m.deleteMany({})))
  await Promise.all(models.map((m) => m.createIndexes()))
}

function jobDescription(job: SeedJob) {
  const list = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
  return sanitizeRichText(
    `<p>${job.summary}</p><h3>What you'll do</h3>${list(job.responsibilities)}<h3>What we're looking for</h3>${list(job.requirements)}` +
      (job.niceToHaveSkills.length ? `<h3>Nice to have</h3>${list(job.niceToHaveSkills)}` : ''),
  )
}

function workHistory(c: SeedCandidate) {
  // Most recent job covers ~60% of the career, the previous one the rest.
  const recentYears = Math.max(1, Math.round(c.years * 0.6))
  return c.employers.map(([company, role], i) => {
    const start = i === 0 ? daysAgo(recentYears * 365) : daysAgo(c.years * 365)
    const end = i === 0 ? undefined : daysAgo(recentYears * 365 + 30)
    const description = i === 0 ? c.highlight : `Worked on ${c.skills.slice(0, 2).map(([s]) => s).join(' and ')} projects in a cross-functional team.`
    return { company, role, startDate: start, endDate: end, description }
  })
}

function cvText(c: SeedCandidate, history: ReturnType<typeof workHistory>) {
  const year = (d?: Date) => (d ? d.getFullYear() : 'present')
  const [institution, degree, field, gradYear] = c.education
  return [
    c.name,
    `${c.headline} · ${c.city}, ${c.country}`,
    '',
    'SUMMARY',
    `${c.headline} with ${c.years} years of experience. ${c.highlight}`,
    '',
    'EXPERIENCE',
    ...history.flatMap((h) => [`${h.role}, ${h.company} (${year(h.startDate)} – ${year(h.endDate)})`, h.description, '']),
    'SKILLS',
    c.skills.map(([s, y]) => `${s} (${y} years)`).join(', '),
    '',
    'TOOLS',
    c.tools.join(', '),
    '',
    'LANGUAGES',
    c.languages.map(([l, p]) => `${l} (${p})`).join(', '),
    '',
    'EDUCATION',
    `${degree} ${field}, ${institution}, ${gradYear}`,
  ].join('\n')
}

// Status paths used to build realistic histories.
const APPLICATION_PATH: ApplicationStatus[] = ['new', 'reviewed', 'shortlisted', 'interview', 'offered', 'hired']
const REQUEST_PATHS: Record<string, RequestStatus[]> = {
  pending_admin_review: ['pending_admin_review'],
  info_requested: ['pending_admin_review', 'info_requested'],
  rejected: ['pending_admin_review', 'rejected'],
  forwarded_to_candidate: ['pending_admin_review', 'forwarded_to_candidate'],
  candidate_accepted: ['pending_admin_review', 'forwarded_to_candidate', 'candidate_accepted'],
  candidate_declined: ['pending_admin_review', 'forwarded_to_candidate', 'candidate_declined'],
  introduced: ['pending_admin_review', 'forwarded_to_candidate', 'candidate_accepted', 'introduced'],
  interviewing: ['pending_admin_review', 'forwarded_to_candidate', 'candidate_accepted', 'introduced', 'interviewing'],
  hired: ['pending_admin_review', 'forwarded_to_candidate', 'candidate_accepted', 'introduced', 'interviewing', 'hired'],
}

async function main() {
  await connectDatabase()
  await confirm()

  console.log('Wiping collections…')
  await wipe()

  const [adminHash, demoHash] = await Promise.all([hashPassword(ADMIN_PASSWORD), hashPassword(DEMO_PASSWORD)])

  // ---- Admin ---------------------------------------------------------------
  const admin = await User.create({ email: ADMIN_EMAIL, passwordHash: adminHash, role: 'admin', isVerified: true })

  // ---- Companies -----------------------------------------------------------
  const companyUsers = await User.insertMany(companies.map((c) => ({ email: c.email, passwordHash: demoHash, role: 'company', isVerified: true })))
  const companyDocs = await Company.insertMany(
    companies.map((c, i) => ({
      userId: companyUsers[i]._id,
      name: c.name,
      website: c.website,
      industry: c.industry,
      size: c.size,
      description: c.description,
      contactPerson: c.contact,
      status: c.status,
      approvedAt: c.status === 'approved' ? daysAgo(60) : undefined,
      createdAt: daysAgo(c.status === 'approved' ? 70 : 2),
    })),
  )
  const companyByKey = new Map(companies.map((c, i) => [c.key, { doc: companyDocs[i], user: companyUsers[i] }]))

  // ---- Jobs ----------------------------------------------------------------
  const jobDocs = await Job.insertMany(
    jobs.map((j) => ({
      companyId: companyByKey.get(j.company)!.doc._id,
      title: j.title,
      description: jobDescription(j),
      location: j.location,
      workMode: j.workMode,
      contractType: j.contractType,
      seniority: j.seniority,
      requiredSkills: j.requiredSkills,
      niceToHaveSkills: j.niceToHaveSkills,
      languages: j.languages.map(([name, proficiency]) => ({ name, proficiency })),
      salaryRange: j.salary ? { min: j.salary[0], max: j.salary[1], currency: 'EUR' } : undefined,
      coverLetterPolicy: j.coverLetterPolicy ?? 'optional',
      featured: Boolean(j.featured),
      status: j.status,
      createdBy: companyByKey.get(j.company)!.user._id,
      createdAt: daysAgo(j.daysAgo + 1),
      publishedAt: j.status === 'pending' ? undefined : daysAgo(j.daysAgo),
      closedAt: j.status === 'closed' ? daysAgo(5) : undefined,
    })),
  )
  const jobByKey = new Map(jobs.map((j, i) => [j.key, jobDocs[i]]))

  // ---- Candidates (applicant numbers from the atomic counter, in order) --------
  const candidateUsers = await User.insertMany(
    candidates.map((_, i) => ({ email: `candidate${String(i + 1).padStart(2, '0')}@example.com`, passwordHash: demoHash, role: 'candidate', isVerified: true })),
  )
  const candidateDocs: CandidateDoc[] = []
  for (const [i, c] of candidates.entries()) {
    const history = workHistory(c)
    const text = cvText(c, history)
    const pdf = textToPdf(text)
    const cvFile = await saveFile(`candidates/${candidateUsers[i]._id}`, { buffer: pdf, mimetype: 'application/pdf', originalname: `${c.name} CV.pdf`, size: pdf.length })
    const [institution, degree, field, year] = c.education
    // Spread sign-ups over the last ~11 weeks so the dashboard trend has data in every week.
    const created = daysAgo(75 - i * 2.4)
    candidateDocs.push(
      await Candidate.create({
        userId: candidateUsers[i]._id,
        applicantNumber: await nextApplicantNumber(),
        fullName: c.name,
        email: candidateUsers[i].email,
        phone: `+44 7700 900${String(100 + i)}`, // Ofcom range reserved for fiction
        location: { country: c.country, city: c.city },
        links: { linkedin: `https://linkedin.example/in/${slug(c.name)}`, portfolio: `https://${slug(c.name)}.example` },
        headline: c.headline,
        totalYearsExperience: c.years,
        skills: c.skills.map(([name, years]) => ({ name, years })),
        tools: c.tools,
        languages: c.languages.map(([name, proficiency]) => ({ name, proficiency })),
        workHistory: history,
        education: [{ institution, degree, field, year }],
        cvFile,
        cvText: text,
        availability: c.availability,
        noticePeriodWeeks: c.noticeWeeks,
        workMode: c.workMode,
        visible: c.visible ?? true,
        consentAt: created,
        lastActiveAt: daysAgo(i % 10),
        createdAt: created,
      }),
    )
  }

  // ---- Applications ------------------------------------------------------------
  const applicationPlan: [string, number, ApplicationStatus][] = [
    ['fe', 0, 'interview'], ['fe', 1, 'reviewed'], ['fe', 2, 'shortlisted'], ['fe', 3, 'rejected'], ['fe', 4, 'new'],
    ['be', 5, 'interview'], ['be', 6, 'new'], ['be', 7, 'shortlisted'],
    ['da', 9, 'offered'], ['da', 10, 'reviewed'], ['da', 11, 'new'], ['da', 12, 'rejected'],
    ['ml', 13, 'shortlisted'], ['ml', 14, 'new'], ['ml', 15, 'reviewed'],
    ['design', 16, 'hired'], ['design', 17, 'interview'], ['design', 19, 'new'],
    ['ux', 18, 'shortlisted'],
    ['pm', 20, 'interview'], ['pm', 21, 'reviewed'], ['pm', 22, 'new'],
    ['growth', 26, 'offered'], ['growth', 27, 'new'], ['growth', 28, 'reviewed'],
    ['qa', 29, 'rejected'],
  ]
  await Application.insertMany(
    applicationPlan.map(([jobKey, ci, status], n) => {
      const start = 25 - (n % 10)
      // Rejections can happen after any stage; here they follow a review.
      const path = status === 'rejected' ? (['new', 'reviewed', 'rejected'] as ApplicationStatus[]) : APPLICATION_PATH.slice(0, APPLICATION_PATH.indexOf(status) + 1)
      return {
        jobId: jobByKey.get(jobKey)!._id,
        candidateId: candidateDocs[ci]._id,
        coverLetter: { text: `I'm excited about this role because it matches my experience as a ${candidates[ci].headline.toLowerCase()}.` },
        status,
        statusHistory: path.map((s, k) => ({ status: s, by: k === 0 ? candidateUsers[ci]._id : admin._id, at: daysAgo(start - k * 2) })),
        createdAt: daysAgo(start),
      }
    }),
  )

  // ---- Contact requests ----------------------------------------------------------
  const requestPlan: { company: string; ci: number; job?: string; roleTitle?: string; status: RequestStatus; message: string }[] = [
    { company: 'northstar', ci: 2, job: 'fe', status: 'pending_admin_review', message: 'Your design-systems experience is exactly what our frontend team needs. Could we set up a 30-minute call?' },
    { company: 'luma', ci: 14, job: 'ml', status: 'info_requested', message: 'We would love to discuss our ML Engineer role and your NLP background.' },
    { company: 'maven', ci: 17, job: 'design', status: 'forwarded_to_candidate', message: 'We liked your fintech onboarding work and would like to talk about a senior design role.' },
    { company: 'northstar', ci: 10, job: 'da', status: 'candidate_accepted', message: 'Our Data Analyst role needs fluent French and strong SQL. Your profile fits well.' },
    { company: 'luma', ci: 21, job: 'pm', status: 'candidate_declined', message: 'We are hiring a Product Manager for our clinician dashboard and think you would be a great fit.' },
    { company: 'maven', ci: 18, job: 'ux', status: 'introduced', message: 'We have a 3-month research project starting soon. Are you available?' },
    { company: 'northstar', ci: 7, job: 'be', status: 'hired', message: 'We are expanding our Lisbon backend team and your Node.js experience stands out.' },
    { company: 'luma', ci: 23, roleTitle: 'Platform Engineer', status: 'rejected', message: 'Contact me asap, need someone tomorrow.' },
    { company: 'maven', ci: 26, job: 'growth', status: 'interviewing', message: 'We are looking for someone to lead growth at our Paris studio.' },
  ]

  const auditEntries: Record<string, unknown>[] = []
  for (const [n, plan] of requestPlan.entries()) {
    const company = companyByKey.get(plan.company)!
    const candUser = candidateUsers[plan.ci]
    const cand = candidateDocs[plan.ci]
    const path = REQUEST_PATHS[plan.status]
    const start = 14 - n
    const at = (k: number) => daysAgo(start - k)
    const actorFor = (s: RequestStatus) => (s === 'pending_admin_review' ? company.user._id : s === 'candidate_accepted' || s === 'candidate_declined' ? candUser._id : admin._id)
    const noteFor: Partial<Record<RequestStatus, string>> = {
      info_requested: 'Asked the company to confirm the salary range and remote policy.',
      rejected: 'Message too vague and no role details provided.',
      forwarded_to_candidate: 'Forwarded with a lightly edited message.',
      candidate_accepted: 'Happy to talk, weekday afternoons work best.',
      candidate_declined: 'Not looking to relocate at the moment.',
      introduced: 'Shared name, email and CV with the company.',
      interviewing: 'First interview scheduled.',
      hired: 'Offer accepted.',
    }

    const messages: { thread: 'company' | 'candidate'; from: Types.ObjectId; fromRole: 'admin' | 'company' | 'candidate'; to: 'admin' | 'company' | 'candidate'; text: string; at: Date }[] = []
    if (plan.status === 'info_requested') {
      messages.push({ thread: 'company', from: admin._id, fromRole: 'admin', to: 'company', text: 'Thanks for your request. Could you confirm the salary range and whether the role can be fully remote?', at: at(1) })
    }
    if (path.includes('forwarded_to_candidate')) {
      messages.push({ thread: 'candidate', from: admin._id, fromRole: 'admin', to: 'candidate', text: `${company.doc.name} would like to speak with you. Let us know if you're interested and we'll arrange an introduction.`, at: at(1) })
    }
    if (path.includes('candidate_accepted')) {
      messages.push({ thread: 'candidate', from: candUser._id, fromRole: 'candidate', to: 'admin', text: 'Thanks! Yes, I would be glad to talk.', at: at(2) })
    }
    if (path.includes('introduced')) {
      messages.push({ thread: 'company', from: admin._id, fromRole: 'admin', to: 'company', text: `Good news: the candidate accepted. Their contact details are now shared with you.`, at: at(3) })
    }
    if (plan.status === 'rejected') {
      messages.push({ thread: 'company', from: admin._id, fromRole: 'admin', to: 'company', text: 'We could not forward this request: please include the role, responsibilities and proposed times.', at: at(1) })
    }

    const request = await ContactRequest.create({
      companyId: company.doc._id,
      candidateId: cand._id,
      jobId: plan.job ? jobByKey.get(plan.job)!._id : undefined,
      roleTitle: plan.roleTitle ?? (plan.job ? jobs.find((j) => j.key === plan.job)!.title : undefined),
      message: plan.message,
      forwardedMessage: path.includes('forwarded_to_candidate') ? plan.message : undefined,
      proposedTimes: [daysAgo(-3), daysAgo(-4)],
      salaryRange: plan.job && jobs.find((j) => j.key === plan.job)!.salary ? { min: jobs.find((j) => j.key === plan.job)!.salary![0], max: jobs.find((j) => j.key === plan.job)!.salary![1], currency: 'EUR' } : undefined,
      status: plan.status,
      history: path.map((s, k) => ({ status: s, by: actorFor(s), note: noteFor[s], at: at(k) })),
      messages,
      candidateNote: plan.status === 'candidate_accepted' || plan.status === 'candidate_declined' ? noteFor[plan.status] : undefined,
      rejectionReason: plan.status === 'rejected' ? noteFor.rejected : undefined,
      sharedDetails: path.includes('introduced')
        ? { fullName: cand.fullName, email: cand.email, phone: cand.phone, linkedin: cand.links?.linkedin, cvShared: true, note: 'Available for interviews next week.', sharedAt: at(3) }
        : undefined,
      interviewDate: path.includes('introduced') ? daysAgo(-5) : undefined,
      hiredAt: plan.status === 'hired' ? at(path.length - 1) : undefined,
      createdAt: at(0),
    })

    for (const [k, s] of path.entries()) {
      const by = actorFor(s)
      auditEntries.push({
        actorId: by,
        actorRole: by.equals(admin._id) ? 'admin' : by.equals(company.user._id) ? 'company' : 'candidate',
        action: k === 0 ? 'request.created' : 'request.status_changed',
        targetType: 'ContactRequest',
        targetId: request._id,
        meta: { from: k === 0 ? null : path[k - 1], to: s },
        at: at(k),
      })
    }
  }

  // A few CV access records so the audit log isn't empty.
  for (const ci of [2, 10, 18]) {
    auditEntries.push({ actorId: admin._id, actorRole: 'admin', action: 'cv.viewed', targetType: 'Candidate', targetId: candidateDocs[ci]._id, meta: { applicantNumber: candidateDocs[ci].applicantNumber }, at: daysAgo(4) })
  }
  auditEntries.push({ actorId: admin._id, actorRole: 'admin', action: 'cv.downloaded', targetType: 'Candidate', targetId: candidateDocs[18]._id, meta: { applicantNumber: candidateDocs[18].applicantNumber }, at: daysAgo(3) })
  for (const c of companies.filter((c) => c.status === 'approved')) {
    auditEntries.push({ actorId: admin._id, actorRole: 'admin', action: 'company.approved', targetType: 'Company', targetId: companyByKey.get(c.key)!.doc._id, at: daysAgo(60) })
  }
  await AuditLog.insertMany(auditEntries)

  // ---- Shortlists, testimonials, settings -----------------------------------------------
  await Shortlist.insertMany([
    { companyId: companyByKey.get('northstar')!.doc._id, name: 'Frontend pipeline', candidateIds: [0, 1, 2].map((i) => candidateDocs[i]._id) },
    { companyId: companyByKey.get('maven')!.doc._id, name: 'Design talent', candidateIds: [16, 17, 18].map((i) => candidateDocs[i]._id) },
  ])
  await Testimonial.insertMany(testimonials.map((t, order) => ({ ...t, order })))
  await Setting.create({ key: 'retentionMonths', value: 24, updatedBy: admin._id })

  // ---- Summary ---------------------------------------------------------------------------
  const counts = await Promise.all([User, Company, Job, Candidate, Application, ContactRequest, Testimonial, AuditLog].map((m) => m.countDocuments()))
  console.log('\nSeed complete:')
  console.log(`  users ${counts[0]} · companies ${counts[1]} · jobs ${counts[2]} · candidates ${counts[3]} · applications ${counts[4]} · contact requests ${counts[5]} · testimonials ${counts[6]} · audit entries ${counts[7]}`)
  console.log(`  applicant numbers ${candidateDocs[0].applicantNumber} … ${candidateDocs.at(-1)!.applicantNumber}`)
  console.log('\nLogins (development data):')
  console.log(`  admin      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log(`  companies  ${companies.map((c) => c.email).join(', ')} / ${DEMO_PASSWORD}`)
  console.log(`  candidates candidate01@example.com … candidate${candidates.length}@example.com / ${DEMO_PASSWORD}\n`)
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase())
