import type { ApiFailure } from '@/types'
import { translateMessage } from '@/i18n'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly details?: unknown) {
    super(translateMessage(message))
    this.name = 'ApiError'
  }
}

/** Calls the API with cookies and unwraps the `{ data }` / `{ error }` envelope. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: { ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }), ...init.headers },
    })
  } catch {
    throw new ApiError('Unable to reach the server. Please check your connection.', 'NETWORK_ERROR', 0)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (body as ApiFailure | null)?.error
    throw new ApiError(error?.message ?? `Request failed (${res.status})`, error?.code ?? 'HTTP_ERROR', res.status, error?.details)
  }
  return (body as { data: T }).data
}
