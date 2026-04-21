import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  type LayoutChangeEvent,
  Modal,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useTheme } from '../theme'
import { useZoomPan, type ZoomPanController } from '../hooks/useZoomPan'
import { ZoomToolbar } from './ZoomToolbar'
import { isWeb } from '../utils/is-web'
import { cn } from '../utils/cn'

export type GraphViewportHandle = {
  controller: ZoomPanController
  setFullscreen: (next: boolean) => void
}

export type GraphViewportProps = {
  /** Intrinsic content dimensions (from LayoutResult). */
  contentWidth: number
  contentHeight: number
  /** Optional fixed viewport dimensions; otherwise measured on layout. */
  width?: number
  height?: number
  /** Interactive pan/zoom. Default: true. */
  interactive?: boolean
  /** Show the zoom toolbar in the top-right. Default: true. */
  showZoomToolbar?: boolean
  /** Allow fullscreen toggle. Default: true. */
  fullscreenable?: boolean
  /** When true, auto-fit to viewport on mount. Default: true. */
  fitOnMount?: boolean
  /** Children are the SVG graph content (raw `<Svg>` tree). */
  children: React.ReactNode
  /** Optional overlay rendered on top of the content (FlowStepper goes here). */
  overlay?: React.ReactNode
  style?: StyleProp<ViewStyle>
  className?: string
}

/**
 * Scroll / zoom / fullscreen wrapper. Places the caller-provided SVG inside a
 * transformed Animated.View driven by `useZoomPan`. On web, wheel + pinch +
 * drag work out of the box; on native, gesture-handler pinch + pan work.
 */
export const GraphViewport = forwardRef<GraphViewportHandle, GraphViewportProps>(
  function GraphViewport(
    {
      contentWidth,
      contentHeight,
      width,
      height,
      interactive = true,
      showZoomToolbar = true,
      fullscreenable = true,
      fitOnMount = true,
      children,
      overlay,
      style,
      className,
    },
    ref,
  ) {
    const theme = useTheme()
    const [measured, setMeasured] = useState<{ w: number; h: number }>({
      w: width ?? 0,
      h: height ?? 0,
    })
    const [isFullscreen, setIsFullscreen] = useState(false)

    const effectiveWidth = width ?? measured.w
    const effectiveHeight = height ?? measured.h

    const controller = useZoomPan({
      contentWidth,
      contentHeight,
      viewportWidth: effectiveWidth,
      viewportHeight: effectiveHeight,
    })

    useImperativeHandle(
      ref,
      () => ({
        controller,
        setFullscreen: setIsFullscreen,
      }),
      [controller],
    )

    useEffect(() => {
      if (!fitOnMount) return
      if (effectiveWidth <= 0 || effectiveHeight <= 0) return
      controller.fitView()
      // Intentionally depend on dimensions only — fitView identity is stable
      // enough and we don't want to re-fit on every scale tick.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveWidth, effectiveHeight, contentWidth, contentHeight, fitOnMount])

    const onLayout = useCallback(
      (event: LayoutChangeEvent) => {
        if (width && height) return
        const { width: w, height: h } = event.nativeEvent.layout
        setMeasured({ w, h })
      },
      [height, width],
    )

    // Explicit deps so the hook works under the web-without-babel path. The
    // Reanimated Babel plugin auto-generates this array for us on native /
    // Metro; consumers using SWC or Vite-without-plugin (like lora) don't
    // get that rewrite, so the hook otherwise throws. Shared values are
    // referentially stable across renders, so the hook only re-computes when
    // the controller identity itself changes (effectively never here).
    const animatedContentStyle = useAnimatedStyle(
      () => ({
        transform: [
          { translateX: controller.translateX.value },
          { translateY: controller.translateY.value },
          { scale: controller.scale.value },
        ],
      }),
      [controller.translateX, controller.translateY, controller.scale],
    )

    const containerStyle: ViewStyle = useMemo(
      () => ({
        flex: width && height ? undefined : 1,
        width,
        height,
        backgroundColor: theme.palette.bg,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        position: 'relative',
      }),
      [height, theme, width],
    )

    const onToggleFullscreen = useMemo(() => {
      if (!fullscreenable) return undefined
      return () => setIsFullscreen((v) => !v)
    }, [fullscreenable])

    // Wheel-zoom on web: attach the listener imperatively via `addEventListener`
    // on the underlying DOM node. RN's public `View` type doesn't expose
    // `onWheel`, and adding a cast is fragile across rn-web versions.
    const rootRef = useRef<View | null>(null)
    useEffect(() => {
      if (!isWeb || !interactive) return undefined
      const node = rootRef.current as unknown as HTMLElement | null
      if (!node) return undefined
      const handler = (event: WheelEvent) => {
        event.preventDefault()
        controller.applyWheel(event.deltaY, event.offsetX, event.offsetY)
      }
      node.addEventListener('wheel', handler, { passive: false })
      return () => node.removeEventListener('wheel', handler)
    }, [controller, interactive])

    const content = (
      <View
        ref={rootRef}
        style={[containerStyle, style]}
        className={cn(className)}
        onLayout={onLayout}
      >
        {interactive ? (
          <GestureDetector gesture={controller.gesture}>
            <Animated.View
              style={[{ width: contentWidth, height: contentHeight }, animatedContentStyle]}
            >
              {children}
            </Animated.View>
          </GestureDetector>
        ) : (
          <Animated.View
            style={[{ width: contentWidth, height: contentHeight }, animatedContentStyle]}
          >
            {children}
          </Animated.View>
        )}
        {showZoomToolbar ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: theme.spacing.sm,
              right: theme.spacing.sm,
            }}
          >
            <ZoomToolbar
              onZoomIn={controller.zoomIn}
              onZoomOut={controller.zoomOut}
              onFit={controller.fitView}
              onToggleFullscreen={onToggleFullscreen}
              isFullscreen={isFullscreen}
            />
          </View>
        ) : null}
        {overlay ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: theme.spacing.md,
              alignItems: 'center',
            }}
          >
            {overlay}
          </View>
        ) : null}
      </View>
    )

    if (fullscreenable && isFullscreen) {
      if (Platform.OS === 'web') {
        // On web, use a fixed-position overlay so we stay inside React's tree
        // (requestFullscreen is awkward with gesture-handler + reanimated).
        return (
          <View
            style={{
              position: 'absolute' as const,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              // react-native-web supports zIndex on View
              zIndex: 9999,
              backgroundColor: theme.palette.bg,
            }}
          >
            {content}
          </View>
        )
      }
      return (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsFullscreen(false)}>
          <View style={{ flex: 1, backgroundColor: theme.palette.bg }}>{content}</View>
        </Modal>
      )
    }

    return content
  },
)
