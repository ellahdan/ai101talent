import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dashboardPath, useLogout, useMe } from '@/hooks/useAuth'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const t = useT(common).nav
  const links = [
    { to: '/jobs', label: t.findWork },
    { to: '/talent', label: t.findTalent },
    { to: '/#how', label: t.howItWorks },
    { to: '/#why', label: t.why },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = () => setMobileOpen(false)
  const onLogout = () => {
    close()
    logout.mutate(undefined, { onSettled: () => navigate('/') })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-foreground/10 transition-[background-color,box-shadow] duration-300',
        scrolled ? 'bg-background/85 shadow-[0_8px_24px_-16px_rgba(22,48,47,.35)] backdrop-blur-md' : 'bg-background',
      )}
    >
      <div className={cn('mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 sm:px-8', scrolled ? 'h-14' : 'h-16')}>
        <Logo />
        <nav aria-label={t.main} className="hidden items-center gap-7 text-sm md:flex">
          {links.map((link) => <Link key={link.to} to={link.to} className="hover:text-brand">{link.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          {me ? (
            <>
              <button type="button" onClick={onLogout} className={cn(buttonVariants({ variant: 'ghost' }), 'rounded-md')}>
                <LogOut data-icon="inline-start" aria-hidden /> {t.logOut}
              </button>
              <Link to={dashboardPath(me.role)} className={cn(buttonVariants(), 'rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
                <LayoutDashboard data-icon="inline-start" aria-hidden /> {t.dashboard}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'rounded-md')}>{t.logIn}</Link>
              <Link to="/register" className={cn(buttonVariants(), 'rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>{t.signUp}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            className="grid size-9 place-items-center"
            aria-label={mobileOpen ? t.closeMenu : t.openMenu}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <m.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-foreground/10 bg-surface md:hidden"
          >
            <div className="flex flex-col gap-4 px-4 py-5 text-sm">
              {links.map((link) => <Link key={link.to} to={link.to} onClick={close}>{link.label}</Link>)}
              {me ? (
                <>
                  <button type="button" onClick={onLogout} className="text-left">{t.logOut}</button>
                  <Link to={dashboardPath(me.role)} onClick={close} className={cn(buttonVariants(), 'w-full rounded-md bg-brand text-brand-foreground')}>{t.dashboard}</Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={close}>{t.logIn}</Link>
                  <Link to="/register" onClick={close} className={cn(buttonVariants(), 'w-full rounded-md bg-brand text-brand-foreground')}>{t.signUp}</Link>
                </>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  )
}
