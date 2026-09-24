import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminCandidateDetail, AdminCandidateSearch, AdminDashboard, AdminSettings, AdminUser, ApplicationStatus, AuditEntry, Paginated, Pipeline } from '@/types'

/** Query string from URL params, empty values dropped and keys sorted (stable cache keys). */
export function cleanQuery(search: URLSearchParams) {
  const qs = new URLSearchParams([...search.entries()].filter(([, v]) => v !== ''))
  qs.sort()
  return qs.toString()
}

export const useAdminDashboard = () => useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<AdminDashboard>('/api/admin/dashboard'), staleTime: 60_000 })

export function useAdminCandidates(search: URLSearchParams) {
  const qs = cleanQuery(search)
  return useQuery({
    queryKey: ['admin', 'candidates', qs],
    queryFn: () => api<AdminCandidateSearch>(`/api/admin/candidates${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
  })
}

export const useAdminCandidate = (id: string | undefined) =>
  useQuery({ queryKey: ['admin', 'candidate', id], queryFn: () => api<AdminCandidateDetail>(`/api/admin/candidates/${id}`), enabled: Boolean(id) })

/** Opens a signed link to a candidate's CV or cover letter (the access is logged). */
export async function openCandidateFile(id: string, kind: 'cv' | 'cover-letter') {
  const { url } = await api<{ url: string }>(`/api/admin/candidates/${id}/files/${kind}`)
  window.open(url, '_blank', 'noopener')
}

export async function openApplicationLetter(applicationId: string) {
  const { url } = await api<{ url: string }>(`/api/admin/applications/${applicationId}/cover-letter`)
  window.open(url, '_blank', 'noopener')
}

// ---- Pipeline --------------------------------------------------------------------------------

export const usePipeline = (jobId: string | undefined) =>
  useQuery({ queryKey: ['admin', 'pipeline', jobId], queryFn: () => api<Pipeline>(`/api/admin/pipeline/${jobId}`), enabled: Boolean(jobId) })

/** Moves an application to another column, optimistically (rolls back on error). */
export function useMoveApplication(jobId: string) {
  const queryClient = useQueryClient()
  const key = ['admin', 'pipeline', jobId]
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => api(`/api/admin/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Pipeline>(key)
      queryClient.setQueryData<Pipeline>(key, (p) => p && { ...p, applications: p.applications.map((a) => (a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a)) })
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(key, ctx.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

// ---- Audit log, settings, admins -------------------------------------------------------------------

export function useAuditLog(search: URLSearchParams) {
  const qs = cleanQuery(search)
  return useQuery({ queryKey: ['admin', 'audit', qs], queryFn: () => api<Paginated<AuditEntry>>(`/api/admin/audit${qs ? `?${qs}` : ''}`), placeholderData: keepPreviousData })
}
export const useAuditOptions = () => useQuery({ queryKey: ['admin', 'audit-options'], queryFn: () => api<{ actions: string[]; targetTypes: string[] }>('/api/admin/audit/actions'), staleTime: 5 * 60_000 })

export const useAdminSettings = () => useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api<AdminSettings>('/api/admin/settings') })
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: AdminSettings) => api<AdminSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(values) }),
    onSuccess: (s) => queryClient.setQueryData(['admin', 'settings'], s),
  })
}

export const useAdmins = () => useQuery({ queryKey: ['admin', 'admins'], queryFn: () => api<AdminUser[]>('/api/admin/admins') })
export function useInviteAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api<AdminUser>('/api/admin/admins', { method: 'POST', body: JSON.stringify({ email }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  })
}
