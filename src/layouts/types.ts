import type { Horizontal, Label, LabelType, MarkerTag, Representation, TransactionsGraphData, Vertical } from '../models'

/** Simple 2D point in SVG user-space. */
export type Point2D = { x: number; y: number }

export type PositionedNode = {
  /** Stable id; matches `nodeIdForVertical(vertical)`. */
  id: string
  vertical: Vertical
  /** Center x in user-space. */
  x: number
  /** Center y in user-space. */
  y: number
  width: number
  height: number
}

export type PositionedEdge = {
  /** Stable id; used as the step id too. `${horizontalIndex}:${subIndex}`. */
  id: string
  horizontalIndex: number
  subIndex: number
  /** Reference back to the graph-data row that produced this edge. */
  horizontal: Horizontal
  representation: Representation
  /** Source + target node ids — may equal (self-loop). */
  sourceNodeId: string
  targetNodeId: string
  /** Kind of path; renderer picks stroke style / markers accordingly. */
  pathKind: 'vector' | 'self-loop' | 'point'
  /** SVG `d=` path string. Drawn as stroke. */
  path: string
  /** Center of the label pill. */
  labelAnchor: Point2D
  markers: { from?: MarkerTag; to?: MarkerTag }
  /** Label describing the transfer — drives color + content. */
  label: Label
  /** Color key (matches `label.type`). */
  colorKey: LabelType
  /** Ancestors group id used for indentation nesting (sequence mode). */
  ancestorsGroup?: string
  /** Direction of arrow for Vector edges; omitted for self-loop / point. */
  direction?: 'leftToRight' | 'rightToLeft'
}

export type LayoutResult = {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  width: number
  height: number
  /** Sequence-mode only: lane center x per vertical index, used for dashed backdrop. */
  accountLaneX?: Map<number, number>
  /** Sequence-mode only: height of the column-header band. */
  headerHeight?: number
}

/** Shared identity helper so sequence + dag agree on node ids. */
export function nodeIdForVertical(vertical: Vertical): string {
  switch (vertical.type) {
    case 'Account':
      return `acct:${vertical.id}:${vertical.accountAddress}`
    case 'Application':
      return `app:${vertical.id}:${String(vertical.applicationId)}`
    case 'Asset':
      return `asset:${vertical.id}:${String(vertical.assetId)}`
    case 'OpUp':
      return `opup:${vertical.id}`
    case 'Placeholder':
      return `placeholder:${vertical.id}`
  }
}

export interface Layout {
  readonly id: 'sequence' | 'dag'
  compute(data: TransactionsGraphData, opts?: unknown): LayoutResult
}
