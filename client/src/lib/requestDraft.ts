// A "Request to speak" written by a visitor before they have a company account. It is kept in
// localStorage so it survives registration, login and page reloads, and is sent automatically
// once the visitor is signed in as a company (see DraftRequestSender).

const KEY = 'ai101-request-draft'

export interface RequestDraft {
  candidateId: string
  applicantNumber: string
  roleTitle: string
  message: string
  /** ISO dates. */
  proposedTimes: string[]
  savedAt: string
}

export function saveRequestDraft(draft: Omit<RequestDraft, 'savedAt'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: new Date().toISOString() } satisfies RequestDraft))
  } catch { /* storage unavailable */ }
}

export function readRequestDraft(): RequestDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RequestDraft) : null
  } catch {
    return null
  }
}

export function clearRequestDraft() {
  try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}
