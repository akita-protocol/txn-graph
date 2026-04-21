import type React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { Horizontal, TransactionsGraphData, Vertical } from './models'
import type { PositionedEdge, PositionedNode } from './layouts/types'
import type { Step } from './hooks/useStepController'
import type { ThemeTokens } from './theme'
import type { EntityRef } from './providers'

export type LayoutMode = 'sequence' | 'dag'

export type DagLayoutOptions = {
  rankdir?: 'LR' | 'RL' | 'TB' | 'BT'
  nodesep?: number
  ranksep?: number
  marginx?: number
  marginy?: number
}

export type RenderTooltipContext = {
  edge: PositionedEdge
  step: Step
  horizontal: Horizontal
  close: () => void
}

export type RenderVerticalTitleContext = {
  node: PositionedNode
  vertical: Vertical
}

export type RenderHorizontalTitleContext = {
  edge: PositionedEdge
  horizontal: Horizontal
}

export type GraphProps = {
  data: TransactionsGraphData
  layout?: LayoutMode
  dagOptions?: DagLayoutOptions

  /** Controlled active-step index. */
  activeStep?: number
  defaultActiveStep?: number
  onStepChange?: (index: number, step: Step) => void

  /** Show the "‹ Step N of M ›" overlay. Default: true. */
  showStepper?: boolean
  /** Attach document keyboard listeners on web. Default: true. */
  stepperKeybindings?: boolean

  /** Enable pan / zoom / pinch. Default: true. */
  interactive?: boolean
  /** Show the zoom-toolbar cluster. Default: true. */
  showZoomToolbar?: boolean
  /** Auto-fit content on first render. Default: true. */
  fitOnMount?: boolean
  /** Allow fullscreen toggle. Default: true. */
  fullscreenable?: boolean

  /**
   * Marching-dots animation on the active edge. Defaults to `true` in normal
   * environments and auto-disables when `process.env.NODE_ENV === 'test'` so
   * snapshot tests produce deterministic `strokeDashoffset` values. Pass an
   * explicit boolean to override (e.g. `animate={true}` inside a
   * vitest-based visual-regression suite).
   */
  animate?: boolean

  /** Fires when a node is tapped. Receives the entity discriminated ref. */
  onEntityTap?: (ref: EntityRef, event?: unknown) => void
  /** Fires when an edge is tapped. */
  onEdgeTap?: (step: Step, event?: unknown) => void

  renderTooltip?: (ctx: RenderTooltipContext) => React.ReactNode
  renderVerticalTitle?: (ctx: RenderVerticalTitleContext) => React.ReactNode
  renderHorizontalTitle?: (ctx: RenderHorizontalTitleContext) => React.ReactNode

  /** Partial theme override — merged into `akitaDarkTheme`. */
  theme?: Partial<ThemeTokens>

  /** Fixed viewport dimensions. When omitted, the container flexes. */
  width?: number
  height?: number

  /** Web-only: show a Download-as-PNG button. */
  downloadable?: boolean
  /** Filename for the Download button. */
  filename?: string

  className?: string
  style?: StyleProp<ViewStyle>
}
