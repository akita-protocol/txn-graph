import React, { useMemo, useRef } from 'react'
import { View } from 'react-native'
import Svg from 'react-native-svg'
import { sequenceLayout } from '../layouts/sequence-layout'
import type { LayoutResult } from '../layouts/types'
import { ThemeProvider, useTheme } from '../theme'
import {
  AssetBadge,
  ActiveEdgeProvider,
  Marker,
  SequenceBackdrop,
  TxEdge,
  VerticalNode,
} from '../primitives'
import { useStepController } from '../hooks/useStepController'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { FlowStepper } from './FlowStepper'
import { GraphViewport } from './GraphViewport'
import { DownloadButton } from './DownloadButton'
import type { GraphProps } from '../types'
import type { PositionedEdge } from '../layouts/types'
import { isWeb } from '../utils/is-web'
import { cn } from '../utils/cn'

/**
 * Top-level public component. Composes the layout, the SVG primitives, the
 * step-through state machine, and the viewport wrapper into a single surface.
 *
 * For M1, only the sequence layout is wired — passing `layout="dag"` throws a
 * clear runtime error so consumers know the feature is forthcoming. DAG mode
 * lands in M4 alongside `dag-layout.ts`.
 */
export function TransactionsGraph(props: GraphProps): React.JSX.Element {
  const {
    data,
    layout = 'sequence',
    activeStep,
    defaultActiveStep,
    onStepChange,
    showStepper = true,
    stepperKeybindings = true,
    interactive = true,
    showZoomToolbar = true,
    fitOnMount = true,
    fullscreenable = true,
    onEntityTap,
    onEdgeTap: _onEdgeTap,
    renderTooltip: _renderTooltip,
    renderVerticalTitle: _renderVerticalTitle,
    renderHorizontalTitle: _renderHorizontalTitle,
    theme,
    width,
    height,
    downloadable,
    filename,
    className,
    style,
  } = props

  if (layout === 'dag') {
    throw new Error(
      '[visual-explorer] layout="dag" is not implemented until M4. Use layout="sequence" for now.',
    )
  }

  const result = useMemo<LayoutResult>(() => sequenceLayout.compute(data), [data])

  const controller = useStepController({
    edges: result.edges,
    activeStep,
    defaultActiveStep,
    onStepChange,
  })

  useKeyboardNavigation({
    enabled: stepperKeybindings && isWeb,
    onNext: controller.next,
    onPrev: controller.prev,
    onHome: controller.reset,
    onEnd: () => controller.goTo(controller.steps.length - 1),
  })

  const activeEdgeId = controller.current?.id ?? null

  const body = (
    <ActiveEdgeProvider activeEdgeId={activeEdgeId}>
      <GraphViewport
        contentWidth={result.width}
        contentHeight={result.height}
        width={width}
        height={height}
        interactive={interactive}
        showZoomToolbar={showZoomToolbar}
        fitOnMount={fitOnMount}
        fullscreenable={fullscreenable}
        overlay={
          showStepper && controller.steps.length > 0 ? (
            <FlowStepper
              index={controller.index}
              total={controller.steps.length}
              isFirst={controller.isFirst}
              isLast={controller.isLast}
              onPrev={controller.prev}
              onNext={controller.next}
              onReset={controller.reset}
            />
          ) : null
        }
      >
        <GraphSvgBody
          result={result}
          downloadable={downloadable}
          filename={filename}
          onEntityTap={onEntityTap}
        />
      </GraphViewport>
    </ActiveEdgeProvider>
  )

  return (
    <ThemeProvider theme={theme}>
      <View className={cn(className)} style={style}>
        {body}
      </View>
    </ThemeProvider>
  )
}

/**
 * Inner body split out from TransactionsGraph so the SVG ref lives beside the
 * DownloadButton that consumes it.
 */
function GraphSvgBody({
  result,
  downloadable,
  filename,
  onEntityTap,
}: {
  result: LayoutResult
  downloadable?: boolean
  filename?: string
  onEntityTap?: GraphProps['onEntityTap']
}): React.JSX.Element {
  const theme = useTheme()
  const svgRef = useRef<SVGSVGElement | null>(null)

  return (
    <View>
      <Svg
        ref={svgRef as unknown as never}
        width={result.width}
        height={result.height}
        viewBox={`0 0 ${result.width} ${result.height}`}
        style={{ backgroundColor: theme.palette.bg }}
      >
        {result.accountLaneX && result.headerHeight !== undefined ? (
          <SequenceBackdrop
            lanes={result.accountLaneX}
            headerHeight={result.headerHeight}
            height={result.height}
            padding={theme.viewport.padding}
          />
        ) : null}
        {result.nodes.map((node) => (
          <VerticalNode key={node.id} node={node} onPress={onEntityTap} />
        ))}
        {result.edges.map((edge) => (
          <EdgeGroup key={edge.id} edge={edge} result={result} />
        ))}
      </Svg>
      {downloadable ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: theme.spacing.sm, top: theme.spacing.sm }}
        >
          <DownloadButton
            svgRef={svgRef as unknown as { current: SVGSVGElement | null }}
            filename={filename}
          />
        </View>
      ) : null}
    </View>
  )
}

/**
 * One edge = the stroke + endpoint markers + label pill. Kept as a component
 * so React can key by `edge.id` and remount cheaply on layout swap.
 */
function EdgeGroup({
  edge,
  result,
}: {
  edge: PositionedEdge
  result: LayoutResult
}): React.JSX.Element {
  void result
  return (
    <React.Fragment>
      <TxEdge edge={edge} />
      {edge.markers.from ? (
        <Marker
          x={extractEndpoint(edge, 'from').x}
          y={extractEndpoint(edge, 'from').y}
          tag={edge.markers.from}
        />
      ) : null}
      {edge.markers.to ? (
        <Marker
          x={extractEndpoint(edge, 'to').x}
          y={extractEndpoint(edge, 'to').y}
          tag={edge.markers.to}
        />
      ) : null}
      <AssetBadge x={edge.labelAnchor.x} y={edge.labelAnchor.y} label={edge.label} />
    </React.Fragment>
  )
}

/** Pull a point out of an edge's path string. Sequence-layout-safe parser. */
function extractEndpoint(edge: PositionedEdge, which: 'from' | 'to'): { x: number; y: number } {
  // All sequence paths start with `M x y` and have at most one subsequent
  // command — `L x y` (vector), a C-curve (self-loop), or a second `M` (point).
  const moveMatch = edge.path.match(/^M\s+([-\d.]+)\s+([-\d.]+)/)
  const lineMatch = edge.path.match(/L\s+([-\d.]+)\s+([-\d.]+)\s*$/)
  const cubicEndMatch = edge.path.match(/C[\s\S]+?\s([-\d.]+)\s+([-\d.]+)\s*$/)

  if (which === 'from' && moveMatch) {
    return { x: parseFloat(moveMatch[1]), y: parseFloat(moveMatch[2]) }
  }
  if (lineMatch) return { x: parseFloat(lineMatch[1]), y: parseFloat(lineMatch[2]) }
  if (cubicEndMatch) return { x: parseFloat(cubicEndMatch[1]), y: parseFloat(cubicEndMatch[2]) }
  if (moveMatch) return { x: parseFloat(moveMatch[1]), y: parseFloat(moveMatch[2]) }
  return { x: 0, y: 0 }
}
