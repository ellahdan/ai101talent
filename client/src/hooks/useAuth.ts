import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { AuthUser, Role } from '@/types'

export const meQueryKey = ['auth', 'me'] as const

/** The logged-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return await api<AuthUser>('/api/auth/me')
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
    retry: false,
  })
}

/** Runs an auth request and stores the returned user as the current session. */
function useSessionMutation<TInput>(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => api<AuthUser>(path, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user)
      // Talent results fetched as a guest lack this account's shortlists and request statuses.
      queryClient.removeQueries({ queryKey: ['talent'] })
    },
  })
}

export const useLogin = () => useSessionMutation<{ email: string; password: string }>('/api/auth/login')
export const useRegister = () => useSessionMutation<Record<string, unknown>>('/api/auth/register')

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.setQueryData(meQueryKey, null)
      // Drop any cached private data from the previous session.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' && q.queryKey[0] !== 'public' && q.queryKey[0] !== 'jobs' })
    },
  })
}

export function dashboardPath(role: Role) {
  return role === 'admin' ? '/admin' : role === 'company' ? '/company' : '/candidate'
}

/** Only allows same-site relative redirects, to avoid open redirects via ?next=. */
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}
