import React from 'react'
import { G, Line } from 'react-native-svg'
import { useTheme } from '../theme'

export type SequenceBackdropProps = {
  /** Lane center x per vertical index, from `LayoutResult.accountLaneX`. */
  lanes: Map<number, number>
  /** `LayoutResult.headerHeight` — where the dashed lines should start. */
  headerHeight: number
  /** Total SVG height. */
  height: number
  /** Padding applied by the layout (lines start just below the column header). */
  padding: number
}

/**
 * Dashed vertical guides that run down each lane. Makes the sequence-diagram
 * scan-able at a glance — you can see which columns participate before any
 * transaction plays.
 */
export function SequenceBackdrop({
  lanes,
  headerHeight,
  height,
  padding,
}: SequenceBackdropProps): React.JSX.Element {
  const theme = useTheme()
  const top = padding + headerHeight
  const bottom = height - padding

  return (
    <G>
      {Array.from(lanes.values()).map((x, idx) => (
        <Line
          key={idx}
          x1={x}
          x2={x}
          y1={top}
          y2={bottom}
          stroke={theme.palette.border}
          strokeWidth={1}
          strokeDasharray="2 6"
          strokeLinecap="round"
          opacity={0.6}
        />
      ))}
    </G>
  )
}
