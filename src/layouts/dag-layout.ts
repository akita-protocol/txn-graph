/**
 * DAG layout: feeds the graph's verticals + vector edges into
 * `@dagrejs/dagre`, then reads back node positions + per-edge polylines.
 * The polylines are smoothed via Catmull-Rom → cubic Bezier so the curves
 * read like the reference-image's flowing arrows.
 *
 * The output `LayoutResult` is intentionally shaped the same as the
 * sequence layout's so the renderer stays layout-agnostic, with a few
 * contract differences:
 *
 *   - No `accountLaneX` / `headerHeight` / `titleWidth` / `horizontalRows`.
 *     Those drive the sequence layout's lane backdrop and HTML title
 *     overlay; in DAG mode nodes have (x, y) positions that don't map to
 *     columns and rows, so the title-column concept doesn't apply. The
 *     renderer already opts into the overlay only when those fields are
 *     present (see `GraphSvgBody.showOverlay`), so this is safe.
 *
 *   - Self-loops ({@link RepresentationType.SelfLoop}) and zero-length
 *     points ({@link RepresentationType.Point}) don't participate in the
 *     Dagre ranking (they have the same source and target and Dagre's
 *     rank-based layout isn't useful for them). We skip adding them to
 *     the dagre graph and synthesize the path ourselves from the resolved
 *     node position — same approach the sequence layout takes for these.
 *
 *   - Multigraph mode is on so a pair of nodes can have many parallel
 *     edges (e.g. Alice → Bob across several Horizontals). The edge name
 *     is `${horizontalIndex}:${subIndex}` so we can look the layout back
 *     up after `dagre.layout` runs.
 */

import dagre from '@dagrejs/dagre'
import {
  Horizontal,
  RepresentationType,
  SelfLoop,
  Vector,
  Vertical,
} from '../models'
import {
  catmullRomToBezier,
  distance,
  linePath,
} from '../primitives/Bezier'
import {
  Layout,
  LayoutResult,
  nodeIdForVertical,
  Point2D,
  PositionedEdge,
  PositionedNode,
} from './types'

export type DagLayoutOptions = {
  /** Dagre rank direction. Default: `'LR'` (left-to-right). */
  rankdir?: 'LR' | 'RL' | 'TB' | 'BT'
  /** Horizontal separation between sibling nodes. Default: 60. */
  nodesep?: number
  /** Vertical separation between ranks. Default: 120. */
  ranksep?: number
  /** Outer x-margin on the resulting graph. Default: 24. */
  marginx?: number
  /** Outer y-margin on the resulting graph. Default: 24. */
  marginy?: number
  /** Node box width (drives Dagre's edge routing). Default: 144. */
  nodeWidth?: number
  /** Node box height. Default: 56. */
  nodeHeight?: number
  /**
   * Catmull-Rom tension for edge smoothing. `0` = classic (smoothest),
   * `1` = straight lines. Defaults to `0` — leaves the reference-image's
   * gentle curves in place.
   */
  smoothingTension?: number
}

const DEFAULTS = {
  rankdir: 'LR' as const,
  nodesep: 60,
  ranksep: 120,
  marginx: 24,
  marginy: 24,
  nodeWidth: 144,
  nodeHeight: 56,
  smoothingTension: 0,
}

/**
 * Synthesize a self-loop path that starts just above the node, curves
 * into the right gutter, and returns just below. Mirrors the primitive
 * the sequence layout uses so the visual remains consistent when
 * switching modes mid-view.
 */
function selfLoopPath(x: number, y: number, radius: number): string {
  const topY = y - radius - 4
  const bottomY = y + radius + 4
  const outX = x + radius * 1.4
  return [
    `M ${x} ${topY}`,
    `C ${outX} ${topY} ${outX} ${bottomY} ${x} ${bottomY}`,
  ].join(' ')
}

function pointPath(x: number, y: number): string {
  // Zero-length path — renderer draws a single Marker circle here.
  return `M ${x} ${y} L ${x} ${y}`
}

