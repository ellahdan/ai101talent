import { env } from '../config/env.js'
import { adminNotificationMessage } from '../lib/emails.js'
import { sendMail } from '../lib/mailer.js'
import { User } from '../models/index.js'

/** Emails the admin team (ADMIN_NOTIFY_EMAIL, or every admin account). Never throws. */
export async function notifyAdmins(subject: string, lines: string[], link?: { label: string; path: string }) {
  try {
    const recipients = env.ADMIN_NOTIFY_EMAIL ? [env.ADMIN_NOTIFY_EMAIL] : (await User.find({ role: 'admin' }).select('email').lean()).map((u) => u.email)
    if (recipients.length) await sendMail(adminNotificationMessage(recipients, subject, lines, link))
  } catch (err) {
    console.error('[notify] admin notification failed', err)
  }
}
