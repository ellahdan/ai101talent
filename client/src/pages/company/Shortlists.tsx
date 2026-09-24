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

export default function Shortlists() {
  const { id } = useParams()
  return id ? <ShortlistDetail id={id} /> : <ShortlistIndex />
}

function ShortlistIndex() {
  useDocumentTitle('Shortlists')
  const { data, isPending, error } = useShortlists()
  const create = useCreateShortlist()
  const [name, setName] = useState('')
  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) create.mutate(name.trim(), { onSuccess: () => { setName(''); toast.success('Shortlist created') } })
  }

  return (
    <>
      <PageHeader title="Shortlists" description="Private lists of anonymized candidates, only visible to your company." />
      <form onSubmit={onCreate} className="mb-6 flex max-w-lg gap-2">
        <label htmlFor="shortlist-name" className="sr-only">New shortlist name</label>
        <Input id="shortlist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New shortlist name" maxLength={80} />
        <Button type="submit" disabled={!name.trim() || create.isPending} className="h-11 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover"><Plus data-icon="inline-start" aria-hidden /> Create</Button>
      </form>
      {create.error && <Alert variant="error" className="mb-4">{create.error.message}</Alert>}
      {isPending ? (
        <Spinner className="size-6 text-foreground/50" />
      ) : error ? (
        <Alert variant="error">{error.message}</Alert>
      ) : data.length === 0 ? (
        <EmptyState icon={Bookmark} title="No shortlists yet" action={<Link to="/company/search" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>Search talent</Link>}>
          Create a list above, or save candidates from talent search.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((l) => (
            <li key={l.id}>
              <Link to={`/company/shortlists/${l.id}`} className="block rounded-lg border border-foreground/12 bg-surface p-5 transition hover:border-brand/60">
                <Bookmark size={18} className="text-brand" aria-hidden />
                <p className="mt-3 font-semibold">{l.name}</p>
                <p className="text-sm text-foreground/60">{l.candidateIds.length} candidate{l.candidateIds.length === 1 ? '' : 's'} · updated {timeAgo(l.updatedAt)}</p>
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
  useDocumentTitle(data?.shortlist.name ?? 'Shortlist')

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error) return <Alert variant="error">{error.message}</Alert>

  return (
    <>
      <Link to="/company/shortlists" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Shortlists</Link>
      <PageHeader
        title={data.shortlist.name}
        description={`${data.candidates.length} candidate${data.candidates.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setEditing('rename')}><Pencil data-icon="inline-start" aria-hidden /> Rename</Button>
            <Button type="button" variant="outline" className="h-10 rounded-md text-destructive" onClick={() => setEditing('delete')}><Trash2 data-icon="inline-start" aria-hidden /> Delete</Button>
          </div>
        }
      />
      {data.candidates.length === 0 ? (
        <EmptyState icon={Bookmark} title="This shortlist is empty" action={<Link to="/company/search" className={cn(buttonVariants(), 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover')}>Search talent</Link>}>
          Save candidates from talent search. Profiles that were hidden by their owner disappear from lists automatically.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.candidates.map((c) => (
            <li key={c.id} className="relative">
              <TalentCard candidate={c} onSave={setSaving} onRequest={setRequesting} />
              <button
                type="button"
                aria-label={`Remove ${c.applicantNumber} from this shortlist`}
                onClick={() => toggle.mutate({ listId: id, candidateId: c.id, add: false }, { onSuccess: () => toast.success(`${c.applicantNumber} removed`) })}
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
  const submit = () => {
    if (mode === 'rename') rename.mutate({ id: list.id, name: name.trim() }, { onSuccess: () => { toast.success('Shortlist renamed'); onClose() } })
    else remove.mutate(list.id, { onSuccess: () => { toast.success('Shortlist deleted'); history.back() } })
  }
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={mode === 'rename' ? 'Rename shortlist' : `Delete “${list.name}”?`} description={mode === 'delete' ? 'The candidates are not affected; only this list is removed.' : undefined}>
      {mode === 'rename' && <Input aria-label="Shortlist name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}
      {mutation.error && <Alert variant="error" className="mt-4">{mutation.error.message}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={mutation.isPending || (mode === 'rename' && !name.trim())} onClick={submit} className={mode === 'delete' ? 'h-10 rounded-md bg-destructive px-4 text-white hover:bg-destructive/90' : 'h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover'}>
          {mutation.isPending && <Spinner />} {mode === 'rename' ? 'Save' : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
