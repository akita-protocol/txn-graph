// Namespace import: dagre ships CJS with no default export, and Vite serves
// it raw when the core package is excluded from dep optimization.
import * as dagre from '@dagrejs/dagre'
import { CONNECTION_KINDS, type EntityId } from '../graph/types'
import type { Connection, ScopeView } from '../graph/scope'

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; width: number; height: number }

export type LayoutOptions = {
  cardWidth: number
  cardHeight: number
  assetWidth: number
  assetHeight: number
  /** Horizontal gap between cards in the same rank. */
  nodesep: number
  /** Vertical gap between ranks. */
  ranksep: number
  /** Gap dagre keeps between long edges threading through a rank. */
  edgesep: number
  /** Spacing between parallel lines of the same pair. */
  laneGap: number
  /** Max spacing between line ends on a card side. */
  portGap: number
  margin: number
  assetGap: number
  /** Space between the graph and the asset row's separator. */
  assetSectionGap: number
  /** Space between the separator and the asset cards (holds the caption). */
  assetCaptionHeight: number
  arrowSize: number
  /** Leaves per row before a fan-out is packed into a grid. */
  maxFan: number
  /** Vertical gap between rows of a packed fan-out. */
  fanRowGap: number
}

export const defaultLayoutOptions: LayoutOptions = {
  cardWidth: 184,
  cardHeight: 68,
  assetWidth: 152,
  assetHeight: 66,
  nodesep: 40,
  ranksep: 84,
  edgesep: 22,
  laneGap: 5,
  portGap: 8,
  margin: 28,
  assetGap: 16,
  assetSectionGap: 56,
  assetCaptionHeight: 30,
  arrowSize: 6,
  maxFan: 6,
  fanRowGap: 44,
}

export type ConnectionGeometry = {
  id: string
  /** SVG path data for the line (ends at the arrow's base). */
  path: string
  /** Closed SVG path for the arrowhead. */
  arrow: string
  start: Point
  end: Point
}

export type SceneLayout = {
  width: number
  height: number
  rects: Record<EntityId, Rect>
  connections: Record<string, ConnectionGeometry>
  /** Count-badge anchor per pair of blocks (keyed by `Connection.pairKey`). */
  badges: Record<string, Point>
  /** SVG path data per asset link id. */
  assetLinks: Record<string, string>
  /** Separator line of the asset row, when there are assets. */
  assetSection?: { y: number; x1: number; x2: number }
}

type Side = 'top' | 'bottom'
type Cubic = [Point, Point, Point, Point]

type PortRequest = {
  key: string
  block: EntityId
  side: Side
  /** x the line heads toward after leaving the card — sorts ports to avoid crossings. */
  toward: number
  tiebreak: number
}

const kindIndex = (c: Connection) => CONNECTION_KINDS.indexOf(c.kind)

/**
 * Lay out a scope: dagre ranks the account/app blocks top-to-bottom, assets
 * sit in a row underneath, and each connection gets its own lane — parallel
 * lines between the same pair, spread ports on each card side, and long
 * edges threaded through the gaps dagre leaves between cards.
 */
