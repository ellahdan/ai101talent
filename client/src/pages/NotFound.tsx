import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export default function NotFound() {
  const t = useT(common).notFound
  return (
    <section className="px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-.05em] sm:text-5xl">{t.title}</h1>
        <p className="mt-4 text-foreground/60">{t.text}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className={cn(buttonVariants(), 'rounded-md bg-brand text-brand-foreground hover:bg-brand-hover')}>{t.home}</Link>
          <Link to="/jobs" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-md')}>{t.jobs}</Link>
        </div>
      </div>
    </section>
  )
}
