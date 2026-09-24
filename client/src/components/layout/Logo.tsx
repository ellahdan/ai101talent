import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="AI101 Talents home">
      <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground"><Sparkles size={16} aria-hidden /></span>
      <span className="text-base sm:text-lg">AI101 <span className="font-normal text-foreground/55">Talents</span></span>
    </Link>
  )
}
