import { Router } from 'express'
import { audit } from '../lib/audit.js'
import { clearSessionCookie, createOneTimeToken, hashPassword, hashToken, setSessionCookie, verifyPassword } from '../lib/auth.js'
import { passwordChangedMessage, passwordResetMessage } from '../lib/emails.js'
import { AppError, badRequest, conflict, unauthorized } from '../lib/errors.js'
import { sendMail } from '../lib/mailer.js'
import { authorize } from '../middleware/auth.js'
import { authLimiter, emailLimiter } from '../middleware/security.js'
import { validate } from '../middleware/validate.js'
import { Candidate, Company, User } from '../models/index.js'
import { notifyAdmins } from '../services/notifications.js'
import { sendVerification, toAuthUser } from '../services/users.js'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from '../validation/auth.js'
import type { z } from 'zod'

const RESET_TTL = 60 * 60_000

export const authRouter = Router()


authRouter.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const body = req.body as z.infer<typeof registerSchema>
  if (await User.exists({ email: body.email })) throw conflict('An account with this email already exists', 'EMAIL_TAKEN')

  const user = await User.create({ email: body.email, passwordHash: await hashPassword(body.password), role: body.role })
  if (body.role === 'company') {
    try {
      await Company.create({ ...body.company, userId: user._id, status: 'pending' })
    } catch (err) {
      // No transactions on a standalone MongoDB, so undo the user manually.
      await User.deleteOne({ _id: user._id })
      throw err
    }
  }

  await sendVerification(user)
  req.user = { id: String(user._id), email: user.email, role: user.role, isVerified: false }
  await audit(req, { action: 'user.registered', targetType: 'User', targetId: user._id, meta: { role: user.role } })
  if (body.role === 'company') {
    await notifyAdmins(`New company to review: ${body.company.name}`, [`${body.company.name} (${user.email}) registered and is waiting for approval.`], { label: 'Review companies', path: '/admin/companies?status=pending' })
  }

  setSessionCookie(res, { sub: String(user._id), role: user.role, tv: user.tokenVersion })
  res.status(201).json({ data: await toAuthUser(user) })
})

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>
  const user = await User.findOne({ email }).select('+passwordHash')
  // Same message whether the email exists or not, so accounts can't be enumerated.
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw unauthorized('Email or password is incorrect', 'INVALID_CREDENTIALS')

  user.lastLoginAt = new Date()
  await user.save()
  if (user.role === 'candidate') await Candidate.updateOne({ userId: user._id }, { lastActiveAt: new Date() })

  setSessionCookie(res, { sub: String(user._id), role: user.role, tv: user.tokenVersion })
  res.json({ data: await toAuthUser(user) })
})

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ data: { ok: true } })
})

/** Current session: the user, or null for visitors (200 either way, so browsers don't log an error). */
authRouter.get('/me', async (req, res) => {
  const user = req.user ? await User.findById(req.user.id).lean() : null
  res.json({ data: user ? await toAuthUser(user) : null })
})

authRouter.post('/verify-email', authLimiter, validate({ body: tokenSchema }), async (req, res) => {
  const { token } = req.body as z.infer<typeof tokenSchema>
  const user = await User.findOne({ 'emailVerification.tokenHash': hashToken(token), 'emailVerification.expiresAt': { $gt: new Date() } })
  if (!user) throw badRequest('This verification link is invalid or has expired', 'INVALID_TOKEN')

  user.isVerified = true
  user.emailVerification = undefined
  await user.save()
  res.json({ data: { verified: true } })
})

authRouter.post('/resend-verification', emailLimiter, authorize(), async (req, res) => {
  const user = await User.findById(req.user!.id)
  if (!user) throw unauthorized()
  if (user.isVerified) throw badRequest('Your email is already verified', 'ALREADY_VERIFIED')
  await sendVerification(user)
  res.json({ data: { sent: true } })
})

authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), async (req, res) => {
  const { email } = req.body as z.infer<typeof forgotPasswordSchema>
  const user = await User.findOne({ email })
  if (user) {
    const { token, record } = createOneTimeToken(RESET_TTL)
    user.passwordReset = record
    await user.save()
    await sendMail(passwordResetMessage(user.email, token))
  }
  // Always the same response, whether or not the account exists.
  res.json({ data: { sent: true } })
})

authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), async (req, res) => {
  const { token, password } = req.body as z.infer<typeof resetPasswordSchema>
  const user = await User.findOne({ 'passwordReset.tokenHash': hashToken(token), 'passwordReset.expiresAt': { $gt: new Date() } })
  if (!user) throw badRequest('This reset link is invalid or has expired', 'INVALID_TOKEN')

  user.passwordHash = await hashPassword(password)
  user.passwordReset = undefined
  user.tokenVersion += 1 // sign out every existing session
  user.isVerified = true // following the emailed link proves ownership of the address
  await user.save()

  req.user = { id: String(user._id), email: user.email, role: user.role, isVerified: true }
  await audit(req, { action: 'user.password_reset', targetType: 'User', targetId: user._id })
  await sendMail(passwordChangedMessage(user.email))
  clearSessionCookie(res)
  res.json({ data: { reset: true } })
})

authRouter.post('/change-password', authLimiter, authorize(), validate({ body: changePasswordSchema }), async (req, res) => {
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>
  const user = await User.findById(req.user!.id).select('+passwordHash')
  if (!user) throw unauthorized()
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new AppError(400, 'INVALID_PASSWORD', 'Your current password is incorrect')

  user.passwordHash = await hashPassword(newPassword)
  user.tokenVersion += 1
  await user.save()

  await audit(req, { action: 'user.password_changed', targetType: 'User', targetId: user._id })
  await sendMail(passwordChangedMessage(user.email))
  // Keep this session alive with the new token version.
  setSessionCookie(res, { sub: String(user._id), role: user.role, tv: user.tokenVersion })
  res.json({ data: { changed: true } })
})
