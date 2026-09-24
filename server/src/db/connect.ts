import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { env } from '../config/env.js'

const EMBEDDED_PORT = 27027
const DB_NAME = 'ai101talents'

let memoryServer: { stop: () => Promise<boolean> } | undefined

/**
 * Connects to MONGODB_URI. In development without a URI, uses an embedded MongoDB whose data persists
 * in server/.data/mongo, so `npm run dev` works with no setup. Scripts (seed, create-admin) reuse the
 * embedded instance if the dev server already started it.
 */
export async function connectDatabase() {
  mongoose.set('strictQuery', true)

  if (env.MONGODB_URI) {
    await mongoose.connect(env.MONGODB_URI)
    console.log(`[db] connected to ${redact(env.MONGODB_URI)}`)
    return
  }
  if (env.isProduction) throw new Error('MONGODB_URI is required in production')

  const embeddedUri = `mongodb://127.0.0.1:${EMBEDDED_PORT}/${DB_NAME}`
  try {
    await mongoose.connect(embeddedUri, { serverSelectionTimeoutMS: 1000 })
    console.log(`[db] connected to running embedded MongoDB (${embeddedUri})`)
    return
  } catch {
    await mongoose.disconnect()
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const dbPath = fileURLToPath(new URL('../../.data/mongo', import.meta.url))
  mkdirSync(dbPath, { recursive: true })
  console.log('[db] MONGODB_URI not set; starting embedded MongoDB (the first run downloads it)')
  memoryServer = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger', port: EMBEDDED_PORT } })
  await mongoose.connect(embeddedUri)
  console.log(`[db] embedded MongoDB ready (${embeddedUri}), data in server/.data/mongo`)
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
  await memoryServer?.stop()
}

function redact(uri: string) {
  return uri.replace(/\/\/([^@/]+)@/, '//***@')
}
