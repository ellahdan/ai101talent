import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Field, PasswordInput, Spinner } from '@/components/ui/form'
import { api } from '@/lib/api'
import { meQueryKey } from '@/hooks/useAuth'
import { passwordSchema } from '@/lib/validation/auth'
import { AuthCard, submitClass } from './AuthCard'
import { useT } from '@/i18n'
import { authText } from '@/i18n/auth'

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ['confirm'] })
type Values = z.infer<typeof schema>

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const t = useT(authText)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reset = useMutation({
    mutationFn: (password: string) => api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    onSuccess: () => {
      // Every session was signed out by the reset.
      queryClient.setQueryData(meQueryKey, null)
      toast.success(t.reset.done)
      navigate('/login', { replace: true })
    },
  })
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  return (
    <AuthCard title={t.reset.title} footer={<Link to="/login" className="font-semibold text-brand">{t.backToLogin}</Link>}>
      {!token ? (
        <Alert variant="error">{t.missingToken} <Link to="/forgot-password" className="font-semibold underline">{t.requestNewLink}</Link>.</Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => reset.mutate(v.password))} noValidate className="space-y-5">
          {reset.error && (
            <Alert variant="error">
              {reset.error.message}. <Link to="/forgot-password" className="font-semibold underline">{t.requestNewLink}</Link>.
            </Alert>
          )}
          <Field label={t.newPassword} error={errors.password?.message} hint={t.passwordHint}>
            {(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('password')} />}
          </Field>
          <Field label={t.confirmPassword} error={errors.confirm?.message}>
            {(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('confirm')} />}
          </Field>
          <Button type="submit" disabled={reset.isPending} className={submitClass}>
            {reset.isPending && <Spinner />} {t.updatePassword}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
