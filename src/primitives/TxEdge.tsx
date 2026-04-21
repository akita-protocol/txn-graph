import React, { useEffect, useMemo } from 'react'
import { G, Path, Polygon } from 'react-native-svg'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import type { PositionedEdge } from '../layouts/types'
import { useTheme } from '../theme'
import { useActiveEdgeContext } from './ActiveEdgeContext'
import { AnimatedPath } from './AnimatedPath'

export type TxEdgeProps = {
  edge: PositionedEdge
  /**
   * When true, always render the edge in its active state regardless of the
   * shared `activeEdgeId`. Useful for static previews / storybook.
   */
  forceActive?: boolean
  /**
   * When false, skip the marching-dots animation even if the edge is active.
   * Defaults to true. The render still two-pass strokes for the glow.
   */
  animate?: boolean
}

/**
 * SVG edge with:
 *   1. Base stroke (always drawn, themed by `label.type`).
 *   2. Active halo — a thick, low-opacity stroke drawn on top when this edge
 *      matches the shared `activeEdgeId`. On web a Gaussian blur can be
 *      layered via ThemeProvider CSS; on native the thickness alone reads as
 *      a glow.
 *   3. Marching-dots overlay — a crisp dashed stroke on top of the halo,
 *      animated via `strokeDashoffset` on the UI thread.
 *
 * Performance: all three visuals share the same `d` path string. Only shared
 * values mutate on step change; React does not re-run.
 */
export function TxEdge({ edge, forceActive, animate = true }: TxEdgeProps): React.JSX.Element {
  const theme = useTheme()
  const { activeEdgeId } = useActiveEdgeContext()
  const palette = theme.label[edge.colorKey]

  const baseWidth = theme.edge.width
  const activeWidth = theme.edge.activeWidth
  const glowWidth = activeWidth * theme.edge.glowWidthMultiplier
  const dimOpacity = theme.edge.dimOpacity
  const dashSize = theme.dots.size
  const gapSize = theme.dots.gap
  const period = ((dashSize + gapSize) / Math.max(1, theme.dots.speed)) * 1000

  const dashOffset = useSharedValue(0)

  useEffect(() => {
    if (!animate) return
    dashOffset.value = 0
    dashOffset.value = withRepeat(
      withTiming(-(dashSize + gapSize), {
        duration: period,
        easing: Easing.linear,
      }),
      -1,
      false,
    )
    return () => cancelAnimation(dashOffset)
  }, [animate, dashOffset, dashSize, gapSize, period])

  const edgeId = edge.id

  // Base stroke: visible regardless of active state, dimmed when some other
  // edge is active so the scene calms down around the focus.
  const baseProps = useAnimatedProps(() => {
    const anyActive = activeEdgeId.value !== null
    const isActive = forceActive || activeEdgeId.value === edgeId
    return {
      strokeOpacity: isActive ? 1 : anyActive ? dimOpacity : 1,
    }
  })

  // Halo: only shown on the active edge.
  const haloProps = useAnimatedProps(() => {
    const isActive = forceActive || activeEdgeId.value === edgeId
    return {
      strokeOpacity: isActive ? 0.35 : 0,
    }
  })

  // Dots overlay: only shown on the active edge, offset animates forever.
  const dotsProps = useAnimatedProps(() => {
    const isActive = forceActive || activeEdgeId.value === edgeId
    return {
      strokeOpacity: isActive ? 1 : 0,
      strokeDashoffset: dashOffset.value,
    }
  })

  const arrowPoly = useMemo(() => computeArrowPolygon(edge), [edge])

  const baseColor = palette.stroke
  const activeColor = palette.glow ?? theme.palette.edgeActive

  return (
    <G>
      {/* Halo — thick stroke for the glow bloom */}
      <AnimatedPath
        d={edge.path}
        stroke={activeColor}
        strokeWidth={glowWidth}
        strokeLinecap="round"
        fill="none"
        animatedProps={haloProps}
      />
      {/* Base stroke */}
      <AnimatedPath
        d={edge.path}
        stroke={baseColor}
        strokeWidth={baseWidth}
        strokeLinecap="round"
        fill="none"
        animatedProps={baseProps}
      />
      {/* Marching dots */}
      <AnimatedPath
        d={edge.path}
        stroke={activeColor}
        strokeWidth={activeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dashSize} ${gapSize}`}
        fill="none"
        animatedProps={dotsProps}
      />
      {/* Static arrow head (non-animated; cheap) */}
      {arrowPoly ? (
        <Polygon
          points={arrowPoly}
          fill={baseColor}
          stroke={baseColor}
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      ) : null}
    </G>
  )
}

/**
 * Compute a small triangle at the endpoint of a Vector edge. Sequence-layout
 * edges are strictly horizontal, so direction is easy. Self-loops and points
 * skip the arrow (their markers handle endpoint annotation).
 */
function computeArrowPolygon(edge: PositionedEdge): string | null {
  if (edge.pathKind !== 'vector') return null

  // Parse the endpoints out of the path string. Sequence paths look like:
  //   M x1 y L x2 y
  const match = edge.path.match(/^M\s+([-\d.]+)\s+([-\d.]+)\s+L\s+([-\d.]+)\s+([-\d.]+)/)
  if (!match) return null
  const x1 = parseFloat(match[1])
  const y1 = parseFloat(match[2])
  const x2 = parseFloat(match[3])
  const y2 = parseFloat(match[4])

  const leftToRight = edge.direction !== 'rightToLeft'
  const tipX = leftToRight ? x2 : x1
  const tipY = leftToRight ? y2 : y1
  const baseX = leftToRight ? tipX - 8 : tipX + 8
  const baseYUpper = tipY - 5
  const baseYLower = tipY + 5
  void x1
  void y1
  void x2
  void y2
  return `${tipX},${tipY} ${baseX},${baseYUpper} ${baseX},${baseYLower}`
}
