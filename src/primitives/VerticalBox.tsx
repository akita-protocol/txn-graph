import React from 'react'
import { G, Rect, Text } from 'react-native-svg'
import { useTheme } from '../theme'

export type VerticalBoxProps = {
  x: number
  y: number
  width: number
  height: number
  /** Primary line (e.g. "Account 1", "App 12345"). */
  title: string
  /** Secondary line (e.g. truncated address). Optional. */
  subtitle?: string
  /** Called when the node is tapped (web + native). */
  onPress?: () => void
  /** Optional accent color for the top border; defaults to palette.accent. */
  accent?: string
}

/**
 * Shared chrome for every column-header node: rounded rect, accent top border,
 * title + optional subtitle. All other vertical-type renderers compose this.
 *
 * Tap handling lives outside the SVG element because react-native-svg's
 * onPress isn't reliable on web — consumers wire tap via a parent `<G>` that
 * delegates through `onPressIn`, handled in the orchestrator.
 */
export function VerticalBox({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  accent,
}: VerticalBoxProps): React.JSX.Element {
  const theme = useTheme()
  const topBorderColor = accent ?? theme.palette.accent
  const left = x - width / 2
  const top = y - height / 2

  return (
    <G>
      <Rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={theme.node.radius}
        ry={theme.node.radius}
        fill={theme.palette.surface}
        stroke={theme.palette.border}
        strokeWidth={1}
      />
      {/* Accent top edge — visually marks each column as a first-class node */}
      <Rect
        x={left}
        y={top}
        width={width}
        height={3}
        rx={theme.node.radius}
        ry={theme.node.radius}
        fill={topBorderColor}
      />
      <Text
        x={x}
        y={subtitle ? y - 4 : y + theme.typography.size.sm / 3}
        textAnchor="middle"
        fontFamily={theme.typography.fontFamily}
        fontSize={theme.typography.size.sm}
        fontWeight={theme.typography.weight.medium}
        fill={theme.palette.text}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          x={x}
          y={y + theme.typography.size.xs + 4}
          textAnchor="middle"
          fontFamily={theme.typography.fontFamily}
          fontSize={theme.typography.size.xs}
          fill={theme.palette.textMuted}
        >
          {subtitle}
        </Text>
      ) : null}
    </G>
  )
}
