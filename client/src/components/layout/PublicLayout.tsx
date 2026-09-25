import { Outlet } from 'react-router-dom'
import { VerifyBanner } from '@/components/auth/VerifyBanner'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export function PublicLayout() {
  const t = useT(common)
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">
        {t.skipToContent}
      </a>
      <Navbar />
      <VerifyBanner />
      {/* Min height keeps the footer below the fold while lazy pages load (no layout shift). */}
      <main id="main" className="min-h-[calc(100vh-4rem)] flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