export function layoutScene(view: ScopeView, options: Partial<LayoutOptions> = {}): SceneLayout {
  const o = { ...defaultLayoutOptions, ...options }
  const rects: Record<EntityId, Rect> = {}

  // ── 1. Rank the blocks ────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setGraph({
    rankdir: 'TB',
    nodesep: o.nodesep,
    ranksep: o.ranksep,
    edgesep: o.edgesep,
    marginx: o.margin,
    marginy: o.margin,
  })
  g.setDefaultEdgeLabel(() => ({}))

  const isAsset = (id: EntityId) => id.startsWith('asset:')
  // Directed pair → its connections (lanes), in legend order.
  const pairs = new Map<string, Connection[]>()
  for (const c of view.connections) {
    if (isAsset(c.to) || isAsset(c.from)) continue
    const key = `${c.from}>${c.to}`
    const list = pairs.get(key) ?? []
    list.push(c)
    pairs.set(key, list)
  }
  for (const lanes of pairs.values()) lanes.sort((a, b) => kindIndex(a) - kindIndex(b))

  // Big fan-outs (an airdrop, a batch payout) would stretch one rank across
  // the screen. Leaves hanging off the same hub are packed into a grid that
  // dagre sees as a single node.
  const fans = findFans(view, pairs, o)
  const fanOf = new Map<EntityId, Fan>()
  for (const fan of fans) for (const leaf of fan.leaves) fanOf.set(leaf, fan)
  for (const b of view.blocks) {
    if (!fanOf.has(b.id)) g.setNode(b.id, { width: o.cardWidth, height: o.cardHeight })
  }
  for (const fan of fans) g.setNode(fan.id, { width: fan.width, height: fan.height })
  const nodeOf = (id: EntityId) => fanOf.get(id)?.id ?? id
  for (const [key, lanes] of pairs) {
    const v = nodeOf(lanes[0].from)
    const w = nodeOf(lanes[0].to)
    if (v === w) continue
    if (fanOf.has(lanes[0].from) || fanOf.has(lanes[0].to)) {
      if (!g.hasEdge(v, w, 'fan')) g.setEdge(v, w, {}, 'fan')
    } else {
      g.setEdge(v, w, {}, key)
    }
  }

  let graphWidth = o.margin * 2
  let graphBottom = o.margin
  /** Rank centerline y → half the tallest node on it (dagre dummies run through this band). */
  const ranks: { y: number; half: number }[] = []
  const addRank = (y: number, half: number) => {
    const r = ranks.find((x) => Math.abs(x.y - y) < 1)
    if (r) r.half = Math.max(r.half, half)
    else ranks.push({ y, half })
  }
  if (view.blocks.length > 0) {
    dagre.layout(g)
    graphWidth = g.graph().width ?? graphWidth
    for (const b of view.blocks) {
      if (fanOf.has(b.id)) continue
      const n = g.node(b.id)
      rects[b.id] = { x: n.x - o.cardWidth / 2, y: n.y - o.cardHeight / 2, width: o.cardWidth, height: o.cardHeight }
      addRank(n.y, o.cardHeight / 2)
    }
    for (const fan of fans) {
      const n = g.node(fan.id)
      fan.x = n.x - fan.width / 2
      fan.y = n.y - fan.height / 2
      addRank(n.y, fan.height / 2)
      fan.leaves.forEach((leaf, i) => {
        const row = Math.floor(i / fan.cols)
        const inRow = Math.min(fan.cols, fan.leaves.length - row * fan.cols)
        const rowWidth = inRow * (o.cardWidth + o.nodesep) - o.nodesep
        // Row 0 sits nearest the hub.
        const visualRow = fan.dir === 'out' ? row : fan.rows - 1 - row
        rects[leaf] = {
          x: n.x - rowWidth / 2 + (i % fan.cols) * (o.cardWidth + o.nodesep),
          y: fan.y + visualRow * (o.cardHeight + o.fanRowGap),
          width: o.cardWidth,
          height: o.cardHeight,
        }
        fan.rowOf.set(leaf, row)
      })
    }
    for (const r of Object.values(rects)) graphBottom = Math.max(graphBottom, r.y + r.height)
  }

  // ── 2. Asset row ──────────────────────────────────────────────────────────
  let width = graphWidth
  let height = graphBottom + o.margin
  let assetSection: SceneLayout['assetSection']
  if (view.assets.length > 0) {
    const step = o.assetWidth + o.assetGap
    const usable = Math.max(graphWidth - o.margin * 2, step * Math.min(view.assets.length, 4) - o.assetGap)
    const cols = Math.max(1, Math.min(view.assets.length, Math.floor((usable + o.assetGap) / step)))
    const rowWidth = cols * step - o.assetGap
    width = Math.max(graphWidth, rowWidth + o.margin * 2)
    const sectionY = (view.blocks.length ? graphBottom + o.assetSectionGap : o.margin)
    assetSection = { y: sectionY, x1: o.margin, x2: width - o.margin }
    const top = sectionY + o.assetCaptionHeight
    view.assets.forEach((a, i) => {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, view.assets.length - row * cols)
      const x0 = (width - (inRow * step - o.assetGap)) / 2
      rects[a.id] = {
        x: x0 + (i % cols) * step,
        y: top + row * (o.assetHeight + o.assetGap),
        width: o.assetWidth,
        height: o.assetHeight,
      }
    })
    const rows = Math.ceil(view.assets.length / cols)
    height = top + rows * (o.assetHeight + o.assetGap) - o.assetGap + o.margin
  }
  // Center the graph when the asset row is the wider of the two.
  const shift = (width - graphWidth) / 2
  if (shift > 0) {
    for (const b of view.blocks) rects[b.id].x += shift
    for (const fan of fans) fan.x += shift
  }

  const center = (id: EntityId): Point => {
    const r = rects[id]
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }

  // ── 3. Routes (before ports, since ports sort by where lines head) ────────
  type Route = {
    c: Connection
    srcSide: Side
    dstSide: Side
    /** Points the line passes through between its two ports. */
    knots: Point[]
    srcToward: number
    dstToward: number
    lane: number
  }
  const routes: Route[] = []
  for (const [key, lanes] of pairs) {
    const [from, to] = [lanes[0].from, lanes[0].to]
    const a = center(from)
    const b = center(to)
    const down = b.y > a.y + 1
    const up = b.y < a.y - 1
    const fan = fanOf.get(from) ?? fanOf.get(to)
    // Dagre dummy nodes sit on rank centerlines in the gaps between cards;
    // each becomes a straight run through its rank band. Boundary and
    // midpoint samples are dropped — they make lines wobble.
    const dummies = fan
      ? []
      : ((g.edge({ v: from, w: to, name: key }) as { points?: Point[] } | undefined)?.points ?? [])
          .slice(1, -1)
          .map((p) => ({ p, rank: ranks.find((r) => Math.abs(r.y - p.y) < 1) }))
          .filter(({ p, rank }) => rank && Math.abs(p.y - a.y) > 1 && Math.abs(p.y - b.y) > 1)
          .map(({ p, rank }) => ({ x: p.x + shift, y: p.y, half: rank!.half + 6 }))
    lanes.forEach((c, i) => {
      const lane = (i - (lanes.length - 1) / 2) * o.laneGap
      const travel = down ? 1 : -1
      const knots: Point[] = []
      for (const d of dummies) {
        knots.push({ x: d.x + lane, y: d.y - travel * d.half }, { x: d.x + lane, y: d.y + travel * d.half })
      }
      if (fan) knots.push(...fanKnots(fan, fan.leaves.includes(from) ? from : to, rects, o, lane))
      routes.push({
        c,
        srcSide: up ? 'top' : 'bottom',
        dstSide: down ? 'top' : 'bottom',
        knots,
        srcToward: (knots[0]?.x ?? b.x) + lane * 0.01,
        dstToward: (knots[knots.length - 1]?.x ?? a.x) + lane * 0.01,
        lane: i,
      })
    })
  }
  // Connections into assets (asset config) drop to the row, detouring
  // through a gap between cards when the direct curve would cross one.
  const graphRects = view.blocks.map((b) => rects[b.id])
  for (const c of view.connections) {
    if (!isAsset(c.to) || !rects[c.to] || !rects[c.from]) continue
    const from = rects[c.from]
    const a = { x: from.x + from.width / 2, y: from.y + from.height }
    const b = { x: center(c.to).x, y: rects[c.to].y }
    const corridor = findCorridor(a, b, graphRects.filter((r) => r !== from), o)
    const knots = corridor === undefined ? [] : corridorKnots(a, b, corridor, o)
    routes.push({
      c,
      srcSide: 'bottom',
      dstSide: 'top',
      knots,
      srcToward: corridor ?? b.x,
      dstToward: corridor ?? a.x,
      lane: kindIndex(c),
    })
  }

  // ── 4. Ports ──────────────────────────────────────────────────────────────
  const requests: PortRequest[] = []
  for (const r of routes) {
    requests.push({ key: `${r.c.id}@src`, block: r.c.from, side: r.srcSide, toward: r.srcToward, tiebreak: r.lane })
    requests.push({ key: `${r.c.id}@dst`, block: r.c.to, side: r.dstSide, toward: r.dstToward, tiebreak: r.lane })
  }
  for (const l of view.assetLinks) {
    if (!rects[l.blockId] || !rects[l.assetId]) continue
    requests.push({ key: `${l.id}@asset`, block: l.assetId, side: 'top', toward: center(l.blockId).x, tiebreak: 99 })
  }
  const ports = assignPorts(requests, rects, o)

  // ── 5. Paths ──────────────────────────────────────────────────────────────
  const connections: Record<string, ConnectionGeometry> = {}
  const firstSegments = new Map<string, Cubic>()
  for (const r of routes) {
    const start = ports.get(`${r.c.id}@src`)!
    const tip = ports.get(`${r.c.id}@dst`)!
    const dir = r.dstSide === 'top' ? 1 : -1
    const end = { x: tip.x, y: tip.y - dir * o.arrowSize * 0.8 }
    const pts: Point[] = [start, ...r.knots, end]
    const segments = smoothVertical(pts, r.srcSide, r.dstSide)
    firstSegments.set(r.c.id, segments[0])
    connections[r.c.id] = {
      id: r.c.id,
      path: cubicsToPath(segments),
      arrow: arrowPath(tip, dir, o.arrowSize),
      start,
      end: tip,
    }
  }

  const assetLinks: Record<string, string> = {}
  for (const l of view.assetLinks) {
    const start = ports.get(`${l.id}@asset`)
    if (!start || !rects[l.blockId]) continue
    const br = rects[l.blockId]
    const end = { x: br.x + br.width / 2, y: br.y + br.height }
    const corridor = findCorridor(end, start, graphRects.filter((r) => r !== br), o)
    const knots = corridor === undefined ? [] : corridorKnots(start, end, corridor, o)
    assetLinks[l.id] = cubicsToPath(smoothVertical([start, ...knots, end], 'top', 'bottom'))
  }

  // ── 6. Pair count badges ──────────────────────────────────────────────────
  const badges: Record<string, Point> = {}
  const placed: Point[] = []
  const byPair = new Map<string, Connection[]>()
  for (const c of view.connections) {
    const list = byPair.get(c.pairKey) ?? []
    list.push(c)
    byPair.set(c.pairKey, list)
  }
  const blockRects = Object.values(rects)
  for (const [key, list] of byPair) {
    // Anchor on the middle lane of the busiest direction.
    const busiest = [...list].sort((x, y) => y.flows.length - x.flows.length)[0]
    const sameDir = list.filter((c) => c.from === busiest.from)
    const anchor = sameDir[Math.floor((sameDir.length - 1) / 2)]
    const seg = firstSegments.get(anchor.id)
    if (!seg) continue
    let chosen = cubicAt(seg, 0.5)
    for (const t of [0.5, 0.36, 0.64, 0.24, 0.76, 0.15, 0.85]) {
      const p = cubicAt(seg, t)
      const clear =
        placed.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 20) &&
        blockRects.every((r) => p.x < r.x - 8 || p.x > r.x + r.width + 8 || p.y < r.y - 8 || p.y > r.y + r.height + 8)
      if (clear) {
        chosen = p
        break
      }
    }
    placed.push(chosen)
    badges[key] = chosen
  }

  return { width, height, rects, connections, badges, assetLinks, assetSection }
}

