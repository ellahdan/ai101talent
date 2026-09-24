import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { AVAILABILITIES, WORK_MODES } from '../types/index.js'
import { languageSchema, storedFileSchema } from './shared.js'

const candidateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    applicantNumber: { type: String, required: true, unique: true },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 40 },
    location: {
      country: { type: String, trim: true, maxlength: 80 },
      city: { type: String, trim: true, maxlength: 80 },
    },
    links: {
      linkedin: { type: String, trim: true, maxlength: 300 },
      portfolio: { type: String, trim: true, maxlength: 300 },
    },
    headline: { type: String, trim: true, maxlength: 160 },
    totalYearsExperience: { type: Number, min: 0, max: 60, default: 0 },

    skills: [{ _id: false, name: { type: String, required: true, trim: true, maxlength: 60 }, years: { type: Number, min: 0, max: 60 } }],
    tools: [{ type: String, trim: true, maxlength: 60 }],
    languages: [languageSchema],
    workHistory: [
      {
        company: { type: String, required: true, trim: true, maxlength: 120 },
        role: { type: String, required: true, trim: true, maxlength: 120 },
        startDate: { type: Date, required: true },
        endDate: Date,
        description: { type: String, maxlength: 4000 },
      },
    ],
    education: [
      {
        institution: { type: String, required: true, trim: true, maxlength: 160 },
        degree: { type: String, trim: true, maxlength: 120 },
        field: { type: String, trim: true, maxlength: 120 },
        year: { type: Number, min: 1950, max: 2100 },
      },
    ],

    cvFile: storedFileSchema,
    // Extracted CV text for keyword search. Never returned unless explicitly selected.
    cvText: { type: String, select: false },
    coverLetter: { text: { type: String, maxlength: 10000 }, file: storedFileSchema },

    availability: { type: String, enum: AVAILABILITIES, default: 'immediately' },
    noticePeriodWeeks: { type: Number, min: 0, max: 52 },
    workMode: { type: String, enum: WORK_MODES },
    visible: { type: Boolean, default: true },
    consentAt: { type: Date, required: true },
    lastActiveAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
)

candidateSchema.index(
  { headline: 'text', 'skills.name': 'text', tools: 'text', 'workHistory.description': 'text', cvText: 'text' },
  { name: 'candidate_text', weights: { headline: 10, 'skills.name': 10, tools: 5, 'workHistory.description': 2, cvText: 1 } },
)
candidateSchema.index({ totalYearsExperience: 1 })
candidateSchema.index({ 'languages.name': 1 })
candidateSchema.index({ 'location.country': 1 })
candidateSchema.index({ visible: 1 })
candidateSchema.index({ lastActiveAt: 1 })

export type CandidateFields = InferSchemaType<typeof candidateSchema>
export type CandidateDoc = HydratedDocument<CandidateFields>
export const Candidate = model('Candidate', candidateSchema)
