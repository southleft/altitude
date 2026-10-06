import { converter, parse, type Color as CuloriColor } from 'culori'

import type { Color, VariableType } from '@open-pencil/scene-graph'

import { colorToCSS } from '#core/color'

import type { CompositeKind, ResolvedTokenImportConfig } from './config'
import { isRecord } from './parse'

/**
 * DTCG value -> variable value.
 *
 * Variables hold COLOR | FLOAT | STRING | BOOLEAN. The type mapping, and what each
 * choice loses, is documented in `packages/docs/programmable/design-tokens.md`:
 *
 * - color -> COLOR (sRGB; other colour spaces convert).
 * - dimension -> FLOAT in canvas pixels for px/rem, the raw number otherwise; `unit`
 *   metadata restores the authored CSS form.
 * - duration -> FLOAT milliseconds (Figma's unit); `unit` restores `s`/`ms`.
 * - number, fontWeight -> FLOAT. fontWeight names map to their numeric weight.
 * - fontFamily, cubicBezier, strokeStyle keyword, and non-standard string types -> STRING.
 * - shadow, typography, border, transition, gradient -> STRING holding the CSS shorthand,
 *   with the structured value kept in metadata (`composite`), or skipped by mapping.
 */

export interface ConvertedValue {
  type: VariableType
  value: Color | number | string | boolean
  unit?: string
  remBase?: number
  composite?: unknown
  /** Set when the conversion was lossy; becomes a `lossy-value` issue. */
  lossy?: string
}

export type ConversionFailure = {
  ok: false
  code: 'invalid-value' | 'unsupported-type' | 'composite-skipped'
  message: string
}

export type ConversionResult =
  | { ok: true; converted: ConvertedValue; compositeKind?: CompositeKind }
  | ConversionFailure

const toRGB = converter('rgb')

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function culoriToColor(parsed: CuloriColor): Color {
  const rgb = toRGB(parsed)
  const clamp = (value: number | undefined) => Math.min(1, Math.max(0, value ?? 0))
  return { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b), a: clamp(parsed.alpha ?? 1) }
}

/** DTCG 2025 colour spaces as CSS colour syntax culori can parse. */
const PREDEFINED_SPACES = new Set([
  'srgb',
  'srgb-linear',
  'display-p3',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
  'xyz-d65',
  'xyz-d50'
])
const PERCENT_SPACES: Partial<Record<string, [string, boolean, boolean, boolean]>> = {
  hsl: ['hsl', false, true, true],
  hwb: ['hwb', false, true, true],
  lab: ['lab', false, false, false],
  lch: ['lch', false, false, false],
  oklab: ['oklab', false, false, false],
  oklch: ['oklch', false, false, false]
}

function componentText(component: unknown, percent: boolean): string {
  if (component === 'none') return 'none'
  const n = typeof component === 'number' ? component : 0
  return percent ? `${n}%` : String(n)
}

function objectColorToCSS(value: Record<string, unknown>): string | null {
  const space = typeof value.colorSpace === 'string' ? value.colorSpace : ''
  const components = Array.isArray(value.components) ? value.components : []
  const alpha = typeof value.alpha === 'number' ? value.alpha : 1
  if (components.length !== 3) return typeof value.hex === 'string' ? value.hex : null
  if (PREDEFINED_SPACES.has(space)) {
    return `color(${space} ${components.map((c) => componentText(c, false)).join(' ')} / ${alpha})`
  }
  const functional = PERCENT_SPACES[space]
  if (functional) {
    const [fn, ...percent] = functional
    const text = components.map((c, index) => componentText(c, percent[index] ?? false)).join(' ')
    return `${fn}(${text} / ${alpha})`
  }
  return typeof value.hex === 'string' ? value.hex : null
}

export function parseTokenColor(value: unknown): Color | null {
  const text = isRecord(value) ? objectColorToCSS(value) : value
  if (typeof text !== 'string') return null
  const parsed = parse(text.trim())
  return parsed ? culoriToColor(parsed) : null
}

export interface ParsedMeasure {
  value: number
  unit: string
}