type Fan = {
  id: string
  hub: EntityId
  /** `out`: hub → leaves (leaves below). `in`: leaves → hub (leaves above). */
  dir: 'out' | 'in'
  leaves: EntityId[]
  cols: number
  rows: number
  width: number
  height: number
  x: number
  y: number
  rowOf: Map<EntityId, number>
}

/** Leaves (one neighbor, one direction) grouped by hub, when the group is wider than `maxFan`. */
function findFans(view: ScopeView, pairs: Map<string, Connection[]>, o: LayoutOptions): Fan[] {
  const neighbors = new Map<EntityId, Set<EntityId>>()
  const outgoing = new Map<EntityId, Set<EntityId>>()
  for (const lanes of pairs.values()) {
    const { from, to } = lanes[0]
    if (!neighbors.has(from)) neighbors.set(from, new Set())
    if (!neighbors.has(to)) neighbors.set(to, new Set())
    neighbors.get(from)!.add(to)
    neighbors.get(to)!.add(from)
    if (!outgoing.has(from)) outgoing.set(from, new Set())
    outgoing.get(from)!.add(to)
  }
  const groups = new Map<string, { hub: EntityId; dir: 'out' | 'in'; leaves: EntityId[] }>()
  for (const b of view.blocks) {
    const nb = neighbors.get(b.id)
    if (!nb || nb.size !== 1 || b.isScopeRoot) continue
    const hub = [...nb][0]
    if ((neighbors.get(hub)?.size ?? 0) <= 1) continue
    const sends = outgoing.get(b.id)?.has(hub) ?? false
    const receives = outgoing.get(hub)?.has(b.id) ?? false
    if (sends === receives) continue
    const dir = receives ? 'out' : 'in'
    const key = `${hub}|${dir}`
    const group = groups.get(key) ?? { hub, dir, leaves: [] }
    group.leaves.push(b.id)
    groups.set(key, group)
  }
  const fans: Fan[] = []
  for (const group of groups.values()) {
    if (group.leaves.length <= o.maxFan) continue
    const rows = Math.ceil(group.leaves.length / o.maxFan)
    const cols = Math.ceil(group.leaves.length / rows)
    fans.push({
      id: `fan:${group.hub}:${group.dir}`,
      ...group,
      cols,
      rows,
      width: cols * (o.cardWidth + o.nodesep) - o.nodesep,
      height: rows * (o.cardHeight + o.fanRowGap) - o.fanRowGap,
      x: 0,
      y: 0,
      rowOf: new Map(),
    })
  }
  return fans
}

