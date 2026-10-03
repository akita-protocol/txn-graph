import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import { animate, useMotionValue, useMotionValueEvent, type MotionValue } from 'motion/react'

const MIN_SCALE = 0.1
const MAX_SCALE = 2.5
/** Fit never zooms past 1:1 — small graphs stay at their natural size. */
const MAX_FIT_SCALE = 1
const FIT_PADDING = 28
const DRAG_THRESHOLD = 4
const SPRING = { type: 'spring', stiffness: 520, damping: 52, mass: 1 } as const

export type Viewport = {
  ref: React.MutableRefObject<HTMLDivElement | null>
  x: MotionValue<number>
  y: MotionValue<number>
  scale: MotionValue<number>
  /** Rounded zoom percentage, for display. */
  zoom: number
  panning: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
  }
  fit: (animated?: boolean) => void
  zoomBy: (factor: number) => void
  /** True once if the last pointer gesture was a drag — call from click handlers to swallow the click. */
  consumeDrag: () => boolean
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function to(value: MotionValue<number>, target: number, animated: boolean) {
  if (!animated || reducedMotion()) {
    value.stop()
    value.set(target)
  } else {
    animate(value, target, SPRING)
  }
}

/**
 * Pan / zoom for the canvas. Drag pans (mouse, touch, pen), two fingers
 * pinch, ctrl/⌘ + wheel (and trackpad pinch) zooms at the pointer, a plain
 * wheel pans. The view refits whenever `fitKey` changes, and on resize
 * until the user moves it.
 */
export function useViewport(contentWidth: number, contentHeight: number, fitKey: string): Viewport {
  const ref = useRef<HTMLDivElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const [zoom, setZoom] = useState(100)
  useMotionValueEvent(scale, 'change', (s) => setZoom(Math.round(s * 100)))

  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const measure = () => setSize({ w: node.clientWidth, h: node.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const touched = useRef(false)
  const fit = useCallback(
    (animated = true) => {
      if (!size.w || !size.h || !contentWidth || !contentHeight) return
      const s = Math.max(
        MIN_SCALE,
        Math.min(MAX_FIT_SCALE, (size.w - FIT_PADDING * 2) / contentWidth, (size.h - FIT_PADDING * 2) / contentHeight),
      )
      to(scale, s, animated)
      to(x, (size.w - contentWidth * s) / 2, animated)
      to(y, Math.max(FIT_PADDING / 2, (size.h - contentHeight * s) / 2), animated)
      touched.current = false
    },
    [contentHeight, contentWidth, scale, size.h, size.w, x, y],
  )

  const lastFitKey = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (lastFitKey.current !== fitKey) {
      lastFitKey.current = fitKey
      fit(false)
    } else if (!touched.current) {
      fit(false)
    }
  }, [fit, fitKey])

  const zoomAt = useCallback(
    (next: number, fx: number, fy: number, animated: boolean) => {
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next))
      const ratio = clamped / scale.get()
      to(x, fx - (fx - x.get()) * ratio, animated)
      to(y, fy - (fy - y.get()) * ratio, animated)
      to(scale, clamped, animated)
      touched.current = true
    },
    [scale, x, y],
  )

  const zoomBy = useCallback(
    (factor: number) => zoomAt(scale.get() * factor, size.w / 2, size.h / 2, true),
    [scale, size.h, size.w, zoomAt],
  )

  // Wheel needs a non-passive native listener to stop page scroll.
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = node.getBoundingClientRect()
        zoomAt(scale.get() * Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top, false)
      } else {
        x.set(x.get() - e.deltaX)
        y.set(y.get() - e.deltaY)
        touched.current = true
      }
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [scale, x, y, zoomAt])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; tx: number; ty: number; dist?: number; s?: number } | null>(null)
  const dragged = useRef(false)
  const [panning, setPanning] = useState(false)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      dragged.current = false
      const pts = [...pointers.current.values()]
      if (pts.length === 1) {
        gesture.current = { x: e.clientX, y: e.clientY, tx: x.get(), ty: y.get() }
      } else if (pts.length === 2) {
        const [a, b] = pts
        gesture.current = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          tx: x.get(),
          ty: y.get(),
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          s: scale.get(),
        }
      }
    },
    [scale, x, y],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId) || !gesture.current) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const g = gesture.current
      const pts = [...pointers.current.values()]
      if (pts.length >= 2 && g.dist && g.s) {
        const [a, b] = pts
        const rect = ref.current!.getBoundingClientRect()
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (g.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist))
        const ratio = next / g.s
        const fx = g.x - rect.left
        const fy = g.y - rect.top
        scale.set(next)
        x.set(fx - (fx - g.tx) * ratio + (mx - g.x))
        y.set(fy - (fy - g.ty) * ratio + (my - g.y))
        dragged.current = true
        touched.current = true
        return
      }
      const dx = e.clientX - g.x
      const dy = e.clientY - g.y
      if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!dragged.current) {
        dragged.current = true
        setPanning(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      x.set(g.tx + dx)
      y.set(g.ty + dy)
      touched.current = true
    },
    [scale, x, y],
  )

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      gesture.current = null
      setPanning(false)
    } else {
      // Lifting one finger of a pinch: continue as a pan from here.
      const [p] = [...pointers.current.values()]
      gesture.current = { x: p.x, y: p.y, tx: x.get(), ty: y.get() }
    }
  }, [x, y])

  const consumeDrag = useCallback(() => {
    const was = dragged.current
    dragged.current = false
    return was
  }, [])

  return {
    ref,
    x,
    y,
    scale,
    zoom,
    panning,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    fit,
    zoomBy,
    consumeDrag,
  }
}
