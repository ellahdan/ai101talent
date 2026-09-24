import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AnonymizedCandidate, AnonymizedCandidateDetail, CompanyRequest, Paginated, Shortlist, TalentFacets } from '@/types'

export const talentKeys = {
  search: (qs: string) => ['talent', 'search', qs] as const,
  facets: ['talent', 'facets'] as const,
  detail: (id: string) => ['talent', 'detail', id] as const,
  shortlists: ['talent', 'shortlists'] as const,
  shortlist: (id: string) => ['talent', 'shortlists', id] as const,
  requests: ['company', 'requests'] as const,
}

export function useTalentSearch(search: URLSearchParams) {
  const qs = new URLSearchParams([...search.entries()].filter(([, v]) => v !== ''))
  qs.sort()
  const key = qs.toString()
  return useQuery({
    queryKey: talentKeys.search(key),
    queryFn: () => api<Paginated<AnonymizedCandidate>>(`/api/search/candidates${key ? `?${key}` : ''}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export const useTalentFacets = () => useQuery({ queryKey: talentKeys.facets, queryFn: () => api<TalentFacets>('/api/search/facets'), staleTime: 5 * 60_000 })
export const useTalentDetail = (id: string | undefined) =>
  useQuery({ queryKey: talentKeys.detail(id ?? ''), queryFn: () => api<AnonymizedCandidateDetail>(`/api/search/candidates/${id}`), enabled: Boolean(id) })

// ---- Shortlists ----------------------------------------------------------------------

export const useShortlists = () => useQuery({ queryKey: talentKeys.shortlists, queryFn: () => api<Shortlist[]>('/api/shortlists') })
export const useShortlistCandidates = (id: string | undefined) =>
  useQuery({
    queryKey: talentKeys.shortlist(id ?? ''),
    queryFn: () => api<{ shortlist: Shortlist; candidates: AnonymizedCandidate[] }>(`/api/shortlists/${id}/candidates`),
    enabled: Boolean(id),
  })

/** Shortlist writes also change the shortlist badges shown on search results. */
function useTalentMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['talent'] }) })
}

export const useCreateShortlist = () => useTalentMutation((name: string) => api<Shortlist>('/api/shortlists', { method: 'POST', body: JSON.stringify({ name }) }))
export const useRenameShortlist = () => useTalentMutation(({ id, name }: { id: string; name: string }) => api<Shortlist>(`/api/shortlists/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }))
export const useDeleteShortlist = () => useTalentMutation((id: string) => api(`/api/shortlists/${id}`, { method: 'DELETE' }))
export const useToggleShortlisted = () =>
  useTalentMutation(({ listId, candidateId, add }: { listId: string; candidateId: string; add: boolean }) =>
    add
      ? api<Shortlist>(`/api/shortlists/${listId}/candidates`, { method: 'POST', body: JSON.stringify({ candidateId }) })
      : api<Shortlist>(`/api/shortlists/${listId}/candidates/${candidateId}`, { method: 'DELETE' }),
  )

// ---- Contact requests (company side) ----------------------------------------------------

export const useCompanyRequests = () => useQuery({ queryKey: talentKeys.requests, queryFn: () => api<CompanyRequest[]>('/api/requests/company') })

export function useCreateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => api<CompanyRequest>('/api/requests', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent'] })
      queryClient.invalidateQueries({ queryKey: talentKeys.requests })
    },
  })
}

export function useCompanyRequestMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api<CompanyRequest>(`/api/requests/company/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: (updated) => queryClient.setQueryData<CompanyRequest[]>(talentKeys.requests, (list) => list?.map((r) => (r.id === updated.id ? updated : r))),
  })
}

/** Opens a short-lived link to a CV the admin shared with this company (the download is logged). */
export async function openSharedCv(requestId: string) {
  const { url } = await api<{ url: string }>(`/api/requests/company/${requestId}/cv`)
  window.location.assign(url)
}
