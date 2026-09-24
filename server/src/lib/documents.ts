import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { badRequest } from './errors.js'

export const PDF = 'application/pdf'
export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

const MAX_TEXT = 200_000

export interface UploadedFile {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}

/**
 * Checks the file's real content, not just its declared type: PDFs start with "%PDF-",
 * DOCX files are ZIP archives ("PK\x03\x04") containing word/document.xml.
 */
export function assertDocument(file: UploadedFile, label: string) {
  if (file.size > MAX_DOCUMENT_BYTES) throw badRequest(`${label} must be 5 MB or smaller`, 'FILE_TOO_LARGE')
  const head = file.buffer.subarray(0, 5).toString('latin1')
  const isPdf = file.mimetype === PDF && head === '%PDF-'
  const isDocx = file.mimetype === DOCX && head.startsWith('PK\u0003\u0004') && file.buffer.includes('word/document.xml')
  if (!isPdf && !isDocx) throw badRequest(`${label} must be a PDF or Word (.docx) file`, 'INVALID_FILE_TYPE')
}

/** Extracts plain text from a PDF or DOCX for keyword search. Returns '' if the document has no readable text. */
export async function extractText(file: UploadedFile): Promise<string> {
  try {
    let text = ''
    if (file.mimetype === PDF) {
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) })
      try {
        text = (await parser.getText()).text
      } finally {
        await parser.destroy()
      }
    } else if (file.mimetype === DOCX) {
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value
    }
    return text
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_TEXT)
  } catch (err) {
    // A scanned or unusual document shouldn't block the application; it just won't be keyword-searchable.
    console.warn('[documents] text extraction failed:', (err as Error).message)
    return ''
  }
}
