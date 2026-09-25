import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, GraduationCap, Languages, MapPin, MessageSquarePlus, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { ACTIVE_REQUEST, availabilityText } from '@/components/talent/TalentCard'
import { ShortlistDialog } from '@/components/talent/ShortlistDialog'
import { RequestDialog } from '@/components/talent/RequestDialog'
import { ContactGate } from '@/components/talent/ContactGate'
import { useTalentDetail } from '@/hooks/useTalent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMe } from '@/hooks/useAuth'
import { proficiencyLabel, workModeLabel } from '@/lib/format'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'
import { talentText } from '@/i18n/talent'

/** Company dashboard view of an anonymized profile. Contacting needs an approved company. */
export default function CandidateView() {
  const { id } = useParams()
  const { data: me } = useMe()
  const approved = me?.company?.status === 'approved' && Boolean(me?.isVerified)
  return <CandidateProfile id={id} canAct={approved} searchHref="/company/search" />
}

/** Anonymized profile: skills and experience only. Contact details come through an admin introduction. */
export function CandidateProfile({ id, canAct, searchHref }: { id: string | undefined; canAct: boolean; searchHref: string }) {
  const { data: c, isPending, error } = useTalentDetail(id)
  const [dialog, setDialog] = useState<'save' | 'request' | null>(null)
  const navigate = useNavigate()
  const t = useT(talentText).profile
  const labels = useT(common)
  useDocumentTitle(c ? t.title(c.applicantNumber) : t.fallbackTitle)

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error || !c) return <Alert variant="error">{error?.message ?? t.notFound} <Link to={searchHref} className="font-semibold underline">{t.backToSearch}</Link></Alert>

  const activeRequest = c.requestStatus && ACTIVE_REQUEST.includes(c.requestStatus)
  const place = [c.location.city, c.location.country].filter(Boolean).join(', ')
  // Opened from a shared link there is no page to go back to.
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(searchHref))

  return (
    <>
      <button type="button" onClick={goBack} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {labels.actions.back}</button>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <header className="rounded-lg border border-foreground/12 bg-surface p-6">
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><UserRound size={26} aria-hidden /></div>
              <div className="min-w-0">
                <h1 className="text-2xl font-medium tracking-[-.04em] sm:text-3xl">{c.headline}</h1>
                <p className="font-mono text-sm text-foreground/55">{c.applicantNumber}</p>
              </div>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/65">
              <li className="flex items-center gap-1.5"><MapPin size={15} aria-hidden /> {place}{c.workMode ? ` · ${labels.prefers(workModeLabel[c.workMode])}` : ''}</li>
              <li className="flex items-center gap-1.5"><Clock size={15} aria-hidden /> {availabilityText(c)}</li>
              <li className="font-semibold text-foreground">{labels.yearsOfExperience(c.totalYearsExperience)}</li>
            </ul>
          </header>

          <Section title={t.skills}>
            <ul className="flex flex-wrap gap-2">
              {c.skills.map((s) => <li key={s.name} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-soft-foreground">{s.name}{s.years != null && <span className="font-normal opacity-75"> · {labels.yearsShort(s.years)}</span>}</li>)}
            </ul>
            {c.tools.length > 0 && <p className="mt-4 text-sm"><span className="font-semibold">{t.tools}</span> <span className="text-foreground/70">{c.tools.join(', ')}</span></p>}
          </Section>

          <Section title={t.experience}>
            {c.roles.length ? (
              <ol className="relative space-y-4 border-l-2 border-brand-soft pl-5">
                {c.roles.map((r, i) => (
                  <li key={i}>
                    <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-brand" aria-hidden />
                    <p className="font-semibold">{r.role}</p>
                    <p className="text-sm text-foreground/60">{r.startYear} – {r.endYear ?? labels.present}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-foreground/60">{t.noRoles}</p>}
            <p className="mt-4 text-xs text-foreground/50">{t.hiddenEmployers}</p>
          </Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title={t.languages}>
              <ul className="space-y-1.5 text-sm">{c.languages.map((l) => <li key={l.name} className="flex items-center gap-2"><Languages size={14} className="text-foreground/45" aria-hidden /> {l.name} <span className="text-foreground/55">· {proficiencyLabel[l.proficiency]}</span></li>)}</ul>
            </Section>
            <Section title={t.education}>
              {c.education.length ? (
                <ul className="space-y-1.5 text-sm">{c.education.map((e, i) => <li key={i} className="flex items-center gap-2"><GraduationCap size={14} className="text-foreground/45" aria-hidden /> {[e.degree, e.field].filter(Boolean).join(', ') || t.studies}{e.year ? ` · ${e.year}` : ''}</li>)}</ul>
              ) : <p className="text-sm text-foreground/60">{t.notProvided}</p>}
            </Section>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-3 rounded-lg border border-foreground/12 bg-surface p-5">
            {c.requestStatus && <div className="flex items-center justify-between text-sm"><span className="text-foreground/60">{t.yourRequest}</span><StatusBadge status={c.requestStatus} label={c.requestStatus === 'rejected' ? t.notForwarded : undefined} /></div>}
            <Button type="button" className="h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover" disabled={activeRequest} onClick={() => setDialog('request')}>
              <MessageSquarePlus data-icon="inline-start" aria-hidden /> {activeRequest ? t.inProgress : t.request}
            </Button>
            <Button type="button" variant="outline" className="h-11 w-full rounded-md" onClick={() => setDialog('save')}>
              {c.shortlists.length ? <BookmarkCheck data-icon="inline-start" aria-hidden className="text-brand" /> : <Bookmark data-icon="inline-start" aria-hidden />} {c.shortlists.length ? t.inShortlists(c.shortlists.length) : t.saveToShortlist}
            </Button>
          </div>
          <p className="flex gap-2 rounded-lg bg-brand-soft/60 p-4 text-sm"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {t.privacy}</p>
        </aside>
      </div>

      {dialog && !canAct && <ContactGate candidate={c} reason={dialog === 'save' ? 'save' : 'contact'} onClose={() => setDialog(null)} />}
      {dialog === 'save' && canAct && <ShortlistDialog candidate={c} onClose={() => setDialog(null)} />}
      {dialog === 'request' && canAct && <RequestDialog candidate={c} onClose={() => setDialog(null)} />}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</h2>
      {children}
    </section>
  )
}
