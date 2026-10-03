import type { Connection, Scope, ScopeView } from './scope'
import type { ConnectionKind, EntityId, Flow } from './types'

export type GraphFilters = {
  hiddenKinds: ReadonlySet<ConnectionKind>
  /** When false, only the scope's outermost transactions are drawn. */
  showInner: boolean
}

export const defaultFilters: GraphFilters = { hiddenKinds: new Set(), showInner: true }

export function isFlowVisible(flow: Flow, scope: Scope, filters: GraphFilters): boolean {
  if (filters.hiddenKinds.has(flow.kind)) return false
  return filters.showInner || scope.rootTxnIds.has(flow.txnId)
}

export function isInnerFlow(flow: Flow, scope: Scope): boolean {
  return !scope.rootTxnIds.has(flow.txnId)
}

export function visibleFlows(flows: readonly Flow[], scope: Scope, filters: GraphFilters): Flow[] {
  return flows.filter((f) => isFlowVisible(f, scope, filters))
}

/** What the pointer (or a selection) is on. */
export type Focus =
  | { type: 'block'; id: EntityId }
  | { type: 'connection'; id: string }
  | { type: 'pair'; key: string }

export type Highlight = {
  blocks: Set<EntityId>
  connections: Set<string>
  assetLinks: Set<string>
}

export function focusEquals(a: Focus | null | undefined, b: Focus | null | undefined): boolean {
  if (!a || !b) return !a && !b
  if (a.type !== b.type) return false
  if (a.type === 'pair') return a.key === (b as typeof a).key
  return a.id === (b as typeof a).id
}

/**
 * Everything that should stay lit while `focus` is active. Returns `null`
 * when nothing is focused (everything renders at full strength).
 */
export function computeHighlight(
  view: ScopeView,
  focus: Focus | null | undefined,
  filters: GraphFilters,
): Highlight | null {
  if (!focus) return null
  const { scope } = view
  const hl: Highlight = { blocks: new Set(), connections: new Set(), assetLinks: new Set() }
  const shown = (c: Connection) => visibleFlows(c.flows, scope, filters).length > 0
  const addConnection = (c: Connection) => {
    hl.connections.add(c.id)
    hl.blocks.add(c.from)
    hl.blocks.add(c.to)
    for (const assetId of c.assetIds) {
      const asset = `asset:${String(assetId)}`
      for (const end of [c.from, c.to]) {
        const linkId = `${asset}~${end}`
        if (view.assetLinks.some((l) => l.id === linkId)) {
          hl.assetLinks.add(linkId)
          hl.blocks.add(asset)
        }
      }
    }
  }

  if (focus.type === 'connection') {
    const c = view.connections.find((x) => x.id === focus.id)
    if (c) addConnection(c)
    return hl
  }
  if (focus.type === 'pair') {
    for (const c of view.connections) if (c.pairKey === focus.key && shown(c)) addConnection(c)
    return hl
  }

  const id = focus.id
  hl.blocks.add(id)
  if (id.startsWith('asset:')) {
    for (const c of view.connections) {
      if (!shown(c)) continue
      if (c.to === id || c.assetIds.some((a) => `asset:${String(a)}` === id)) {
        hl.connections.add(c.id)
        hl.blocks.add(c.from)
        hl.blocks.add(c.to)
      }
    }
    for (const l of view.assetLinks) {
      if (l.assetId !== id || visibleFlows(l.flows, scope, filters).length === 0) continue
      hl.assetLinks.add(l.id)
      hl.blocks.add(l.blockId)
    }
    return hl
  }
  for (const c of view.connections) {
    if ((c.from === id || c.to === id) && shown(c)) {
      hl.connections.add(c.id)
      hl.blocks.add(c.from)
      hl.blocks.add(c.to)
    }
  }
  for (const l of view.assetLinks) {
    if (l.blockId !== id || visibleFlows(l.flows, scope, filters).length === 0) continue
    hl.assetLinks.add(l.id)
    hl.blocks.add(l.assetId)
  }
  return hl
}
