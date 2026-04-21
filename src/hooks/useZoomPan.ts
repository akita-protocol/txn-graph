import { useCallback, useMemo } from 'react'
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler'
import {
  useSharedValue,
  withSpring,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated'

export type ZoomPanOptions = {
  minScale?: number
  maxScale?: number
  /** How much each zoom-button press multiplies the scale. */
  zoomStep?: number
  /** Reanimated spring for fit / reset / zoom-button transitions. */
  spring?: WithSpringConfig
  /** Content bounds — used by `fitView()`. */
  contentWidth?: number
  contentHeight?: number
  viewportWidth?: number
  viewportHeight?: number
  /** Padding applied on each side during `fitView()`. */
  fitPadding?: number
}

export type ZoomPanController = {
  translateX: SharedValue<number>
  translateY: SharedValue<number>
  scale: SharedValue<number>
  gesture: ComposedGesture
  zoomIn: () => void
  zoomOut: () => void
  zoomBy: (factor: number) => void
  zoomTo: (target: number) => void
  reset: () => void
  fitView: () => void
  /** Apply a wheel delta (web). Positive dy = zoom out. */
  applyWheel: (deltaY: number, focalX?: number, focalY?: number) => void
}

const DEFAULT_SPRING: WithSpringConfig = {
  damping: 70,
  stiffness: 900,
  mass: 2,
}

export function useZoomPan(options: ZoomPanOptions = {}): ZoomPanController {
  const {
    minScale = 0.25,
    maxScale = 4,
    zoomStep = 1.2,
    spring = DEFAULT_SPRING,
    contentWidth,
    contentHeight,
    viewportWidth,
    viewportHeight,
    fitPadding = 24,
  } = options

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)

  // Pan gesture — accumulates a delta on the UI thread. `savedX/Y` preserves
  // the pre-gesture translate so pans compose cleanly.
  const savedX = useSharedValue(0)
  const savedY = useSharedValue(0)
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(4)
        .onStart(() => {
          savedX.value = translateX.value
          savedY.value = translateY.value
        })
        .onUpdate((event) => {
          translateX.value = savedX.value + event.translationX
          translateY.value = savedY.value + event.translationY
        }),
    [savedX, savedY, translateX, translateY],
  )

  const savedScale = useSharedValue(1)
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scale.value
        })
        .onUpdate((event) => {
          const next = clampScale(savedScale.value * event.scale, minScale, maxScale)
          scale.value = next
        }),
    [maxScale, minScale, savedScale, scale],
  )

  const gesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  )

  const zoomTo = useCallback(
    (target: number) => {
      const clamped = clampScale(target, minScale, maxScale)
      scale.value = withSpring(clamped, spring)
    },
    [maxScale, minScale, scale, spring],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      zoomTo(scale.value * factor)
    },
    [scale, zoomTo],
  )

  const zoomIn = useCallback(() => zoomBy(zoomStep), [zoomBy, zoomStep])
  const zoomOut = useCallback(() => zoomBy(1 / zoomStep), [zoomBy, zoomStep])

  const reset = useCallback(() => {
    translateX.value = withSpring(0, spring)
    translateY.value = withSpring(0, spring)
    scale.value = withSpring(1, spring)
  }, [scale, spring, translateX, translateY])

  const fitView = useCallback(() => {
    if (!contentWidth || !contentHeight || !viewportWidth || !viewportHeight) {
      reset()
      return
    }
    const availableW = Math.max(1, viewportWidth - fitPadding * 2)
    const availableH = Math.max(1, viewportHeight - fitPadding * 2)
    const fit = Math.min(availableW / contentWidth, availableH / contentHeight, maxScale)
    const target = clampScale(fit, minScale, maxScale)
    const centeredX = (viewportWidth - contentWidth * target) / 2
    const centeredY = (viewportHeight - contentHeight * target) / 2
    scale.value = withSpring(target, spring)
    translateX.value = withSpring(centeredX, spring)
    translateY.value = withSpring(centeredY, spring)
  }, [
    contentHeight,
    contentWidth,
    fitPadding,
    maxScale,
    minScale,
    reset,
    scale,
    spring,
    translateX,
    translateY,
    viewportHeight,
    viewportWidth,
  ])

  const applyWheel = useCallback(
    (deltaY: number, focalX?: number, focalY?: number) => {
      const factor = Math.exp(-deltaY * 0.0015)
      const next = clampScale(scale.value * factor, minScale, maxScale)
      const ratio = next / scale.value
      // Anchor zoom on focal point if provided (keeps the point under the
      // cursor fixed in screen space).
      if (typeof focalX === 'number' && typeof focalY === 'number') {
        translateX.value = focalX - (focalX - translateX.value) * ratio
        translateY.value = focalY - (focalY - translateY.value) * ratio
      }
      scale.value = next
    },
    [maxScale, minScale, scale, translateX, translateY],
  )

  return {
    translateX,
    translateY,
    scale,
    gesture,
    zoomIn,
    zoomOut,
    zoomBy,
    zoomTo,
    reset,
    fitView,
    applyWheel,
  }
}

function clampScale(value: number, min: number, max: number): number {
  'worklet'
  if (value < min) return min
  if (value > max) return max
  return value
}
