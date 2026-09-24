import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { FormProvider, useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, History } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Alert, Field, PasswordInput, Spinner, Textarea } from '@/components/ui/form'
import { FileDrop } from '@/components/ui/file-drop'
import { BasicsSection, emptyProfile, ExperienceSection, PreferencesSection, SkillsSection, STEP_FIELDS, type ProfileFormValues } from '@/components/profile/ProfileSections'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { passwordSchema } from '@/lib/validation/auth'
import { profileSchema } from '@/lib/validation/candidate'
import { candidateKeys, multipart } from '@/hooks/useCandidate'
import { meQueryKey, useMe } from '@/hooks/useAuth'
import { useJob } from '@/hooks/useJobs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { ApplySubmitResult, CoverLetterPolicy, JobDetail } from '@/types'
import { Confirmation } from './Confirmation'
import { QuickApply } from './QuickApply'
import { ReviewStep } from './ReviewStep'

const DRAFT_KEY = 'ai101-apply-draft'
const STEPS = [
  { key: 'basics', label: 'About you' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'documents', label: 'CV & preferences' },
  { key: 'review', label: 'Review' },
] as const

type FormValues = ProfileFormValues & { consent: boolean; password?: string }
const formSchema = profileSchema.extend({ consent: z.boolean(), password: z.string().optional() })

interface Draft {
  values: Partial<FormValues>
  step: number
  jobId: string | null
  savedAt: string
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

export default function Apply() {
  const [params] = useSearchParams()
  const jobId = params.get('job')
  const { data: me, isPending: mePending } = useMe()
  const job = useJob(jobId ?? undefined)
  useDocumentTitle(job.data ? `Apply: ${job.data.title}` : 'Create your profile')
  const [result, setResult] = useState<ApplySubmitResult | null>(null)

  if (result) return <Confirmation result={result} />
  if (mePending || (jobId && job.isPending)) return <div className="grid min-h-[60vh] place-items-center"><Spinner className="size-6 text-foreground/50" /></div>

  if (me && me.role !== 'candidate') {
    return (
      <Shell>
        <Alert variant="info">You're logged in as a {me.role} account. Only candidate accounts can apply or create a profile.</Alert>
      </Shell>
    )
  }
  if (jobId && (job.isError || !job.data)) {
    return (
      <Shell>
        <Alert variant="error">This position is no longer open. <Link to="/jobs" className="font-semibold underline">Browse open positions</Link> or <Link to="/apply" className="font-semibold underline">create a general profile</Link>.</Alert>
      </Shell>
    )
  }
  if (me?.candidate) {
    // Existing profile: apply in one step, or edit the profile from the dashboard.
    return job.data ? <QuickApply job={job.data} onDone={setResult} /> : <Navigate to="/candidate/profile" replace />
  }
  return <ApplyWizard job={job.data ?? null} accountEmail={me?.email} onDone={setResult} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">{children}</div>
    </section>
  )
}

// ---- Multi-step wizard -----------------------------------------------------------------------

