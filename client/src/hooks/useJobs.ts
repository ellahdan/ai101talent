import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { JobDetail, JobFacets, JobSummary, Paginated } from '@/types'

/** Query string for GET /api/jobs, built from the page's URL search params (empty values dropped). */
export function useJobs(search: URLSearchParams) {
  const qs = new URLSearchParams([...search.entries()].filter(([, v]) => v !== ''))
  qs.sort()
  const key = qs.toString()
  return useQuery({
    queryKey: ['jobs', 'list', key],
    queryFn: () => api<Paginated<JobSummary>>(`/api/jobs${key ? `?${key}` : ''}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useJobFacets() {
  return useQuery({ queryKey: ['jobs', 'facets'], queryFn: () => api<JobFacets>('/api/jobs/facets'), staleTime: 5 * 60_000 })
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    queryFn: () => api<JobDetail>(`/api/jobs/${id}`),
    enabled: Boolean(id),
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 1,
  })
}
