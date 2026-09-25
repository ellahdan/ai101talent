import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Select, Spinner, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useMyJobs } from '@/hooks/useCompany'
import { useCreateRequest } from '@/hooks/useTalent'
import type { AnonymizedCandidate } from '@/types'
import { translateMessage, useT } from '@/i18n'
import { common } from '@/i18n/common'
import { talentText } from '@/i18n/talent'

// Mirrors createRequestSchema on the server (times are local datetime-local strings here).
const schema = z
  .object({
    jobId: z.string(),
    roleTitle: z.string().trim().max(140),
    message: z.string().trim().min(30, 'Tell the candidate a bit more (30+ characters)').max(5000),
    times: z
      .array(z.object({ value: z.string() }))
      .transform((t) => t.map((x) => x.value).filter(Boolean))
      .pipe(z.array(z.string().refine((v) => new Date(v).getTime() > Date.now(), 'Proposed times must be in the future')).min(1, 'Propose at least one interview time')),
    salaryMin: z.string(),
    salaryMax: z.string(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter code'),
  })
  .refine((v) => v.jobId || v.roleTitle.trim(), { message: 'Choose one of your positions or enter a role title', path: ['roleTitle'] })
  .refine((v) => !v.salaryMin || !v.salaryMax || Number(v.salaryMin) <= Number(v.salaryMax), { message: 'The minimum must not exceed the maximum', path: ['salaryMax'] })

type Values = z.input<typeof schema>

/** "Request to speak": the request goes to the AI101 team for review, never straight to the candidate. */
export function RequestDialog({ candidate, onClose }: { candidate: AnonymizedCandidate; onClose: () => void }) {
  const jobs = useMyJobs()
  const t = useT(talentText).request
  const c = useT(common)
  const create = useCreateRequest()
  const usableJobs = (jobs.data ?? []).filter((j) => j.status !== 'closed')
  const [timeCount, setTimeCount] = useState(2)
  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { jobId: '', roleTitle: '', message: '', times: [{ value: '' }, { value: '' }, { value: '' }], salaryMin: '', salaryMax: '', currency: 'EUR' },
  })
  const jobId = useWatch({ control, name: 'jobId' })

  // Prefill the salary from the chosen position.
  const onJobChange = (id: string) => {
    const job = usableJobs.find((j) => j.id === id)
    if (job?.salaryRange) {
      setValue('salaryMin', job.salaryRange.min != null ? String(job.salaryRange.min) : '')
      setValue('salaryMax', job.salaryRange.max != null ? String(job.salaryRange.max) : '')
      setValue('currency', job.salaryRange.currency)
    }
  }

  const onSubmit = handleSubmit((v) =>
    create.mutate(
      {
        candidateId: candidate.id,
        jobId: v.jobId || undefined,
        roleTitle: v.jobId ? undefined : v.roleTitle,
        message: v.message,
        proposedTimes: v.times.map((t) => new Date(t).toISOString()),
        salaryRange: v.salaryMin || v.salaryMax ? { min: v.salaryMin ? Number(v.salaryMin) : undefined, max: v.salaryMax ? Number(v.salaryMax) : undefined, currency: v.currency } : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t.sent)
          onClose()
        },
      },
    ),
  )

  /** Removes one time and shifts the later ones up, so no hidden value is submitted. */
  const removeTime = (index: number) => {
    const values = getValues('times').map((t) => t.value)
    values.splice(index, 1)
    setValue('times', [...values, '', '', ''].slice(0, 3).map((value) => ({ value })))
    setTimeCount((n) => n - 1)
  }

  const timesError = (errors.times as { message?: string; root?: { message?: string } } | undefined)
  const minTime = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16)

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.title} description={<>{t.with} <span className="font-mono">{candidate.applicantNumber}</span> · {candidate.headline}</>} className="max-w-xl">
      <div className="mb-5 flex gap-2.5 rounded-md bg-brand-soft/60 p-3 text-sm">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p>{t.intro}</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <Field label={t.position}>
          {(ids) => (
            <Select {...ids} {...register('jobId', { onChange: (e) => onJobChange(e.target.value) })}>
              <option value="">{t.otherRole}</option>
              {usableJobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.status === 'pending' ? t.awaitingReview : ''}</option>)}
            </Select>
          )}
        </Field>
        {!jobId && (
          <Field label={t.roleTitle} error={errors.roleTitle?.message}>
            {(ids) => <Input {...ids} placeholder={t.rolePlaceholder} {...register('roleTitle')} />}
          </Field>
        )}
        <Field label={t.message} error={errors.message?.message} hint={t.messageHint}>
          {(ids) => <Textarea {...ids} rows={5} {...register('message')} />}
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold">{t.times}</legend>
          <div className="mt-2 space-y-2">
            {Array.from({ length: timeCount }, (_, i) => (
              <div key={i} className="flex gap-2">
                <Input type="datetime-local" min={minTime} aria-label={t.time(i + 1)} className="h-10" {...register(`times.${i}.value`)} />
                {timeCount > 1 && (
                  <button type="button" aria-label={t.removeTime(i + 1)} onClick={() => removeTime(i)} className="grid size-10 shrink-0 place-items-center rounded-md text-foreground/50 hover:bg-muted"><Trash2 size={15} aria-hidden /></button>
                )}
              </div>
            ))}
          </div>
          {timeCount < 3 && <button type="button" onClick={() => setTimeCount((n) => n + 1)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand"><Plus size={14} aria-hidden /> {t.addTime}</button>}
          {(timesError?.message ?? timesError?.root?.message) && <p className="mt-1.5 text-xs font-medium text-destructive">{translateMessage(timesError?.message ?? timesError?.root?.message ?? '')}</p>}
        </fieldset>
        <div className="grid grid-cols-[1fr_1fr_90px] gap-3">
          <Field label={t.salaryFrom} optional>{(ids) => <Input {...ids} type="number" min={0} className="h-10" {...register('salaryMin')} />}</Field>
          <Field label={t.salaryTo} optional error={errors.salaryMax?.message}>{(ids) => <Input {...ids} type="number" min={0} className="h-10" {...register('salaryMax')} />}</Field>
          <Field label={t.currency} error={errors.currency?.message}>{(ids) => <Input {...ids} maxLength={3} className="h-10 uppercase" {...register('currency')} />}</Field>
        </div>
        {create.error && <Alert variant="error">{create.error.message}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{c.actions.cancel}</Button>
          <Button type="submit" disabled={create.isPending} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{create.isPending && <Spinner />} {t.submit}</Button>
        </div>
      </form>
    </Modal>
  )
}
