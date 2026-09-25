import type { ReactNode } from 'react'
import { useFieldArray, useFormContext, useWatch, type FieldErrors } from 'react-hook-form'
import { Plus, Trash2, X } from 'lucide-react'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { ComboboxInput, TagInput } from '@/components/ui/tag-input'
import { Switch } from '@/components/ui/switch'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { AVAILABILITIES, PROFICIENCIES, WORK_MODES, type Availability, type Proficiency, type WorkMode } from '@/types'
import { translateMessage, useT } from '@/i18n'
import { profileText } from '@/i18n/profile'

/** Raw form values (numbers may be empty while editing). Validated by profileSchema on submit. */
export interface ProfileFormValues {
  fullName: string
  email: string
  phone?: string
  location: { country: string; city?: string }
  links: { linkedin?: string; portfolio?: string }
  headline: string
  totalYearsExperience?: number
  skills: { name: string; years?: number }[]
  tools: string[]
  languages: { name: string; proficiency: Proficiency }[]
  workHistory: { company: string; role: string; startDate: string; endDate?: string; description?: string }[]
  education: { institution: string; degree?: string; field?: string; year?: number }[]
  availability: Availability
  noticePeriodWeeks?: number
  workMode?: WorkMode
  visible: boolean
  coverLetterText?: string
}

export const emptyProfile: ProfileFormValues = {
  fullName: '',
  email: '',
  phone: '',
  location: { country: '', city: '' },
  links: { linkedin: '', portfolio: '' },
  headline: '',
  totalYearsExperience: undefined,
  skills: [],
  tools: [],
  languages: [{ name: 'English', proficiency: 'fluent' }],
  workHistory: [],
  education: [],
  availability: 'immediately',
  noticePeriodWeeks: undefined,
  workMode: undefined,
  visible: true,
  coverLetterText: '',
}

/** Field paths validated at each step of the apply form. */
export const STEP_FIELDS = {
  basics: ['fullName', 'email', 'phone', 'location', 'links', 'headline', 'totalYearsExperience'],
  skills: ['skills', 'tools', 'languages'],
  experience: ['workHistory', 'education'],
  preferences: ['availability', 'noticePeriodWeeks', 'workMode', 'visible', 'coverLetterText'],
} as const

const toNumber = (v: unknown) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v))
const toOptional = (v: unknown) => (v === '' ? undefined : v)

/** Reads a nested error message, including array-level errors (e.g. "Add at least one skill"). */
function errorAt(errors: FieldErrors, path: string): string | undefined {
  const node = path.split('.').reduce<any>((acc, key) => acc?.[key], errors)
  const message: string | undefined = node?.message ?? node?.root?.message
  return message && translateMessage(message)
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-[-.02em]">{title}</h2>
        {description && <p className="mt-1 text-sm text-foreground/60">{description}</p>}
      </div>
      {children}
    </section>
  )
}

// ---- Basics ---------------------------------------------------------------------------

