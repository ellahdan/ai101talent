import { Schema } from 'mongoose'
import { PROFICIENCIES } from '../types/index.js'

/** A file in private storage. `key` locates it; `url` is only set by drivers that have a stable URL. */
export const storedFileSchema = new Schema(
  {
    key: { type: String, required: true },
    url: String,
    mimeType: { type: String, required: true },
    originalName: { type: String, required: true },
    size: Number,
  },
  { _id: false },
)

export const languageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    proficiency: { type: String, enum: PROFICIENCIES, required: true },
  },
  { _id: false },
)

export const salaryRangeSchema = new Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'EUR', uppercase: true, minlength: 3, maxlength: 3 },
  },
  { _id: false },
)
