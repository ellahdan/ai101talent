import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { APPLICATION_STATUSES } from '../types/index.js'
import { storedFileSchema } from './shared.js'

const applicationSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true, index: true },
    coverLetter: { text: { type: String, maxlength: 10000 }, file: storedFileSchema },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'new' },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: APPLICATION_STATUSES, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, maxlength: 1000 },
        at: { type: Date, default: () => new Date() },
      },
    ],
  },
  { timestamps: true },
)

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true })
applicationSchema.index({ jobId: 1, status: 1 })

export type ApplicationFields = InferSchemaType<typeof applicationSchema>
export type ApplicationDoc = HydratedDocument<ApplicationFields>
export const Application = model('Application', applicationSchema)
