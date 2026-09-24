import { env } from '../config/env.js'
import type { MailMessage } from './mailer.js'

// Email templates. Each returns subject, HTML and a plain-text alternative.

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Shared HTML email layout: table-based for Outlook, inline styles only, a hidden preheader
 * (the preview line in inbox lists), a bulletproof button and a footer with privacy/contact links.
 */
function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const preheader = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px"><tr>
         <td bgcolor="#14A800" style="border-radius:8px"><a href="${escape(cta.url)}" style="display:inline-block;padding:12px 22px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:8px">${escape(cta.label)}</a></td>
       </tr></table>
       <p style="font-size:13px;color:#5c6f6e;margin:0">Or copy this link into your browser:<br><span style="word-break:break-all">${escape(cta.url)}</span></p>`
    : ''
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#F7F7F2;font-family:Arial,Helvetica,sans-serif;color:#16302F">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F7F2"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #dfe3df">
      <tr><td style="padding:28px 32px 0">
        <span style="display:inline-block;width:28px;height:28px;border-radius:6px;background:#14A800;vertical-align:middle"></span>
        <span style="font-weight:700;font-size:18px;vertical-align:middle;margin-left:8px">AI101 <span style="font-weight:400;color:#6b7d7c">Talents</span></span>
      </td></tr>
      <tr><td style="padding:20px 32px 32px;font-size:15px;line-height:1.6">
        <h1 style="font-size:22px;line-height:1.3;letter-spacing:-.02em;margin:0 0 16px">${escape(title)}</h1>
        ${bodyHtml}${button}
      </td></tr>
    </table>
    <p style="font-size:12px;line-height:1.6;color:#6b7d7c;margin:20px 0 0;max-width:560px">
      AI101 Talents · Every introduction is reviewed by our team.<br>
      You're receiving this email because of activity on your AI101 Talents account.
      <a href="${env.CLIENT_URL}/privacy" style="color:#6b7d7c">Privacy policy</a> · <a href="mailto:${escape(env.CONTACT_EMAIL)}" style="color:#6b7d7c">Contact us</a>
    </p>
  </td></tr></table>
</body></html>`
}

export function verifyEmailMessage(to: string, token: string): MailMessage {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`
  return {
    to,
    subject: 'Confirm your email address',
    html: layout('Confirm your email', '<p>Thanks for joining AI101 Talents. Please confirm your email address. The link is valid for 24 hours.</p>', { label: 'Confirm email', url }),
    text: `Thanks for joining AI101 Talents. Confirm your email address (valid for 24 hours):\n${url}`,
  }
}

export function passwordResetMessage(to: string, token: string): MailMessage {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`
  return {
    to,
    subject: 'Reset your password',
    html: layout('Reset your password', "<p>We received a request to reset your password. The link is valid for 1 hour. If you didn't ask for this, you can ignore this email.</p>", { label: 'Choose a new password', url }),
    text: `Reset your password (valid for 1 hour):\n${url}\n\nIf you didn't ask for this, ignore this email.`,
  }
}

export function applicantConfirmationMessage(to: string, name: string, applicantNumber: string, jobTitle?: string): MailMessage {
  const what = jobTitle ? `your application for <strong>${escape(jobTitle)}</strong>` : 'your profile'
  const whatText = jobTitle ? `your application for ${jobTitle}` : 'your profile'
  const numberBlock = `<p style="margin:20px 0;padding:16px;border-radius:8px;background:#E7F7E4;text-align:center">
      <span style="display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#16740d">Your applicant number</span>
      <span style="display:block;margin-top:4px;font-size:26px;font-weight:700;letter-spacing:.02em">${escape(applicantNumber)}</span></p>`
  return {
    to,
    subject: jobTitle ? `Application received: ${jobTitle}` : 'Your AI101 Talents profile is ready',
    html: layout(
      `Thanks, ${name.split(' ')[0]}!`,
      `<p>We've received ${what}.</p>${numberBlock}
       <p>Keep this number: use it whenever you contact us. Companies never see your contact details. If one wants to talk to you, our team reviews the request first and asks for your permission.</p>`,
      { label: 'Go to your dashboard', url: `${env.CLIENT_URL}/candidate` },
    ),
    text: `Thanks, ${name}! We've received ${whatText}.\n\nYour applicant number: ${applicantNumber}\n\nCompanies never see your contact details. If one wants to talk to you, our team reviews the request first and asks for your permission.\n\nDashboard: ${env.CLIENT_URL}/candidate`,
  }
}

