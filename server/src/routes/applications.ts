import { Router } from 'express'
import type { z } from 'zod'
import { audit } from '../lib/audit.js'
import { assertDocument } from '../lib/documents.js'
import { applicantConfirmationMessage } from '../lib/emails.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'
import { sendMail } from '../lib/mailer.js'
import { deleteFile, saveFile } from '../lib/storage.js'
import { authorize } from '../middleware/auth.js'
import { documentUpload, uploadedFiles } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import { Application, Candidate, Job } from '../models/index.js'
import type { MyApplication } from '../types/index.js'
import { applySchema } from '../validation/candidate.js'

export const applicationsRouter = Router()

/** Apply to a job with an existing profile. */
applicationsRouter.post('/', authorize('candidate'), documentUpload, validate({ body: applySchema }), async (req, res) => {
  const { jobId, coverLetterText } = req.body as z.infer<typeof applySchema>
  const { coverLetter } = uploadedFiles(req)

  const candidate = await Candidate.findOne({ userId: req.user!.id })
  if (!candidate) throw badRequest('Create your profile before applying', 'NO_PROFILE')
  const job = await Job.findOne({ _id: jobId, status: 'open' }).populate<{ companyId: { status: string } }>('companyId', 'status')
  if (!job || job.companyId.status !== 'approved') throw badRequest('This position is no longer open', 'JOB_CLOSED')
  if (await Application.exists({ jobId, candidateId: candidate._id })) throw conflict('You have already applied to this position', 'ALREADY_APPLIED')
  if (job.coverLetterPolicy === 'required' && !coverLetterText && !coverLetter) throw badRequest('This position requires a cover letter', 'COVER_LETTER_REQUIRED')

  let file
  if (coverLetter && job.coverLetterPolicy !== 'none') {
    assertDocument(coverLetter, 'Your cover letter')
    file = await saveFile(`candidates/${req.user!.id}`, coverLetter)
  }

  try {
    const application = await Application.create({
      jobId,
      candidateId: candidate._id,
      coverLetter: job.coverLetterPolicy === 'none' ? undefined : { text: coverLetterText, file },
      statusHistory: [{ status: 'new', by: req.user!.id }],
    })
    candidate.lastActiveAt = new Date()
    await candidate.save()
    await audit(req, { action: 'application.created', targetType: 'Application', targetId: application._id, meta: { jobId } })
    await sendMail(applicantConfirmationMessage(candidate.email, candidate.fullName, candidate.applicantNumber, job.title))
    res.status(201).json({ data: { id: String(application._id), applicantNumber: candidate.applicantNumber, jobTitle: job.title } })
  } catch (err) {
    await deleteFile(file?.key)
    throw err
  }
})

applicationsRouter.get('/mine', authorize('candidate'), async (req, res) => {
  const candidate = await Candidate.findOne({ userId: req.user!.id }).select('_id').lean()
  if (!candidate) throw notFound('You have not created a profile yet', 'NO_PROFILE')

  // One aggregation instead of find + two populates: each database round trip matters on a remote cluster.
  const rows = await Application.aggregate<{
    _id: unknown
    status: MyApplication['status']
    createdAt: Date
    updatedAt: Date
    statusHistory: { status: MyApplication['status']; at: Date }[]
    job: { _id: unknown; title: string; location: string; status: MyApplication['job']['status']; company: { name: string }[] }
  }>([
    { $match: { candidateId: candidate._id } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        as: 'job',
        pipeline: [
          { $project: { title: 1, location: 1, status: 1, companyId: 1 } },
          { $lookup: { from: 'companies', localField: 'companyId', foreignField: '_id', as: 'company', pipeline: [{ $project: { name: 1 } }] } },
        ],
      },
    },
    { $unwind: '$job' },
    { $project: { status: 1, createdAt: 1, updatedAt: 1, statusHistory: 1, job: 1 } },
  ])

  const data: MyApplication[] = rows.map((a) => ({
    id: String(a._id),
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    job: { id: String(a.job._id), title: a.job.title, companyName: a.job.company[0]?.name ?? '', location: a.job.location, status: a.job.status },
    statusHistory: a.statusHistory.map((h) => ({ status: h.status, at: h.at.toISOString() })),
  }))
  res.json({ data })
})
