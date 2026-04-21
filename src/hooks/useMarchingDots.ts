import { useEffect } from 'react'
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

export type MarchingDotsOptions = {
  /** Dash segment length. */
  dash: number
  /** Gap length between dashes. */
  gap: number
  /** Pixels-per-second scroll speed. */
  speed: number
  /** When false, pauses the animation (shared value holds at 0). */
  enabled?: boolean
}

/**
 * Drives a stroke-dashoffset loop. Exposed as a standalone hook so consumers
 * can build custom animated edges (e.g. a colored trail behind the active
 * edge) without re-implementing the Reanimated plumbing that `<TxEdge>` uses
 * internally.
 */
export function useMarchingDots(options: MarchingDotsOptions): SharedValue<number> {
  const { dash, gap, speed, enabled = true } = options
  const offset = useSharedValue(0)

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(offset)
      offset.value = 0
      return
    }
    const period = ((dash + gap) / Math.max(1, speed)) * 1000
    offset.value = 0
    offset.value = withRepeat(
      withTiming(-(dash + gap), { duration: period, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(offset)
  }, [dash, enabled, gap, offset, speed])

  return offset
}