function ApplyWizard({ job, accountEmail, onDone }: { job: JobDetail | null; accountEmail?: string; onDone: (r: ApplySubmitResult) => void }) {
  const queryClient = useQueryClient()
  const policy: CoverLetterPolicy = job?.coverLetterPolicy ?? 'optional'
  const needsPassword = !accountEmail
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Restore a saved draft (only if it was for the same job, or both are general profiles).
  const [draft] = useState(() => {
    const d = readDraft()
    return d && d.jobId === (job?.id ?? null) ? d : null
  })
  const [draftNotice, setDraftNotice] = useState(Boolean(draft))
  const [step, setStep] = useState(draft?.step ?? 0)
  const [cv, setCv] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: { ...emptyProfile, ...draft?.values, email: accountEmail ?? draft?.values.email ?? '', consent: false, password: '' },
    mode: 'onTouched',
  })
  const { handleSubmit, trigger, control, register, setError, formState: { errors } } = form

  // Autosave the draft (never the password, consent or files).
  const values = useWatch({ control })
  useEffect(() => {
    const t = setTimeout(() => {
      const { password: _p, consent: _c, ...rest } = values as FormValues
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: rest, step, jobId: job?.id ?? null, savedAt: new Date().toISOString() } satisfies Draft))
      } catch { /* storage unavailable */ }
    }, 600)
    return () => clearTimeout(t)
  }, [values, step, job?.id])

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    form.reset({ ...emptyProfile, email: accountEmail ?? '', consent: false, password: '' })
    setStep(0)
    setDraftNotice(false)
  }

  const goTo = (next: number) => {
    setStep(next)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      headingRef.current?.focus({ preventScroll: true })
    })
  }

  const validateStep = async (i: number) => {
    const key = STEPS[i].key
    if (key === 'review') return true
    if (key === 'documents') {
      const ok = await trigger([...STEP_FIELDS.preferences])
      if (!cv) setFileError('Please upload your CV')
      const letterText = form.getValues('coverLetterText')?.trim()
      if (policy === 'required' && !letterText && !coverLetter) {
        setError('coverLetterText', { message: 'This position requires a cover letter: write one or upload a file' })
        return false
      }
      return ok && Boolean(cv)
    }
    return trigger([...STEP_FIELDS[key]] as (keyof FormValues)[])
  }

  const next = async () => {
    if (await validateStep(step)) goTo(step + 1)
  }

  const submit = useMutation({
    mutationFn: (payload: unknown) => api<ApplySubmitResult>('/api/candidates', { method: 'POST', body: multipart(payload, { cv, coverLetter: policy === 'none' ? null : coverLetter }) }),
    onSuccess: (res) => {
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      queryClient.setQueryData(meQueryKey, res.user)
      queryClient.invalidateQueries({ queryKey: candidateKeys.profile })
      onDone(res)
      window.scrollTo({ top: 0 })
    },
  })

  /** Schema errors can sit in earlier steps (e.g. after restoring a draft): show the first step that has one. */
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const keys = Object.keys(errs)
    const index = STEPS.findIndex((s) => s.key !== 'review' && s.key !== 'documents' && (STEP_FIELDS[s.key] as readonly string[]).some((f) => keys.includes(f)))
    const prefIndex = (STEP_FIELDS.preferences as readonly string[]).some((f) => keys.includes(f)) ? 3 : -1
    const target = Math.min(...[index, prefIndex].filter((i) => i >= 0))
    if (Number.isFinite(target)) goTo(target)
  }

  const onSubmit = handleSubmit(async (v) => {
    let ok = true
    if (!v.consent) {
      setError('consent', { message: 'Please agree to continue' })
      ok = false
    }
    if (needsPassword) {
      const pw = passwordSchema.safeParse(v.password ?? '')
      if (!pw.success) {
        setError('password', { message: pw.error.issues[0].message })
        ok = false
      }
    }
    // Earlier steps may have been skipped via a restored draft; re-check everything.
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!(await validateStep(i))) {
        goTo(i)
        return
      }
    }
    if (!ok) return
    const { password, consent: _consent, coverLetterText, ...profile } = v
    submit.mutate({
      ...profile,
      coverLetterText: policy === 'none' ? undefined : coverLetterText,
      consent: true,
      jobId: job?.id,
      password: needsPassword ? password : undefined,
    })
  }, onInvalid)

  const current = STEPS[step]
  const emailTaken = submit.error instanceof ApiError && submit.error.code === 'EMAIL_TAKEN'

  return (
    <section className="px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        {job ? (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-foreground/12 bg-surface p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"><BriefcaseBusiness size={20} aria-hidden /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Applying for</p>
              <p className="truncate font-semibold">{job.title} <span className="font-normal text-foreground/60">· {job.company.name}</span></p>
            </div>
          </div>
        ) : null}
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand" aria-live="polite">Step {step + 1} of {STEPS.length} · {current.label}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-medium tracking-[-.05em] outline-none sm:text-4xl">{job ? 'Your application' : 'Create your profile'}</h1>

        <Stepper step={step} onJump={(i) => i < step && goTo(i)} />

        {draftNotice && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-foreground/12 bg-chip px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><History size={16} aria-hidden /> We restored your saved draft{draft ? ` from ${new Date(draft.savedAt).toLocaleString()}` : ''}. Files aren't saved, so you'll need to upload your CV again.</span>
            <span className="flex gap-3">
              <button type="button" className="font-semibold text-brand" onClick={() => setDraftNotice(false)}>Keep it</button>
              <button type="button" className="font-semibold text-destructive" onClick={discardDraft}>Start over</button>
            </span>
          </div>
        )}

        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-8">
            <div className="rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={current.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                  {current.key === 'basics' && <BasicsSection emailLocked={Boolean(accountEmail)} />}
                  {current.key === 'skills' && <SkillsSection />}
                  {current.key === 'experience' && <ExperienceSection />}
                  {current.key === 'documents' && (
                    <div className="space-y-8">
                      <section className="space-y-5">
                        <h2 className="text-lg font-semibold tracking-[-.02em]">Documents</h2>
                        <FileDrop label="CV" file={cv} onChange={(f) => { setCv(f); setFileError(undefined) }} error={fileError} />
                        {policy !== 'none' && (
                          <div className="space-y-4">
                            <p className="text-sm font-semibold">
                              Cover letter <span className="font-normal text-foreground/55">{policy === 'required' ? '(required for this position)' : '(optional)'}</span>
                            </p>
                            <Field label="Write it here" error={errors.coverLetterText?.message}>
                              {(ids) => <Textarea {...ids} rows={6} placeholder="Why are you interested, and what would you bring?" {...register('coverLetterText')} />}
                            </Field>
                            <FileDrop label="…or upload a file" file={coverLetter} onChange={setCoverLetter} />
                          </div>
                        )}
                      </section>
                      <PreferencesSection />
                    </div>
                  )}
                  {current.key === 'review' && (
                    <div className="space-y-8">
                      <ReviewStep cvName={cv?.name} coverLetterName={coverLetter?.name} onEdit={goTo} />
                      {needsPassword && (
                        <Field label="Choose a password" error={errors.password?.message} hint="You'll use it with your email to log in and track your applications.">
                          {(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('password')} />}
                        </Field>
                      )}
                      <div>
                        <label className="flex items-start gap-3 text-sm leading-relaxed">
                          <input type="checkbox" className="mt-1 size-4 accent-brand" aria-invalid={errors.consent ? true : undefined} {...register('consent')} />
                          <span>
                            I agree to the <Link to="/privacy" target="_blank" className="font-semibold text-brand underline-offset-4 hover:underline">privacy policy</Link> and to being contacted about opportunities through AI101 Talents.
                          </span>
                        </label>
                        {errors.consent && <p className="mt-1.5 text-xs font-medium text-destructive">{errors.consent.message}</p>}
                      </div>
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
            </div>

            {submit.error && (
              <Alert variant="error" className="mt-5">
                {submit.error.message}
                {emailTaken && <> <Link to={`/login?next=${encodeURIComponent(`/apply${job ? `?job=${job.id}` : ''}`)}`} className="font-semibold underline">Log in</Link></>}
              </Alert>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button type="button" variant="outline" className="h-11 rounded-md px-4" onClick={() => goTo(step - 1)}>
                  <ArrowLeft data-icon="inline-start" aria-hidden /> Back
                </Button>
              ) : <span />}
              {step < STEPS.length - 1 ? (
                <Button type="button" className="h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover" onClick={next}>
                  Continue <ArrowRight data-icon="inline-end" aria-hidden />
                </Button>
              ) : (
                <Button type="submit" disabled={submit.isPending} className="h-11 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">
                  {submit.isPending && <Spinner />} {job ? 'Submit application' : 'Create profile'}
                </Button>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-foreground/50">Your progress is saved on this device as you go.</p>
          </form>
        </FormProvider>
      </div>
    </section>
  )
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div className="mt-6">
      <div className="h-1.5 overflow-hidden rounded-full bg-chip" role="progressbar" aria-label="Form progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].label}`}>
        <m.div className="h-full rounded-full bg-brand" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>
      <ol className="mt-4 hidden grid-cols-5 gap-2 sm:grid">
        {STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= step}
              aria-current={i === step ? 'step' : undefined}
              className={cn('flex w-full items-center gap-2 text-left text-xs font-semibold', i === step ? 'text-foreground' : i < step ? 'text-brand hover:underline' : 'text-foreground/40')}
            >
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11px]', i < step ? 'bg-brand text-brand-foreground' : i === step ? 'bg-ink text-ink-foreground' : 'bg-chip')}>
                {i < step ? <Check size={13} aria-hidden /> : i + 1}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