/**
 * Lines to leaves past the first row run down the gap left of the leaf's
 * column, then turn into the card in the row gap above (or below) it.
 */
function fanKnots(fan: Fan, leaf: EntityId, rects: Record<EntityId, Rect>, o: LayoutOptions, lane: number): Point[] {
  const row = fan.rowOf.get(leaf) ?? 0
  if (row === 0) return []
  const r = rects[leaf]
  const x = r.x - o.nodesep / 2 + lane + (row - (fan.rows - 1) / 2) * 3
  const lead = o.fanRowGap * 0.7
  if (fan.dir === 'out') {
    return [
      { x, y: fan.y - 10 },
      { x, y: r.y - lead },
    ]
  }
  return [
    { x, y: r.y + r.height + lead },
    { x, y: fan.y + fan.height + 10 },
  ]
}

/**
 * When the direct curve from `a` (above) to `b` (below) would cross a card,
 * return the x of the nearest clear vertical corridor; undefined when the
 * direct curve is clear.
 */
function findCorridor(a: Point, b: Point, obstacles: Rect[], o: LayoutOptions): number | undefined {
  const top = Math.min(a.y, b.y)
  const bottom = Math.max(a.y, b.y)
  const pad = 6
  const hits = (p: Point) =>
    obstacles.some((r) => p.x > r.x - pad && p.x < r.x + r.width + pad && p.y > r.y - pad && p.y < r.y + r.height + pad)
  const direct = smoothVertical([a, b], 'bottom', 'top')[0]
  let blocked = false
  for (let t = 0.04; t < 1; t += 0.04) if (hits(cubicAt(direct, t))) blocked = true
  if (!blocked) return undefined
  const band = obstacles.filter((r) => r.y + r.height > top + pad && r.y < bottom - pad)
  const clear = (x: number) => band.every((r) => x < r.x - pad || x > r.x + r.width + pad)
  const prefer = (a.x + b.x) / 2
  const candidates = [prefer]
  for (const r of band) candidates.push(r.x - o.nodesep / 2, r.x + r.width + o.nodesep / 2)
  return candidates.filter(clear).sort((p, q) => Math.abs(p - prefer) - Math.abs(q - prefer))[0]
}

