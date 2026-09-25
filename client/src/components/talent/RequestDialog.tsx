import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { LogIn, Pencil, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Field, Input, Select, Spinner, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useMyJobs } from '@/hooks/useCompany'
import { useCreateRequest } from '@/hooks/useTalent'
import { saveRequestDraft } from '@/lib/requestDraft'
import { cn } from '@/lib/utils'
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
  })
  .refine((v) => v.jobId || v.roleTitle.trim(), { message: 'Choose one of your positions or enter a role title', path: ['roleTitle'] })

type Values = z.input<typeof schema>

/**
 * "Request to speak": the request goes to the AI101 team for review, never straight to the candidate.
 * - company: sends it. Companies not approved yet get it saved until they are.
 * - guest: the visitor fills in the same form; on Send it is saved on this device and they are asked
 *   to create a company account or log in, after which it is sent automatically.
 */
export function RequestDialog({ candidate, mode = 'company', onClose }: { candidate: AnonymizedCandidate; mode?: 'company' | 'guest'; onClose: () => void }) {
  const guest = mode === 'guest'
  const jobs = useMyJobs(!guest)
  const create = useCreateRequest()
  const t = useT(talentText).request
  const c = useT(common)
  const usableJobs = (jobs.data ?? []).filter((j) => j.status !== 'closed')
  const [timeCount, setTimeCount] = useState(2)
  const [step, setStep] = useState<'form' | 'account'>('form')
  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { jobId: '', roleTitle: '', message: '', times: [{ value: '' }, { value: '' }, { value: '' }] },
  })
  const jobId = useWatch({ control, name: 'jobId' })

  const onSubmit = handleSubmit((v) => {
    const payload = {
      candidateId: candidate.id,
      roleTitle: v.jobId ? undefined : v.roleTitle,
      message: v.message,
      proposedTimes: v.times.map((time) => new Date(time).toISOString()),
    }
    if (guest) {
      saveRequestDraft({ candidateId: candidate.id, applicantNumber: candidate.applicantNumber, roleTitle: v.roleTitle, message: v.message, proposedTimes: payload.proposedTimes })
      setStep('account')
      return
    }
    create.mutate(
      { ...payload, jobId: v.jobId || undefined },
      {
        onSuccess: (request) => {
          toast.success(request.status === 'awaiting_company_approval' ? t.savedPending : t.sent)
          onClose()
        },
      },
    )
  })

  /** Removes one time and shifts the later ones up, so no hidden value is submitted. */
  const removeTime = (index: number) => {
    const values = getValues('times').map((time) => time.value)
    values.splice(index, 1)
    setValue('times', [...values, '', '', ''].slice(0, 3).map((value) => ({ value })))
    setTimeCount((n) => n - 1)
  }

  const timesError = (errors.times as { message?: string; root?: { message?: string } } | undefined)
  const minTime = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16)
  // After registering or logging in, the visitor comes back to this profile; the draft is sent on the way.
  const next = encodeURIComponent(`/talent/${candidate.id}`)

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={step === 'account' ? t.accountTitle : t.title}
      description={<>{t.with} <span className="font-mono">{candidate.applicantNumber}</span> · {candidate.headline}</>}
      className="max-w-xl"
    >
      {step === 'account' ? (
        <div>
          <Alert variant="success">{t.draftSaved}</Alert>
          <p className="mt-4 text-sm leading-relaxed text-foreground/70">{t.accountText}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to={`/register?role=company&next=${next}`} className={cn(buttonVariants(), 'h-11 rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
              <UserPlus data-icon="inline-start" aria-hidden /> {t.createAccount}
            </Link>
            <Link to={`/login?next=${next}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-md')}>
              <LogIn data-icon="inline-start" aria-hidden /> {t.logIn}
            </Link>
            <button type="button" onClick={() => setStep('form')} className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand">
              <Pencil size={14} aria-hidden /> {t.editMessage}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex gap-2.5 rounded-md bg-brand-soft/60 p-3 text-sm">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden />
            <p>{t.intro}</p>
          </div>
          <form onSubmit={onSubmit} noValidate className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {!guest && (
              <Field label={t.position}>
                {(ids) => (
                  <Select {...ids} {...register('jobId')}>
                    <option value="">{t.otherRole}</option>
                    {usableJobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.status === 'pending' ? t.awaitingReview : ''}</option>)}
                  </Select>
                )}
              </Field>
            )}
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
            {create.error && <Alert variant="error">{create.error.message}</Alert>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{c.actions.cancel}</Button>
              <Button type="submit" disabled={create.isPending} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{create.isPending && <Spinner />} {t.submit}</Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}
