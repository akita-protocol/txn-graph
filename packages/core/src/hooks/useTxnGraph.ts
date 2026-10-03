import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphTransaction } from '../models'
import { buildTxnGraph } from '../graph/build'
import {
  computeHighlight,
  focusEquals,
  type Focus,
  type GraphFilters,
  type Highlight,
} from '../graph/focus'
import { getScopeView, resolveScope, type Block, type Connection, type ScopeView } from '../graph/scope'
import type { ConnectionKind, EntityId, TxnGraph } from '../graph/types'
import { layoutScene, type LayoutOptions, type SceneLayout } from '../layout/scene'

export type UseTxnGraphOptions = {
  transactions: readonly GraphTransaction[]
  layout?: Partial<LayoutOptions>
  /** Drill path to open on mount (app entity ids, e.g. `['app:1234']`). */
  initialScopePath?: EntityId[]
  onScopeChange?: (path: EntityId[]) => void
  onSelectionChange?: (selection: Focus | null) => void
}

export type TxnGraphController = {
  graph: TxnGraph
  view: ScopeView
  scene: SceneLayout
  blocks: Map<EntityId, Block>
  connections: Map<string, Connection>

  filters: GraphFilters
  toggleKind: (kind: ConnectionKind) => void
  setShowInner: (show: boolean) => void

  hover: Focus | null
  setHover: (focus: Focus | null) => void
  selection: Focus | null
  select: (focus: Focus | null) => void
  /** Hover wins over selection. */
  focus: Focus | null
  highlight: Highlight | null

  /** Drill into an app block. Returns false if the block can't be opened. */
  open: (blockId: EntityId) => boolean
  /** Open drillable blocks, toggle selection on the rest. */
  activate: (blockId: EntityId) => void
  up: () => void
  /** Jump to a breadcrumb depth (0 = the whole group). */
  goTo: (depth: number) => void
}

/**
 * Platform-neutral state for the graph: drill path, filters, hover and
 * selection, plus the derived scope view and layout. Both renderers are thin
 * shells over this hook; custom renderers can use it directly.
 */
export function useTxnGraph({
  transactions,
  layout,
  initialScopePath,
  onScopeChange,
  onSelectionChange,
}: UseTxnGraphOptions): TxnGraphController {
  const graph = useMemo(() => buildTxnGraph(transactions), [transactions])
  const [path, setPath] = useState<EntityId[]>(initialScopePath ?? [])
  const [hiddenKinds, setHiddenKinds] = useState<ReadonlySet<ConnectionKind>>(() => new Set())
  const [showInner, setShowInner] = useState(true)
  const [hover, setHoverState] = useState<Focus | null>(null)
  const [selection, setSelection] = useState<Focus | null>(null)

  const scope = useMemo(() => resolveScope(graph, path), [graph, path])
  const view = useMemo(() => getScopeView(graph, scope), [graph, scope])
  const layoutKey = JSON.stringify(layout ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => layoutScene(view, layout), [view, layoutKey])
  const filters = useMemo<GraphFilters>(() => ({ hiddenKinds, showInner }), [hiddenKinds, showInner])

  const blocks = useMemo(() => {
    const map = new Map<EntityId, Block>()
    for (const b of view.blocks) map.set(b.id, b)
    for (const b of view.assets) map.set(b.id, b)
    return map
  }, [view])
  const connections = useMemo(() => new Map(view.connections.map((c) => [c.id, c])), [view])

  const focus = hover ?? selection
  const highlight = useMemo(() => computeHighlight(view, focus, filters), [view, focus, filters])

  const callbacks = useRef({ onScopeChange, onSelectionChange })
  callbacks.current = { onScopeChange, onSelectionChange }

  const select = useCallback((next: Focus | null) => {
    setSelection(next)
    callbacks.current.onSelectionChange?.(next)
  }, [])
  const setHover = useCallback((next: Focus | null) => {
    setHoverState((prev) => (focusEquals(prev, next) ? prev : next))
  }, [])

  const changePath = useCallback(
    (next: EntityId[]) => {
      setPath(next)
      setHoverState(null)
      select(null)
      callbacks.current.onScopeChange?.(next)
    },
    [select],
  )

  // Resolution can drop stale segments (new transactions) — keep state in sync.
  useEffect(() => {
    if (scope.path.length !== path.length) setPath(scope.path)
  }, [scope.path, path.length])

  const open = useCallback(
    (blockId: EntityId) => {
      if (!blocks.get(blockId)?.drillable) return false
      changePath([...scope.path, blockId])
      return true
    },
    [blocks, changePath, scope.path],
  )

  const activate = useCallback(
    (blockId: EntityId) => {
      if (open(blockId)) return
      const next: Focus = { type: 'block', id: blockId }
      select(focusEquals(selection, next) ? null : next)
    },
    [open, select, selection],
  )

  const up = useCallback(() => {
    if (scope.path.length) changePath(scope.path.slice(0, -1))
  }, [changePath, scope.path])
  const goTo = useCallback(
    (depth: number) => {
      if (depth < scope.path.length) changePath(scope.path.slice(0, depth))
    },
    [changePath, scope.path],
  )

  const toggleKind = useCallback((kind: ConnectionKind) => {
    setHiddenKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }, [])

  return {
    graph,
    view,
    scene,
    blocks,
    connections,
    filters,
    toggleKind,
    setShowInner,
    hover,
    setHover,
    selection,
    select,
    focus,
    highlight,
    open,
    activate,
    up,
    goTo,
  }
}
