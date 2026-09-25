import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import { FileText, GripVertical, KanbanSquare } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Alert, Select, Spinner } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { statusLabel } from '@/components/ui/status-badge'
import { useAdminJobs } from '@/hooks/useAdmin'
import { openApplicationLetter, useMoveApplication, usePipeline } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUSES, type ApplicationStatus, type PipelineCard } from '@/types'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { adminText } from '@/i18n/admin'

export default function AdminPipeline() {
  const t = useT(adminText).pipeline
  const labels = useT(common)
  useDocumentTitle(t.title)
  const [params, setParams] = useSearchParams()
  const jobs = useAdminJobs()
  // Default to the position with the most applications.
  const defaultJob = useMemo(() => [...(jobs.data ?? [])].sort((a, b) => b.applicationCount - a.applicationCount)[0]?.id, [jobs.data])
  const jobId = params.get('job') ?? defaultJob

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-5 max-w-xl">
        <label htmlFor="pipeline-job" className="mb-1.5 block text-sm font-semibold">{t.position}</label>
        <Select id="pipeline-job" value={jobId ?? ''} onChange={(e) => setParams({ job: e.target.value }, { replace: true })} disabled={jobs.isPending}>
          {jobs.data?.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company.name} ({j.applicationCount}){j.status !== 'open' ? ` · ${labels.status[j.status]}` : ''}</option>)}
        </Select>
      </div>
      {jobs.isPending ? <Spinner className="size-6 text-foreground/50" /> : jobId ? <Board key={jobId} jobId={jobId} /> : <EmptyState icon={KanbanSquare} title={t.noJobs} />}
    </>
  )
}

function Board({ jobId }: { jobId: string }) {
  const { data, isPending, error } = usePipeline(jobId)
  const move = useMoveApplication(jobId)
  const [dragging, setDragging] = useState<PipelineCard | null>(null)
  const [letter, setLetter] = useState<PipelineCard | null>(null)
  const t = useT(adminText).pipeline
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor))

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error) return <Alert variant="error">{error.message}</Alert>

  const byId = new Map(data.applications.map((a) => [a.id, a]))
  const name = (id: string | number) => byId.get(String(id))?.candidate.fullName ?? t.application
  const column = (id?: string | number) => (id ? statusLabel(String(id) as ApplicationStatus) : t.noColumn)

  const moveTo = (card: PipelineCard, status: ApplicationStatus) => {
    if (card.status === status) return
    move.mutate({ id: card.id, status }, { onSuccess: () => toast.success(`${card.candidate.fullName} → ${statusLabel(status)}`), onError: (e) => toast.error(e.message) })
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const card = byId.get(String(active.id))
    if (card && over) moveTo(card, over.id as ApplicationStatus)
  }

  // Screen reader announcements with names and stage labels instead of raw ids.
  const announcements: Announcements = {
    onDragStart: ({ active }) => t.pickedUp(name(active.id)),
    onDragOver: ({ active, over }) => t.over(name(active.id), column(over?.id)),
    onDragEnd: ({ active, over }) => (over ? t.moved(name(active.id), column(over.id)) : t.dropped(name(active.id))),
    onDragCancel: ({ active }) => t.cancelled(name(active.id)),
  }

  if (data.applications.length === 0) return <EmptyState icon={KanbanSquare} title={t.noApplications} />

  return (
    <DndContext sensors={sensors} accessibility={{ announcements }} onDragStart={({ active }) => setDragging(byId.get(String(active.id)) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1120px] grid-cols-7 gap-3">
          {APPLICATION_STATUSES.map((status) => (
            <Column key={status} status={status} cards={data.applications.filter((a) => a.status === status)} onMove={moveTo} onLetter={setLetter} />
          ))}
        </div>
      </div>
      <DragOverlay>{dragging ? <CardBody card={dragging} overlay /> : null}</DragOverlay>

      {letter && (
        <Modal open onOpenChange={(o) => !o && setLetter(null)} title={t.letterTitle(letter.candidate.fullName)} className="max-w-lg">
          {letter.coverLetter?.text && <p className="max-h-80 overflow-y-auto text-sm leading-relaxed whitespace-pre-line">{letter.coverLetter.text}</p>}
          {letter.coverLetter?.hasFile && (
            <button type="button" onClick={() => openApplicationLetter(letter.id).catch((e) => toast.error(e.message))} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
              <FileText size={15} aria-hidden /> {t.openFile}
            </button>
          )}
        </Modal>
      )}
    </DndContext>
  )
}

