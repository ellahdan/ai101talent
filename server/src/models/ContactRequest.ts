import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { REQUEST_STATUSES, ROLES } from '../types/index.js'
import { salaryRangeSchema } from './shared.js'

const contactRequestSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    // Role title when the request is not tied to a posted job.
    roleTitle: { type: String, trim: true, maxlength: 140 },
    // The company's original message; the admin may edit the version forwarded to the candidate.
    message: { type: String, required: true, maxlength: 5000 },
    forwardedMessage: { type: String, maxlength: 5000 },
    proposedTimes: [Date],
    // Legacy: salaries are no longer collected or returned. Kept so old documents stay valid.
    salaryRange: salaryRangeSchema,
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending_admin_review', index: true },
    history: [
      {
        _id: false,
        status: { type: String, enum: REQUEST_STATUSES, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, maxlength: 2000 },
        at: { type: Date, default: () => new Date() },
      },
    ],
    // Two separate threads: admin <-> company and admin <-> candidate. Companies and candidates never share a thread.
    messages: [
      {
        thread: { type: String, enum: ['company', 'candidate'], required: true },
        from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        fromRole: { type: String, enum: ROLES, required: true },
        to: { type: String, enum: ROLES, required: true },
        text: { type: String, required: true, maxlength: 5000 },
        at: { type: Date, default: () => new Date() },
      },
    ],
    candidateNote: { type: String, maxlength: 2000 },
    rejectionReason: { type: String, maxlength: 2000 },
    // Only what the admin explicitly chose to share at the introduction step.
    sharedDetails: {
      fullName: String,
      email: String,
      phone: String,
      linkedin: String,
      cvShared: Boolean,
      note: { type: String, maxlength: 2000 },
      sharedAt: Date,
    },
    interviewDate: Date,
    hiredAt: Date,
  },
  { timestamps: true },
)

contactRequestSchema.index({ status: 1, createdAt: -1 })

export type ContactRequestFields = InferSchemaType<typeof contactRequestSchema>
export type ContactRequestDoc = HydratedDocument<ContactRequestFields>
export const ContactRequest = model('ContactRequest', contactRequestSchema)
