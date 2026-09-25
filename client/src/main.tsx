import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LazyMotion, MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from '@/hooks/useTheme'
import { LangProvider } from '@/i18n'
import { router } from '@/router'
import './index.css'

const loadMotionFeatures = () => import('@/lib/motion-features').then((mod) => mod.default)

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* "user" disables transform/layout animations when the OS asks for reduced motion. */}
        <MotionConfig reducedMotion="user">
          {/* strict: only the lightweight m.* components are allowed; features load asynchronously. */}
          <LazyMotion features={loadMotionFeatures} strict>
            <RouterProvider router={router} />
            <ThemedToaster />
          </LazyMotion>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
    </LangProvider>
  </StrictMode>,
)

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="top-center" richColors closeButton />
}
