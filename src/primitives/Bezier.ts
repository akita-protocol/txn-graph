/**
 * Shared path helpers. Used by both layouts + future animation code.
 * Everything here is pure (no React, no react-native-svg) so it's easy to
 * unit-test and share across platforms.
 */

import type { Point2D } from '../layouts/types'

/** Clamp helper — avoids pulling a dep for one line of math. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Euclidean distance. */
export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Build a straight-line path. */
export function linePath(from: Point2D, to: Point2D): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

/** Build a move + series-of-lines polyline path. */
export function polylinePath(points: Point2D[]): string {
  if (points.length === 0) return ''
  const [head, ...rest] = points
  return [`M ${head.x} ${head.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(' ')
}

/**
 * Catmull-Rom-to-Bezier smoothing. Given a polyline, emit a cubic Bezier path
 * that passes through every original vertex with smooth tangents.
 *
 * `alpha` controls parameterization:
 *   - 0 = uniform (classic)
 *   - 0.5 = centripetal (prevents loops/cusps — default)
 *   - 1 = chordal
 *
 * `tension` ∈ [0, 1]. Higher tension = tighter curves. 0 = default Catmull-Rom.
 */
export function catmullRomToBezier(
  points: Point2D[],
  options: { alpha?: number; tension?: number } = {},
): string {
  const { alpha = 0.5, tension = 0 } = options
  if (points.length < 2) return ''
  if (points.length === 2) return linePath(points[0], points[1])

  // Phantom endpoints mirror the terminal segments so the curve hits the first
  // and last points exactly.
  const padded: Point2D[] = [
    {
      x: points[0].x + (points[0].x - points[1].x),
      y: points[0].y + (points[0].y - points[1].y),
    },
    ...points,
    {
      x: points[points.length - 1].x + (points[points.length - 1].x - points[points.length - 2].x),
      y: points[points.length - 1].y + (points[points.length - 1].y - points[points.length - 2].y),
    },
  ]

  const d: string[] = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < padded.length - 2; i += 1) {
    const p0 = padded[i - 1]
    const p1 = padded[i]
    const p2 = padded[i + 1]
    const p3 = padded[i + 2]

    const t01 = Math.pow(distance(p0, p1), alpha)
    const t12 = Math.pow(distance(p1, p2), alpha)
    const t23 = Math.pow(distance(p2, p3), alpha)

    const m1x =
      (1 - tension) *
      (p2.x - p0.x + (t12 / (t01 + t12 || 1)) * (p1.x - p0.x - (p2.x - p0.x)))
    const m1y =
      (1 - tension) *
      (p2.y - p0.y + (t12 / (t01 + t12 || 1)) * (p1.y - p0.y - (p2.y - p0.y)))
    const m2x =
      (1 - tension) *
      (p3.x - p1.x + (t12 / (t12 + t23 || 1)) * (p2.x - p1.x - (p3.x - p1.x)))
    const m2y =
      (1 - tension) *
      (p3.y - p1.y + (t12 / (t12 + t23 || 1)) * (p2.y - p1.y - (p3.y - p1.y)))

    const c1x = p1.x + m1x / 3
    const c1y = p1.y + m1y / 3
    const c2x = p2.x - m2x / 3
    const c2y = p2.y - m2y / 3
    d.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`)
  }
  return d.join(' ')
}

/** Right-angle-rounded-corner connector. Useful for the sequence layout. */
export function roundedStepPath(
  from: Point2D,
  to: Point2D,
  radius = 8,
  via?: number, // optional intermediate y
): string {
  const midY = via ?? (from.y + to.y) / 2
  const r = Math.min(radius, Math.abs(from.x - to.x) / 2, Math.abs(from.y - to.y) / 2)
  const dir = to.x > from.x ? 1 : -1
  return [
    `M ${from.x} ${from.y}`,
    `L ${from.x} ${midY - r * Math.sign(midY - from.y || 1)}`,
    `Q ${from.x} ${midY} ${from.x + r * dir} ${midY}`,
    `L ${to.x - r * dir} ${midY}`,
    `Q ${to.x} ${midY} ${to.x} ${midY + r * Math.sign(to.y - midY || 1)}`,
    `L ${to.x} ${to.y}`,
  ].join(' ')
}
