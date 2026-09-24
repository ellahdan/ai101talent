import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/Reveal'

export function FinalCta() {
  return (
    <section className="px-4 pb-14 sm:px-8 sm:pb-20">
      <Reveal className="mx-auto max-w-7xl rounded-lg bg-ink p-7 text-ink-foreground sm:p-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.14em] text-brand-bright">Your next chapter starts here</p>
        <h2 className="max-w-2xl text-3xl font-medium tracking-[-.06em] sm:text-6xl">Find work that works for you.</h2>
        <p className="mt-5 max-w-md text-white/65">Join a network that puts people, potential, and possibility first.</p>
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <Link to="/apply" className={cn(buttonVariants(), 'rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>
            Get started <ArrowRight data-icon="inline-end" />
          </Link>
          <Link to="/register?role=company" className="text-sm font-semibold text-brand-bright underline-offset-4 hover:underline">Hiring? Find talent</Link>
        </div>
      </Reveal>
    </section>
  )
}
