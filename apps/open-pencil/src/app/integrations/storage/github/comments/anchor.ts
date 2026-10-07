import * as v from 'valibot'

/**
 * Where a comment points: written into the issue body as a hidden HTML comment, so the
 * issue reads normally on GitHub and the editor can place its pin.
 *
 * `x`/`y` are absolute canvas coordinates when the comment was made; `dx`/`dy` are the
 * offset from the anchor node's absolute position, so the pin follows the node.
 */
export type CommentAnchor = {
  doc: string
  page: string
  node: string | null
  x: number
  y: number
  dx: number
  dy: number
  branch: string
  commit: string
}

const MARKER = 'openpencil:anchor'
/** Bodies and anchor JSON longer than this are not parsed for an anchor. */
const MAX_BODY_LENGTH = 65_536
const MAX_ANCHOR_LENGTH = 2_048
const MAX_COORDINATE = 1e7

export const COMMENT_LABEL = 'design-comment'
/** GitHub label names are at most 50 characters. */
const MAX_LABEL_LENGTH = 50
export const MAX_COMMENT_TITLE_LENGTH = 80

const Identifier = v.pipe(v.string(), v.maxLength(200), v.regex(/^[^\s<>"]*$/))
const Coordinate = v.pipe(
  v.number(),
  v.finite(),
  v.minValue(-MAX_COORDINATE),
  v.maxValue(MAX_COORDINATE)
)

const AnchorSchema = v.object({
  doc: v.pipe(Identifier, v.minLength(1)),
  page: v.pipe(Identifier, v.minLength(1)),
  node: v.optional(v.nullable(Identifier), null),
  x: Coordinate,
  y: Coordinate,
  dx: v.optional(Coordinate, 0),
  dy: v.optional(Coordinate, 0),
  branch: v.optional(v.pipe(v.string(), v.maxLength(255)), ''),
  commit: v.optional(v.pipe(v.string(), v.regex(/^[0-9a-f]{0,64}$/)), '')
})

/** The label that ties issues to one document: `doc:<slug>`. */
export function documentLabel(slug: string): string {
  return `doc:${slug}`.slice(0, MAX_LABEL_LENGTH)
}

/** The hidden block appended to an issue body; `--`, `<` and `>` are escaped inside it. */
export function anchorBlock(anchor: CommentAnchor): string {
  const json = JSON.stringify(anchor)
    .replaceAll('--', '-\\u002d')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
  return `<!-- ${MARKER} ${json} -->`
}

const BLOCK_PATTERN = /<!--\s*openpencil:anchor\s+(\{[^<>]*?\})\s*-->/g

/**
 * The anchor of an issue body, or null. Malformed, oversized or hostile blocks are ignored
 * rather than trusted: values are bounded and must be finite. The last block wins, since
 * the editor appends it after the comment text.
 */
export function parseAnchor(body: string | null | undefined): CommentAnchor | null {
  if (!body || body.length > MAX_BODY_LENGTH) return null
  let last: string | null = null
  for (const match of body.matchAll(BLOCK_PATTERN)) last = match[1]
  if (!last || last.length > MAX_ANCHOR_LENGTH) return null
  let data: unknown
  try {
    data = JSON.parse(last)
  } catch {
    return null
  }
  const parsed = v.safeParse(AnchorSchema, data)
  return parsed.success ? parsed.output : null
}

/** The body without anchor blocks, for display. */
export function stripAnchor(body: string | null | undefined): string {
  return (body ?? '').replace(BLOCK_PATTERN, '').trim()
}

/** Issue title: the first non-empty line of the comment, truncated. */
export function commentTitle(text: string, fallback: string): string {
  const line =
    text
      .split('\n')
      .map((part) => part.trim())
      .find(Boolean) ?? ''
  if (!line) return fallback
  return line.length > MAX_COMMENT_TITLE_LENGTH
    ? `${line.slice(0, MAX_COMMENT_TITLE_LENGTH - 1).trimEnd()}…`
    : line
}

/**
 * Issue body: the comment, a link to the branch's open pull request, a readable location
 * line and the anchor block. Repository content, so the generated lines are English.
 */
export function commentBody(input: {
  text: string
  anchor: CommentAnchor
  pageName: string
  nodeName: string | null
  pullRequest: number | null
}): string {
  const location = [
    `page “${input.pageName}”`,
    input.nodeName ? `layer “${input.nodeName}”` : null,
    `\`${input.anchor.doc}\``,
    input.anchor.branch ? `on \`${input.anchor.branch}\`` : null
  ]
    .filter(Boolean)
    .join(' · ')
  return [
    input.text.trim(),
    '',
    input.pullRequest ? `Related to #${input.pullRequest}` : null,
    input.pullRequest ? '' : null,
    `_Design comment on ${location}, from OpenPencil._`,
    '',
    anchorBlock(input.anchor)
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}
