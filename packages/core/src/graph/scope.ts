import {
  AppCallSubType,
  AssetConfigSubType,
  TransactionType,
  type AssetId,
} from '../models'
import { appEntityId, subtreeIds } from './build'
import type {
  AppEntity,
  ConnectionKind,
  Entity,
  EntityId,
  Flow,
  TxnGraph,
} from './types'

/**
 * A scope is the slice of the group you are looking at. The root scope is the
 * whole group; drilling into an app narrows it to the calls made to that app
 * plus everything those calls did (their inner transactions, recursively).
 */
export type Scope = {
  /** App entity ids from the root down. Empty at the root. */
  path: EntityId[]
  /** `''` at the root, otherwise the path joined with `/`. */
  key: string
  txnIds: Set<string>
  /** Outermost transactions of the scope — the group's top-level txns at the root, the calls into the app otherwise. */
  rootTxnIds: Set<string>
}

export type BlockRole =
  | 'signer'
  | 'rekeyed'
  | 'create'
  | 'update'
  | 'called'
  | 'created'
  | 'reconfigured'
  | 'destroyed'

export type BlockStats = {
  /** Flows leaving the block (self-flows excluded). */
  out: number
  /** Flows arriving at the block (self-flows excluded). */
  in: number
  self: number
  /** App calls received (apps) — counted separately from `in`. */
  calls: number
  /** Flows carrying this asset (assets only). */
  moves: number
}

export type Block = {
  id: EntityId
  entity: Entity
  role?: BlockRole
  stats: BlockStats
  /** Inner transactions an app issued in this scope. 0 for non-apps. */
  parts: number
  /** True when opening the block narrows the view. */
  drillable: boolean
  /** The app this scope was opened on. */
  isScopeRoot: boolean
  selfFlows: Flow[]
}

/** All flows of one kind from one block to another, drawn as one line. */
export type Connection = {
  id: string
  /** Shared by every connection between the same two blocks, either direction. */
  pairKey: string
  from: EntityId
  to: EntityId
  kind: ConnectionKind
  flows: Flow[]
  assetIds: AssetId[]
}

/** Asset ↔ block association. Drawn only while either end is in focus. */
export type AssetLink = {
  id: string
  assetId: EntityId
  blockId: EntityId
  flows: Flow[]
}

export type ScopeStats = {
  txns: number
  outer: number
  inner: number
  accounts: number
  apps: number
  assets: number
}

export type ScopeView = {
  scope: Scope
  /** The app the scope was opened on; undefined at the root. */
  entity?: AppEntity
  /** Accounts and apps — the blocks laid out in the graph. */
  blocks: Block[]
  /** Assets — laid out in their own row below the graph. */
  assets: Block[]
  connections: Connection[]
  assetLinks: AssetLink[]
  /** Senders of the scope's outermost transactions, in order. */
  signers: EntityId[]
  /** Flow counts per kind (self-flows included). */
  kindCounts: Partial<Record<ConnectionKind, number>>
  stats: ScopeStats
}

export const ROOT_SCOPE_KEY = ''

/**
 * Resolve a drill path. Path segments that no longer match (e.g. after the
 * transactions changed) are dropped, so the result's `path` may be shorter
 * than the one passed in.
 */
export function resolveScope(graph: TxnGraph, path: readonly EntityId[]): Scope {
  let txnIds = new Set(graph.order)
  let rootTxnIds = new Set(graph.roots)
  const resolved: EntityId[] = []
  for (const appId of path) {
    const next = childScopeIds(graph, txnIds, appId)
    if (!next) break
    txnIds = next.txnIds
    rootTxnIds = next.rootTxnIds
    resolved.push(appId)
  }
  return { path: resolved, key: resolved.join('/'), txnIds, rootTxnIds }
}

function childScopeIds(
  graph: TxnGraph,
  parent: Set<string>,
  appId: EntityId,
): { txnIds: Set<string>; rootTxnIds: Set<string> } | null {
  const txnIds = new Set<string>()
  const rootTxnIds = new Set<string>()
  for (const id of graph.order) {
    if (!parent.has(id) || txnIds.has(id)) continue
    const { txn } = graph.txns.get(id)!
    if (txn.type !== TransactionType.AppCall || appEntityId(txn.applicationId) !== appId) continue
    rootTxnIds.add(id)
    subtreeIds(graph, id, txnIds)
  }
  return rootTxnIds.size > 0 ? { txnIds, rootTxnIds } : null
}

