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

export default function AdminSettings() {
  useDocumentTitle('Settings')
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Retention />
        <Admins />
        <Panel icon={KeyRound} title="Your password" description="Changing it signs you out on every other device.">
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
  const [months, setMonths] = useState('')
  useEffect(() => { if (data) setMonths(String(data.retentionMonths)) }, [data])
  const value = Number(months)
  const invalid = !Number.isInteger(value) || value < 6 || value > 120

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!invalid) save.mutate({ retentionMonths: value }, { onSuccess: () => toast.success('Retention period saved') })
  }

  return (
    <Panel icon={Clock} title="Data retention" description="Candidate profiles with no activity (no login or profile update) for this long are deleted automatically, including their CV and applications. The job runs daily.">
      {isPending ? <Spinner className="size-5 text-foreground/50" /> : (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <Field label="Delete inactive profiles after (months)" error={invalid && months ? 'Choose between 6 and 120 months' : undefined}>
            {(ids) => <Input {...ids} type="number" min={6} max={120} className="h-10 w-40" value={months} onChange={(e) => setMonths(e.target.value)} />}
          </Field>
          <Button type="submit" disabled={invalid || save.isPending || value === data?.retentionMonths} className="h-10 rounded-md bg-brand px-5 text-brand-foreground hover:bg-brand-hover">{save.isPending && <Spinner />} Save</Button>
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
  const [email, setEmail] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    invite.mutate(email.trim(), { onSuccess: () => { toast.success(`Invitation sent to ${email.trim()}`); setEmail('') } })
  }
  return (
    <Panel icon={ShieldCheck} title="Admin accounts" description="Admins can see every candidate's full profile and CV. Invite only people who need it. Invitees choose their own password through a link valid for 72 hours.">
      {isPending ? <Spinner className="size-5 text-foreground/50" /> : (
        <ul className="divide-y divide-foreground/10 rounded-md border border-foreground/12">
          {data?.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{a.email}{a.email === me?.email && <span className="ml-2 text-xs text-foreground/50">(you)</span>}</span>
              <span className="text-xs text-foreground/55">{a.isVerified ? (a.lastLoginAt ? `last login ${timeAgo(a.lastLoginAt)}` : 'active') : 'invitation pending'}</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-4 flex max-w-xl flex-wrap gap-2">
        <label htmlFor="invite-email" className="sr-only">Email of the new admin</label>
        <Input id="invite-email" type="email" required placeholder="new.admin@company.com" className="h-10 min-w-0 flex-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={!email.trim() || invite.isPending} className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover">{invite.isPending ? <Spinner /> : <UserPlus data-icon="inline-start" aria-hidden />} Invite admin</Button>
      </form>
      {invite.error && <Alert variant="error" className="mt-3">{invite.error.message}</Alert>}
    </Panel>
  )
}
