import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { CandidateProfile, CandidateRequest, MyApplication } from '@/types'

export const candidateKeys = {
  profile: ['candidate', 'profile'] as const,
  applications: ['candidate', 'applications'] as const,
  requests: ['candidate', 'requests'] as const,
}

/** Builds the multipart body the upload endpoints expect: JSON in `data`, plus optional files. */
export function multipart(data: unknown, files: { cv?: File | null; coverLetter?: File | null } = {}) {
  const body = new FormData()
  body.set('data', JSON.stringify(data))
  if (files.cv) body.set('cv', files.cv)
  if (files.coverLetter) body.set('coverLetter', files.coverLetter)
  return body
}

/** The candidate's own profile, or null if they haven't created one yet. */
export function useMyProfile(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.profile,
    queryFn: async () => {
      try {
        return await api<CandidateProfile>('/api/candidates/me')
      } catch (err) {
        if (err instanceof ApiError && err.code === 'NO_PROFILE') return null
        throw err
      }
    },
    enabled,
  })
}

export function useMyApplications(enabled = true) {
  return useQuery({ queryKey: candidateKeys.applications, queryFn: () => api<MyApplication[]>('/api/applications/mine'), enabled })
}

export function useMyRequests(enabled = true) {
  return useQuery({ queryKey: candidateKeys.requests, queryFn: () => api<CandidateRequest[]>('/api/requests/mine'), enabled })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data, cv, coverLetter }: { data: unknown; cv?: File | null; coverLetter?: File | null }) =>
      api<CandidateProfile>('/api/candidates/me', { method: 'PUT', body: multipart(data, { cv, coverLetter }) }),
    onSuccess: (profile) => queryClient.setQueryData(candidateKeys.profile, profile),
  })
}

/** Updates one request in the cached list after a response or message. */
function useRequestMutation<TInput>(path: (id: string) => string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: TInput & { id: string }) => api<CandidateRequest>(path(id), { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (updated) =>
      queryClient.setQueryData<CandidateRequest[]>(candidateKeys.requests, (list) => list?.map((r) => (r.id === updated.id ? updated : r))),
  })
}

export const useRespondToRequest = () => useRequestMutation<{ decision: 'accept' | 'decline'; note?: string }>((id) => `/api/requests/${id}/respond`)
export const useSendRequestMessage = () => useRequestMutation<{ text: string }>((id) => `/api/requests/${id}/messages`)

/** Opens a short-lived signed download link for the candidate's own CV or cover letter. */
export async function openMyFile(kind: 'cv' | 'cover-letter') {
  const { url } = await api<{ url: string }>(`/api/candidates/me/files/${kind}`)
  window.location.assign(url)
}
