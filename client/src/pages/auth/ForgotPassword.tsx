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

type Values = z.infer<typeof forgotPasswordSchema>

export default function ForgotPassword() {
  const request = useMutation({ mutationFn: (values: Values) => api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) }) })
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema) })

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={<Link to="/login" className="font-semibold text-brand">Back to log in</Link>}
    >
      {request.isSuccess ? (
        <Alert variant="success">If an account exists for {getValues('email')}, a reset link is on its way. It's valid for 1 hour.</Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => request.mutate(v))} noValidate className="space-y-5">
          {request.error && <Alert variant="error">{request.error.message}</Alert>}
          <Field label="Email" error={errors.email?.message}>
            {(ids) => <Input {...ids} type="email" autoComplete="email" {...register('email')} />}
          </Field>
          <Button type="submit" disabled={request.isPending} className={submitClass}>
            {request.isPending && <Spinner />} Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
