import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, type LucideIcon } from 'lucide-react'
import { VerifyBanner } from '@/components/auth/VerifyBanner'
import { useLogout, useMe } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

/** Dashboard layout for signed-in areas: top bar, sidebar navigation (tabs on mobile) and page content. */
export function AppShell({ area, nav }: { area: string; nav: NavItem[] }) {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const t = useT(common)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">{t.skipToContent}</a>
      <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-foreground sm:inline">{area}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden max-w-56 truncate text-sm text-foreground/60 md:inline">{me?.email}</span>
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/') })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm hover:bg-muted"
            >
              <LogOut size={16} aria-hidden /> <span className="hidden sm:inline">{t.nav.logOut}</span>
            </button>
          </div>
        </div>
        {/* Mobile: horizontal tabs */}
        <nav aria-label={t.shell.navigation(area)} className="border-t border-foreground/10 lg:hidden">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2">
            {nav.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavItemLink item={item} compact />
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <VerifyBanner />

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t.shell.navigation(area)} className="hidden lg:block">
          <ul className="sticky top-20 space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavItemLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <main id="app-main" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItemLink({ item, compact }: { item: NavItem; compact?: boolean }) {
  const t = useT(common)
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md text-sm font-medium transition',
          compact ? 'px-3 py-1.5' : 'px-3 py-2.5',
          isActive ? 'bg-brand-soft font-semibold text-brand-soft-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon size={17} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-foreground" aria-label={t.shell.needAttention(item.badge)}>
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-foreground/60">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-foreground/20 bg-surface px-6 py-12 text-center">
      <Icon size={28} className="mx-auto text-brand" aria-hidden />
      <p className="mt-4 font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-foreground/60">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
