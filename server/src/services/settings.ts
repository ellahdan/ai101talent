import { Setting } from '../models/index.js'
import type { AdminSettings } from '../types/index.js'

const DEFAULTS: AdminSettings = { retentionMonths: 24 }

export async function getSettings(): Promise<AdminSettings> {
  const rows = await Setting.find({ key: { $in: Object.keys(DEFAULTS) } }).lean()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { ...DEFAULTS, ...stored } as AdminSettings
}

export async function updateSettings(values: Partial<AdminSettings>, adminId: string) {
  await Promise.all(Object.entries(values).map(([key, value]) => Setting.updateOne({ key }, { value, updatedBy: adminId }, { upsert: true })))
  return getSettings()
}
