import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Select, Spinner } from '@/components/ui/form'
import { RichTextEditor } from '@/components/ui/rich-text'
import { Switch } from '@/components/ui/switch'
import { TagInput } from '@/components/ui/tag-input'
import { contractTypeLabel, proficiencyLabel, seniorityLabel, workModeLabel } from '@/lib/format'
import { adminJobSchema, jobInputSchema, type JobFormValues } from '@/lib/validation/job'
import { CONTRACT_TYPES, COVER_LETTER_POLICIES, PROFICIENCIES, SENIORITIES, WORK_MODES, type CoverLetterPolicy, type ManagedJob } from '@/types'

export const emptyJob: JobFormValues = {
  title: '',
  description: '',
  location: '',
  workMode: 'hybrid',
  contractType: 'full-time',
  seniority: 'mid',
  requiredSkills: [],
  niceToHaveSkills: [],
  languages: [{ name: 'English', proficiency: 'fluent' }],
  salaryRange: { min: undefined, max: undefined, currency: 'EUR' },
  coverLetterPolicy: 'optional',
  companyId: '',
  featured: false,
}

export const jobToForm = (j: ManagedJob): JobFormValues => ({
  title: j.title,
  description: j.description,
  location: j.location,
  workMode: j.workMode,
  contractType: j.contractType,
  seniority: j.seniority,
  requiredSkills: j.requiredSkills,
  niceToHaveSkills: j.niceToHaveSkills,
  languages: j.languages,
  salaryRange: { min: j.salaryRange?.min, max: j.salaryRange?.max, currency: j.salaryRange?.currency ?? 'EUR' },
  coverLetterPolicy: j.coverLetterPolicy,
  companyId: j.company.id,
  featured: j.featured,
})

const policyText: Record<CoverLetterPolicy, [string, string]> = {
  optional: ['Optional', 'Candidates may add one'],
  required: ['Required', 'Candidates must write or upload one'],
  none: ['Not needed', 'The cover letter field is hidden'],
}

interface JobFormProps {
  defaultValues: JobFormValues
  onSubmit: (values: JobFormValues) => void
  submitting: boolean
  error?: string | null
  submitLabel: string
  /** Admin mode adds the company picker and the featured switch. */
  companies?: { id: string; name: string }[]
  footerNote?: ReactNode
}

