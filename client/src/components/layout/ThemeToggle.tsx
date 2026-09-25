import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const t = useT(common).theme
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? t.toLight : t.toDark}
      className={cn('grid size-9 place-items-center rounded-md text-foreground/70 transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none', className)}
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
