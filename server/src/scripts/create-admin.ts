// Creates an admin account (there is no public admin signup).
// Usage: npm run create-admin -w server -- --email admin@example.com --password "S3cure-pass"
import { parseArgs } from 'node:util'
import { connectDatabase, disconnectDatabase } from '../db/connect.js'
import { hashPassword } from '../lib/auth.js'
import { User } from '../models/index.js'
import { emailSchema, passwordSchema } from '../validation/auth.js'

const { values } = parseArgs({ options: { email: { type: 'string' }, password: { type: 'string' } } })

const email = emailSchema.safeParse(values.email)
const password = passwordSchema.safeParse(values.password)
if (!email.success || !password.success) {
  console.error('Usage: npm run create-admin -w server -- --email <email> --password <password>')
  console.error('Password: 8–72 characters with at least one letter and one number.')
  process.exit(1)
}

await connectDatabase()
try {
  if (await User.exists({ email: email.data })) {
    console.error(`A user with email ${email.data} already exists.`)
    process.exitCode = 1
  } else {
    await User.create({ email: email.data, passwordHash: await hashPassword(password.data), role: 'admin', isVerified: true })
    console.log(`Admin ${email.data} created.`)
  }
} finally {
  await disconnectDatabase()
}