/**
 * Walk the polyline and return the point at normalized arc-length `t`.
 * Used to place the label pill at the visual center of the smoothed
 * edge — more natural than simply lerping between the endpoints.
 */
function pointAlongPolyline(points: Point2D[], t: number): Point2D {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  const clamped = Math.max(0, Math.min(1, t))
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const seg = distance(points[i - 1], points[i])
    lengths.push(seg)
    total += seg
  }
  if (total === 0) return points[0]
  const target = clamped * total
  let accum = 0
  for (let i = 0; i < lengths.length; i += 1) {
    const next = accum + lengths[i]
    if (next >= target) {
      const localT = lengths[i] === 0 ? 0 : (target - accum) / lengths[i]
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * localT,
        y: points[i].y + (points[i + 1].y - points[i].y) * localT,
      }
    }
    accum = next
  }
  return points[points.length - 1]
}

/**
 * Translate a single Horizontal's Representation into a PositionedEdge,
 * using the already-laid-out `nodesById` + the `dagre.graphlib.Graph` we
 * can query for per-edge polyline points.
 */
function buildEdgeFromRepresentation(
  horizontal: Horizontal,
  horizontalIndex: number,
  subIndex: number,
  verticals: Vertical[],
  nodesById: Map<string, PositionedNode>,
  dagreGraph: dagre.graphlib.Graph,
  opts: Required<DagLayoutOptions>,
): PositionedEdge {
  const rep = horizontal.representation
  const edgeId = `${horizontalIndex}:${subIndex}`

  if (rep.type === RepresentationType.SelfLoop) {
    const sl = rep as SelfLoop
    const vertex = verticals.find((x) => x.id === sl.fromVerticalIndex)!
    const nodeId = nodeIdForVertical(vertex)
    const node = nodesById.get(nodeId)!
    const path = selfLoopPath(node.x, node.y, node.height / 2)
    return {
      id: edgeId,
      horizontalIndex,
      subIndex,
      horizontal,
      representation: rep,
      sourceNodeId: nodeId,
      targetNodeId: nodeId,
      pathKind: 'self-loop',
      path,
      labelAnchor: { x: node.x + node.width * 0.5, y: node.y },
      markers: { from: sl.fromTag, to: sl.toTag },
      label: sl.label,
      colorKey: sl.label.type,
    }
  }

  if (rep.type === RepresentationType.Point) {
    const vertex = verticals.find((x) => x.id === rep.fromVerticalIndex)!
    const nodeId = nodeIdForVertical(vertex)
    const node = nodesById.get(nodeId)!
    const path = pointPath(node.x, node.y)
    return {
      id: edgeId,
      horizontalIndex,
      subIndex,
      horizontal,
      representation: rep,
      sourceNodeId: nodeId,
      targetNodeId: nodeId,
      pathKind: 'point',
      path,
      labelAnchor: { x: node.x + 16, y: node.y - 2 },
      markers: { from: rep.fromTag },
      label: rep.label,
      colorKey: rep.label.type,
    }
  }

  // Vector — look up the dagre-computed polyline for this specific edge.
  const v = rep as Vector
  const fromVertex = verticals.find((x) => x.id === v.fromVerticalIndex)!
  const toVertex = verticals.find((x) => x.id === v.toVerticalIndex)!
  const sourceNodeId = nodeIdForVertical(fromVertex)
  const targetNodeId = nodeIdForVertical(toVertex)
  const sourceNode = nodesById.get(sourceNodeId)!
  const targetNode = nodesById.get(targetNodeId)!

  // `multigraph: true` means we stored each edge under its unique `edgeId`
  // name so sibling edges (Alice → Bob x3) don't collapse onto one path.
  const dagreEdge = dagreGraph.edge({
    v: sourceNodeId,
    w: targetNodeId,
    name: edgeId,
  })
  const waypoints = dagreEdge?.points ?? []

  // Anchor the polyline at the node centers so stroke endpoints line up
  // with whatever rendering the node primitive uses. If dagre omitted the
  // endpoint waypoints, the anchors fill in; if it included them, the
  // duplicates just smooth cleanly through.
  const polyline: Point2D[] = [
    { x: sourceNode.x, y: sourceNode.y },
    ...waypoints.map((p) => ({ x: p.x, y: p.y })),
    { x: targetNode.x, y: targetNode.y },
  ]
  const path =
    polyline.length >= 3
      ? catmullRomToBezier(polyline, {
          alpha: 0.5,
          tension: opts.smoothingTension,
        })
      : linePath(polyline[0], polyline[polyline.length - 1])

  // Place the label pill at the arc-length midpoint of the polyline so
  // curved edges don't end up with labels floating off one end.
  const midpoint = pointAlongPolyline(polyline, 0.5)

  return {
    id: edgeId,
    horizontalIndex,
    subIndex,
    horizontal,
    representation: rep,
    sourceNodeId,
    targetNodeId,
    pathKind: 'vector',
    path,
    labelAnchor: { x: midpoint.x, y: midpoint.y - 12 },
    markers: { from: v.fromTag, to: v.toTag },
    label: v.label,
    colorKey: v.label.type,
    direction: v.direction,
  }
}

