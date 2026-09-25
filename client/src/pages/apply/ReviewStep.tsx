import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Pencil } from 'lucide-react'
import type { ProfileFormValues } from '@/components/profile/ProfileSections'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { useT } from '@/i18n'
import { profileText } from '@/i18n/profile'
import { common } from '@/i18n/common'

function Block({ title, step, onEdit, children }: { title: string; step: number; onEdit: (step: number) => void; children: ReactNode }) {
  const t = useT(profileText).review
  return (
    <div className="border-b border-foreground/10 pb-5 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand" aria-label={t.editSection(title)}>
          <Pencil size={13} aria-hidden /> {t.edit}
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
  const t = useT(profileText).review
  const labels = useT(common)

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold tracking-[-.02em]">{t.title}</h2>
      <Block title={t.about} step={0} onEdit={onEdit}>
        <p className="font-semibold">{v.fullName}</p>
        <p className="text-foreground/65">{v.headline} · {t.yearsOfExperience(v.totalYearsExperience ?? 0)}</p>
        <p className="text-foreground/65">{[v.email, v.phone, place].filter(Boolean).join(' · ')}</p>
      </Block>
      <Block title={t.skillsAndLanguages} step={1} onEdit={onEdit}>
        <p>{v.skills?.map((s) => (s.years != null ? `${s.name} (${labels.yearsTiny(s.years)})` : s.name)).join(', ') || '—'}</p>
        {v.tools?.length > 0 && <p className="text-foreground/65">{t.tools} {v.tools.join(', ')}</p>}
        <p className="text-foreground/65">{t.languages} {v.languages?.map((l) => `${l.name} (${proficiencyLabel[l.proficiency]})`).join(', ')}</p>
      </Block>
      <Block title={t.experience} step={2} onEdit={onEdit}>
        {v.workHistory?.length ? (
          <ul className="space-y-1">{v.workHistory.map((w, i) => <li key={i}>{t.roleAt(w.role, w.company)} <span className="text-foreground/55">({w.startDate} – {w.endDate || t.present})</span></li>)}</ul>
        ) : (
          <p className="text-foreground/55">{t.noRoles}</p>
        )}
        {v.education?.length > 0 && <p className="mt-1 text-foreground/65">{t.education} {v.education.map((e) => [e.degree, e.field, e.institution].filter(Boolean).join(', ')).join('; ')}</p>}
      </Block>
      <Block title={t.cvAndPreferences} step={3} onEdit={onEdit}>
        <p>{t.cv} <span className="font-semibold">{cvName ?? t.missing}</span></p>
        {(v.coverLetterText || coverLetterName) && <p className="text-foreground/65">{t.coverLetter} {[v.coverLetterText ? t.written : null, coverLetterName].filter(Boolean).join(' + ')}</p>}
        <p className="text-foreground/65">
          {v.availability === 'immediately' ? t.immediately : t.notice(v.noticePeriodWeeks ?? '?')}
          {v.workMode ? t.prefers(workModeLabel[v.workMode]) : ''}
        </p>
        <p className="text-foreground/65">{v.visible ? t.visible : t.hidden}</p>
      </Block>
    </section>
  )
}
