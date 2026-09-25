import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Spinner } from '@/components/ui/form'
import { api } from '@/lib/api'
import { forgotPasswordSchema } from '@/lib/validation/auth'
import { AuthCard, submitClass } from './AuthCard'
import { useT } from '@/i18n'
import { authText } from '@/i18n/auth'

type Values = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const t = useT(authText)
  const request = useMutation({ mutationFn: (values: Values) => api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) }) })
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema) })

  return (
    <AuthCard
      title={t.forgot.title}
      subtitle={t.forgot.subtitle}
      footer={<Link to="/login" className="font-semibold text-brand">{t.backToLogin}</Link>}
    >
      {request.isSuccess ? (
        <Alert variant="success">{t.forgot.sent(getValues('email'))}</Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => request.mutate(v))} noValidate className="space-y-5">
          {request.error && <Alert variant="error">{request.error.message}</Alert>}
          <Field label={t.email} error={errors.email?.message}>
            {(ids) => <Input {...ids} type="email" autoComplete="email" {...register('email')} />}
          </Field>
          <Button type="submit" disabled={request.isPending} className={submitClass}>
            {request.isPending && <Spinner />} {t.forgot.submit}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
