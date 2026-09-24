import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminCompany, AdminSummary, CompanyStatus, JobStatus, ManagedJob } from '@/types'

export const adminKeys = {
  summary: ['admin', 'summary'] as const,
  companies: (status?: string, q?: string) => ['admin', 'companies', status ?? 'all', q ?? ''] as const,
  jobs: (status?: string, q?: string) => ['admin', 'jobs', status ?? 'all', q ?? ''] as const,
  job: (id: string) => ['admin', 'job', id] as const,
}

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
  return s ? `?${s}` : ''
}

export const useAdminSummary = () => useQuery({ queryKey: adminKeys.summary, queryFn: () => api<AdminSummary>('/api/admin/summary'), refetchInterval: 60_000 })

export const useAdminCompanies = (status?: CompanyStatus, q?: string) =>
  useQuery({ queryKey: adminKeys.companies(status, q), queryFn: () => api<AdminCompany[]>(`/api/admin/companies${qs({ status, q })}`), placeholderData: (p) => p })

export const useAdminJobs = (status?: JobStatus, q?: string) =>
  useQuery({ queryKey: adminKeys.jobs(status, q), queryFn: () => api<ManagedJob[]>(`/api/admin/jobs${qs({ status, q })}`), placeholderData: (p) => p })

export const useAdminJob = (id: string | undefined) =>
  useQuery({ queryKey: adminKeys.job(id ?? ''), queryFn: () => api<ManagedJob>(`/api/admin/jobs/${id}`), enabled: Boolean(id) })

/** Any admin write: refresh lists, the summary badges and public data afterwards. */
function useAdminMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['public'] })
    },
  })
}

export const useSetCompanyStatus = () =>
  useAdminMutation(({ id, status, note }: { id: string; status: CompanyStatus; note?: string }) =>
    api<AdminCompany>(`/api/admin/companies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  )

export const useSetJobStatus = () =>
  useAdminMutation(({ id, status, note }: { id: string; status: JobStatus; note?: string }) =>
    api<ManagedJob>(`/api/admin/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  )

export const useSetFeatured = () =>
  useAdminMutation(({ id, featured }: { id: string; featured: boolean }) => api<ManagedJob>(`/api/admin/jobs/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featured }) }))

export const useSaveAdminJob = (id?: string) =>
  useAdminMutation((data: unknown) => api<ManagedJob>(id ? `/api/admin/jobs/${id}` : '/api/admin/jobs', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }))
