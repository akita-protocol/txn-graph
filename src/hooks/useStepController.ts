import { useCallback, useMemo, useRef, useState } from 'react'
import type { PositionedEdge } from '../layouts/types'
import type { Horizontal } from '../models'

/**
 * One entry in the step-through narrative. In both sequence and DAG modes
 * a single Horizontal (which is already flattened to include inner-txn rows)
 * maps to exactly one Step.
 */
export type Step = {
  id: string
  index: number
  horizontal: Horizontal
  edge: PositionedEdge
}

export type StepControllerOptions = {
  edges: PositionedEdge[]
  /** Controlled active-step index (wins over `defaultActiveStep`). */
  activeStep?: number
  /** Uncontrolled initial index. Defaults to 0. */
  defaultActiveStep?: number
  /** Fired on every transition, including the initial set when controlled. */
  onStepChange?: (index: number, step: Step) => void
}

export type StepController = {
  steps: Step[]
  index: number
  current: Step | undefined
  goTo: (index: number) => void
  next: () => void
  prev: () => void
  reset: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Step-through state machine. Works in both controlled and uncontrolled modes.
 *
 * Controlled: `activeStep` is defined. The hook mirrors it; calls to `goTo`,
 * `next`, `prev`, `reset` fire `onStepChange(nextIndex, step)` but do not
 * mutate internal state — the consumer owns it.
 *
 * Uncontrolled: `activeStep` is undefined. Internal state drives the index;
 * the hook still fires `onStepChange` on every transition.
 */
export function useStepController(options: StepControllerOptions): StepController {
  const { edges, activeStep, defaultActiveStep = 0, onStepChange } = options

  const steps = useMemo<Step[]>(
    () =>
      edges.map((edge, index) => ({
        id: edge.id,
        index,
        horizontal: edge.horizontal,
        edge,
      })),
    [edges],
  )

  const [internal, setInternal] = useState<number>(() => clampIndex(defaultActiveStep, steps.length))
  const isControlled = typeof activeStep === 'number'
  const index = clampIndex(isControlled ? (activeStep as number) : internal, steps.length)

  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange

  const goTo = useCallback(
    (next: number) => {
      const clamped = clampIndex(next, steps.length)
      if (steps.length === 0) return
      const step = steps[clamped]
      if (!isControlled) setInternal(clamped)
      if (clamped !== index) onStepChangeRef.current?.(clamped, step)
    },
    [index, isControlled, steps],
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const reset = useCallback(() => goTo(0), [goTo])

  const current = steps[index]
  const isFirst = index <= 0
  const isLast = index >= steps.length - 1

  return {
    steps,
    index,
    current,
    goTo,
    next,
    prev,
    reset,
    isFirst,
    isLast,
  }
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) return 0
  if (value < 0) return 0
  if (value >= length) return length - 1
  return value
}
