import { isCubicBezier, type CubicBezier, type MotionEasingKeyword } from '@open-pencil/scene-graph'

/** CSS easing keywords as the curves the CSS Easing spec defines for them. */
export const EASING_KEYWORD_CURVES: Readonly<Record<MotionEasingKeyword, CubicBezier>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1]
}

const NEWTON_ITERATIONS = 8
const NEWTON_EPSILON = 1e-7
const BISECTION_ITERATIONS = 40

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` timing function: progress in [0, 1] → eased output.
 *
 * Solves x(s) = t for the curve parameter with Newton's method, falling back to bisection
 * where the slope is too flat, then returns y(s). y may leave [0, 1] for overshooting curves
 * such as Altitude's `spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`), as in CSS.
 */
export function cubicBezierEasing(curve: CubicBezier): (t: number) => number {
  const [x1, y1, x2, y2] = curve
  if (x1 === y1 && x2 === y2) return (t) => clamp01(t)

  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx

  function solveX(x: number): number {
    let s = x
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const error = sampleX(s) - x
      if (Math.abs(error) < NEWTON_EPSILON) return s
      const slope = slopeX(s)
      if (Math.abs(slope) < 1e-6) break
      s -= error / slope
    }
    let lo = 0
    let hi = 1
    s = x
    for (let i = 0; i < BISECTION_ITERATIONS; i++) {
      const value = sampleX(s)
      if (Math.abs(value - x) < NEWTON_EPSILON) return s
      if (value < x) lo = s
      else hi = s
      s = (lo + hi) / 2
    }
    return s
  }

  return (t) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return sampleY(solveX(t))
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * Parse a CSS easing value — `cubic-bezier(a, b, c, d)` or a keyword — into a curve.
 * Returns null for anything else (`steps()`, `linear()` with stops, garbage).
 */
export function parseCSSEasing(value: string): CubicBezier | null {
  const text = value.trim().toLowerCase()
  if (Object.hasOwn(EASING_KEYWORD_CURVES, text)) {
    return EASING_KEYWORD_CURVES[text as MotionEasingKeyword]
  }
  const match = /^cubic-bezier\(\s*([^)]*)\)$/.exec(text)
  if (!match) return null
  const parts = match[1].split(',').map((part) => Number(part.trim()))
  return isCubicBezier(parts) ? [parts[0], parts[1], parts[2], parts[3]] : null
}

/** CSS `cubic-bezier()` text for a curve. */
export function cubicBezierCSS(curve: CubicBezier): string {
  return `cubic-bezier(${curve.map((value) => String(Number(value.toFixed(4)))).join(', ')})`
}
