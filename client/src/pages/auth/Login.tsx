import { useRef } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, PasswordInput, Spinner } from '@/components/ui/form'
import { dashboardPath, safeNext, useLogin, useMe } from '@/hooks/useAuth'
import { emailSchema } from '@/lib/validation/auth'
import { AuthCard, submitClass } from './AuthCard'

const schema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password') })
type Values = z.infer<typeof schema>

export default function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const login = useLogin()
  // Set on submit: logging in updates the session, and the form handles the redirect itself.
  const submitted = useRef(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })
  const next = safeNext(params.get('next'))

  if (me && !submitted.current) return <Navigate to={next ?? dashboardPath(me.role)} replace />

  const onSubmit = handleSubmit((values) => {
    submitted.current = true
    login.mutate(values, { onSuccess: (user) => navigate(next ?? dashboardPath(user.role), { replace: true }) })
  })

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to manage your profile, jobs or requests."
      footer={<>New to AI101 Talents? <Link to="/register" className="font-semibold text-brand">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {login.error && <Alert variant="error">{login.error.message}</Alert>}
        <Field label="Email" error={errors.email?.message}>
          {(ids) => <Input {...ids} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(ids) => <PasswordInput {...ids} autoComplete="current-password" {...register('password')} />}
        </Field>
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-semibold text-brand">Forgot password?</Link>
        </div>
        <Button type="submit" disabled={login.isPending} className={submitClass}>
          {login.isPending && <Spinner />} Log in
        </Button>
      </form>
    </AuthCard>
  )
}