function Column({ status, cards, onMove, onLetter }: { status: ApplicationStatus; cards: PipelineCard[]; onMove: (c: PipelineCard, s: ApplicationStatus) => void; onLetter: (c: PipelineCard) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section ref={setNodeRef} aria-label={`${statusLabel(status)} (${cards.length})`} className={cn('flex min-h-[420px] flex-col rounded-lg border p-2 transition-colors', isOver ? 'border-brand bg-brand-soft/60' : 'border-foreground/10 bg-chip/50')}>
      <h2 className="flex items-center justify-between px-1.5 py-1 text-sm font-semibold">
        {statusLabel(status)} <span className="rounded-full bg-surface px-2 text-xs text-foreground/60">{cards.length}</span>
      </h2>
      <ul className="mt-2 flex-1 space-y-2">
        {cards.map((card) => <DraggableCard key={card.id} card={card} onMove={onMove} onLetter={onLetter} />)}
      </ul>
    </section>
  )
}

function DraggableCard({ card, onMove, onLetter }: { card: PipelineCard; onMove: (c: PipelineCard, s: ApplicationStatus) => void; onLetter: (c: PipelineCard) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  return (
    <li ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <CardBody card={card} handle={{ ...attributes, ...listeners }} onMove={onMove} onLetter={onLetter} />
    </li>
  )
}

function CardBody({ card, handle, overlay, onMove, onLetter }: { card: PipelineCard; handle?: Record<string, unknown>; overlay?: boolean; onMove?: (c: PipelineCard, s: ApplicationStatus) => void; onLetter?: (c: PipelineCard) => void }) {
  const t = useT(adminText).pipeline
  const labels = useT(common)
  return (
    <div className={cn('rounded-md border border-foreground/12 bg-surface p-3 text-sm', overlay && 'rotate-2 shadow-xl')}>
      <div className="flex items-start gap-1.5">
        <button type="button" aria-label={t.drag(card.candidate.fullName)} className="-ml-1 grid h-6 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-foreground/40 hover:bg-muted active:cursor-grabbing" {...handle}>
          <GripVertical size={14} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <Link to={`/admin/candidates/${card.candidate.id}`} className="block truncate font-semibold hover:text-brand">{card.candidate.fullName}</Link>
          <p className="font-mono text-[11px] text-foreground/50">{card.candidate.applicantNumber}</p>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-foreground/65">{card.candidate.headline} · {labels.yearsShort(card.candidate.totalYearsExperience)}</p>
      <p className="mt-1 truncate text-xs text-foreground/50">{card.candidate.topSkills.join(', ')}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-foreground/45">{timeAgo(card.updatedAt)}</span>
        {card.coverLetter && onLetter && (
          <button type="button" onClick={() => onLetter(card)} aria-label={t.letterFrom(card.candidate.fullName)} className="grid size-6 place-items-center rounded text-foreground/50 hover:bg-muted hover:text-brand">
            <FileText size={13} aria-hidden />
          </button>
        )}
      </div>
      {onMove && (
        <select
          aria-label={t.moveTo(card.candidate.fullName)}
          value={card.status}
          onChange={(e) => onMove(card, e.target.value as ApplicationStatus)}
          className="mt-2 h-7 w-full rounded border border-foreground/12 bg-surface px-1.5 text-xs"
        >
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      )}
    </div>
  )
}
