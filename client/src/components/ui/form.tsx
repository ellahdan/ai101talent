import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const controlClass =
  'w-full rounded-md border border-foreground/15 bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, 'h-11', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'min-h-28 py-2.5 leading-relaxed', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlClass, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20fill=%27none%27%20stroke=%27%23839190%27%20stroke-width=%272%27%20viewBox=%270%200%2024%2024%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[position:right_.75rem_center] bg-no-repeat pr-9', className)} {...props}>
      {children}
    </select>
  )
})

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-foreground/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {visible ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
      </button>
    </div>
  )
})

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  /** Receives the ids to wire up: pass them to the control as id / aria-describedby / aria-invalid. */
  children: (ids: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}

/** Label + control + hint + error, with accessible wiring between them. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-semibold">
        {label}
        {optional && <span className="text-xs font-normal text-foreground/50">Optional</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className="text-xs text-foreground/55">{hint}</p>}
      {error && <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertCircle size={13} aria-hidden />{error}</p>}
    </div>
  )
}

const alertStyles = {
  error: { cls: 'border-destructive/30 bg-destructive/8 text-destructive', Icon: AlertCircle },
  success: { cls: 'border-brand/30 bg-brand-soft text-brand-soft-foreground', Icon: CheckCircle2 },
  info: { cls: 'border-foreground/12 bg-chip text-foreground/80', Icon: Info },
}

export function Alert({ variant = 'info', children, className }: { variant?: keyof typeof alertStyles; children: ReactNode; className?: string }) {
  const { cls, Icon } = alertStyles[variant]
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-md border px-3.5 py-3 text-sm', cls, className)}>
      <Icon size={17} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} size={16} aria-hidden />
}
