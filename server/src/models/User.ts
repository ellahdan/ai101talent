import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose'
import { ROLES } from '../types/index.js'

const tokenSchema = new Schema({ tokenHash: String, expiresAt: Date }, { _id: false })

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    isVerified: { type: Boolean, default: false },
    // Incremented on password reset/logout-everywhere to invalidate existing JWTs.
    tokenVersion: { type: Number, default: 0 },
    emailVerification: { type: tokenSchema, select: false },
    passwordReset: { type: tokenSchema, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
)

export type UserFields = InferSchemaType<typeof userSchema>
export type UserDoc = HydratedDocument<UserFields>
export const User = model('User', userSchema)