/** `16px`, `1.5rem`, `0.2s`, `50%`, `12`, `{ value, unit }`. Empty unit means unitless. */
export function parseMeasure(value: unknown): ParsedMeasure | null {
  if (typeof value === 'number' && Number.isFinite(value)) return { value, unit: '' }
  if (isRecord(value) && typeof value.value === 'number' && typeof value.unit === 'string') {
    return { value: value.value, unit: value.unit }
  }
  if (typeof value !== 'string') return null
  const match = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*([a-z%]*)$/i.exec(value.trim())
  if (!match) return null
  return { value: Number(match[1]), unit: match[2].toLowerCase() }
}

/** CSS text for a measure; unitless dimensions read as px, as Tokens Studio authors them. */
function measureCSS(value: unknown, defaultUnit: string): string | null {
  const measure = parseMeasure(value)
  if (!measure) return typeof value === 'string' ? value : null
  return `${round(measure.value)}${measure.unit || defaultUnit}`
}

const FONT_WEIGHTS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
  extrablack: 950,
  ultrablack: 950
}

export function parseFontWeight(value: unknown): number | null {
  if (typeof value === 'number' && value >= 1 && value <= 1000) return value
  if (typeof value !== 'string') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 1000) return numeric
  return FONT_WEIGHTS[value.toLowerCase().replace(/[-_\s]/g, '')] ?? null
}

