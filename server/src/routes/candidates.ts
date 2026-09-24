import { Router, type Request } from 'express'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { clearSessionCookie, hashPassword, setSessionCookie, verifyPassword } from '../lib/auth.js'
import { invalidateCache } from '../lib/cache.js'
import { nextApplicantNumber } from '../lib/counters.js'
import { assertDocument, extractText, type UploadedFile } from '../lib/documents.js'
import { applicantConfirmationMessage } from '../lib/emails.js'
import { AppError, badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors.js'
import { sendMail } from '../lib/mailer.js'
import { deleteFile, saveFile, signedFileUrl, type StoredFile } from '../lib/storage.js'
import { authorize } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { documentUpload, uploadedFiles } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import { Application, Candidate, ContactRequest, Job, User, type UserDoc } from '../models/index.js'
import { deleteCandidateAccount, profileFields, toCandidateProfile } from '../services/candidates.js'
import { sendVerification, toAuthUser } from '../services/users.js'
import type { ApplySubmitResult } from '../types/index.js'
import { deleteAccountSchema, profileSchema, submitProfileSchema } from '../validation/candidate.js'

export const candidatesRouter = Router()

async function myCandidate(req: Request) {
  const candidate = await Candidate.findOne({ userId: req.user!.id })
  if (!candidate) throw notFound('You have not created a profile yet', 'NO_PROFILE')
  return candidate
}

/** Validates, stores and extracts a document. Returns the stored file plus its text. */
async function storeDocument(file: UploadedFile, folder: string, label: string) {
  assertDocument(file, label)
  const [stored, text] = await Promise.all([saveFile(folder, file), extractText(file)])
  return { stored, text }
}

// ---- Create profile (optionally applying to a job) -----------------------------------------

candidatesRouter.post('/', authLimiter, documentUpload, validate({ body: submitProfileSchema }), async (req, res) => {
  const input = req.body as z.infer<typeof submitProfileSchema>
  const { cv, coverLetter } = uploadedFiles(req)
  if (!cv) throw badRequest('Please upload your CV (PDF or Word, max 5 MB)', 'CV_REQUIRED')

  // Who is this for? A logged-in candidate without a profile, or a visitor creating an account now.
  let user: UserDoc | null = null
  let createdUser = false
  if (req.user) {
    if (req.user.role !== 'candidate') throw forbidden('Only candidate accounts can create a profile')
    if (await Candidate.exists({ userId: req.user.id })) throw conflict('You already have a profile. Edit it from your dashboard.', 'PROFILE_EXISTS')
    user = await User.findById(req.user.id)
  } else {
    if (!input.password) throw badRequest('Choose a password to create your account', 'PASSWORD_REQUIRED')
    if (await User.exists({ email: input.email })) throw conflict('An account with this email already exists. Log in to continue.', 'EMAIL_TAKEN')
  }

  // Validate the job and its cover letter rule before storing anything.
  const job = input.jobId ? await Job.findOne({ _id: input.jobId, status: 'open' }).populate<{ companyId: { status: string } }>('companyId', 'status') : null
  if (input.jobId && (!job || job.companyId.status !== 'approved')) throw badRequest('This position is no longer open', 'JOB_CLOSED')
  const hasCoverLetter = Boolean(input.coverLetterText || coverLetter)
  if (job?.coverLetterPolicy === 'required' && !hasCoverLetter) throw badRequest('This position requires a cover letter', 'COVER_LETTER_REQUIRED')
  assertDocument(cv, 'Your CV')
  if (coverLetter) assertDocument(coverLetter, 'Your cover letter')

  const storedKeys: string[] = []
  try {
    if (!user) {
      user = await User.create({ email: input.email, passwordHash: await hashPassword(input.password!), role: 'candidate' })
      createdUser = true
    }
    const folder = `candidates/${user._id}`
    const cvDoc = await storeDocument(cv, folder, 'Your CV')
    storedKeys.push(cvDoc.stored.key)
    let letterFile: StoredFile | undefined
    if (coverLetter && job?.coverLetterPolicy !== 'none') {
      letterFile = (await storeDocument(coverLetter, folder, 'Your cover letter')).stored
      storedKeys.push(letterFile.key)
    }
    const letter = job?.coverLetterPolicy === 'none' ? undefined : { text: input.coverLetterText, file: letterFile }

    const candidate = await Candidate.create({
      ...profileFields(input),
      userId: user._id,
      applicantNumber: await nextApplicantNumber(),
      cvFile: cvDoc.stored,
      cvText: cvDoc.text,
      // A cover letter sent with an application belongs to that application; otherwise it's part of the profile.
      coverLetter: job ? undefined : letter,
      consentAt: new Date(),
      lastActiveAt: new Date(),
    })

    let applicationId: string | undefined
    if (job) {
      const application = await Application.create({
        jobId: job._id,
        candidateId: candidate._id,
        coverLetter: letter,
        statusHistory: [{ status: 'new', by: user._id }],
      })
      applicationId = String(application._id)
    }

    req.user ??= { id: String(user._id), email: user.email, role: 'candidate', isVerified: user.isVerified }
    await audit(req, { action: 'candidate.created', targetType: 'Candidate', targetId: candidate._id, meta: { applicantNumber: candidate.applicantNumber } })
    if (applicationId) await audit(req, { action: 'application.created', targetType: 'Application', targetId: applicationId, meta: { jobId: String(job!._id) } })
    invalidateCache('public:stats')

    await sendMail(applicantConfirmationMessage(candidate.email, candidate.fullName, candidate.applicantNumber, job?.title))
    if (createdUser) {
      await sendVerification(user)
      setSessionCookie(res, { sub: String(user._id), role: 'candidate', tv: user.tokenVersion })
    }

    const result: ApplySubmitResult = {
      applicantNumber: candidate.applicantNumber,
      candidateId: String(candidate._id),
      applicationId,
      jobTitle: job?.title,
      user: await toAuthUser(user),
    }
    res.status(201).json({ data: result })
  } catch (err) {
    // Roll back anything created so the visitor can simply try again.
    await Promise.all(storedKeys.map(deleteFile))
    if (createdUser && user) await User.deleteOne({ _id: user._id })
    throw err
  }
})

// ---- Own profile -------------------------------------------------------------------

const candidateOnly = authorize('candidate')

candidatesRouter.get('/me', candidateOnly, async (req, res) => {
  const candidate = await myCandidate(req)
  res.json({ data: toCandidateProfile(candidate) })
})

candidatesRouter.put('/me', candidateOnly, documentUpload, validate({ body: profileSchema }), async (req, res) => {
  const input = req.body as z.infer<typeof profileSchema>
  const { cv, coverLetter } = uploadedFiles(req)
  const candidate = await myCandidate(req)
  const folder = `candidates/${req.user!.id}`
  const oldKeys: string[] = []

  if (cv) {
    const { stored, text } = await storeDocument(cv, folder, 'Your CV')
    if (candidate.cvFile?.key) oldKeys.push(candidate.cvFile.key)
    candidate.cvFile = stored
    candidate.cvText = text
  }
  const letterFile = coverLetter ? (await storeDocument(coverLetter, folder, 'Your cover letter')).stored : undefined
  if (letterFile && candidate.coverLetter?.file?.key) oldKeys.push(candidate.coverLetter.file.key)

  candidate.set({
    ...profileFields(input),
    coverLetter: { text: input.coverLetterText, file: letterFile ?? candidate.coverLetter?.file },
    lastActiveAt: new Date(),
  })
  await candidate.save()
  await Promise.all(oldKeys.map(deleteFile))
  if (cv) await audit(req, { action: 'candidate.cv_replaced', targetType: 'Candidate', targetId: candidate._id })

  res.json({ data: toCandidateProfile(candidate) })
})

/** Removes the profile cover letter (text and file). */
candidatesRouter.delete('/me/cover-letter', candidateOnly, async (req, res) => {
  const candidate = await myCandidate(req)
  const key = candidate.coverLetter?.file?.key
  candidate.coverLetter = undefined
  await candidate.save()
  await deleteFile(key)
  res.json({ data: toCandidateProfile(candidate) })
})

candidatesRouter.get('/me/files/:kind', candidateOnly, async (req, res) => {
  const candidate = await myCandidate(req)
  const file = req.params.kind === 'cv' ? candidate.cvFile : req.params.kind === 'cover-letter' ? candidate.coverLetter?.file : undefined
  if (!file) throw notFound('File not found')
  res.json({ data: { url: await signedFileUrl(file) } })
})

// ---- Data export & deletion (GDPR) ---------------------------------------------------

candidatesRouter.get('/me/export', candidateOnly, async (req, res) => {
  const [user, candidate] = await Promise.all([User.findById(req.user!.id).lean(), Candidate.findOne({ userId: req.user!.id }).select('+cvText').lean()])
  const [applications, requests] = candidate
    ? await Promise.all([
        Application.find({ candidateId: candidate._id }).populate('jobId', 'title location').lean(),
        ContactRequest.find({ candidateId: candidate._id, 'history.status': 'forwarded_to_candidate' })
          .populate('companyId', 'name')
          .select('companyId roleTitle forwardedMessage proposedTimes salaryRange status history candidateNote interviewDate createdAt messages')
          .lean(),
      ])
    : [[], []]

  const exported = {
    exportedAt: new Date().toISOString(),
    account: user && { email: user.email, role: user.role, isVerified: user.isVerified, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
    profile: candidate,
    applications,
    // Only the parts of contact requests the candidate is entitled to see.
    contactRequests: requests.map((r) => ({ ...r, messages: r.messages.filter((m) => m.thread === 'candidate') })),
  }
  res.setHeader('Content-Disposition', `attachment; filename="ai101-talents-data-${candidate?.applicantNumber ?? 'account'}.json"`)
  res.json(exported)
})

candidatesRouter.delete('/me', authLimiter, candidateOnly, validate({ body: deleteAccountSchema }), async (req, res) => {
  const { password } = req.body as z.infer<typeof deleteAccountSchema>
  const user = await User.findById(req.user!.id).select('+passwordHash')
  if (!user) throw unauthorized()
  if (!(await verifyPassword(password, user.passwordHash))) throw new AppError(400, 'INVALID_PASSWORD', 'Your password is incorrect')

  await deleteCandidateAccount(user._id)
  await audit(null, { action: 'candidate.account_deleted', targetType: 'User', targetId: user._id })

  clearSessionCookie(res)
  res.json({ data: { deleted: true } })
})
