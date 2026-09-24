import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Download, Eye, EyeOff, FileText, Globe, Link2, Mail, MailWarning, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/ui/form'
import { Highlight } from '@/components/ui/highlight'
import { StatusBadge } from '@/components/ui/status-badge'
import { openCandidateFile, useAdminCandidate } from '@/hooks/useAdminOffice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { proficiencyLabel, timeAgo, workModeLabel } from '@/lib/format'

export default function AdminCandidateDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const terms = (params.get('terms') ?? '').split(',').filter(Boolean)
  const { data: c, isPending, error } = useAdminCandidate(id)
  const [cvOpen, setCvOpen] = useState(terms.length > 0)
  useDocumentTitle(c ? `${c.fullName} (${c.applicantNumber})` : 'Candidate')

  if (isPending) return <Spinner className="size-6 text-foreground/50" />
  if (error || !c) return <Alert variant="error">{error?.message ?? 'Candidate not found'}</Alert>

  const open = (kind: 'cv' | 'cover-letter') => openCandidateFile(c.id, kind).catch((e) => toast.error(e.message))

  return (
    <>
      <Link to="/admin/candidates" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> Candidates</Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-[-.05em]">{c.fullName}</h1>
          <p className="mt-1 text-foreground/65"><span className="font-mono text-sm">{c.applicantNumber}</span> · <Highlight text={c.headline} terms={terms} /> · {c.totalYearsExperience} years</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1">{c.visible ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />} {c.visible ? 'Visible to companies' : 'Hidden from companies'}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1">{c.account.isVerified ? <Mail size={12} aria-hidden /> : <MailWarning size={12} aria-hidden />} {c.account.isVerified ? 'Email confirmed' : 'Email not confirmed'}</span>
            <span className="rounded-full bg-chip px-2.5 py-1">Joined {new Date(c.createdAt).toLocaleDateString()}{c.lastActiveAt ? ` · active ${timeAgo(c.lastActiveAt)}` : ''}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.cvFile && <Button type="button" className="h-10 rounded-md bg-brand px-4 text-brand-foreground hover:bg-brand-hover" onClick={() => open('cv')}><Download data-icon="inline-start" aria-hidden /> Open CV</Button>}
          {c.coverLetter?.file && <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => open('cover-letter')}><FileText data-icon="inline-start" aria-hidden /> Cover letter</Button>}
        </div>
      </header>
      <p className="mb-6 text-xs text-foreground/50">Opening this profile and its files is recorded in the audit log.</p>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Skills, tools and languages">
            <div className="flex flex-wrap gap-1.5">
              {c.skills.map((s) => <span key={s.name} className={terms.includes(s.name.toLowerCase()) ? 'rounded-full bg-amber-200 px-2.5 py-1 text-sm font-semibold dark:bg-amber-400/35' : 'rounded-full bg-brand-soft px-2.5 py-1 text-sm text-brand-soft-foreground'}>{s.name}{s.years != null && ` · ${s.years}y`}</span>)}
            </div>
            {c.tools.length > 0 && <p className="mt-3 text-sm"><strong>Tools:</strong> <Highlight text={c.tools.join(', ')} terms={terms} /></p>}
            <p className="mt-2 text-sm"><strong>Languages:</strong> {c.languages.map((l) => `${l.name} (${proficiencyLabel[l.proficiency]})`).join(', ')}</p>
          </Card>
          <Card title="Work history">
            {c.workHistory.length === 0 ? <p className="text-sm text-foreground/60">None listed.</p> : (
              <ol className="space-y-4">
                {c.workHistory.map((w, i) => (
                  <li key={i}>
                    <p className="font-semibold">{w.role} · {w.company}</p>
                    <p className="text-xs text-foreground/55">{w.startDate} – {w.endDate ?? 'present'}</p>
                    {w.description && <p className="mt-1 text-sm text-foreground/75"><Highlight text={w.description} terms={terms} /></p>}
                  </li>
                ))}
              </ol>
            )}
            {c.education.length > 0 && (
              <div className="mt-5 border-t border-foreground/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">Education</p>
                <ul className="mt-2 space-y-1 text-sm">{c.education.map((e, i) => <li key={i}>{[e.degree, e.field].filter(Boolean).join(', ')}{e.degree || e.field ? ' · ' : ''}{e.institution}{e.year ? ` (${e.year})` : ''}</li>)}</ul>
              </div>
            )}
          </Card>
          {c.coverLetter?.text && <Card title="Cover letter (profile)"><p className="text-sm leading-relaxed whitespace-pre-line">{c.coverLetter.text}</p></Card>}
          <Card title="CV text" action={<button type="button" className="text-sm font-semibold text-brand" aria-expanded={cvOpen} onClick={() => setCvOpen((o) => !o)}>{cvOpen ? 'Hide' : 'Show'}</button>}>
            {!c.cvText ? (
              <p className="text-sm text-foreground/60">No text could be extracted from this CV (it may be a scanned document).</p>
            ) : cvOpen ? (
              <pre className="max-h-[32rem] overflow-auto rounded-md bg-chip/60 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={c.cvText} terms={terms} /></pre>
            ) : (
              <p className="text-sm text-foreground/60">{c.cvText.length.toLocaleString()} characters extracted{terms.length ? ' · matches are highlighted' : ''}.</p>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Contact">
            <dl className="space-y-2 text-sm">
              <Row icon={Mail} label="Email"><a href={`mailto:${c.email}`} className="break-all text-brand">{c.email}</a></Row>
              {c.phone && <Row icon={Phone} label="Phone">{c.phone}</Row>}
              <Row icon={MapPin} label="Location">{[c.location.city, c.location.country].filter(Boolean).join(', ')}</Row>
              {c.links.linkedin && <Row icon={Link2} label="LinkedIn"><a href={c.links.linkedin} target="_blank" rel="noopener noreferrer" className="break-all text-brand">{c.links.linkedin.replace(/^https?:\/\//, '')}</a></Row>}
              {c.links.portfolio && <Row icon={Globe} label="Portfolio"><a href={c.links.portfolio} target="_blank" rel="noopener noreferrer" className="break-all text-brand">{c.links.portfolio.replace(/^https?:\/\//, '')}</a></Row>}
            </dl>
            <p className="mt-4 border-t border-foreground/10 pt-3 text-sm">{c.availability === 'immediately' ? 'Available immediately' : `Notice period: ${c.noticePeriodWeeks ?? '?'} weeks`}{c.workMode ? ` · prefers ${workModeLabel[c.workMode].toLowerCase()}` : ''}</p>
          </Card>
          <Card title={`Applications (${c.applications.length})`}>
            {c.applications.length === 0 ? <p className="text-sm text-foreground/60">None.</p> : (
              <ul className="space-y-3">
                {c.applications.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2">
                    <Link to={`/admin/pipeline?job=${a.job.id}`} className="min-w-0 text-sm hover:text-brand"><span className="font-semibold">{a.job.title}</span><br /><span className="text-xs text-foreground/55">{a.job.companyName} · {new Date(a.createdAt).toLocaleDateString()}</span></Link>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`Contact requests (${c.requests.length})`}>
            {c.requests.length === 0 ? <p className="text-sm text-foreground/60">None.</p> : (
              <ul className="space-y-3">
                {c.requests.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <Link to={`/admin/requests/${r.id}`} className="min-w-0 text-sm hover:text-brand"><span className="font-semibold">{r.companyName}</span><br /><span className="text-xs text-foreground/55">{r.roleTitle ?? 'Role'} · {new Date(r.createdAt).toLocaleDateString()}</span></Link>
                    <StatusBadge status={r.status} label={r.status === 'rejected' ? 'Rejected' : undefined} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  )
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-foreground/12 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{title}</h2>{action}</div>
      {children}
    </section>
  )
}

function Row({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <dt><Icon size={15} className="mt-0.5 text-foreground/45" aria-label={label} /></dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
