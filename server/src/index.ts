import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './db/connect.js'
import { createApp } from './app.js'
import { scheduleRetention } from './jobs/retention.js'

async function main() {
  await connectDatabase()

  scheduleRetention()

  const server = createApp().listen(env.PORT, () => {
    console.log(`[server] API listening on http://localhost:${env.PORT}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down`)
    server.close()
    await disconnectDatabase()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