export function JobForm({ defaultValues, onSubmit, submitting, error, submitLabel, companies, footerNote }: JobFormProps) {
  const admin = Boolean(companies)
  const { register, control, handleSubmit, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(admin ? adminJobSchema : jobInputSchema) as unknown as Resolver<JobFormValues>,
    defaultValues,
  })
  const languages = useFieldArray({ control, name: 'languages' })
  const arrayError = (e: unknown) => (e as { message?: string; root?: { message?: string } } | undefined)?.message ?? (e as { root?: { message?: string } } | undefined)?.root?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card title="The role">
        {admin && (
          <Field label="Company" error={errors.companyId?.message}>
            {(ids) => (
              <Select {...ids} {...register('companyId')}>
                <option value="">Choose a company</option>
                {companies!.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label="Job title" error={errors.title?.message}>
          {(ids) => <Input {...ids} placeholder="e.g. Senior Frontend Engineer" {...register('title')} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location" error={errors.location?.message}>
            {(ids) => <Input {...ids} placeholder='e.g. "Lisbon, Portugal" or "Remote (EU)"' {...register('location')} />}
          </Field>
          <Field label="Work mode">
            {(ids) => <Select {...ids} {...register('workMode')}>{WORK_MODES.map((m) => <option key={m} value={m}>{workModeLabel[m]}</option>)}</Select>}
          </Field>
          <Field label="Contract type">
            {(ids) => <Select {...ids} {...register('contractType')}>{CONTRACT_TYPES.map((c) => <option key={c} value={c}>{contractTypeLabel[c]}</option>)}</Select>}
          </Field>
          <Field label="Seniority">
            {(ids) => <Select {...ids} {...register('seniority')}>{SENIORITIES.map((s) => <option key={s} value={s}>{seniorityLabel[s]}</option>)}</Select>}
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message} hint="What the person will do, what you're looking for, and anything that makes the role special.">
          {(ids) => (
            <Controller control={control} name="description" render={({ field }) => <RichTextEditor {...ids} value={field.value} onChange={field.onChange} placeholder="Describe the role…" />} />
          )}
        </Field>
      </Card>

      <Card title="Skills and languages">
        <Field label="Required skills" error={arrayError(errors.requiredSkills)} hint="Candidates are matched on these first.">
          {(ids) => <Controller control={control} name="requiredSkills" render={({ field }) => <TagInput {...ids} type="skills" value={field.value} onChange={field.onChange} placeholder="Type a skill and press Enter" />} />}
        </Field>
        <Field label="Nice-to-have skills" optional error={arrayError(errors.niceToHaveSkills)}>
          {(ids) => <Controller control={control} name="niceToHaveSkills" render={({ field }) => <TagInput {...ids} type="skills" value={field.value} onChange={field.onChange} placeholder="Type a skill and press Enter" />} />}
        </Field>
        <div className="space-y-2.5">
          <p className="text-sm font-semibold">Languages</p>
          {languages.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_170px_auto] items-start gap-2">
              <Input aria-label={`Language ${i + 1}`} aria-invalid={errors.languages?.[i]?.name ? true : undefined} {...register(`languages.${i}.name`)} />
              <Select aria-label={`Required level for language ${i + 1}`} {...register(`languages.${i}.proficiency`)}>
                {PROFICIENCIES.map((p) => <option key={p} value={p}>{proficiencyLabel[p]}</option>)}
              </Select>
              <button type="button" onClick={() => languages.remove(i)} aria-label={`Remove language ${i + 1}`} className="grid size-11 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => languages.append({ name: '', proficiency: 'conversational' })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            <Plus size={15} aria-hidden /> Add a language
          </button>
        </div>
      </Card>

      <Card title="Salary and application">
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_120px]">
          <Field label="Salary from" optional error={errors.salaryRange?.min?.message}>
            {(ids) => <Input {...ids} type="number" min={0} inputMode="numeric" {...register('salaryRange.min', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />}
          </Field>
          <Field label="Salary to" optional error={errors.salaryRange?.max?.message}>
            {(ids) => <Input {...ids} type="number" min={0} inputMode="numeric" {...register('salaryRange.max', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })} />}
          </Field>
          <Field label="Currency" error={errors.salaryRange?.currency?.message}>
            {(ids) => <Input {...ids} maxLength={3} className="uppercase" {...register('salaryRange.currency')} />}
          </Field>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Cover letter</legend>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
            {COVER_LETTER_POLICIES.map((p) => (
              <label key={p} className="flex cursor-pointer gap-3 rounded-md border border-foreground/15 p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/60">
                <input type="radio" value={p} className="mt-1 accent-brand" {...register('coverLetterPolicy')} />
                <span>
                  <span className="block text-sm font-semibold">{policyText[p][0]}</span>
                  <span className="block text-xs text-foreground/60">{policyText[p][1]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {admin && (
          <Controller
            control={control}
            name="featured"
            render={({ field }) => <Switch checked={Boolean(field.value)} onChange={field.onChange} label="Featured on the landing page" description="Featured positions appear first in listings and in the landing page carousel." />}
          />
        )}
      </Card>

      {Object.keys(errors).length > 0 && <Alert variant="error">Some fields need your attention.</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap items-center justify-end gap-4">
        {footerNote && <p className="mr-auto text-sm text-foreground/60">{footerNote}</p>}
        <Button type="submit" disabled={submitting} className="h-11 rounded-md bg-brand px-6 text-brand-foreground hover:bg-brand-hover">
          {submitting && <Spinner />} {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">
      <h2 className="text-lg font-semibold tracking-[-.02em]">{title}</h2>
      {children}
    </section>
  )
}
