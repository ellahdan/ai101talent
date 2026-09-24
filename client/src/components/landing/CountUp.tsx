import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'

const format = new Intl.NumberFormat('en')

/**
 * Counts from 0 to `value` the first time it scrolls into view. Frames write straight to the DOM
 * (no React re-render per frame), which keeps the main thread free during page load.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' })
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = numberRef.current
    if (!el || !inView) return
    if (reduceMotion) {
      el.textContent = format.format(value)
      return
    }
    const controls = animate(0, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = format.format(Math.round(v)) } })
    return () => controls.stop()
  }, [inView, value, reduceMotion])

  return (
    <span ref={ref}>
      <span ref={numberRef} aria-hidden>{reduceMotion ? format.format(value) : '0'}</span>
      <span className="sr-only">{format.format(value)}</span>
    </span>
  )
}