/** Two knots holding a line on `x` between just below `a` and just above `b`. */
function corridorKnots(a: Point, b: Point, x: number, o: LayoutOptions): Point[] {
  const dir = Math.sign(b.y - a.y) || 1
  const lead = Math.min(o.ranksep * 0.45, Math.abs(b.y - a.y) / 3)
  return [
    { x, y: a.y + dir * lead },
    { x, y: b.y - dir * lead },
  ]
}

function assignPorts(requests: PortRequest[], rects: Record<EntityId, Rect>, o: LayoutOptions): Map<string, Point> {
  const groups = new Map<string, PortRequest[]>()
  for (const r of requests) {
    const k = `${r.block}|${r.side}`
    const list = groups.get(k) ?? []
    list.push(r)
    groups.set(k, list)
  }
  const out = new Map<string, Point>()
  for (const list of groups.values()) {
    const rect = rects[list[0].block]
    list.sort((a, b) => a.toward - b.toward || a.tiebreak - b.tiebreak)
    const n = list.length
    const gap = n > 1 ? Math.min(o.portGap, (rect.width - 28) / (n - 1)) : 0
    const cx = rect.x + rect.width / 2
    const y = list[0].side === 'top' ? rect.y : rect.y + rect.height
    list.forEach((r, i) => out.set(r.key, { x: cx + (i - (n - 1) / 2) * gap, y }))
  }
  return out
}

