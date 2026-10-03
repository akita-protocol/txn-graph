import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler'
import {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const MIN_SCALE = 0.1
const MAX_SCALE = 2.5
const MAX_FIT_SCALE = 1
const FIT_PADDING = 20
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }

export type Viewport = {
  onLayout: (e: LayoutChangeEvent) => void
  gesture: ComposedGesture
  stageStyle: ReturnType<typeof useAnimatedStyle>
  fit: (animated?: boolean) => void
  zoomBy: (factor: number) => void
}

/**
 * Pan (one finger) and pinch (two, anchored at the focal point) on the UI
 * thread. Refits whenever `fitKey` changes, and on resize until the user
 * moves the view.
 */
export function useViewport(contentWidth: number, contentHeight: number, fitKey: string): Viewport {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const scale = useSharedValue(1)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const touched = useRef(false)
  const markTouched = useCallback(() => {
    touched.current = true
  }, [])

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }))
  }, [])

  const fit = useCallback(
    (animated = true) => {
      if (!size.w || !size.h || !contentWidth || !contentHeight) return
      const s = Math.max(
        MIN_SCALE,
        Math.min(MAX_FIT_SCALE, (size.w - FIT_PADDING * 2) / contentWidth, (size.h - FIT_PADDING * 2) / contentHeight),
      )
      const x = (size.w - contentWidth * s) / 2
      const y = Math.max(FIT_PADDING / 2, (size.h - contentHeight * s) / 2)
      scale.value = animated ? withTiming(s, TIMING) : s
      tx.value = animated ? withTiming(x, TIMING) : x
      ty.value = animated ? withTiming(y, TIMING) : y
      touched.current = false
    },
    [contentHeight, contentWidth, scale, size.h, size.w, tx, ty],
  )

  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    if (lastKey.current !== fitKey) {
      lastKey.current = fitKey
      fit(false)
    } else if (!touched.current) {
      fit(false)
    }
  }, [fit, fitKey])

  const zoomBy = useCallback(
    (factor: number) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value * factor))
      const ratio = next / scale.value
      const fx = size.w / 2
      const fy = size.h / 2
      tx.value = withTiming(fx - (fx - tx.value) * ratio, TIMING)
      ty.value = withTiming(fy - (fy - ty.value) * ratio, TIMING)
      scale.value = withTiming(next, TIMING)
      touched.current = true
    },
    [scale, size.h, size.w, tx, ty],
  )

  const start = useSharedValue({ x: 0, y: 0, s: 1, fx: 0, fy: 0 })
  const panBase = useSharedValue({ x: 0, y: 0, stale: false })
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .onStart(() => {
        panBase.value = { x: tx.value, y: ty.value, stale: false }
      })
      .onUpdate((e) => {
        // Two fingers belong to the pinch; when one lifts, re-base so the
        // remaining finger pans from where the pinch left the view.
        if (e.numberOfPointers > 1) {
          panBase.value = { ...panBase.value, stale: true }
          return
        }
        if (panBase.value.stale) {
          panBase.value = { x: tx.value - e.translationX, y: ty.value - e.translationY, stale: false }
        }
        tx.value = panBase.value.x + e.translationX
        ty.value = panBase.value.y + e.translationY
      })
      .onEnd(() => {
        runOnJS(markTouched)()
      })
    const pinch = Gesture.Pinch()
      .onStart((e) => {
        start.value = { x: tx.value, y: ty.value, s: scale.value, fx: e.focalX, fy: e.focalY }
      })
      .onUpdate((e) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, start.value.s * e.scale))
        const ratio = next / start.value.s
        // Keep the content point under the initial focal point fixed, and
        // let the focal point's drift pan.
        tx.value = e.focalX - (start.value.fx - start.value.x) * ratio
        ty.value = e.focalY - (start.value.fy - start.value.y) * ratio
        scale.value = next
      })
      .onEnd(() => {
        runOnJS(markTouched)()
      })
    return Gesture.Simultaneous(pan, pinch)
  }, [markTouched, panBase, scale, start, tx, ty])

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  return { onLayout, gesture, stageStyle, fit, zoomBy }
}
