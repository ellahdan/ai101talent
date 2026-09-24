import { Schema, model, type InferSchemaType } from 'mongoose'
import { ROLES } from '../types/index.js'

// ---- Shortlist -----------------------------------------------------------

const shortlistSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    candidateIds: [{ type: Schema.Types.ObjectId, ref: 'Candidate' }],
  },
  { timestamps: true },
)
shortlistSchema.index({ companyId: 1, name: 1 }, { unique: true })
export const Shortlist = model('Shortlist', shortlistSchema)

// ---- Counter (atomic sequences, e.g. applicant numbers) ------------------

const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false })
export const Counter = model('Counter', counterSchema)

// ---- Audit log -----------------------------------------------------------

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, enum: [...ROLES, 'system'] },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
    ip: String,
    at: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
)
auditLogSchema.index({ at: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1, at: -1 })
auditLogSchema.index({ actorId: 1, at: -1 })
auditLogSchema.index({ action: 1, at: -1 })
export type AuditLogFields = InferSchemaType<typeof auditLogSchema>
export const AuditLog = model('AuditLog', auditLogSchema)

// ---- Testimonial (landing page) ------------------------------------------

const testimonialSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    quote: { type: String, required: true, maxlength: 600 },
    avatarUrl: String,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)
export const Testimonial = model('Testimonial', testimonialSchema)

// ---- Settings (admin-editable, e.g. data retention) -----------------------

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
export const Setting = model('Setting', settingSchema)
