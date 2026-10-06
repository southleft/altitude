import { twirl } from 'twirlwind'

import type { DesignDocument, DesignElement, DesignNode, DesignText } from './types'

export interface SerializeHTMLOptions {
  style?: 'inline' | 'tailwind'
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

export function splitWhitespace(value: string): string[] {
  const parts: string[] = []
  let current = ''
  for (const char of value) {
    if (char === ' ' || char === '\n' || char === '\t' || char === '\r' || char === '\f') {
      if (current.length > 0) parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.length > 0) parts.push(current)
  return parts
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

const ATTR_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}
const ATTR_SPECIAL = /[&<>"]/
const ATTR_SPECIAL_GLOBAL = /[&<>"]/g

/**
 * One scan, and none of the copying when nothing needs escaping. Fact attributes carry
 * megabytes of JSON on a large export, and four chained `replaceAll` passes copied every
 * one of them four times.
 */
function escapeAttr(value: string): string {
  if (!ATTR_SPECIAL.test(value)) return value
  return value.replace(ATTR_SPECIAL_GLOBAL, (char) => ATTR_ESCAPES[char] ?? char)
}

function serializeText(node: DesignText): string {
  return escapeText(node.text)
}

function serializeStyle(node: DesignElement): string | undefined {
  if (!node.inlineStyle || Object.keys(node.inlineStyle).length === 0) return undefined
  return Object.entries(node.inlineStyle)
    .filter(([, value]) => value !== '')
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ')
}

function serializeTailwindClasses(node: DesignElement): string | undefined {
  const style = serializeStyle(node)
  if (!style) return undefined
  const className = twirl(style)
  return className.length > 0 ? className : undefined
}

export function mergeClassNames(...values: Array<string | undefined>): string | undefined {
  const className = values
    .flatMap((value) => (value ? splitWhitespace(value) : []))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(' ')
  return className.length > 0 ? className : undefined
}

function serializeAttrs(node: DesignElement, options: SerializeHTMLOptions): string {
  const style = serializeStyle(node)
  const tailwindClass = options.style === 'tailwind' ? serializeTailwindClasses(node) : undefined
  const inlineStyle = style && options.style !== 'tailwind' ? style : undefined
  const mergedClass = tailwindClass ? mergeClassNames(node.attrs.class, tailwindClass) : undefined
  // Same names, order and values as spreading the attrs and overriding class/style, without
  // building the intermediate objects for every element.
  let serialized = ''
  const append = (name: string, value: string | undefined) => {
    if (typeof value === 'string' && value !== '') serialized += ` ${name}="${escapeAttr(value)}"`
  }
  for (const name in node.attrs) {
    if (!Object.hasOwn(node.attrs, name)) continue
    if (name === 'style' && tailwindClass) continue
    if (name === 'class' && tailwindClass) append(name, mergedClass)
    else if (name === 'style' && inlineStyle) append(name, inlineStyle)
    else append(name, node.attrs[name])
  }
  if (tailwindClass && !Object.hasOwn(node.attrs, 'class')) append('class', mergedClass)
  if (inlineStyle && !Object.hasOwn(node.attrs, 'style')) append('style', inlineStyle)
  return serialized
}

function serializeElement(node: DesignElement, options: SerializeHTMLOptions): string {
  const tagName = node.tagName.toLowerCase()
  const attrs = serializeAttrs(node, options)
  if (VOID_ELEMENTS.has(tagName)) return `<${tagName}${attrs}>`
  // rawHTML is already markup: emitting it escaped would render the SVG source as text.
  const content =
    node.rawHTML ?? node.children.map((child) => serializeNode(child, options)).join('')
  return `<${tagName}${attrs}>${content}</${tagName}>`
}

export function serializeNode(node: DesignNode, options: SerializeHTMLOptions = {}): string {
  return node.type === 'text' ? serializeText(node) : serializeElement(node, options)
}

export function serializeHTML(
  document: DesignDocument,
  options: SerializeHTMLOptions = {}
): string {
  return document.children.map((node) => serializeNode(node, options)).join('')
}
