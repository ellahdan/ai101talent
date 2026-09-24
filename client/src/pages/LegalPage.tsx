import type { ReactNode } from 'react'

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">Legal</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-foreground/55">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/75 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-.02em] [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </div>
    </article>
  )
}
