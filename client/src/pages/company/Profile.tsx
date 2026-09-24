import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { z } from 'zod'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Select, Spinner, Textarea } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMyCompany, useUpdateCompany } from '@/hooks/useCompany'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { companyDetailsSchema } from '@/lib/validation/auth'
import { COMPANY_SIZES, type CompanyProfile as Company } from '@/types'

type Values = z.input<typeof companyDetailsSchema>

const toForm = (c: Company): Values => ({
  name: c.name,
  website: c.website ?? '',
  industry: c.industry ?? '',
  size: c.size,
  description: c.description ?? '',
  contactPerson: { name: c.contactPerson.name, title: c.contactPerson.title ?? '', phone: c.contactPerson.phone ?? '' },
})

export default function CompanyProfile() {
  useDocumentTitle('Company profile')
  const { data, isPending, error } = useMyCompany()
  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error) return <Alert variant="error">{error.message}</Alert>
  return <ProfileForm company={data} />
}

function ProfileForm({ company }: { company: Company }) {
  const update = useUpdateCompany()
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values, unknown, z.output<typeof companyDetailsSchema>>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: toForm(company),
  })
  useEffect(() => reset(toForm(company)), [company, reset])
  const e = errors

  return (
    <>
      <PageHeader title="Company profile" description={<>Login email: <strong className="text-foreground">{company.email}</strong></>} actions={<StatusBadge status={company.status} />} />
      <form onSubmit={handleSubmit((v) => update.mutate(v, { onSuccess: () => toast.success('Company profile saved') }))} noValidate className="space-y-6 rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">
        {update.error && <Alert variant="error">{update.error.message}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company name" error={e.name?.message}>{(ids) => <Input {...ids} {...register('name')} />}</Field>
          <Field label="Website" optional error={e.website?.message}>{(ids) => <Input {...ids} type="url" {...register('website')} />}</Field>
          <Field label="Industry" optional error={e.industry?.message}>{(ids) => <Input {...ids} {...register('industry')} />}</Field>
          <Field label="Company size" optional>
            {(ids) => (
              <Select {...ids} {...register('size', { setValueAs: (v) => v || undefined })}>
                <option value="">Select size</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="About the company" optional error={e.description?.message} hint="Shown to candidates on your job postings and in introductions.">
          {(ids) => <Textarea {...ids} rows={4} {...register('description')} />}
        </Field>
        <fieldset className="grid gap-5 sm:grid-cols-3">
          <legend className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Contact person</legend>
          <Field label="Full name" error={e.contactPerson?.name?.message}>{(ids) => <Input {...ids} {...register('contactPerson.name')} />}</Field>
          <Field label="Job title" optional>{(ids) => <Input {...ids} {...register('contactPerson.title')} />}</Field>
          <Field label="Phone" optional>{(ids) => <Input {...ids} type="tel" {...register('contactPerson.phone')} />}</Field>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || update.isPending} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{update.isPending && <Spinner />} Save changes</Button>
        </div>
      </form>
    </>
  )
}