export function getScopeView(graph: TxnGraph, scope: Scope): ScopeView {
  const flows: Flow[] = []
  for (const id of graph.order) {
    if (scope.txnIds.has(id)) flows.push(...(graph.flowsByTxn.get(id) ?? []))
  }

  // Entities in first-appearance order — dagre uses insertion order to break
  // ties, so the first sender ends up leftmost.
  const seen: EntityId[] = []
  const touch = (id: EntityId | undefined) => {
    if (id && !seen.includes(id)) seen.push(id)
  }
  for (const flow of flows) {
    touch(flow.from)
    touch(flow.to)
    touch(flow.actor)
    if (flow.assetId !== undefined) touch(`asset:${String(flow.assetId)}`)
  }

  const blocksById = new Map<EntityId, Block>()
  for (const id of seen) {
    blocksById.set(id, {
      id,
      entity: graph.entities.get(id)!,
      stats: { out: 0, in: 0, self: 0, calls: 0, moves: 0 },
      parts: 0,
      drillable: false,
      isScopeRoot: scope.path[scope.path.length - 1] === id,
      selfFlows: [],
    })
  }

  const connections = new Map<string, Connection>()
  const assetLinks = new Map<string, AssetLink>()
  const kindCounts: Partial<Record<ConnectionKind, number>> = {}
  const link = (assetId: EntityId, blockId: EntityId, flow: Flow) => {
    if (assetId === blockId) return
    const id = `${assetId}~${blockId}`
    const existing = assetLinks.get(id)
    if (existing) existing.flows.push(flow)
    else assetLinks.set(id, { id, assetId, blockId, flows: [flow] })
  }

  for (const flow of flows) {
    kindCounts[flow.kind] = (kindCounts[flow.kind] ?? 0) + 1
    const from = blocksById.get(flow.from)!
    const to = blocksById.get(flow.to)!
    if (flow.assetId !== undefined) {
      const asset = blocksById.get(`asset:${String(flow.assetId)}`)
      if (asset) asset.stats.moves += 1
    }
    if (flow.from === flow.to) {
      from.stats.self += 1
      from.selfFlows.push(flow)
    } else {
      if (flow.kind !== 'auth') {
        from.stats.out += 1
        if (flow.kind === 'appl') to.stats.calls += 1
        else to.stats.in += 1
      }
      const id = `${flow.from}>${flow.to}:${flow.kind}`
      const existing = connections.get(id)
      if (existing) {
        existing.flows.push(flow)
        if (flow.assetId !== undefined && !existing.assetIds.includes(flow.assetId)) {
          existing.assetIds.push(flow.assetId)
        }
      } else {
        connections.set(id, {
          id,
          pairKey: pairKey(flow.from, flow.to),
          from: flow.from,
          to: flow.to,
          kind: flow.kind,
          flows: [flow],
          assetIds: flow.assetId !== undefined ? [flow.assetId] : [],
        })
      }
    }
    if (flow.assetId !== undefined && flow.kind !== 'acfg') {
      const assetId = `asset:${String(flow.assetId)}`
      link(assetId, flow.from, flow)
      link(assetId, flow.to, flow)
      if (flow.actor) link(assetId, flow.actor, flow)
    }
  }

  assignRoles(graph, scope, blocksById)

  // Drillability: an app opens when narrowing to its calls hides something
  // and reveals inner transactions.
  for (const block of blocksById.values()) {
    if (block.entity.kind !== 'app' || block.stats.calls === 0) continue
    const child = childScopeIds(graph, scope.txnIds, block.id)
    if (!child) continue
    block.parts = child.txnIds.size - child.rootTxnIds.size
    block.drillable = block.parts > 0 && child.txnIds.size < scope.txnIds.size
  }

  const all = [...blocksById.values()]
  const blocks = all.filter((b) => b.entity.kind !== 'asset')
  const assets = all.filter((b) => b.entity.kind === 'asset')
  const scopeEntity = scope.path.length
    ? graph.entities.get(scope.path[scope.path.length - 1])
    : undefined

  let outer = 0
  const signers: EntityId[] = []
  for (const id of scope.txnIds) {
    if (!scope.rootTxnIds.has(id)) continue
    outer += 1
    const first = graph.flowsByTxn.get(id)?.[0]
    const sender = first ? (first.kind === 'clawback' && first.actor ? first.actor : first.from) : undefined
    if (sender && !signers.includes(sender)) signers.push(sender)
  }

  return {
    scope,
    entity: scopeEntity?.kind === 'app' ? scopeEntity : undefined,
    blocks,
    assets,
    connections: [...connections.values()],
    assetLinks: [...assetLinks.values()],
    signers,
    kindCounts,
    stats: {
      txns: scope.txnIds.size,
      outer,
      inner: scope.txnIds.size - outer,
      accounts: blocks.filter((b) => b.entity.kind === 'account').length,
      apps: blocks.filter((b) => b.entity.kind === 'app').length,
      assets: assets.length,
    },
  }
}

export function pairKey(a: EntityId, b: EntityId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function assignRoles(graph: TxnGraph, scope: Scope, blocks: Map<EntityId, Block>) {
  const set = (id: EntityId, role: BlockRole, rank: number) => {
    const block = blocks.get(id)
    if (!block) return
    if (!block.role || ROLE_RANK[block.role] < rank) block.role = role
  }
  for (const id of scope.txnIds) {
    const { txn } = graph.txns.get(id)!
    const flow = graph.flowsByTxn.get(id)?.[0]
    if (!flow) continue
    const sender = flow.kind === 'clawback' && flow.actor ? flow.actor : flow.from
    if (txn.signer && txn.signer !== txn.sender) set(sender, 'rekeyed', ROLE_RANK.rekeyed)
    else if (scope.rootTxnIds.has(id) && blocks.get(sender)?.entity.kind === 'account') {
      set(sender, 'signer', ROLE_RANK.signer)
    }
    if (txn.type === TransactionType.AppCall) {
      const target = appEntityId(txn.applicationId)
      if (txn.subType === AppCallSubType.Create) set(target, 'create', ROLE_RANK.create)
      else if (txn.subType === AppCallSubType.Update) set(target, 'update', ROLE_RANK.update)
      else set(target, 'called', ROLE_RANK.called)
    }
    if (txn.type === TransactionType.AssetConfig) {
      const target = `asset:${String(txn.assetId)}`
      if (txn.subType === AssetConfigSubType.Create) set(target, 'created', ROLE_RANK.created)
      else if (txn.subType === AssetConfigSubType.Destroy) set(target, 'destroyed', ROLE_RANK.destroyed)
      else set(target, 'reconfigured', ROLE_RANK.reconfigured)
    }
  }
}

const ROLE_RANK: Record<BlockRole, number> = {
  called: 1,
  signer: 1,
  reconfigured: 1,
  update: 2,
  created: 2,
  rekeyed: 2,
  create: 3,
  destroyed: 3,
}
