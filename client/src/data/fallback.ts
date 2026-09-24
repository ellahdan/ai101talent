import type { JobSummary, PopularSkill, PublicStats, Testimonial } from '@/types'

// Shown when the API is unreachable, so the landing page never renders empty.
// Fallback jobs have no real detail page and link to /jobs instead.

export const fallbackStats: PublicStats = {
  openPositions: 120,
  registeredTalents: 2400,
  companies: 85,
  successfulHires: 310,
}

export const fallbackJobs: JobSummary[] = [
  {
    id: 'fallback-1',
    title: 'Senior Product Designer',
    company: { id: 'fallback', name: 'Maven Studio' },
    location: 'Lisbon, Portugal',
    workMode: 'hybrid',
    contractType: 'full-time',
    seniority: 'senior',
    requiredSkills: ['Figma', 'Product design', 'Research'],
    salaryRange: { min: 55000, max: 75000, currency: 'EUR' },
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'fallback-2',
    title: 'Frontend Engineer',
    company: { id: 'fallback', name: 'Northstar Labs' },
    location: 'Remote',
    workMode: 'remote',
    contractType: 'contract',
    seniority: 'mid',
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
    salaryRange: { min: 50000, max: 65000, currency: 'EUR' },
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'fallback-3',
    title: 'Growth Marketing Lead',
    company: { id: 'fallback', name: 'Luma Health' },
    location: 'Paris, France',
    workMode: 'onsite',
    contractType: 'full-time',
    seniority: 'lead',
    requiredSkills: ['Growth', 'B2B', 'Analytics'],
    featured: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

export const fallbackSkills: PopularSkill[] = [
  'React', 'TypeScript', 'Python', 'Node.js', 'Figma', 'SQL', 'Data analysis', 'Product design',
  'AWS', 'Machine learning', 'Growth', 'Project management', 'Copywriting', 'Docker',
].map((name, i) => ({ name, count: 40 - i * 2 }))

export const fallbackTestimonials: Testimonial[] = [
  { id: 't1', name: 'Adaeze Nwosu', role: 'Data Analyst', quote: 'The team introduced me to a company that actually read my profile. Two conversations later I had an offer.' },
  { id: 't2', name: 'Julien Marchand', role: 'CTO, Northstar Labs', quote: 'Searching by real skills and years of experience saved us weeks. Every introduction was relevant.' },
  { id: 't3', name: 'Maja Eriksson', role: 'Product Designer', quote: 'I liked that nobody could contact me without my say. It made applying feel safe.' },
  { id: 't4', name: 'Kofi Boateng', role: 'Head of People, Luma Health', quote: 'The mediated introductions meant candidates arrived informed and genuinely interested.' },
]
