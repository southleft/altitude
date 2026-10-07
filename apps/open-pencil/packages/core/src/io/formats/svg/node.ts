export interface SVGNode {
  tag: string
  attrs: Record<string, string | number>
  children: (SVGNode | string)[]
}

export function svg(
  tag: string,
  attrs: Record<string, string | number | undefined | null>,
  ...children: (SVGNode | string | null | undefined | false)[]
): SVGNode {
  const cleaned: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) cleaned[k] = v
  }
  return {
    tag,
    attrs: cleaned,
    children: children.filter((c): c is SVGNode | string => c != null && c !== false)
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderAttrs(attrs: Record<string, string | number>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(attrs)) {
    parts.push(`${k}="${escapeAttr(String(v))}"`)
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : ''
}

export function renderSVGNode(node: SVGNode, indent = 0): string {
  const pad = '  '.repeat(indent)
  const attrsStr = renderAttrs(node.attrs)

  if (node.children.length === 0) {
    return `${pad}<${node.tag}${attrsStr}/>`
  }

  const hasOnlyText = node.children.length === 1 && typeof node.children[0] === 'string'
  if (hasOnlyText) {
    return `${pad}<${node.tag}${attrsStr}>${escapeText(node.children[0] as string)}</${node.tag}>`
  }

  const lines = [`${pad}<${node.tag}${attrsStr}>`]
  for (const child of node.children) {
    if (typeof child === 'string') {
      lines.push(`${'  '.repeat(indent + 1)}${escapeText(child)}`)
    } else {
      lines.push(renderSVGNode(child, indent + 1))
    }
  }
  lines.push(`${pad}</${node.tag}>`)
  return lines.join('\n')
}
