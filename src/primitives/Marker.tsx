import React from 'react'
import { Circle, G, Path, Text } from 'react-native-svg'
import { useTheme } from '../theme'
import type { MarkerTag } from '../models'

export type MarkerProps = {
  x: number
  y: number
  tag: MarkerTag
  /** Fill used for numbered markers. Defaults to `theme.palette.surfaceElevated`. */
  fill?: string
  /** Stroke used for the marker ring. Defaults to `theme.palette.accent`. */
  stroke?: string
  /** Foreground used for the glyph / number. Defaults to `theme.palette.text`. */
  color?: string
  radius?: number
}

/**
 * Renders the small annotation that sits on an edge endpoint:
 *   - `number`  → filled circle with the account number inside
 *   - `'Rekey'` → stylized key icon (the rekey glyph used by lora)
 */
export function Marker({
  x,
  y,
  tag,
  fill,
  stroke,
  color,
  radius = 9,
}: MarkerProps): React.JSX.Element {
  const theme = useTheme()
  const resolvedFill = fill ?? theme.palette.surfaceElevated
  const resolvedStroke = stroke ?? theme.palette.accent
  const resolvedColor = color ?? theme.palette.text

  if (tag === 'Rekey') {
    return (
      <G>
        <Circle cx={x} cy={y} r={radius} fill={resolvedFill} stroke={resolvedStroke} strokeWidth={1.2} />
        <Path
          d={keyIconPath(x, y, radius * 0.55)}
          fill={resolvedColor}
          stroke={resolvedColor}
          strokeWidth={0.5}
        />
      </G>
    )
  }

  return (
    <G>
      <Circle cx={x} cy={y} r={radius} fill={resolvedFill} stroke={resolvedStroke} strokeWidth={1.2} />
      <Text
        x={x}
        y={y + theme.typography.size.xs / 3}
        textAnchor="middle"
        fontFamily={theme.typography.fontFamily}
        fontSize={theme.typography.size.xs}
        fontWeight={theme.typography.weight.medium}
        fill={resolvedColor}
      >
        {String(tag)}
      </Text>
    </G>
  )
}

/** Tiny key-shape centered on (cx, cy). Roughly matches lora's `KeyIcon`. */
function keyIconPath(cx: number, cy: number, r: number): string {
  const headR = r * 0.55
  const shaft = r * 1.1
  return [
    `M ${cx - headR} ${cy}`,
    `a ${headR} ${headR} 0 1 0 ${headR * 2} 0`,
    `a ${headR} ${headR} 0 1 0 ${-headR * 2} 0`,
    `M ${cx + headR} ${cy}`,
    `L ${cx + headR + shaft} ${cy}`,
    `M ${cx + headR + shaft * 0.7} ${cy}`,
    `L ${cx + headR + shaft * 0.7} ${cy + headR * 0.6}`,
  ].join(' ')
}
