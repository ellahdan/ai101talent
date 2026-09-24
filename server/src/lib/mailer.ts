import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'

export interface MailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
}

let transporter: Transporter | undefined

function getTransporter() {
  if (env.EMAIL_TRANSPORT === 'log' || !env.SMTP_HOST) return undefined
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  return transporter
}

/**
 * Sends an email through SMTP, or logs it to the console when SMTP is not configured (development).
 * Failures are logged, never thrown: an email problem must not break the request that triggered it.
 */
export async function sendMail(message: MailMessage) {
  const transport = getTransporter()
  if (!transport) {
    console.log(
      `\n[mail] ── To: ${[message.to].flat().join(', ')}\n[mail]    Subject: ${message.subject}\n${message.text
        .split('\n')
        .map((l) => `[mail]    ${l}`)
        .join('\n')}\n`,
    )
    return
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, ...message })
  } catch (err) {
    console.error('[mail] failed to send', message.subject, err)
  }
}
