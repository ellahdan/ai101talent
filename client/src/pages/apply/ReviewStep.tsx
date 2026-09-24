import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Pencil } from 'lucide-react'
import type { ProfileFormValues } from '@/components/profile/ProfileSections'
import { proficiencyLabel, workModeLabel } from '@/lib/format'

function Block({ title, step, onEdit, children }: { title: string; step: number; onEdit: (step: number) => void; children: ReactNode }) {
  return (
    <div className="border-b border-foreground/10 pb-5 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand" aria-label={`Edit ${title}`}>
          <Pencil size={13} aria-hidden /> Edit
        </button>
      </div>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

/** Read-only summary of everything entered, with links back to each step. */
export function ReviewStep({ cvName, coverLetterName, onEdit }: { cvName?: string; coverLetterName?: string; onEdit: (step: number) => void }) {
  const v = useWatch({ control: useFormContext<ProfileFormValues>().control }) as ProfileFormValues
  const place = [v.location?.city, v.location?.country].filter(Boolean).join(', ')

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold tracking-[-.02em]">Check your details</h2>
      <Block title="About you" step={0} onEdit={onEdit}>
        <p className="font-semibold">{v.fullName}</p>
        <p className="text-foreground/65">{v.headline} · {v.totalYearsExperience ?? 0} years of experience</p>
        <p className="text-foreground/65">{[v.email, v.phone, place].filter(Boolean).join(' · ')}</p>
      </Block>
      <Block title="Skills and languages" step={1} onEdit={onEdit}>
        <p>{v.skills?.map((s) => (s.years != null ? `${s.name} (${s.years}y)` : s.name)).join(', ') || '—'}</p>
        {v.tools?.length > 0 && <p className="text-foreground/65">Tools: {v.tools.join(', ')}</p>}
        <p className="text-foreground/65">Languages: {v.languages?.map((l) => `${l.name} (${proficiencyLabel[l.proficiency]})`).join(', ')}</p>
      </Block>
      <Block title="Experience" step={2} onEdit={onEdit}>
        {v.workHistory?.length ? (
          <ul className="space-y-1">{v.workHistory.map((w, i) => <li key={i}>{w.role} at {w.company} <span className="text-foreground/55">({w.startDate} – {w.endDate || 'present'})</span></li>)}</ul>
        ) : (
          <p className="text-foreground/55">No roles added</p>
        )}
        {v.education?.length > 0 && <p className="mt-1 text-foreground/65">Education: {v.education.map((e) => [e.degree, e.field, e.institution].filter(Boolean).join(', ')).join('; ')}</p>}
      </Block>
      <Block title="CV and preferences" step={3} onEdit={onEdit}>
        <p>CV: <span className="font-semibold">{cvName ?? 'missing'}</span></p>
        {(v.coverLetterText || coverLetterName) && <p className="text-foreground/65">Cover letter: {[v.coverLetterText ? 'written' : null, coverLetterName].filter(Boolean).join(' + ')}</p>}
        <p className="text-foreground/65">
          {v.availability === 'immediately' ? 'Available immediately' : `Notice period: ${v.noticePeriodWeeks ?? '?'} weeks`}
          {v.workMode ? ` · Prefers ${workModeLabel[v.workMode].toLowerCase()}` : ''}
        </p>
        <p className="text-foreground/65">{v.visible ? 'Visible in company search (anonymized)' : 'Hidden from company search'}</p>
      </Block>
    </section>
  )
}
