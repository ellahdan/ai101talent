import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Alert, Field, PasswordInput, Spinner } from '@/components/ui/form'
import { api } from '@/lib/api'
import { passwordSchema } from '@/lib/validation/auth'
import { useT } from '@/i18n'
import { authText } from '@/i18n/auth'

const changeSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords don't match", path: ['confirm'] })

/** Change-password form (current + new + confirm). Other sessions are signed out by the server. */
export function ChangePassword() {
  const t = useT(authText)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof changeSchema>>({ resolver: zodResolver(changeSchema) })
  const change = useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) => api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      reset()
      toast.success(t.changed)
    },
  })
  return (
    <form onSubmit={handleSubmit(({ currentPassword, newPassword }) => change.mutate({ currentPassword, newPassword }))} noValidate className="grid max-w-xl gap-4">
      {change.error && <Alert variant="error">{change.error.message}</Alert>}
      <Field label={t.currentPassword} error={errors.currentPassword?.message}>{(ids) => <PasswordInput {...ids} autoComplete="current-password" {...register('currentPassword')} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.newPassword} error={errors.newPassword?.message}>{(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('newPassword')} />}</Field>
        <Field label={t.confirmPassword} error={errors.confirm?.message}>{(ids) => <PasswordInput {...ids} autoComplete="new-password" {...register('confirm')} />}</Field>
      </div>
      <div>
        <Button type="submit" disabled={change.isPending} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{change.isPending && <Spinner />} {t.updatePassword}</Button>
      </div>
    </form>
  )
}