export function companyStatusMessage(to: string, companyName: string, status: 'approved' | 'suspended' | 'pending', note?: string): MailMessage {
  const noteHtml = note ? `<p style="padding:12px 16px;border-left:3px solid #14A800;background:#F7F7F2">${escape(note)}</p>` : ''
  if (status === 'approved') {
    return {
      to,
      subject: `${companyName} is approved on AI101 Talents`,
      html: layout('Your company is approved', `<p>Good news: <strong>${escape(companyName)}</strong> has been approved. You can now post positions and search anonymized talent profiles.</p>${noteHtml}`, { label: 'Open your dashboard', url: `${env.CLIENT_URL}/company` }),
      text: `${companyName} has been approved. You can now post positions and search talent.\n${note ?? ''}\n${env.CLIENT_URL}/company`,
    }
  }
  return {
    to,
    subject: `Update about your AI101 Talents company account`,
    html: layout('Your company account was updated', `<p>The account for <strong>${escape(companyName)}</strong> is currently <strong>${status}</strong>. Job postings and talent search are unavailable until this changes.</p>${noteHtml}<p>Reply to this email if you have questions.</p>`),
    text: `The account for ${companyName} is currently ${status}.\n${note ?? ''}`,
  }
}

export function jobStatusMessage(to: string, jobTitle: string, jobId: string, outcome: 'approved' | 'rejected' | 'closed' | 'reopened', note?: string): MailMessage {
  const noteHtml = note ? `<p style="padding:12px 16px;border-left:3px solid #14A800;background:#F7F7F2">${escape(note)}</p>` : ''
  const copy = {
    approved: { subject: `Published: ${jobTitle}`, title: 'Your position is live', body: `<strong>${escape(jobTitle)}</strong> has been approved and is now visible to candidates.`, url: `${env.CLIENT_URL}/jobs/${jobId}`, label: 'View the listing' },
    rejected: { subject: `Changes needed: ${jobTitle}`, title: 'Your position was not published', body: `We couldn't publish <strong>${escape(jobTitle)}</strong> yet. Please see the note below, update the posting and submit it again.`, url: `${env.CLIENT_URL}/company/jobs/${jobId}/edit`, label: 'Edit the posting' },
    closed: { subject: `Closed: ${jobTitle}`, title: 'Your position was closed', body: `<strong>${escape(jobTitle)}</strong> is no longer accepting applications.`, url: `${env.CLIENT_URL}/company/jobs`, label: 'Your positions' },
    reopened: { subject: `Reopened: ${jobTitle}`, title: 'Your position is open again', body: `<strong>${escape(jobTitle)}</strong> is visible to candidates again.`, url: `${env.CLIENT_URL}/jobs/${jobId}`, label: 'View the listing' },
  }[outcome]
  return {
    to,
    subject: copy.subject,
    html: layout(copy.title, `<p>${copy.body}</p>${noteHtml}`, { label: copy.label, url: copy.url }),
    text: `${copy.body.replace(/<[^>]+>/g, '')}\n${note ?? ''}\n${copy.url}`,
  }
}

/** Generic notification to a candidate or company: a title, a few paragraphs and a link into the app. */
export function notificationMessage(to: string, subject: string, title: string, lines: string[], link: { label: string; path: string }): MailMessage {
  return {
    to,
    subject,
    html: layout(title, lines.map((l) => `<p>${escape(l)}</p>`).join(''), { label: link.label, url: `${env.CLIENT_URL}${link.path}` }),
    text: [...lines, `${link.label}: ${env.CLIENT_URL}${link.path}`].join('\n\n'),
  }
}

export function adminNotificationMessage(to: string[], subject: string, lines: string[], link?: { label: string; path: string }): MailMessage {
  return {
    to,
    subject: `[AI101 admin] ${subject}`,
    html: layout(subject, lines.map((l) => `<p>${escape(l)}</p>`).join(''), link ? { label: link.label, url: `${env.CLIENT_URL}${link.path}` } : undefined),
    text: [...lines, link ? `${link.label}: ${env.CLIENT_URL}${link.path}` : ''].join('\n'),
  }
}

export function passwordChangedMessage(to: string): MailMessage {
  return {
    to,
    subject: 'Your password was changed',
    html: layout('Your password was changed', `<p>Your AI101 Talents password was just changed and other sessions were signed out. If this wasn't you, reset your password immediately.</p>`, { label: 'Reset password', url: `${env.CLIENT_URL}/forgot-password` }),
    text: `Your AI101 Talents password was just changed. If this wasn't you, reset it: ${env.CLIENT_URL}/forgot-password`,
  }
}
