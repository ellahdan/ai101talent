import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Bookmark, Pencil, Plus, Trash2, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, Input, Spinner } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { TalentCard } from '@/components/talent/TalentCard'
import { ShortlistDialog } from '@/components/talent/ShortlistDialog'
import { RequestDialog } from '@/components/talent/RequestDialog'
import { useCreateShortlist, useDeleteShortlist, useRenameShortlist, useShortlistCandidates, useShortlists, useToggleShortlisted } from '@/hooks/useTalent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AnonymizedCandidate, Shortlist } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { companyText } from '@/i18n/company'

export default function Shortlists() {
  const { id } = useParams()
  return id ? <ShortlistDetail id={id} /> : <ShortlistIndex />
}

function ShortlistIndex() {
  const t = useT(companyText).shortlists
  useDocumentTitle(t.title)
  const { data, isPending, error } = useShortlists()
  const create = useCreateShortlist()
  const [name, setName] = useState('')
  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) create.mutate(name.trim(), { onSuccess: () => { setName(''); toast.success(t.created) } })
  }

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <form onSubmit={onCreate} className="mb-6 flex max-w-lg gap-2">
        <label htmlFor="shortlist-name" className="sr-only">{t.newName}</label>
        <Input id="shortlist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.newName} maxLength={80} />
        <Button type="submit" disabled={!name.trim() || create.isPending} className="h-11 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover"><Plus data-icon="inline-start" aria-hidden /> {t.create}</Button>
      </form>
      {create.error && <Alert variant="error" className="mb-4">{create.error.message}</Alert>}
      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={Bookmark} title={t.none} action={<Link to="/company/search" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>{t.searchTalent}</Link>}>
          {t.noneText}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((l) => (
            <li key={l.id}>
              <Link to={`/company/shortlists/${l.id}`} className="block rounded-lg border border-foreground/12 bg-surface p-5 transition hover:border-brand/60">
                <Bookmark size={18} className="text-brand" aria-hidden />
                <p className="mt-3 font-semibold">{l.name}</p>
                <p className="text-sm text-foreground/60">{t.count(l.candidateIds.length)} · {t.updated(timeAgo(l.updatedAt))}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function ShortlistDetail({ id }: { id: string }) {
  const { data, isPending, error } = useShortlistCandidates(id)
  const toggle = useToggleShortlisted()
  const [saving, setSaving] = useState<AnonymizedCandidate | null>(null)
  const [requesting, setRequesting] = useState<AnonymizedCandidate | null>(null)
  const [editing, setEditing] = useState<'rename' | 'delete' | null>(null)
  const t = useT(companyText).shortlists
  useDocumentTitle(data?.shortlist.name ?? t.fallbackTitle)

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error) return <Alert variant="error">{error.message}</Alert>

  return (
    <>
      <Link to="/company/shortlists" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {t.back}</Link>
      <PageHeader
        title={data.shortlist.name}
        description={t.count(data.candidates.length)}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setEditing('rename')}><Pencil data-icon="inline-start" aria-hidden /> {t.rename}</Button>
            <Button type="button" variant="outline" className="h-10 rounded-md text-destructive" onClick={() => setEditing('delete')}><Trash2 data-icon="inline-start" aria-hidden /> {t.delete}</Button>
          </div>
        }
      />
      {data.candidates.length === 0 ? (
        <EmptyState icon={Bookmark} title={t.empty} action={<Link to="/company/search" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>{t.searchTalent}</Link>}>
          {t.emptyText}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.candidates.map((c) => (
            <li key={c.id} className="relative">
              <TalentCard candidate={c} href={`/company/candidates/${c.id}`} onSave={setSaving} onRequest={setRequesting} />
              <button
                type="button"
                aria-label={t.removeFrom(c.applicantNumber)}
                onClick={() => toggle.mutate({ listId: id, candidateId: c.id, add: false }, { onSuccess: () => toast.success(t.removed(c.applicantNumber)) })}
                className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-surface text-foreground/50 shadow-sm hover:text-destructive"
              >
                <X size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {saving && <ShortlistDialog candidate={saving} onClose={() => setSaving(null)} />}
      {requesting && <RequestDialog candidate={requesting} onClose={() => setRequesting(null)} />}
      {editing && <EditDialog list={data.shortlist} mode={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditDialog({ list, mode, onClose }: { list: Shortlist; mode: 'rename' | 'delete'; onClose: () => void }) {
  const [name, setName] = useState(list.name)
  const rename = useRenameShortlist()
  const remove = useDeleteShortlist()
  const mutation = mode === 'rename' ? rename : remove
  const t = useT(companyText).shortlists
  const c = useT(common)
  const submit = () => {
    if (mode === 'rename') rename.mutate({ id: list.id, name: name.trim() }, { onSuccess: () => { toast.success(t.renamed); onClose() } })
    else remove.mutate(list.id, { onSuccess: () => { toast.success(t.deleted); history.back() } })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={mode === 'rename' ? t.renameTitle : t.deleteTitle(list.name)} description={mode === 'delete' ? t.deleteText : undefined}>
      {mode === 'rename' && <Input aria-label={t.nameLabel} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}
      {mutation.error && <Alert variant="error" className="mt-4">{mutation.error.message}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{c.actions.cancel}</Button>
        <Button type="button" disabled={mutation.isPending || (mode === 'rename' && !name.trim())} onClick={submit} className={mode === 'delete' ? 'h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90' : 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover'}>
          {mutation.isPending && <Spinner />} {mode === 'rename' ? c.actions.save : c.actions.delete}
        </Button>
      </div>
    </Modal>
  )
}
