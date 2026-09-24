import cron from 'node-cron'
import { env } from '../config/env.js'
import { audit } from '../lib/audit.js'
import { Candidate } from '../models/index.js'
import { deleteCandidateAccount } from '../services/candidates.js'
import { getSettings } from '../services/settings.js'

/** Date before which a profile counts as inactive for the given retention period. */
export function retentionCutoff(months: number, now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  return cutoff
}

/**
 * Deletes candidate accounts with no activity (login, profile update, application or request reply)
 * since the retention cutoff. With `dryRun`, only reports what would be deleted.
 */
export async function runRetention({ dryRun = false } = {}) {
  const { retentionMonths } = await getSettings()
  const cutoff = retentionCutoff(retentionMonths)
  const stale = await Candidate.find({ lastActiveAt: { $lt: cutoff } }).select('userId applicantNumber lastActiveAt').lean()

  if (!dryRun) {
    for (const c of stale) {
      await deleteCandidateAccount(c.userId)
      // No identifying data in the log: the profile no longer exists.
      await audit(null, { action: 'candidate.retention_deleted', targetType: 'User', targetId: c.userId, meta: { inactiveSince: c.lastActiveAt?.toISOString().slice(0, 10), retentionMonths } })
    }
  }
  return { retentionMonths, cutoff, count: stale.length, applicantNumbers: stale.map((c) => c.applicantNumber) }
}

let running = false

/** Schedules the daily retention job (unless disabled, e.g. on all but one instance). */
export function scheduleRetention() {
  if (!env.RETENTION_ENABLED) {
    console.log('[retention] scheduled job disabled (RETENTION_ENABLED=false)')
    return
  }
  cron.schedule(
    env.RETENTION_CRON,
    async () => {
      if (running) return // never overlap with a previous run
      running = true
      try {
        const result = await runRetention()
        console.log(`[retention] deleted ${result.count} profile(s) inactive since before ${result.cutoff.toISOString().slice(0, 10)} (${result.retentionMonths} months)`)
      } catch (err) {
        console.error('[retention] run failed', err)
      } finally {
        running = false
      }
    },
    { timezone: 'UTC', name: 'retention' },
  )
  console.log(`[retention] scheduled "${env.RETENTION_CRON}" (UTC)`)
}
