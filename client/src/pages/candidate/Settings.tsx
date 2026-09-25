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
import { translateMessage, useT } from '@/i18n'
import { common } from '@/i18n/common'
import { candidateText } from '@/i18n/candidate'

export default function CandidateSettings() {
  const t = useT(candidateText).settings
  useDocumentTitle(t.title)
  const { data: me } = useMe()
  return (
    <>
      <PageHeader title={t.title} description={<>{t.signedInAs} <strong className="text-foreground">{me?.email}</strong>{me?.isVerified ? t.confirmed : t.notConfirmed}</>} />
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
  const t = useT(candidateText).settings
  return (
    <Panel icon={KeyRound} title={t.password} description={t.passwordText}>
      <ChangePassword />
    </Panel>
  )
}

function ExportData() {
  const t = useT(candidateText).settings
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/candidates/me/export`, { credentials: 'include' })
      if (!res.ok) throw new Error(t.exportFailed)
      const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'ai101-talents-data.json'
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement('a'), { href: url, download: name })
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(translateMessage((err as Error).message))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel icon={Download} title={t.export} description={t.exportText}>
      <Button type="button" variant="outline" className="h-10 rounded-md" onClick={download} disabled={busy}>{busy ? <Spinner /> : <Download data-icon="inline-start" aria-hidden />} {t.download}</Button>
    </Panel>
  )
}

function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const t = useT(candidateText).settings
  const c = useT(common)
  const remove = useMutation({
    mutationFn: () => api('/api/candidates/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
      toast.success(t.deleted)
      navigate('/', { replace: true })
    },
  })
  return (
    <Panel icon={Trash2} danger title={t.delete} description={t.deleteText}>
      <Button type="button" className="h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90" onClick={() => setOpen(true)}>{t.deleteButton}</Button>
      <Modal open={open} onOpenChange={setOpen} title={t.deleteTitle} description={t.deleteConfirmText}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            remove.mutate()
          }}
          className="space-y-4"
        >
          {remove.error && <Alert variant="error">{remove.error.message}</Alert>}
          <Field label={t.password_}>{(ids) => <PasswordInput {...ids} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setOpen(false)}>{c.actions.cancel}</Button>
            <Button type="submit" disabled={!password || remove.isPending} className="h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90">{remove.isPending && <Spinner />} {t.deletePermanently}</Button>
          </div>
        </form>
      </Modal>
    </Panel>
  )
}
