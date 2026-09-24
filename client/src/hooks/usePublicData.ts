import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fallbackJobs, fallbackSkills, fallbackStats, fallbackTestimonials } from '@/data/fallback'
import type { JobSummary, PopularSkill, PublicStats, Testimonial } from '@/types'

const publicQuery = { staleTime: 5 * 60_000, retry: 1 } as const

/**
 * Wraps a public query so the landing page can render fallback content when the API fails.
 * `isFallback` lets components avoid linking to fallback jobs that do not exist.
 */
function withFallback<T>(query: { data: T | undefined; isPending: boolean; isError: boolean }, fallback: T) {
  return {
    data: query.isError ? fallback : query.data,
    isLoading: query.isPending,
    isFallback: query.isError,
  }
}

export function usePublicStats() {
  const q = useQuery({ queryKey: ['public', 'stats'], queryFn: () => api<PublicStats>('/api/public/stats'), ...publicQuery })
  return withFallback(q, fallbackStats)
}

export function useFeaturedJobs() {
  const q = useQuery({ queryKey: ['jobs', 'featured'], queryFn: () => api<{ items: JobSummary[] }>('/api/jobs?featured=true&limit=6').then((r) => r.items), ...publicQuery })
  return withFallback(q, fallbackJobs)
}

export function usePopularSkills() {
  const q = useQuery({ queryKey: ['public', 'skills'], queryFn: () => api<PopularSkill[]>('/api/public/skills'), ...publicQuery })
  return withFallback(q, fallbackSkills)
}

export function useTestimonials() {
  const q = useQuery({ queryKey: ['public', 'testimonials'], queryFn: () => api<Testimonial[]>('/api/public/testimonials'), ...publicQuery })
  return withFallback(q, fallbackTestimonials)
}
