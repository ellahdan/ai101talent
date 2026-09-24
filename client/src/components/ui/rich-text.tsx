import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading3, Italic, Link2, List, ListOrdered, Redo2, Underline, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextProps {
  value: string
  onChange: (html: string) => void
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  placeholder?: string
}

/** Minimal rich-text editor (headings, bold/italic/underline, lists, links). Output is sanitized on the server. */
export function RichTextEditor({ value, onChange, id, placeholder, ...aria }: RichTextProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https', 'mailto'] },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        ...(aria['aria-describedby'] ? { 'aria-describedby': aria['aria-describedby'] } : {}),
        ...(aria['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
        class: 'prose-job min-h-56 px-4 py-3 outline-none',
      },
    },
  })

  // Sync external changes (e.g. the form loading saved data) without emitting an update.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === '' && editor.isEmpty)) editor.commands.setContent(value, { emitUpdate: false })
  }, [value, editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            h3: e.isActive('heading', { level: 3 }),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            link: e.isActive('link'),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
            empty: e.isEmpty,
          }
        : null,
  })

  if (!editor || !state) return <div className="min-h-56 rounded-md border border-foreground/15 bg-surface" />

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link address (leave empty to remove the link)', previous ?? 'https://')
    if (url === null) return
    if (url.trim() === '' || url === 'https://') editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-surface transition focus-within:border-brand focus-within:ring-3 focus-within:ring-ring/40',
        aria['aria-invalid'] ? 'border-destructive' : 'border-foreground/15',
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-foreground/10 bg-chip/60 p-1.5">
        <Tool label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Tool>
        <Tool label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Tool>
        <Tool label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={16} /></Tool>
        <Sep />
        <Tool label="Heading" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Tool>
        <Tool label="Bulleted list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></Tool>
        <Tool label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></Tool>
        <Tool label="Link" active={state.link} onClick={setLink}><Link2 size={16} /></Tool>
        <Sep />
        <Tool label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></Tool>
        <Tool label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></Tool>
      </div>
      <div className="relative">
        {state.empty && placeholder && <p aria-hidden className="pointer-events-none absolute top-3 left-4 text-sm text-foreground/40">{placeholder}</p>}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Tool({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={cn('grid size-8 place-items-center rounded transition disabled:opacity-35', active ? 'bg-ink text-ink-foreground' : 'text-foreground/70 hover:bg-foreground/10')}
    >
      {children}
    </button>
  )
}

const Sep = () => <span aria-hidden className="mx-1 my-1.5 w-px bg-foreground/15" />
