import { useRef, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { BriefcaseBusiness, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, PasswordInput, Select, Spinner, Textarea } from '@/components/ui/form'
import { dashboardPath, useMe, useRegister } from '@/hooks/useAuth'
import { companyDetailsSchema, emailSchema, passwordSchema } from '@/lib/validation/auth'
import { cn } from '@/lib/utils'
import { COMPANY_SIZES } from '@/types'
import { AuthCard, submitClass } from './AuthCard'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { authText } from '@/i18n/auth'

type Role = 'candidate' | 'company'

export default function Register() {
  const [params, setParams] = useSearchParams()
  const { data: me } = useMe()
  // Set on submit: registering signs the user in, and the form handles the redirect itself.
  const submitted = useRef(false)
  const role: Role = params.get('role') === 'company' ? 'company' : 'candidate'
  const t = useT(authText).register

  if (me && !submitted.current) return <Navigate to={dashboardPath(me.role)} replace />

  const markSubmitted = () => { submitted.current = true }
  const setRole = (r: Role) => setParams(r === 'company' ? { role: 'company' } : {}, { replace: true })

  return (
    <AuthCard
      wide={role === 'company'}
      title={role === 'company' ? t.companyTitle : t.candidateTitle}
      subtitle={role === 'company' ? t.companySubtitle : t.candidateSubtitle}
      footer={<>{t.haveAccount} <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-semibold text-brand">{t.logIn}</Link></>}
    >
      <div role="radiogroup" aria-label={t.accountType} className="mb-7 grid grid-cols-2 gap-2">
        <RoleOption active={role === 'candidate'} onSelect={() => setRole('candidate')} icon={<UserRound size={18} aria-hidden />} label={t.lookingForWork} />
        <RoleOption active={role === 'company'} onSelect={() => setRole('company')} icon={<BriefcaseBusiness size={18} aria-hidden />} label={t.hiring} />
      </div>
      {role === 'company' ? <CompanyForm onSubmitStart={markSubmitted} /> : <CandidateForm onSubmitStart={markSubmitted} />}
    </AuthCard>
  )
}

function RoleOption({ active, onSelect, icon, label }: { active: boolean; onSelect: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-3 text-left text-sm font-semibold transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
        active ? 'border-brand bg-brand-soft text-brand-soft-foreground' : 'border-foreground/15 text-foreground/65 hover:border-foreground/30',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function Consent() {
  const t = useT(authText).register
  return (
    <p className="text-xs leading-relaxed text-foreground/55">
      {t.consentPrefix} <Link to="/terms" className="underline underline-offset-2">{t.terms}</Link> {t.and}{' '}
      <Link to="/privacy" className="underline underline-offset-2">{t.privacy}</Link>.
    </p>
  )
}

// ---- Candidate ----------------------------------------------------------------

const candidateSchema = z.object({ email: emailSchema, password: passwordSchema })

function CandidateForm({ onSubmitStart }: { onSubmitStart: () => void }) {
  const t = useT(authText)
  const navigate = useNavigate()
  const registerUser = useRegister()
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof candidateSchema>>({ resolver: zodResolver(candidateSchema) })

  const onSubmit = handleSubmit((values) => {
    onSubmitStart()
    registerUser.mutate(
      { role: 'candidate', ...values },
      {
        onSuccess: () => {
          toast.success(t.register.candidateCreated)
          navigate('/apply', { replace: true })
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {registerUser.error && <Alert variant="error">{registerUser.error.message}</Alert>}
      <Field label={t.email} error={errors.email?.message}>
        {(ids) => <Input {...ids} type="email" autoComplete="email" {...register('email')} />}
      </Field>
      <Field label={t.password} error={errors.password?.message} hint={t.passwordHint}>
        {(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('password')} />}
      </Field>
      <Consent />
      <Button type="submit" disabled={registerUser.isPending} className={submitClass}>
        {registerUser.isPending && <Spinner />} {t.register.createAccount}
      </Button>
    </form>
  )
}

// ---- Company ------------------------------------------------------------------

const companySchema = z.object({ email: emailSchema, password: passwordSchema, company: companyDetailsSchema })
type CompanyInput = z.input<typeof companySchema>
type CompanyOutput = z.output<typeof companySchema>

function CompanyForm({ onSubmitStart }: { onSubmitStart: () => void }) {
  const a = useT(authText)
  const t = a.register
  const c = useT(common)
  const navigate = useNavigate()
  const registerUser = useRegister()
  const { register, handleSubmit, formState: { errors } } = useForm<CompanyInput, unknown, CompanyOutput>({ resolver: zodResolver(companySchema) })
  const e = errors.company

  const onSubmit = handleSubmit((values) => {
    onSubmitStart()
    registerUser.mutate(
      { role: 'company', ...values },
      {
        onSuccess: () => {
          toast.success(t.companyCreated)
          navigate('/company', { replace: true })
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-7">
      {registerUser.error && <Alert variant="error">{registerUser.error.message}</Alert>}

      <fieldset className="space-y-5">
        <legend className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.company}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.companyName} error={e?.name?.message}>
            {(ids) => <Input {...ids} autoComplete="organization" {...register('company.name')} />}
          </Field>
          <Field label={t.website} optional error={e?.website?.message}>
            {(ids) => <Input {...ids} type="url" inputMode="url" placeholder="example.com" {...register('company.website')} />}
          </Field>
          <Field label={t.industry} optional error={e?.industry?.message}>
            {(ids) => <Input {...ids} placeholder={t.industryPlaceholder} {...register('company.industry')} />}
          </Field>
          <Field label={t.size} optional error={e?.size?.message}>
            {(ids) => (
              <Select {...ids} defaultValue="" {...register('company.size', { setValueAs: (v) => v || undefined })}>
                <option value="">{t.selectSize}</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{c.employees(s)}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t.about} optional error={e?.description?.message}>
          {(ids) => <Textarea {...ids} rows={3} placeholder={t.aboutPlaceholder} {...register('company.description')} />}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.contactPerson}</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t.fullName} error={e?.contactPerson?.name?.message}>
            {(ids) => <Input {...ids} autoComplete="name" {...register('company.contactPerson.name')} />}
          </Field>
          <Field label={t.jobTitle} optional error={e?.contactPerson?.title?.message}>
            {(ids) => <Input {...ids} autoComplete="organization-title" {...register('company.contactPerson.title')} />}
          </Field>
          <Field label={t.phone} optional error={e?.contactPerson?.phone?.message}>
            {(ids) => <Input {...ids} type="tel" autoComplete="tel" {...register('company.contactPerson.phone')} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.loginSection}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={a.workEmail} error={errors.email?.message}>
            {(ids) => <Input {...ids} type="email" autoComplete="email" {...register('email')} />}
          </Field>
          <Field label={a.password} error={errors.password?.message} hint={a.passwordHintShort}>
            {(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('password')} />}
          </Field>
        </div>
      </fieldset>

      <Consent />
      <Button type="submit" disabled={registerUser.isPending} className={submitClass}>
        {registerUser.isPending && <Spinner />} {t.registerCompany}
      </Button>
    </form>
  )
}
