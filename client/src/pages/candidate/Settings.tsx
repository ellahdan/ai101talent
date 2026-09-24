import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, KeyRound, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Alert, Field, PasswordInput, Spinner } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { api } from '@/lib/api'
import { meQueryKey, useMe } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ChangePassword } from '@/components/account/ChangePassword'

export default function CandidateSettings() {
  useDocumentTitle('Settings')
  const { data: me } = useMe()
  return (
    <>
      <PageHeader title="Settings" description={<>Signed in as <strong className="text-foreground">{me?.email}</strong>{me?.isVerified ? ' · email confirmed' : ' · email not confirmed yet'}</>} />
      <div className="space-y-6">
        <ChangePasswordPanel />
        <ExportData />
        <DeleteAccount />
      </div>
    </>
  )
}

function Panel({ icon: Icon, title, description, children, danger }: { icon: typeof KeyRound; title: string; description: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-lg border bg-surface p-5 sm:p-8 ${danger ? 'border-destructive/30' : 'border-foreground/12'}`}>
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-.02em]"><Icon size={18} className={danger ? 'text-destructive' : 'text-brand'} aria-hidden /> {title}</h2>
      <p className="mt-1 text-sm text-foreground/60">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ChangePasswordPanel() {
  return (
    <Panel icon={KeyRound} title="Change password" description="Changing your password signs you out on every other device.">
      <ChangePassword />
    </Panel>
  )
}

function ExportData() {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/candidates/me/export`, { credentials: 'include' })
      if (!res.ok) throw new Error('Export failed')
      const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'ai101-talents-data.json'
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement('a'), { href: url, download: name })
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel icon={Download} title="Export your data" description="Download everything we hold about you (profile, CV text, applications and contact requests) as a JSON file.">
      <Button type="button" variant="outline" className="h-10 rounded-md" onClick={download} disabled={busy}>{busy ? <Spinner /> : <Download data-icon="inline-start" aria-hidden />} Download my data</Button>
    </Panel>
  )
}

function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => api('/api/candidates/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
      toast.success('Your account and all your data have been deleted.')
      navigate('/', { replace: true })
    },
  })
  return (
    <Panel icon={Trash2} danger title="Delete your account" description="Permanently deletes your profile, CV and cover letters, applications and contact requests. This cannot be undone.">
      <Button type="button" className="h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90" onClick={() => setOpen(true)}>Delete my account</Button>
      <Modal open={open} onOpenChange={setOpen} title="Delete your account?" description="All your data and files are permanently deleted. Enter your password to confirm.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            remove.mutate()
          }}
          className="space-y-4"
        >
          {remove.error && <Alert variant="error">{remove.error.message}</Alert>}
          <Field label="Password">{(ids) => <PasswordInput {...ids} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!password || remove.isPending} className="h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90">{remove.isPending && <Spinner />} Delete permanently</Button>
          </div>
        </form>
      </Modal>
    </Panel>
  )
}
