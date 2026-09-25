import { useEffect } from 'react'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

const BASE = 'AI101 Talents'

export function useDocumentTitle(title?: string) {
  const tagline = useT(common).brandTagline
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — ${tagline}`
  }, [title, tagline])
}
