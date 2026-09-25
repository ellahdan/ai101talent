import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { common } from '@/i18n/common'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}

/** Accessible modal (focus trap, Escape to close, labelled by its title) built on Base UI Dialog. */
export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  const t = useT(common)
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 overflow-y-auto overscroll-contain -translate-y-1/2 rounded-lg border border-foreground/12 bg-surface p-6 text-foreground shadow-2xl outline-none transition-all duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold tracking-[-.02em]">{title}</Dialog.Title>
            <Dialog.Close aria-label={t.actions.close} className="grid size-8 shrink-0 place-items-center rounded-md text-foreground/50 hover:bg-muted hover:text-foreground">
              <X size={17} aria-hidden />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="mt-2 text-sm leading-relaxed text-foreground/65">{description}</Dialog.Description>}
          {children && <div className="mt-5">{children}</div>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
