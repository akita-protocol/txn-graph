/**
 * Sequence-diagram layout: accounts / apps / assets as columns (verticals),
 * transactions as rows (horizontals). A port of lora's grid math from
 * `src/features/transactions-graph/components/graph-config.tsx` and
 * `horizontal.tsx`, but emitting SVG path strings so the renderer can be pure
 * SVG cross-platform.
 */

import {
  Horizontal,
  RepresentationType,
  SelfLoop,
  Vector,
  Vertical,
} from '../models'
import {
  Layout,
  LayoutResult,
  nodeIdForVertical,
  PositionedEdge,
  PositionedNode,
} from './types'

export type SequenceLayoutOptions = {
  titleWidth?: number
  colWidth?: number
  rowHeight?: number
  headerHeight?: number
  padding?: number
  nodeWidth?: number
  nodeHeight?: number
}

const DEFAULTS = {
  titleWidth: 180,
  colWidth: 160,
  rowHeight: 52,
  headerHeight: 80,
  padding: 24,
  nodeWidth: 144,
  nodeHeight: 56,
}

function colCenterX(colIdx: number, opts: Required<SequenceLayoutOptions>): number {
  return opts.padding + opts.titleWidth + colIdx * opts.colWidth + opts.colWidth / 2
}

function rowCenterY(rowIdx: number, opts: Required<SequenceLayoutOptions>): number {
  return opts.padding + opts.headerHeight + rowIdx * opts.rowHeight + opts.rowHeight / 2
}

function vectorPath(fromX: number, toX: number, y: number): string {
  // Horizontal stroke, clipped with rounded ends. Kept simple for now —
  // future enhancement: add a subtle curve near the endpoints.
  return `M ${fromX} ${y} L ${toX} ${y}`
}

function selfLoopPath(x: number, y: number, colWidth: number): string {
  // Start at the column's right edge, arc right into the gutter, and return
  // along the same y to the arrow head. Uses a cubic bezier for a gentle hook.
  const outX = x + colWidth * 0.35
  const topY = y - 18
  const bottomY = y + 18
  return [
    `M ${x} ${topY - 4}`,
    `C ${outX} ${topY - 4} ${outX} ${bottomY + 4} ${x} ${bottomY + 4}`,
  ].join(' ')
}

function pointPath(x: number, y: number): string {
  // Zero-length path; the renderer draws a marker circle directly.
  return `M ${x} ${y} L ${x} ${y}`
}

function buildEdgeFromRepresentation(
  horizontal: Horizontal,
  horizontalIndex: number,
  subIndex: number,
  verticals: Vertical[],
  opts: Required<SequenceLayoutOptions>,
): PositionedEdge {
  const rep = horizontal.representation
  const rowY = rowCenterY(horizontalIndex, opts)

  if (rep.type === RepresentationType.Vector) {
    const v = rep as Vector
    const fromIdx = verticals.findIndex((x) => x.id === v.fromVerticalIndex)
    const toIdx = verticals.findIndex((x) => x.id === v.toVerticalIndex)
    const leftCenter = colCenterX(Math.min(fromIdx, toIdx), opts)
    const rightCenter = colCenterX(Math.max(fromIdx, toIdx), opts)
    const path = vectorPath(leftCenter, rightCenter, rowY)
    const labelAnchor = { x: (leftCenter + rightCenter) / 2, y: rowY - 14 }

    return {
      id: `${horizontalIndex}:${subIndex}`,
      horizontalIndex,
      subIndex,
      horizontal,
      representation: rep,
      sourceNodeId: nodeIdForVertical(verticals[fromIdx]),
      targetNodeId: nodeIdForVertical(verticals[toIdx]),
      pathKind: 'vector',
      path,
      labelAnchor,
      markers: { from: v.fromTag, to: v.toTag },
      label: v.label,
      colorKey: v.label.type,
      direction: v.direction,
    }
  }

  if (rep.type === RepresentationType.SelfLoop) {
    const sl = rep as SelfLoop
    const fromIdx = verticals.findIndex((x) => x.id === sl.fromVerticalIndex)
    const x = colCenterX(fromIdx, opts)
    const path = selfLoopPath(x, rowY, opts.colWidth)
    const labelAnchor = { x: x + opts.colWidth * 0.2, y: rowY }

    return {
      id: `${horizontalIndex}:${subIndex}`,
      horizontalIndex,
      subIndex,
      horizontal,
      representation: rep,
      sourceNodeId: nodeIdForVertical(verticals[fromIdx]),
      targetNodeId: nodeIdForVertical(verticals[fromIdx]),
      pathKind: 'self-loop',
      path,
      labelAnchor,
      markers: { from: sl.fromTag, to: sl.toTag },
      label: sl.label,
      colorKey: sl.label.type,
    }
  }

  // Point
  const fromIdx = verticals.findIndex((x) => x.id === rep.fromVerticalIndex)
  const x = colCenterX(fromIdx, opts)
  const path = pointPath(x, rowY)

  return {
    id: `${horizontalIndex}:${subIndex}`,
    horizontalIndex,
    subIndex,
    horizontal,
    representation: rep,
    sourceNodeId: nodeIdForVertical(verticals[fromIdx]),
    targetNodeId: nodeIdForVertical(verticals[fromIdx]),
    pathKind: 'point',
    path,
    labelAnchor: { x: x + 16, y: rowY - 2 },
    markers: { from: rep.fromTag },
    label: rep.label,
    colorKey: rep.label.type,
  }
}

export function makeSequenceLayout(options: SequenceLayoutOptions = {}): Layout {
  const opts: Required<SequenceLayoutOptions> = { ...DEFAULTS, ...options }

  return {
    id: 'sequence',
    compute(data): LayoutResult {
      const { horizontals, verticals } = data

      const nodes: PositionedNode[] = verticals.map((vertical, index) => ({
        id: nodeIdForVertical(vertical),
        vertical,
        x: colCenterX(index, opts),
        y: opts.padding + opts.headerHeight / 2,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
      }))

      const edges: PositionedEdge[] = horizontals.map((h, i) =>
        buildEdgeFromRepresentation(h, i, 0, verticals, opts),
      )

      const laneX = new Map<number, number>()
      verticals.forEach((_, i) => laneX.set(i, colCenterX(i, opts)))

      const totalWidth =
        opts.padding * 2 + opts.titleWidth + Math.max(1, verticals.length) * opts.colWidth
      const totalHeight =
        opts.padding * 2 + opts.headerHeight + Math.max(1, horizontals.length) * opts.rowHeight

      return {
        nodes,
        edges,
        width: totalWidth,
        height: totalHeight,
        accountLaneX: laneX,
        headerHeight: opts.headerHeight,
      }
    },
  }
}

export const sequenceLayout: Layout = makeSequenceLayout()

export const sequenceLayoutDefaults = DEFAULTS
