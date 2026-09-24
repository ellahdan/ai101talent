import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { COMPANY_SIZES, COMPANY_STATUSES } from '../types/index.js'

const companySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    website: { type: String, trim: true, maxlength: 300 },
    industry: { type: String, trim: true, maxlength: 80 },
    size: { type: String, enum: COMPANY_SIZES },
    description: { type: String, maxlength: 4000 },
    contactPerson: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      title: { type: String, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 40 },
    },
    status: { type: String, enum: COMPANY_STATUSES, default: 'pending', index: true },
    statusNote: { type: String, maxlength: 1000 },
    approvedAt: Date,
  },
  { timestamps: true },
)

export type CompanyFields = InferSchemaType<typeof companySchema>
export type CompanyDoc = HydratedDocument<CompanyFields>
export const Company = model('Company', companySchema)
