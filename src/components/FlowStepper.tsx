import React from 'react'
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useTheme } from '../theme'
import { StepPill } from '../primitives'
import { cn } from '../utils/cn'

export type FlowStepperProps = {
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  onReset?: () => void
  style?: StyleProp<ViewStyle>
  className?: string
  /** Optional: disable the subtle spring entry. */
  disableEntryAnimation?: boolean
}

/**
 * Bottom-center overlay: ‹ · Step N of M · › · Esc-to-reset.
 * Mirrors the "Step 3 of 7" pattern from the reference design.
 */
export function FlowStepper({
  index,
  total,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onReset,
  style,
  className,
  disableEntryAnimation,
}: FlowStepperProps): React.JSX.Element {
  const theme = useTheme()
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.palette.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.palette.border,
  }
  const Wrapper = disableEntryAnimation ? View : Animated.View
  const entry = disableEntryAnimation ? undefined : FadeInDown.springify().damping(80).mass(2)

  return (
    <Wrapper
      entering={entry as unknown as undefined}
      style={[containerStyle, style]}
      className={cn(className)}
    >
      <StepButton
        label="‹"
        ariaLabel="Previous step"
        onPress={onPrev}
        disabled={isFirst}
      />
      <StepPill current={index} total={total} onPress={onReset} />
      <StepButton
        label="›"
        ariaLabel="Next step"
        onPress={onNext}
        disabled={isLast}
      />
    </Wrapper>
  )
}

function StepButton({
  label,
  ariaLabel,
  onPress,
  disabled,
}: {
  label: string
  ariaLabel: string
  onPress: () => void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const size = 32
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: theme.palette.border,
        backgroundColor: theme.palette.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text
        style={{
          color: theme.palette.text,
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.size.md,
          lineHeight: theme.typography.size.md + 2,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
