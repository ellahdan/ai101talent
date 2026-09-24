/** Tiny in-memory TTL cache for cheap-to-stale public data (landing page stats, skills, facets). */
const store = new Map<string, { value: unknown; expires: number }>()

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await load()
  store.set(key, { value, expires: Date.now() + ttlMs })
  return value
}

export function invalidateCache(prefix = '') {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}
