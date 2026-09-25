import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Clock, KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { ChangePassword } from '@/components/account/ChangePassword'
import { Button } from '@/components/ui/button'
import { Alert, Field, Input, Spinner } from '@/components/ui/form'
import { useAdminSettings, useAdmins, useInviteAdmin, useSaveSettings } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMe } from '@/hooks/useAuth'
import { timeAgo } from '@/lib/format'
import { useT } from '@/i18n'
import { adminText } from '@/i18n/admin'

export default function AdminSettings() {
  const t = useT(adminText).settings
  useDocumentTitle(t.title)
  return (
    <>
      <PageHeader title={t.title} />
      <div className="space-y-6">
        <Retention />
        <Admins />
        <Panel icon={KeyRound} title={t.password} description={t.passwordText}>
          <ChangePassword />
        </Panel>
      </div>
    </>
  )
}

function Panel({ icon: Icon, title, description, children }: { icon: typeof Clock; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface p-5 sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-.02em]"><Icon size={18} className="text-brand" aria-hidden /> {title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm text-foreground/60">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Retention() {
  const { data, isPending } = useAdminSettings()
  const save = useSaveSettings()
  const t = useT(adminText).settings
  const [months, setMonths] = useState('')
  useEffect(() => { if (data) setMonths(String(data.retentionMonths)) }, [data])
  const value = Number(months)
  const invalid = !Number.isInteger(value) || value < 6 || value > 120

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!invalid) save.mutate({ retentionMonths: value }, { onSuccess: () => toast.success(t.retentionSaved) })
  }

  return (
    <Panel icon={Clock} title={t.retention} description={t.retentionText}>
      {isPending ? <Spinner className="size-5 text-foreground/50" /> : (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <Field label={t.months} error={invalid && months ? t.monthsError : undefined}>
            {(ids) => <Input {...ids} type="number" min={6} max={120} className="h-10 w-40" value={months} onChange={(e) => setMonths(e.target.value)} />}
          </Field>
          <Button type="submit" disabled={invalid || save.isPending || value === data?.retentionMonths} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{save.isPending && <Spinner />} {t.save}</Button>
        </form>
      )}
      {save.error && <Alert variant="error" className="mt-3">{save.error.message}</Alert>}
    </Panel>
  )
}

function Admins() {
  const { data: me } = useMe()
  const { data, isPending } = useAdmins()
  const invite = useInviteAdmin()
  const t = useT(adminText).settings
  const [email, setEmail] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    invite.mutate(email.trim(), { onSuccess: () => { toast.success(t.invited(email.trim())); setEmail('') } })
  }
  return (
    <Panel icon={ShieldCheck} title={t.admins} description={t.adminsText}>
      {isPending ? <Spinner className="size-5 text-foreground/50" /> : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/12">
          {data?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{a.email}{a.email === me?.email && <span className="ml-2 text-xs text-foreground/50">{t.you}</span>}</span>
              <span className="text-xs text-foreground/55">{a.isVerified ? (a.lastLoginAt ? t.lastLogin(timeAgo(a.lastLoginAt)) : t.active) : t.pending}</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-4 flex max-w-xl flex-wrap gap-2">
        <label htmlFor="invite-email" className="sr-only">{t.inviteLabel}</label>
        <Input id="invite-email" type="email" required placeholder="new.admin@company.com" className="h-10 min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={!email.trim() || invite.isPending} className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">{invite.isPending ? <Spinner /> : <UserPlus data-icon="inline-start" aria-hidden />} {t.invite}</Button>
      </form>
      {invite.error && <Alert variant="error" className="mt-3">{invite.error.message}</Alert>}
    </Panel>
  )
}
