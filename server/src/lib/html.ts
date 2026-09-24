import sanitizeHtml from 'sanitize-html'

/** Allowed markup for rich-text job descriptions. Everything else (scripts, styles, attributes) is stripped. */
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'code', 'pre', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }) },
  })
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Case-insensitive exact-match regex, e.g. for skills and locations. */
export const exactCi = (s: string) => new RegExp(`^${escapeRegex(s.trim())}$`, 'i')
