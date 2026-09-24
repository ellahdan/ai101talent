import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminRequest } from '@/types'

export type RequestGroup = 'action' | 'active' | 'closed'

export const adminRequestKeys = {
  list: (group?: RequestGroup) => ['admin', 'requests', group ?? 'all'] as const,
  detail: (id: string) => ['admin', 'request', id] as const,
}

export const useAdminRequests = (group?: RequestGroup) =>
  useQuery({
    queryKey: adminRequestKeys.list(group),
    queryFn: () => api<AdminRequest[]>(`/api/admin/requests${group ? `?group=${group}` : ''}`),
    placeholderData: (p) => p,
  })

export const useAdminRequest = (id: string | undefined) =>
  useQuery({ queryKey: adminRequestKeys.detail(id ?? ''), queryFn: () => api<AdminRequest>(`/api/admin/requests/${id}`), enabled: Boolean(id) })

export type RequestAction =
  | { kind: 'forward'; message: string }
  | { kind: 'request-info'; message: string }
  | { kind: 'reject'; reason: string }
  | { kind: 'introduce'; share: { fullName: boolean; email: boolean; phone: boolean; linkedin: boolean; cv: boolean }; note?: string; interviewDate?: string }
  | { kind: 'outcome'; status: 'interviewing' | 'hired' | 'not_selected' | 'closed'; note?: string; interviewDate?: string }
  | { kind: 'messages'; thread: 'company' | 'candidate'; text: string }

/** Runs one mediation step and refreshes the request, the queue and the badges. */
export function useRequestAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, ...body }: RequestAction) => api<AdminRequest>(`/api/admin/requests/${id}/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminRequestKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: ['admin', 'requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] })
    },
  })
}

export async function openRequestCv(id: string) {
  const { url } = await api<{ url: string }>(`/api/admin/requests/${id}/cv`)
  window.open(url, '_blank', 'noopener')
}
