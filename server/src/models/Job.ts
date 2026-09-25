import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { CONTRACT_TYPES, COVER_LETTER_POLICIES, JOB_STATUSES, SENIORITIES, WORK_MODES } from '../types/index.js'
import { languageSchema, salaryRangeSchema } from './shared.js'

const jobSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    // Sanitized HTML from the rich-text editor.
    description: { type: String, required: true, maxlength: 30000 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    workMode: { type: String, enum: WORK_MODES, required: true },
    contractType: { type: String, enum: CONTRACT_TYPES, required: true },
    seniority: { type: String, enum: SENIORITIES, required: true },
    requiredSkills: [{ type: String, trim: true, maxlength: 60 }],
    niceToHaveSkills: [{ type: String, trim: true, maxlength: 60 }],
    languages: [languageSchema],
    // Legacy: salaries are no longer collected or returned. Kept so old documents stay valid.
    salaryRange: salaryRangeSchema,
    coverLetterPolicy: { type: String, enum: COVER_LETTER_POLICIES, default: 'optional' },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: JOB_STATUSES, default: 'pending' },
    moderationNote: { type: String, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: Date,
    closedAt: Date,
  },
  { timestamps: true },
)

jobSchema.index({ status: 1, featured: -1, createdAt: -1 })
jobSchema.index({ requiredSkills: 1 })
jobSchema.index({ title: 'text', requiredSkills: 'text', niceToHaveSkills: 'text', description: 'text' }, { name: 'job_text', weights: { title: 10, requiredSkills: 6, niceToHaveSkills: 3, description: 1 } })

export type JobFields = InferSchemaType<typeof jobSchema>
export type JobDoc = HydratedDocument<JobFields>
export const Job = model('Job', jobSchema)
