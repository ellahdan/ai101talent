import { Counter } from '../models/index.js'

/**
 * Atomically increments and returns the next value of a named sequence.
 * `$inc` with `upsert` in one findOneAndUpdate means concurrent callers never get the same number,
 * and numbers are never reused (the counter only moves forward, even if a later insert fails).
 */
export async function nextSequence(name: string) {
  const counter = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
  return counter.seq
}

/** Returns the next applicant number, e.g. "AI101-000001". */
export async function nextApplicantNumber() {
  const seq = await nextSequence('applicantNumber')
  return `AI101-${String(seq).padStart(6, '0')}`
}
