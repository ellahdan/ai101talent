import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Eye, EyeOff, Inbox, ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMyApplications, useMyProfile, useMyRequests } from '@/hooks/useCandidate'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { timeAgo } from '@/lib/format'
import { NoProfile } from './CandidateLayout'
import { useT } from '@/i18n'
import { candidateText } from '@/i18n/candidate'

export default function CandidateDashboard() {
  const t = useT(candidateText).dashboard
  useDocumentTitle(t.title)
  const profile = useMyProfile()
  const hasProfile = Boolean(profile.data)
  const applications = useMyApplications(hasProfile)
  const requests = useMyRequests(hasProfile)
  const [copied, setCopied] = useState(false)

  if (profile.isPending) return <Spinner className="size-6 text-foreground/50" />
  if (!profile.data) return <><PageHeader title={t.welcome} /><NoProfile /></>

  const p = profile.data
  const awaiting = requests.data?.filter((r) => r.status === 'forwarded_to_candidate') ?? []
  const active = applications.data?.filter((a) => !['rejected', 'hired'].includes(a.status)).length ?? 0

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.applicantNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <>
      <PageHeader title={t.hi(p.fullName.split(' ')[0])} description={t.description} />

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded-lg bg-ink p-6 text-ink-foreground">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-bright">{t.applicantNumber}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-wide">{p.applicantNumber}</p>
          <button type="button" onClick={copy} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? t.copied : t.copy}
          </button>
        </div>
        <Stat label={t.activeApplications} value={applications.isPending ? '…' : String(active)} icon={ListChecks} to="/candidate/applications" />
        <Stat label={t.awaitingReply} value={requests.isPending ? '…' : String(awaiting.length)} icon={Inbox} to="/candidate/requests" highlight={awaiting.length > 0} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-foreground/12 bg-surface px-5 py-4">
        <p className="flex items-center gap-2 text-sm">
          {p.visible ? <Eye size={17} className="text-brand" aria-hidden /> : <EyeOff size={17} className="text-foreground/50" aria-hidden />}
          {p.visible ? t.visible : t.hidden}
        </p>
        <Link to="/candidate/profile" className="text-sm font-semibold text-brand">{t.change}</Link>
      </div>

      {awaiting.length > 0 && (
        <section className="mt-8" aria-labelledby="awaiting-heading">
          <h2 id="awaiting-heading" className="text-lg font-semibold tracking-[-.02em]">{t.wantsToTalk}</h2>
          <ul className="mt-3 space-y-3">
            {awaiting.map((r) => (
              <li key={r.id}>
                <Link to={`/candidate/requests#${r.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-brand/40 bg-brand-soft/50 px-5 py-4 transition hover:border-brand">
                  <span>
                    <span className="block font-semibold">{r.company.name}</span>
                    <span className="block text-sm text-foreground/65">{r.job?.title ?? r.roleTitle ?? t.openRole} · {t.received(timeAgo(r.updatedAt))}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{t.review} <ArrowRight size={15} aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold tracking-[-.02em]">{t.recent}</h2>
          <Link to="/candidate/applications" className="text-sm font-semibold text-brand">{t.seeAll}</Link>
        </div>
        {applications.isPending ? (
          <Spinner className="mt-4 size-5 text-foreground/50" />
        ) : applications.data?.length ? (
          <ul className="mt-3 divide-y divide-foreground/10 rounded-lg border border-foreground/12 bg-surface">
            {applications.data.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.job.title}</p>
                  <p className="text-sm text-foreground/60">{a.job.companyName} · {t.applied(timeAgo(a.createdAt))}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-foreground/20 p-6 text-center text-sm text-foreground/60">
            {t.none} <Link to="/jobs" className="font-semibold text-brand">{t.browse}</Link>
          </p>
        )}
      </section>
    </>
  )
}

function Stat({ label, value, icon: Icon, to, highlight }: { label: string; value: string; icon: typeof Inbox; to: string; highlight?: boolean }) {
  return (
    <Link to={to} className={`rounded-lg border p-6 transition hover:border-brand/60 ${highlight ? 'border-brand/50 bg-brand-soft/50' : 'border-foreground/12 bg-surface'}`}>
      <Icon size={20} className="text-brand" aria-hidden />
      <p className="mt-4 text-3xl font-medium">{value}</p>
      <p className="mt-1 text-sm text-foreground/60">{label}</p>
    </Link>
  )
}
