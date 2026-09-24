import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { meQueryKey } from '@/hooks/useAuth'
import type { CompanyProfile, ManagedJob } from '@/types'

export const companyKeys = {
  profile: ['company', 'profile'] as const,
  jobs: ['company', 'jobs'] as const,
  job: (id: string) => ['company', 'jobs', id] as const,
}

export const useMyCompany = () => useQuery({ queryKey: companyKeys.profile, queryFn: () => api<CompanyProfile>('/api/companies/me') })
export const useMyJobs = () => useQuery({ queryKey: companyKeys.jobs, queryFn: () => api<ManagedJob[]>('/api/companies/me/jobs') })
export const useMyJob = (id: string | undefined) =>
  useQuery({ queryKey: companyKeys.job(id ?? ''), queryFn: () => api<ManagedJob>(`/api/companies/me/jobs/${id}`), enabled: Boolean(id) })

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api<CompanyProfile>('/api/companies/me', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.profile, company)
      queryClient.invalidateQueries({ queryKey: meQueryKey })
    },
  })
}

/** Save (create or update) a job posting. */
export function useSaveJob(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) =>
      api<ManagedJob>(id ? `/api/companies/me/jobs/${id}` : '/api/companies/me/jobs', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
    onSuccess: (job) => {
      queryClient.setQueryData(companyKeys.job(job.id), job)
      // Show the new status straight away (e.g. an edited live job goes back to review).
      queryClient.setQueryData<ManagedJob[]>(companyKeys.jobs, (list) => (list ? (list.some((j) => j.id === job.id) ? list.map((j) => (j.id === job.id ? job : j)) : [job, ...list]) : list))
    },
  })
}

export function useJobAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'close' | 'reopen' }) => api<ManagedJob>(`/api/companies/me/jobs/${id}/${action}`, { method: 'POST' }),
    onSuccess: (job) => {
      queryClient.setQueryData<ManagedJob[]>(companyKeys.jobs, (list) => list?.map((j) => (j.id === job.id ? job : j)))
      queryClient.setQueryData(companyKeys.job(job.id), job)
    },
  })
}
