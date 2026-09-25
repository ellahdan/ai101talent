import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Input, Spinner } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useCreateShortlist, useShortlists, useToggleShortlisted } from '@/hooks/useTalent'
import type { AnonymizedCandidate } from '@/types'
import { useT } from '@/i18n'
import { talentText } from '@/i18n/talent'

/** Add or remove a candidate from the company's shortlists, or create a new list on the spot. */
export function ShortlistDialog({ candidate, onClose }: { candidate: AnonymizedCandidate; onClose: () => void }) {
  const lists = useShortlists()
  const toggle = useToggleShortlisted()
  const create = useCreateShortlist()
  const [name, setName] = useState('')
  const t = useT(talentText).shortlist

  const onCreate = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(name.trim(), {
      onSuccess: (list) => {
        setName('')
        toggle.mutate({ listId: list.id, candidateId: candidate.id, add: true }, { onSuccess: () => toast.success(t.saved(list.name)) })
      },
    })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.title} description={<>{t.candidate} <span className="font-mono">{candidate.applicantNumber}</span> · {candidate.headline}</>}>
      {lists.isPending ? (
        <Spinner className="size-5 text-foreground/50" />
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {lists.data?.length === 0 && <li className="text-sm text-foreground/60">{t.none}</li>}
          {lists.data?.map((l) => {
            const inList = l.candidateIds.includes(candidate.id)
            return (
              <li key={l.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={inList}
                    disabled={toggle.isPending}
                    onChange={() => toggle.mutate({ listId: l.id, candidateId: candidate.id, add: !inList }, { onError: (e) => toast.error(e.message) })}
                  />
                  <span className="flex-1 text-sm font-medium">{l.name}</span>
                  <span className="text-xs text-foreground/50">{l.candidateIds.length}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={onCreate} className="mt-4 flex gap-2 border-t border-foreground/10 pt-4">
        <label htmlFor="new-shortlist" className="sr-only">{t.newName}</label>
        <Input id="new-shortlist" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.placeholder} maxLength={80} className="h-10" />
        <Button type="submit" disabled={!name.trim() || create.isPending} className="h-10 rounded-md bg-brand px-3 text-brand-foreground hover:bg-brand-hover"><Plus data-icon="inline-start" aria-hidden /> {t.create}</Button>
      </form>
      {create.error && <Alert variant="error" className="mt-3">{create.error.message}</Alert>}
      <div className="mt-5 flex justify-end"><Button type="button" variant="outline" className="h-10 rounded-md" onClick={onClose}>{t.done}</Button></div>
    </Modal>
  )
}
