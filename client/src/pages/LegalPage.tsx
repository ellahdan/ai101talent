import type { ReactNode } from 'react'
import { defineText, useT } from '@/i18n'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const text = defineText(
  { legal: 'Legal', updated: (when: string) => `Last updated ${when}`, date: 'September 2026' },
  { legal: 'Rechtliches', updated: (when: string) => `Zuletzt aktualisiert: ${when}`, date: 'September 2026' },
)

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const t = useT(text)
  useDocumentTitle(title)
  return (
    <article className="px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand">{t.legal}</p>
        <h1 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-foreground/55">{t.updated(t.date)}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/75 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-.02em] [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </div>
    </article>
  )
}