/**
 * Chain points with cubics whose tangents are vertical at every knot — the
 * lines leave and enter cards straight, then bend once in between.
 */
function smoothVertical(pts: Point[], srcSide: Side, dstSide: Side): Cubic[] {
  const out: Cubic[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dy = b.y - a.y
    // Leaving a top port means heading up; entering a bottom port means
    // arriving from below — that fixes the tangent sign at the ends.
    const startSign = i === 0 ? (srcSide === 'top' ? -1 : 1) : Math.sign(dy) || 1
    const endSign = i === pts.length - 2 ? (dstSide === 'top' ? 1 : -1) : Math.sign(dy) || 1
    const reach = Math.max(Math.abs(dy) * 0.5, 18)
    out.push([a, { x: a.x, y: a.y + startSign * reach }, { x: b.x, y: b.y - endSign * reach }, b])
  }
  return out
}

function cubicsToPath(segments: Cubic[]): string {
  if (segments.length === 0) return ''
  const f = (n: number) => Math.round(n * 10) / 10
  let d = `M${f(segments[0][0].x)},${f(segments[0][0].y)}`
  for (const [, c1, c2, p] of segments) {
    d += ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p.x)},${f(p.y)}`
  }
  return d
}

function cubicAt([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }
}

function arrowPath(tip: Point, dir: 1 | -1, size: number): string {
  const f = (n: number) => Math.round(n * 10) / 10
  const baseY = tip.y - dir * size
  const half = size * 0.62
  return `M${f(tip.x)},${f(tip.y)} L${f(tip.x - half)},${f(baseY)} L${f(tip.x + half)},${f(baseY)} Z`
}
