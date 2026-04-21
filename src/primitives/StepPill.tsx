import React from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'
import { cn } from '../utils/cn'

export type StepPillProps = {
  current: number
  total: number
  label?: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  className?: string
}

/**
 * "Step 3 of 7" chip used in the overlay and inline titles. Accepts optional
 * `className` for NativeWind consumers that want to restyle it without losing
 * the default Akita look.
 */
export function StepPill({
  current,
  total,
  label = 'Step',
  onPress,
  style,
  className,
}: StepPillProps): React.JSX.Element {
  const theme = useTheme()
  const container: ViewStyle = {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.palette.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  }

  const content = (
    <View style={[container, style]}>
      <Text
        style={{
          color: theme.palette.textMuted,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.sm,
          fontWeight: theme.typography.weight.regular,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.palette.accentAlt,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.sm,
          fontWeight: theme.typography.weight.bold,
        }}
      >
        {current + 1}
      </Text>
      <Text
        style={{
          color: theme.palette.textSubtle,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.sm,
        }}
      >
        of {total}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={cn(className)} accessibilityRole="button">
        {content}
      </Pressable>
    )
  }
  return <View className={cn(className)}>{content}</View>
}
