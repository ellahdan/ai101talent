import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/config'
import { Logo } from './Logo'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export function Footer() {
  const c = useT(common)
  const t = c.footer
  const columns = [
    { title: t.candidates, links: [{ to: '/jobs', label: t.browseJobs }, { to: '/apply', label: t.createProfile }, { to: '/login', label: c.nav.logIn }] },
    { title: t.companies, links: [{ to: '/talent', label: t.findTalent }, { to: '/register?role=company', label: t.registerCompany }, { to: '/login', label: t.companyLogin }] },
    { title: t.legal, links: [{ to: '/privacy', label: t.privacyPolicy }, { to: '/terms', label: t.terms }] },
  ]
  return (
    <footer className="border-t border-foreground/10 px-4 pt-12 pb-7 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/60">{t.blurb}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-soft-foreground hover:text-brand">
              <Mail size={15} aria-hidden /> {CONTACT_EMAIL}
            </a>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{col.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => <li key={l.label}><Link to={l.to} className="text-foreground/70 hover:text-brand">{l.label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-foreground/10 pt-7 text-sm text-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AI101 Talents</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-brand">{t.privacy}</Link>
            <Link to="/terms" className="hover:text-brand">{t.termsShort}</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-brand">{t.contact}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
