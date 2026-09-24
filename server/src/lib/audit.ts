import type { Request } from 'express'
import type { Types } from 'mongoose'
import { AuditLog } from '../models/index.js'

interface AuditEntry {
  action: string
  targetType: string
  targetId?: Types.ObjectId | string
  meta?: Record<string, unknown>
}

/** Records who did what. Pass the request to capture the actor and IP; omit it for system jobs. */
export async function audit(req: Request | null, entry: AuditEntry) {
  await AuditLog.create({
    ...entry,
    actorId: req?.user?.id,
    actorRole: req?.user?.role ?? 'system',
    ip: req?.ip,
  })
}
