import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/config'
import { Logo } from './Logo'

const columns = [
  { title: 'Candidates', links: [{ to: '/jobs', label: 'Browse jobs' }, { to: '/apply', label: 'Create a profile' }, { to: '/login', label: 'Log in' }] },
  { title: 'Companies', links: [{ to: '/register?role=company', label: 'Hire talent' }, { to: '/#how', label: 'How it works' }, { to: '/login', label: 'Company login' }] },
  { title: 'Legal', links: [{ to: '/privacy', label: 'Privacy policy' }, { to: '/terms', label: 'Terms of use' }] },
]

export function Footer() {
  return (
    <footer className="border-t border-foreground/10 px-4 pt-12 pb-7 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/60">A human-first talent platform. Every introduction is reviewed by our team.</p>
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
            <Link to="/privacy" className="hover:text-brand">Privacy</Link>
            <Link to="/terms" className="hover:text-brand">Terms</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-brand">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
