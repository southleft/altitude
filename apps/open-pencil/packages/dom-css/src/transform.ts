/**
 * CSS `transform` -> node rotation and flips.
 *
 * The exporter writes the functional form `rotate(Ndeg) scaleX(-1) scaleY(-1)`, but a real
 * browser's `getComputedStyle` always resolves transforms to `matrix(a, b, c, d, e, f)` (or
 * `matrix3d(...)`), and the computed value wins over the inline one. Both forms are read here.
 *
 * A matrix cannot tell "flip on both axes" from "rotate by 180°", and cannot say which axis a
 * single flip was on. Reflections are reported as `flipX` with the rotation adjusted to match,
 * which renders identically. When the authored inline value is still in functional form it is
 * preferred, so the exact intent survives wherever it is available.
 */

export interface CSSTransformFacts {
  rotation: number
  flipX: boolean
  flipY: boolean
}

/** Matrix entries closer to zero than this are treated as zero. */
const EPSILON = 1e-9
/** Rotations are rounded so float noise from the browser does not read as an edit. */
const ROTATION_PRECISION = 1e4

function roundRotation(degrees: number): number {
  const rounded = Math.round(degrees * ROTATION_PRECISION) / ROTATION_PRECISION
  return Object.is(rounded, -0) ? 0 : rounded
}

function parseNumbers(args: string): number[] | null {
  const values = args
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  return values.every(Number.isFinite) ? values : null
}

/** Decompose the linear part of a 2D matrix (CSS `matrix(a, b, c, d, …)`). */
export function decompose2DMatrix(
  a: number,
  b: number,
  c: number,
  d: number
): CSSTransformFacts | null {
  const determinant = a * d - b * c
  if (Math.abs(determinant) < EPSILON) return null
  if (determinant > 0) {
    return {
      rotation: roundRotation((Math.atan2(b, a) * 180) / Math.PI),
      flipX: false,
      flipY: false
    }
  }
  // M = R(θ) · scale(-1, 1)  =>  a = -cos θ, b = -sin θ
  return {
    rotation: roundRotation((Math.atan2(-b, -a) * 180) / Math.PI),
    flipX: true,
    flipY: false
  }
}

function parseMatrix(transform: string): CSSTransformFacts | null | undefined {
  const matrix = /^matrix\(([^)]*)\)$/i.exec(transform)
  if (matrix) {
    const values = parseNumbers(matrix[1] ?? '')
    if (values?.length !== 6) return null
    const [a = 1, b = 0, c = 0, d = 1] = values
    return decompose2DMatrix(a, b, c, d)
  }

  const matrix3d = /^matrix3d\(([^)]*)\)$/i.exec(transform)
  if (!matrix3d) return undefined
  const values = parseNumbers(matrix3d[1] ?? '')
  if (values?.length !== 16) return null
  // Only a matrix3d that is really 2D can be read; anything with depth stays unread.
  const flat = [2, 3, 6, 7, 8, 9, 11, 14].every((index) => Math.abs(values[index] ?? 0) < EPSILON)
  if (!flat || values[10] !== 1 || values[15] !== 1) return null
  return decompose2DMatrix(values[0] ?? 1, values[1] ?? 0, values[4] ?? 0, values[5] ?? 1)
}

function parseFunctional(transform: string): CSSTransformFacts | null {
  const rotate = /rotate\(\s*(-?[\d.]+)deg\s*\)/i.exec(transform)
  const flipX = /scaleX\(\s*-1\s*\)/i.test(transform)
  const flipY = /scaleY\(\s*-1\s*\)/i.test(transform)
  if (!rotate && !flipX && !flipY) return null
  return { rotation: rotate ? Number.parseFloat(rotate[1] ?? '0') : 0, flipX, flipY }
}

/**
 * Read rotation and flips from a CSS transform. Returns null for `none`, for forms this
 * bridge does not understand, and for transforms with depth — rather than half-applying them.
 */
export function transformFactsFromCSS(transform: string | undefined): CSSTransformFacts | null {
  const value = transform?.trim()
  if (!value || value === 'none') return null
  const matrix = parseMatrix(value)
  if (matrix !== undefined) return matrix
  return parseFunctional(value)
}