export function makeDagLayout(options: DagLayoutOptions = {}): Layout {
  const opts: Required<DagLayoutOptions> = { ...DEFAULTS, ...options }

  return {
    id: 'dag',
    compute(data): LayoutResult {
      const { horizontals, verticals } = data

      const g = new dagre.graphlib.Graph({ multigraph: true, directed: true })
      g.setGraph({
        rankdir: opts.rankdir,
        nodesep: opts.nodesep,
        ranksep: opts.ranksep,
        marginx: opts.marginx,
        marginy: opts.marginy,
      })
      // Dagre demands a default label factory before `layout()` runs or it
      // throws on edges that were added without a label object.
      g.setDefaultEdgeLabel(() => ({}))

      for (const vertical of verticals) {
        g.setNode(nodeIdForVertical(vertical), {
          width: opts.nodeWidth,
          height: opts.nodeHeight,
        })
      }

      // Only Vector edges feed the ranking. SelfLoops + Points route off
      // the resolved node position themselves, so pushing them into dagre
      // would produce degenerate paths.
      horizontals.forEach((h, i) => {
        const rep = h.representation
        if (rep.type !== RepresentationType.Vector) return
        const fromVertex = verticals.find((x) => x.id === rep.fromVerticalIndex)
        const toVertex = verticals.find((x) => x.id === rep.toVerticalIndex)
        if (!fromVertex || !toVertex) return
        g.setEdge(
          nodeIdForVertical(fromVertex),
          nodeIdForVertical(toVertex),
          {},
          `${i}:0`,
        )
      })

      dagre.layout(g)

      const nodes: PositionedNode[] = verticals.map((vertical) => {
        const id = nodeIdForVertical(vertical)
        const n = g.node(id)
        return {
          id,
          vertical,
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
        }
      })

      const nodesById = new Map(nodes.map((n) => [n.id, n] as const))

      const edges: PositionedEdge[] = horizontals.map((h, i) =>
        buildEdgeFromRepresentation(h, i, 0, verticals, nodesById, g, opts),
      )

      const graphLabel = g.graph()
      // Dagre stores the laid-out bounds on the graph label after `layout()`.
      // We add our own margins on top so the viewport has breathing room
      // regardless of how the consumer configured `marginx`/`marginy`.
      const width = (graphLabel.width ?? 0) + opts.marginx * 2
      const height = (graphLabel.height ?? 0) + opts.marginy * 2

      return {
        nodes,
        edges,
        width,
        height,
        // `accountLaneX` / `headerHeight` / `titleWidth` / `horizontalRows`
        // are sequence-only (see file header). The renderer checks for their
        // presence before drawing the lane backdrop + HTML title overlay.
      }
    },
  }
}

export const dagLayout: Layout = makeDagLayout()
export const dagLayoutDefaults = DEFAULTS
