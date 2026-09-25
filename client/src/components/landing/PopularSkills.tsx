import { Link } from 'react-router-dom'
import { usePopularSkills } from '@/hooks/usePublicData'
import { defineText, useT } from '@/i18n'

const text = defineText({ heading: 'Popular skills' }, { heading: 'Gefragte Fähigkeiten' })

export function PopularSkills() {
  const { data, isLoading } = usePopularSkills()
  const skills = data ?? []
  const t = useT(text)
  const max = Math.max(1, ...skills.map((s) => s.count))
  const min = Math.min(max, ...skills.map((s) => s.count))

  return (
    <section aria-labelledby="skills-heading" className="border-b border-foreground/10 bg-surface px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p id="skills-heading" className="mb-4 text-xs font-semibold uppercase tracking-[.14em] text-foreground/50">{t.heading}</p>
        <ul className="flex flex-wrap items-center gap-2" aria-busy={isLoading}>
          {isLoading
            ? Array.from({ length: 10 }, (_, i) => <li key={i} className="h-9 animate-pulse rounded-full bg-chip" style={{ width: `${70 + ((i * 37) % 60)}px` }} />)
            : skills.map((skill) => {
                // Scale tags slightly by popularity to give the cloud some rhythm.
                const weight = max === min ? 0.5 : (skill.count - min) / (max - min)
                return (
                  <li key={skill.name}>
                    <Link
                      to={`/jobs?skills=${encodeURIComponent(skill.name)}`}
                      style={{ fontSize: `${0.8 + weight * 0.2}rem` }}
                      className={`block rounded-full border border-foreground/15 px-4 py-2 transition hover:-translate-y-0.5 hover:border-brand hover:text-brand ${weight > 0.66 ? 'font-semibold' : ''}`}
                    >
                      {skill.name}
                    </Link>
                  </li>
                )
              })}
        </ul>
      </div>
    </section>
  )
}
