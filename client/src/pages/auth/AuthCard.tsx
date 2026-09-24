import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AuthCard({ title, subtitle, children, footer, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <section className="px-4 py-12 sm:px-8 sm:py-20">
      <div className={cn('mx-auto', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="rounded-lg border border-foreground/12 bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-medium tracking-[-.05em]">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-foreground/60">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-foreground/60">{footer}</div>}
      </div>
    </section>
  )
}

export const submitClass = 'h-11 w-full rounded-md bg-brand text-brand-foreground hover:bg-brand-hover'
