import React from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { cn } from '../utils/cn'

export type ZoomToolbarProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  style?: StyleProp<ViewStyle>
  className?: string
}

/**
 * Vertical cluster of icon buttons — zoom in / out / fit / fullscreen.
 * Sits top-right of the viewport by default.
 */
export function ZoomToolbar({
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
  isFullscreen,
  style,
  className,
}: ZoomToolbarProps): React.JSX.Element {
  const theme = useTheme()
  const containerStyle: ViewStyle = {
    flexDirection: 'column',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
    backgroundColor: theme.palette.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.border,
  }
  return (
    <View style={[containerStyle, style]} className={cn(className)}>
      <ToolbarButton label="+" ariaLabel="Zoom in" onPress={onZoomIn} />
      <ToolbarButton label="–" ariaLabel="Zoom out" onPress={onZoomOut} />
      <ToolbarButton label="⤢" ariaLabel="Fit to view" onPress={onFit} />
      {onToggleFullscreen ? (
        <ToolbarButton
          label={isFullscreen ? '⤡' : '⛶'}
          ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onPress={onToggleFullscreen}
        />
      ) : null}
    </View>
  )
}

function ToolbarButton({
  label,
  ariaLabel,
  onPress,
}: {
  label: string
  ariaLabel: string
  onPress: () => void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      style={{
        width: 32,
        height: 32,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.palette.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: theme.palette.text,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.md,
          lineHeight: theme.typography.size.md + 2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
