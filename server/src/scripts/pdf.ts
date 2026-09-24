// Minimal PDF writer for seed CVs: plain text in Helvetica, wrapped and paginated. No dependencies.

const PAGE_W = 595 // A4 in points
const PAGE_H = 842
const MARGIN = 56
const LINE_H = 15
const MAX_CHARS = 92
const LINES_PER_PAGE = Math.floor((PAGE_H - 2 * MARGIN) / LINE_H)

/** Standard fonts use WinAnsi encoding; replace the few common characters outside Latin-1. */
function toWinAnsi(s: string) {
  return s
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/[^\x00-\xFF]/g, '?')
}

const escapePdf = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

function wrap(text: string) {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      if ((line + ' ' + word).trim().length > MAX_CHARS) {
        out.push(line)
        line = word
      } else {
        line = (line ? line + ' ' : '') + word
      }
    }
    out.push(line)
  }
  return out
}

export function textToPdf(text: string): Buffer {
  const lines = wrap(toWinAnsi(text))
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE))
  if (!pages.length) pages.push([''])

  // Objects: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  const objects: string[] = []
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach((pageLines, i) => {
    const content = [
      'BT',
      '/F1 10.5 Tf',
      `${LINE_H} TL`,
      `${MARGIN} ${PAGE_H - MARGIN} Td`,
      ...pageLines.map((l) => `(${escapePdf(l)}) '`),
      'ET',
    ].join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
