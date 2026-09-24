import { z } from 'zod'
import { COMPANY_SIZES } from '../types/index.js'

// Mirrored in client/src/lib/validation/auth.ts — keep the rules in sync.

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254)

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number')

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined))
  .pipe(z.string().url('Enter a valid URL').optional())

export const companyDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter the company name').max(120),
  website: optionalUrl,
  industry: optionalText(80),
  size: z.enum(COMPANY_SIZES).optional(),
  description: optionalText(4000),
  contactPerson: z.object({
    name: z.string().trim().min(2, 'Enter a contact name').max(120),
    title: optionalText(120),
    phone: optionalText(40),
  }),
})

export const registerSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('candidate'), email: emailSchema, password: passwordSchema }),
  z.object({ role: z.literal('company'), email: emailSchema, password: passwordSchema, company: companyDetailsSchema }),
])

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) })
export const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or expired link') })
export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetPasswordSchema = tokenSchema.extend({ password: passwordSchema })
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
