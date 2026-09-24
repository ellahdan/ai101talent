import { useEffect, useState } from 'react'

/** Types and deletes each phrase in turn. Returns '' when disabled. */
export function useTypewriter(phrases: string[], enabled: boolean) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!enabled || phrases.length === 0) {
      setText('')
      return
    }
    let phrase = 0
    let chars = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const current = phrases[phrase]
      chars += deleting ? -1 : 1
      setText(current.slice(0, chars))

      let delay = deleting ? 28 : 65
      if (!deleting && chars === current.length) {
        deleting = true
        delay = 1700
      } else if (deleting && chars === 0) {
        deleting = false
        phrase = (phrase + 1) % phrases.length
        delay = 350
      }
      timer = setTimeout(tick, delay)
    }
    timer = setTimeout(tick, 400)
    return () => clearTimeout(timer)
  }, [phrases, enabled])

  return text
}
