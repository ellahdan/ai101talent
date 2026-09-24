import type { ReactNode } from 'react'
import { useFieldArray, useFormContext, useWatch, type FieldErrors } from 'react-hook-form'
import { Plus, Trash2, X } from 'lucide-react'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { ComboboxInput, TagInput } from '@/components/ui/tag-input'
import { Switch } from '@/components/ui/switch'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { AVAILABILITIES, PROFICIENCIES, WORK_MODES, type Availability, type Proficiency, type WorkMode } from '@/types'

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
  return node?.message ?? node?.root?.message
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
  return (
    <Section title="About you" description="Companies never see your name or contact details unless you accept an introduction.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errorAt(errors, 'fullName')}>
          {(ids) => <Input {...ids} autoComplete="name" {...register('fullName')} />}
        </Field>
        <Field label="Email" error={errorAt(errors, 'email')} hint={emailLocked ? 'Your account email. You can change your contact email later.' : undefined}>
          {(ids) => <Input {...ids} type="email" autoComplete="email" readOnly={emailLocked} {...register('email')} />}
        </Field>
        <Field label="Phone" optional error={errorAt(errors, 'phone')}>
          {(ids) => <Input {...ids} type="tel" autoComplete="tel" {...register('phone')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" error={errorAt(errors, 'location.country')}>
            {(ids) => <Input {...ids} autoComplete="country-name" {...register('location.country')} />}
          </Field>
          <Field label="City" optional error={errorAt(errors, 'location.city')}>
            {(ids) => <Input {...ids} autoComplete="address-level2" {...register('location.city')} />}
          </Field>
        </div>
        <Field label="LinkedIn" optional error={errorAt(errors, 'links.linkedin')}>
          {(ids) => <Input {...ids} type="url" inputMode="url" placeholder="linkedin.com/in/you" {...register('links.linkedin')} />}
        </Field>
        <Field label="Portfolio or website" optional error={errorAt(errors, 'links.portfolio')}>
          {(ids) => <Input {...ids} type="url" inputMode="url" placeholder="yourname.com" {...register('links.portfolio')} />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
        <Field label="Headline / current role" error={errorAt(errors, 'headline')} hint='For example "Senior Frontend Engineer" or "Data Analyst, French and English".'>
          {(ids) => <Input {...ids} {...register('headline')} />}
        </Field>
        <Field label="Years of experience" error={errorAt(errors, 'totalYearsExperience')}>
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

  return (
    <Section title="Skills and languages" description="These are what companies search for. Add your strongest skills first.">
      <div className="space-y-2.5">
        <p className="text-sm font-semibold" id="skills-label">Skills</p>
        <ComboboxInput type="skills" exclude={skillNames} onAdd={(name) => skills.append({ name, years: undefined })} placeholder="Type a skill, e.g. React, then press Enter" aria-describedby="skills-label" aria-invalid={skillsError ? true : undefined} />
        {skills.fields.length > 0 && (
          <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/12">
            {skills.fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
                <label className="flex items-center gap-2 text-xs text-foreground/60">
                  Years
                  <Input type="number" min={0} max={60} inputMode="numeric" aria-label={`Years of experience with ${f.name}`} className="h-9 w-20" {...register(`skills.${i}.years`, { setValueAs: toNumber })} />
                </label>
                <button type="button" onClick={() => skills.remove(i)} aria-label={`Remove ${f.name}`} className="grid size-8 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
                  <X size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={skillsError ? 'text-xs font-medium text-destructive' : 'text-xs text-foreground/55'}>{skillsError ?? 'Years per skill are optional but help companies find you.'}</p>
      </div>

      <Field label="Tools and technologies" optional error={errorAt(errors, 'tools')}>
        {(ids) => <TagInput {...ids} type="tools" value={tools} onChange={(v) => setValue('tools', v, { shouldDirty: true, shouldValidate: true })} placeholder="e.g. Figma, Docker, Jira" />}
      </Field>

      <div className="space-y-2.5">
        <p className="text-sm font-semibold">Languages</p>
        <datalist id="common-languages">{COMMON_LANGUAGES.map((l) => <option key={l} value={l} />)}</datalist>
        {languages.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_170px_auto] items-start gap-2">
            <Input list="common-languages" aria-label={`Language ${i + 1}`} aria-invalid={errorAt(errors, `languages.${i}.name`) ? true : undefined} {...register(`languages.${i}.name`)} />
            <Select aria-label={`Proficiency for language ${i + 1}`} {...register(`languages.${i}.proficiency`)}>
              {PROFICIENCIES.map((p) => <option key={p} value={p}>{proficiencyLabel[p]}</option>)}
            </Select>
            <button type="button" onClick={() => languages.remove(i)} aria-label={`Remove language ${i + 1}`} className="grid size-11 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ))}
        {errorAt(errors, 'languages') && <p className="text-xs font-medium text-destructive">{errorAt(errors, 'languages')}</p>}
        <AddButton onClick={() => languages.append({ name: '', proficiency: 'conversational' })}>Add a language</AddButton>
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

  return (
    <Section title="Experience" description="Your most recent roles are the most useful. Both sections are optional.">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Work history</p>
        {work.fields.map((f, i) => {
          const current = !workValues[i]?.endDate
          return (
            <fieldset key={f.id} className="space-y-4 rounded-md border border-foreground/12 p-4">
              <legend className="sr-only">Role {i + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company" error={errorAt(errors, `workHistory.${i}.company`)}>
                  {(ids) => <Input {...ids} {...register(`workHistory.${i}.company`)} />}
                </Field>
                <Field label="Role" error={errorAt(errors, `workHistory.${i}.role`)}>
                  {(ids) => <Input {...ids} {...register(`workHistory.${i}.role`)} />}
                </Field>
                <Field label="Start" error={errorAt(errors, `workHistory.${i}.startDate`)}>
                  {(ids) => <Input {...ids} type="month" {...register(`workHistory.${i}.startDate`)} />}
                </Field>
                <Field label="End" error={errorAt(errors, `workHistory.${i}.endDate`)} hint="Leave empty if this is your current role.">
                  {(ids) => <Input {...ids} type="month" {...register(`workHistory.${i}.endDate`, { setValueAs: toOptional })} />}
                </Field>
              </div>
              <Field label="What did you do?" optional error={errorAt(errors, `workHistory.${i}.description`)}>
                {(ids) => <Textarea {...ids} rows={3} placeholder="Key responsibilities and results" {...register(`workHistory.${i}.description`)} />}
              </Field>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/55">{current ? 'Current role' : ''}</span>
                <button type="button" onClick={() => work.remove(i)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <Trash2 size={14} aria-hidden /> Remove role
                </button>
              </div>
            </fieldset>
          )
        })}
        <AddButton onClick={() => work.append({ company: '', role: '', startDate: '', endDate: undefined, description: '' })}>Add a role</AddButton>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Education</p>
        {education.fields.map((f, i) => (
          <fieldset key={f.id} className="grid gap-4 rounded-md border border-foreground/12 p-4 sm:grid-cols-2">
            <legend className="sr-only">Education {i + 1}</legend>
            <Field label="School or university" error={errorAt(errors, `education.${i}.institution`)}>
              {(ids) => <Input {...ids} {...register(`education.${i}.institution`)} />}
            </Field>
            <Field label="Degree" optional>
              {(ids) => <Input {...ids} placeholder="e.g. BSc" {...register(`education.${i}.degree`)} />}
            </Field>
            <Field label="Field of study" optional>
              {(ids) => <Input {...ids} {...register(`education.${i}.field`)} />}
            </Field>
            <div className="flex items-end gap-3">
              <Field label="Year" optional className="flex-1" error={errorAt(errors, `education.${i}.year`)}>
                {(ids) => <Input {...ids} type="number" min={1950} max={2100} {...register(`education.${i}.year`, { setValueAs: toNumber })} />}
              </Field>
              <button type="button" onClick={() => education.remove(i)} aria-label={`Remove education ${i + 1}`} className="grid size-11 place-items-center rounded-md text-destructive hover:bg-muted">
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </fieldset>
        ))}
        <AddButton onClick={() => education.append({ institution: '', degree: '', field: '', year: undefined })}>Add education</AddButton>
      </div>
    </Section>
  )
}

// ---- Availability & visibility ------------------------------------------------------------------------

export function PreferencesSection() {
  const { control, register, setValue, formState: { errors } } = useFormContext<ProfileFormValues>()
  const availability = useWatch({ control, name: 'availability' })
  const visible = useWatch({ control, name: 'visible' })

  return (
    <Section title="Availability and visibility">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Availability" error={errorAt(errors, 'availability')}>
          {(ids) => (
            <Select {...ids} {...register('availability')}>
              {AVAILABILITIES.map((a) => <option key={a} value={a}>{a === 'immediately' ? 'Immediately' : 'After a notice period'}</option>)}
            </Select>
          )}
        </Field>
        {availability === 'notice_period' && (
          <Field label="Notice period (weeks)" error={errorAt(errors, 'noticePeriodWeeks')}>
            {(ids) => <Input {...ids} type="number" min={0} max={52} {...register('noticePeriodWeeks', { setValueAs: toNumber })} />}
          </Field>
        )}
        <Field label="Preferred work mode" optional error={errorAt(errors, 'workMode')}>
          {(ids) => (
            <Select {...ids} {...register('workMode', { setValueAs: toOptional })}>
              <option value="">No preference</option>
              {WORK_MODES.map((m) => <option key={m} value={m}>{workModeLabel[m]}</option>)}
            </Select>
          )}
        </Field>
      </div>
      <div className="rounded-md border border-foreground/12 p-4">
        <Switch
          checked={visible}
          onChange={(v) => setValue('visible', v, { shouldDirty: true })}
          label="Visible in company search"
          description={visible ? 'Approved companies can find your anonymized profile and ask our team for an introduction.' : 'Your profile is only used for positions you apply to.'}
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
