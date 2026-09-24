// Runs the data-retention job once.
// Usage: npm run retention -w server -- --dry-run   (report only)
//        npm run retention -w server                (delete)
import { parseArgs } from 'node:util'
import { connectDatabase, disconnectDatabase } from '../db/connect.js'
import { runRetention } from '../jobs/retention.js'

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } })

await connectDatabase()
try {
  const result = await runRetention({ dryRun: values['dry-run'] })
  const verb = values['dry-run'] ? 'Would delete' : 'Deleted'
  console.log(`${verb} ${result.count} profile(s) inactive since before ${result.cutoff.toISOString().slice(0, 10)} (retention: ${result.retentionMonths} months).`)
  if (result.count) console.log(result.applicantNumbers.join(', '))
} finally {
  await disconnectDatabase()
}
