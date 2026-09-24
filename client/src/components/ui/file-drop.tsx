import { useId, useRef, useState, type DragEvent } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Returns an error message, or null if the file is an acceptable PDF/DOCX under 5 MB. */
export function checkDocument(file: File) {
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Upload a PDF or Word (.docx) file'
  if (file.size > MAX_FILE_BYTES) return 'The file must be 5 MB or smaller'
  return null
}

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

interface FileDropProps {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  error?: string
  /** Name of an already stored file, shown when no new file is picked. */
  currentName?: string
  hint?: string
}

/** Drag-and-drop or click-to-browse zone for a single PDF/DOCX document. */
export function FileDrop({ label, file, onChange, error, currentName, hint = 'PDF or Word (.docx), up to 5 MB' }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const shownError = localError ?? error

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = checkDocument(f)
    setLocalError(problem)
    if (!problem) onChange(f)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {file ? (
        <div className="flex items-center gap-3 rounded-md border border-brand/40 bg-brand-soft/60 px-4 py-3">
          <FileText size={20} className="shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-foreground/55">{formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label={`Remove ${file.name}`} className="grid size-8 place-items-center rounded-md text-foreground/60 hover:bg-foreground/10">
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-7 text-center transition',
            dragging ? 'border-brand bg-brand-soft/60' : 'border-foreground/20',
            shownError && 'border-destructive/60',
          )}
        >
          <UploadCloud size={26} className="text-brand" aria-hidden />
          <p className="text-sm">
            <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-brand underline-offset-4 hover:underline">
              Choose a file
            </button>{' '}
            or drag it here
          </p>
          <p className="text-xs text-foreground/55">{hint}</p>
          {currentName && <p className="text-xs text-foreground/65">Current file: <span className="font-semibold">{currentName}</span></p>}
        </div>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-invalid={shownError ? true : undefined}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {shownError && <p role="alert" className="text-xs font-medium text-destructive">{shownError}</p>}
    </div>
  )
}
