import { useEffect } from 'react'

const BASE = 'AI101 Talents'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Better work starts with a good connection`
  }, [title])
}