function fontFamilyCSS(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value
      .map((name) => (/\s/.test(name) && !/^["']/.test(name) ? `"${name}"` : name))
      .join(', ')
  }
  return null
}

function colorCSS(value: unknown): string | null {
  if (typeof value === 'string') return value
  const color = parseTokenColor(value)
  return color ? colorToCSS(color) : null
}

function cubicBezierCSS(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number')) {
    return `cubic-bezier(${value.join(', ')})`
  }
  return null
}

function durationCSS(value: unknown): string | null {
  const measure = parseMeasure(value)
  if (!measure || !['s', 'ms'].includes(measure.unit)) return null
  return `${round(measure.value)}${measure.unit}`
}

function shadowLayerCSS(layer: unknown): string | null {
  if (!isRecord(layer)) return null
  const parts = [
    measureCSS(layer.offsetX ?? layer.x ?? 0, 'px'),
    measureCSS(layer.offsetY ?? layer.y ?? 0, 'px'),
    measureCSS(layer.blur ?? 0, 'px'),
    measureCSS(layer.spread ?? 0, 'px'),
    colorCSS(layer.color)
  ]
  if (parts.some((part) => part === null)) return null
  const inset = layer.inset === true || layer.type === 'innerShadow' ? 'inset ' : ''
  return `${inset}${parts.join(' ')}`
}

function shadowCSS(value: unknown): string | null {
  const layers = Array.isArray(value) ? value : [value]
  const css = layers.map(shadowLayerCSS)
  return css.every((item): item is string => item !== null) ? css.join(', ') : null
}

function lineHeightCSS(value: unknown): string {
  const measure = parseMeasure(value)
  if (!measure) return ''
  // A unitless lineHeight in DTCG is a multiplier; Tokens Studio authors pixels the same
  // way. Values above 4 can only be pixels.
  const unit = measure.unit || (measure.value > 4 ? 'px' : '')
  return `/${round(measure.value)}${unit}`
}

const FONT_SHORTHAND_DROPS = ['letterSpacing', 'textDecoration', 'textCase', 'paragraphSpacing']

function typographyCSS(value: unknown): { css: string; lossy?: string } | null {
  if (!isRecord(value)) return null
  const family = fontFamilyCSS(value.fontFamily)
  const size = measureCSS(value.fontSize, 'px')
  if (!family || !size) return null
  const weight = parseFontWeight(value.fontWeight) ?? 400
  const style =
    typeof value.fontStyle === 'string' && value.fontStyle !== 'normal' ? `${value.fontStyle} ` : ''
  const dropped = FONT_SHORTHAND_DROPS.filter((key) => value[key] !== undefined)
  return {
    css: `${style}${weight} ${size}${lineHeightCSS(value.lineHeight)} ${family}`,
    lossy: dropped.length
      ? `CSS font shorthand cannot carry ${dropped.join(', ')}; kept in metadata`
      : undefined
  }
}

function borderCSS(value: unknown): { css: string; lossy?: string } | null {
  if (!isRecord(value)) return null
  const width = measureCSS(value.width, 'px')
  const color = colorCSS(value.color)
  if (!width || !color) return null
  if (typeof value.style === 'string') return { css: `${width} ${value.style} ${color}` }
  return {
    css: `${width} dashed ${color}`,
    lossy: 'object strokeStyle (dashArray) approximated as dashed'
  }
}

function transitionCSS(value: unknown): string | null {
  if (!isRecord(value)) return null
  const duration = durationCSS(value.duration)
  const timing = cubicBezierCSS(value.timingFunction)
  const delay = value.delay === undefined ? '0ms' : durationCSS(value.delay)
  if (!duration || !timing || !delay) return null
  return `${duration} ${timing} ${delay}`
}

function gradientCSS(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const stops = value.map((stop) => {
    if (!isRecord(stop)) return null
    const color = colorCSS(stop.color)
    if (!color || typeof stop.position !== 'number') return null
    return `${color} ${round(stop.position * 100, 4)}%`
  })
  if (!stops.every((stop): stop is string => stop !== null)) return null
  return `linear-gradient(${stops.join(', ')})`
}

type Converter = (value: unknown, config: ResolvedTokenImportConfig) => ConversionResult

function invalid(what: string, value: unknown): ConversionFailure {
  return {
    ok: false,
    code: 'invalid-value',
    message: `Invalid ${what} value ${String(JSON.stringify(value)).slice(0, 80)}`
  }
}

function ok(converted: ConvertedValue): ConversionResult {
  return { ok: true, converted }
}

function floatFromMeasure(
  measure: ParsedMeasure,
  config: ResolvedTokenImportConfig,
  unitlessUnit: string
): ConvertedValue {
  const unit = measure.unit || unitlessUnit
  if (unit === 'rem') {
    return {
      type: 'FLOAT',
      value: round(measure.value * config.remBase),
      unit,
      remBase: config.remBase
    }
  }
  return { type: 'FLOAT', value: round(measure.value), unit }
}

function composite(
  kind: CompositeKind,
  format: (value: unknown) => { css: string; lossy?: string } | string | null,
  fixedLossy?: string
): Converter {
  return (value, config) => {
    if (config.composites[kind] === 'skip') {
      return {
        ok: false,
        code: 'composite-skipped',
        message: `${kind} composites are skipped by the mapping`
      }
    }
    const formatted = format(value)
    if (formatted === null) return invalid(kind, value)
    const css = typeof formatted === 'string' ? formatted : formatted.css
    const lossy = typeof formatted === 'string' ? fixedLossy : (formatted.lossy ?? fixedLossy)
    return {
      ok: true,
      compositeKind: kind,
      converted: { type: 'STRING', value: css, composite: value, lossy }
    }
  }
}

function lengthConverter(unitlessUnit: string, what: string): Converter {
  return (value, config) => {
    const measure = parseMeasure(value)
    return measure ? ok(floatFromMeasure(measure, config, unitlessUnit)) : invalid(what, value)
  }
}

function stringConverter(format: (value: unknown) => string | null, what: string): Converter {
  return (value) => {
    const text = format(value)
    return text === null ? invalid(what, value) : ok({ type: 'STRING', value: text })
  }
}

const convertColor: Converter = (value) => {
  const color = parseTokenColor(value)
  return color ? ok({ type: 'COLOR', value: color }) : invalid('color', value)
}

const convertDuration: Converter = (value) => {
  const measure = parseMeasure(value)
  if (!measure || !['s', 'ms'].includes(measure.unit)) return invalid('duration', value)
  const ms = measure.unit === 's' ? measure.value * 1000 : measure.value
  return ok({ type: 'FLOAT', value: round(ms), unit: measure.unit })
}

const convertNumber: Converter = (value) => {
  const measure = parseMeasure(value)
  if (measure?.unit !== '') return invalid('number', value)
  return ok({ type: 'FLOAT', value: round(measure.value), unit: '' })
}

const convertFontWeight: Converter = (value) => {
  const weight = parseFontWeight(value)
  return weight === null
    ? invalid('fontWeight', value)
    : ok({ type: 'FLOAT', value: weight, unit: '' })
}

const convertStrokeStyle: Converter = (value, config) =>
  typeof value === 'string'
    ? ok({ type: 'STRING', value })
    : composite(
        'strokeStyle',
        () => 'dashed',
        'object strokeStyle (dashArray) approximated as dashed'
      )(value, config)

const convertBoolean: Converter = (value) =>
  typeof value === 'boolean' ? ok({ type: 'BOOLEAN', value }) : invalid('boolean', value)

const convertPlainString: Converter = (value, config) =>
  typeof value === 'string' ? ok({ type: 'STRING', value }) : inferValue(value, 'string', config)

/**
 * Converters by `$type`, covering DTCG types plus the legacy Tokens Studio names a
 * migrated tree still carries (`sizing`, `fontSizes`, `boxShadow`, …).
 */
const CONVERTERS: Partial<Record<string, Converter>> = {
  color: convertColor,
  duration: convertDuration,
  number: convertNumber,
  opacity: convertNumber,
  fontWeight: convertFontWeight,
  fontWeights: convertFontWeight,
  fontFamily: stringConverter(fontFamilyCSS, 'fontFamily'),
  fontFamilies: stringConverter(fontFamilyCSS, 'fontFamily'),
  cubicBezier: stringConverter(cubicBezierCSS, 'cubicBezier'),
  strokeStyle: convertStrokeStyle,
  shadow: composite('shadow', shadowCSS),
  boxShadow: composite('shadow', shadowCSS),
  typography: composite('typography', typographyCSS),
  border: composite('border', borderCSS),
  transition: composite('transition', transitionCSS),
  gradient: composite(
    'gradient',
    gradientCSS,
    'DTCG gradients carry no direction; emitted as a top-to-bottom linear-gradient'
  ),
  boolean: convertBoolean,
  dimension: lengthConverter('px', 'dimension'),
  sizing: lengthConverter('px', 'sizing'),
  spacing: lengthConverter('px', 'spacing'),
  borderRadius: lengthConverter('px', 'borderRadius'),
  borderWidth: lengthConverter('px', 'borderWidth'),
  fontSize: lengthConverter('px', 'fontSize'),
  fontSizes: lengthConverter('px', 'fontSizes'),
  letterSpacing: lengthConverter('', 'letterSpacing'),
  lineHeight: lengthConverter('', 'lineHeight'),
  lineHeights: lengthConverter('', 'lineHeights'),
  string: convertPlainString,
  text: convertPlainString,
  other: convertPlainString,
  textDecoration: convertPlainString,
  textCase: convertPlainString,
  fontStyle: convertPlainString
}

function inferValue(
  value: unknown,
  type: string,
  config: ResolvedTokenImportConfig
): ConversionResult {
  if (typeof value === 'boolean') return ok({ type: 'BOOLEAN', value })
  const measure = parseMeasure(value)
  if (measure) return ok(floatFromMeasure(measure, config, ''))
  if (typeof value === 'string') return ok({ type: 'STRING', value })
  return { ok: false, code: 'unsupported-type', message: `Unsupported $type "${type}"` }
}

/** Convert a fully resolved token value of DTCG `type`. */
export function convertTokenValue(
  type: string | undefined,
  value: unknown,
  config: ResolvedTokenImportConfig
): ConversionResult {
  const converter = type ? CONVERTERS[type] : undefined
  return converter ? converter(value, config) : inferValue(value, type ?? 'untyped', config)
}

/** CSS text for a FLOAT carried with unit metadata. */
export function floatToCSS(value: number, unit: string | undefined, remBase = 16): string {
  if (unit === undefined || unit === 'px') return `${round(value)}px`
  if (unit === 'rem') return `${round(value / remBase)}rem`
  if (unit === 's') return `${round(value / 1000)}s`
  return `${round(value)}${unit}`
}