export function BasicsSection({ emailLocked }: { emailLocked?: boolean }) {
  const { register, formState: { errors } } = useFormContext<ProfileFormValues>()
  const t = useT(profileText).basics
  return (
    <Section title={t.title} description={t.description}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.fullName} error={errorAt(errors, 'fullName')}>
          {(ids) => <Input {...ids} autoComplete="name" {...register('fullName')} />}
        </Field>
        <Field label={t.email} error={errorAt(errors, 'email')} hint={emailLocked ? t.emailLocked : undefined}>
          {(ids) => <Input {...ids} type="email" autoComplete="email" readOnly={emailLocked} {...register('email')} />}
        </Field>
        <Field label={t.phone} optional error={errorAt(errors, 'phone')}>
          {(ids) => <Input {...ids} type="tel" autoComplete="tel" {...register('phone')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.country} error={errorAt(errors, 'location.country')}>
            {(ids) => <Input {...ids} autoComplete="country-name" {...register('location.country')} />}
          </Field>
          <Field label={t.city} optional error={errorAt(errors, 'location.city')}>
            {(ids) => <Input {...ids} autoComplete="address-level2" {...register('location.city')} />}
          </Field>
        </div>
        <Field label={t.linkedin} optional error={errorAt(errors, 'links.linkedin')}>
          {(ids) => <Input {...ids} type="url" inputMode="url" placeholder="linkedin.com/in/you" {...register('links.linkedin')} />}
        </Field>
        <Field label={t.portfolio} optional error={errorAt(errors, 'links.portfolio')}>
          {(ids) => <Input {...ids} type="url" inputMode="url" placeholder="yourname.com" {...register('links.portfolio')} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
        <Field label={t.headline} error={errorAt(errors, 'headline')} hint={t.headlineHint}>
          {(ids) => <Input {...ids} {...register('headline')} />}
        </Field>
        <Field label={t.years} error={errorAt(errors, 'totalYearsExperience')}>
          {(ids) => <Input {...ids} type="number" inputMode="numeric" min={0} max={60} {...register('totalYearsExperience', { setValueAs: toNumber })} />}
        </Field>
      </div>
    </Section>
  )
}

// ---- Skills, tools, languages ------------------------------------------------------------

const COMMON_LANGUAGES = ['English', 'French', 'Spanish', 'German', 'Portuguese', 'Italian', 'Dutch', 'Arabic', 'Swahili', 'Hindi', 'Mandarin', 'Japanese', 'Polish', 'Swedish', 'Yoruba', 'Hausa', 'Igbo', 'Wolof', 'Turkish', 'Russian']

export function SkillsSection() {
  const { control, register, setValue, formState: { errors } } = useFormContext<ProfileFormValues>()
  const skills = useFieldArray({ control, name: 'skills' })
  const languages = useFieldArray({ control, name: 'languages' })
  const tools = useWatch({ control, name: 'tools' }) ?? []
  const skillNames = (useWatch({ control, name: 'skills' }) ?? []).map((s) => s.name)
  const skillsError = errorAt(errors, 'skills')
  const t = useT(profileText).skills

  return (
    <Section title={t.title} description={t.description}>
      <div className="space-y-2.5">
        <p className="text-sm font-semibold" id="skills-label">{t.skills}</p>
        <ComboboxInput type="skills" exclude={skillNames} onAdd={(name) => skills.append({ name, years: undefined })} placeholder={t.placeholder} aria-describedby="skills-label" aria-invalid={skillsError ? true : undefined} />
        {skills.fields.length > 0 && (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/12">
            {skills.fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
                <label className="flex items-center gap-2 text-xs text-foreground/60">
                  {t.years}
                  <Input type="number" min={0} max={60} inputMode="numeric" aria-label={t.yearsWith(f.name)} className="h-9 w-20" {...register(`skills.${i}.years`, { setValueAs: toNumber })} />
                </label>
                <button type="button" onClick={() => skills.remove(i)} aria-label={t.remove(f.name)} className="grid size-8 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
                  <X size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={skillsError ? 'text-xs font-medium text-destructive' : 'text-xs text-foreground/55'}>{skillsError ?? t.yearsHint}</p>
      </div>

      <Field label={t.tools} optional error={errorAt(errors, 'tools')}>
        {(ids) => <TagInput {...ids} type="tools" value={tools} onChange={(v) => setValue('tools', v, { shouldDirty: true, shouldValidate: true })} placeholder={t.toolsPlaceholder} />}
      </Field>

      <div className="space-y-2.5">
        <p className="text-sm font-semibold">{t.languages}</p>
        <datalist id="common-languages">{COMMON_LANGUAGES.map((l) => <option key={l} value={l} />)}</datalist>
        {languages.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_170px_auto] items-start gap-2">
            <Input list="common-languages" aria-label={t.language(i + 1)} aria-invalid={errorAt(errors, `languages.${i}.name`) ? true : undefined} {...register(`languages.${i}.name`)} />
            <Select aria-label={t.proficiency(i + 1)} {...register(`languages.${i}.proficiency`)}>
              {PROFICIENCIES.map((p) => <option key={p} value={p}>{proficiencyLabel[p]}</option>)}
            </Select>
            <button type="button" onClick={() => languages.remove(i)} aria-label={t.removeLanguage(i + 1)} className="grid size-11 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ))}
        {errorAt(errors, 'languages') && <p className="text-xs font-medium text-destructive">{errorAt(errors, 'languages')}</p>}
        <AddButton onClick={() => languages.append({ name: '', proficiency: 'conversational' })}>{t.addLanguage}</AddButton>
      </div>
    </Section>
  )
}

// ---- Work history & education ----------------------------------------------------------------

export function ExperienceSection() {
  const { control, register, formState: { errors } } = useFormContext<ProfileFormValues>()
  const work = useFieldArray({ control, name: 'workHistory' })
  const education = useFieldArray({ control, name: 'education' })
  const workValues = useWatch({ control, name: 'workHistory' }) ?? []
  const t = useT(profileText).experience

  return (
    <Section title={t.title} description={t.description}>
      <div className="space-y-3">
        <p className="text-sm font-semibold">{t.work}</p>
        {work.fields.map((f, i) => {
          const current = !workValues[i]?.endDate
          return (
            <fieldset key={f.id} className="space-y-4 rounded-md border border-foreground/12 p-4">
              <legend className="sr-only">{t.role(i + 1)}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.company} error={errorAt(errors, `workHistory.${i}.company`)}>
                  {(ids) => <Input {...ids} {...register(`workHistory.${i}.company`)} />}
                </Field>
                <Field label={t.roleLabel} error={errorAt(errors, `workHistory.${i}.role`)}>
                  {(ids) => <Input {...ids} {...register(`workHistory.${i}.role`)} />}
                </Field>
                <Field label={t.start} error={errorAt(errors, `workHistory.${i}.startDate`)}>
                  {(ids) => <Input {...ids} type="month" {...register(`workHistory.${i}.startDate`)} />}
                </Field>
                <Field label={t.end} error={errorAt(errors, `workHistory.${i}.endDate`)} hint={t.endHint}>
                  {(ids) => <Input {...ids} type="month" {...register(`workHistory.${i}.endDate`, { setValueAs: toOptional })} />}
                </Field>
              </div>
              <Field label={t.whatDidYouDo} optional error={errorAt(errors, `workHistory.${i}.description`)}>
                {(ids) => <Textarea {...ids} rows={3} placeholder={t.whatPlaceholder} {...register(`workHistory.${i}.description`)} />}
              </Field>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/55">{current ? t.current : ''}</span>
                <button type="button" onClick={() => work.remove(i)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <Trash2 size={14} aria-hidden /> {t.removeRole}
                </button>
              </div>
            </fieldset>
          )
        })}
        <AddButton onClick={() => work.append({ company: '', role: '', startDate: '', endDate: undefined, description: '' })}>{t.addRole}</AddButton>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t.education}</p>
        {education.fields.map((f, i) => (
          <fieldset key={f.id} className="grid gap-4 rounded-md border border-foreground/12 p-4 sm:grid-cols-2">
            <legend className="sr-only">{t.educationN(i + 1)}</legend>
            <Field label={t.school} error={errorAt(errors, `education.${i}.institution`)}>
              {(ids) => <Input {...ids} {...register(`education.${i}.institution`)} />}
            </Field>
            <Field label={t.degree} optional>
              {(ids) => <Input {...ids} placeholder={t.degreePlaceholder} {...register(`education.${i}.degree`)} />}
            </Field>
            <Field label={t.field} optional>
              {(ids) => <Input {...ids} {...register(`education.${i}.field`)} />}
            </Field>
            <div className="flex items-end gap-3">
              <Field label={t.year} optional className="flex-1" error={errorAt(errors, `education.${i}.year`)}>
                {(ids) => <Input {...ids} type="number" min={1950} max={2100} {...register(`education.${i}.year`, { setValueAs: toNumber })} />}
              </Field>
              <button type="button" onClick={() => education.remove(i)} aria-label={t.removeEducation(i + 1)} className="grid size-11 place-items-center rounded-md text-destructive hover:bg-muted">
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </fieldset>
        ))}
        <AddButton onClick={() => education.append({ institution: '', degree: '', field: '', year: undefined })}>{t.addEducation}</AddButton>
      </div>
    </Section>
  )
}

// ---- Availability & visibility ------------------------------------------------------------------------

export function PreferencesSection() {
  const { control, register, setValue, formState: { errors } } = useFormContext<ProfileFormValues>()
  const availability = useWatch({ control, name: 'availability' })
  const visible = useWatch({ control, name: 'visible' })
  const t = useT(profileText).preferences

  return (
    <Section title={t.title}>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t.availability} error={errorAt(errors, 'availability')}>
          {(ids) => (
            <Select {...ids} {...register('availability')}>
              {AVAILABILITIES.map((a) => <option key={a} value={a}>{a === 'immediately' ? t.immediately : t.afterNotice}</option>)}
            </Select>
          )}
        </Field>
        {availability === 'notice_period' && (
          <Field label={t.noticeWeeks} error={errorAt(errors, 'noticePeriodWeeks')}>
            {(ids) => <Input {...ids} type="number" min={0} max={52} {...register('noticePeriodWeeks', { setValueAs: toNumber })} />}
          </Field>
        )}
        <Field label={t.workMode} optional error={errorAt(errors, 'workMode')}>
          {(ids) => (
            <Select {...ids} {...register('workMode', { setValueAs: toOptional })}>
              <option value="">{t.noPreference}</option>
              {WORK_MODES.map((m) => <option key={m} value={m}>{workModeLabel[m]}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <div className="rounded-md border border-foreground/12 p-4">
        <Switch
          checked={visible}
          onChange={(v) => setValue('visible', v, { shouldDirty: true })}
          label={t.visible}
          description={visible ? t.visibleOn : t.visibleOff}
        />
      </div>
    </Section>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
      <Plus size={15} aria-hidden /> {children}
    </button>
  )
}
