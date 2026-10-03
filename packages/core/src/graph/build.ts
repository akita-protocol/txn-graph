import {
  AssetTransferSubType,
  TransactionType,
  type Address,
  type ApplicationId,
  type AssetId,
  type GraphTransaction,
} from '../models'
import type { Entity, EntityId, Flow, TxnGraph, TxnRecord } from './types'

export const accountEntityId = (address: Address): EntityId => `acct:${address}`
export const appEntityId = (id: ApplicationId): EntityId => `app:${String(id)}`
export const assetEntityId = (id: AssetId): EntityId => `asset:${String(id)}`

/**
 * Index a transaction group: number every transaction (inner ones included),
 * resolve app escrow addresses onto their app, and break each transaction
 * into directed flows between entities.
 */
export function buildTxnGraph(transactions: readonly GraphTransaction[]): TxnGraph {
  const txns = new Map<string, TxnRecord>()
  const order: string[] = []
  const roots: string[] = []
  const usedIds = new Set<string>()

  const visit = (txn: GraphTransaction, path: string, depth: number, parentId?: string): string => {
    let id = txn.id || `txn-${path}`
    // Fixtures and partially-decoded groups sometimes repeat ids.
    if (usedIds.has(id)) id = `${id}#${path}`
    usedIds.add(id)
    const record: TxnRecord = { id, path, depth, parentId, childIds: [], txn }
    txns.set(id, record)
    order.push(id)
    if (txn.type === TransactionType.AppCall) {
      txn.innerTransactions.forEach((inner, i) => {
        record.childIds.push(visit(inner, `${path}.${i + 1}`, depth + 1, id))
      })
    }
    return id
  }
  transactions.forEach((txn, i) => roots.push(visit(txn, String(i + 1), 0)))

  // Escrow addresses resolve onto their app so value sent to an app lands on
  // the app's block rather than on an anonymous account.
  const appByAddress = new Map<Address, ApplicationId>()
  for (const id of order) {
    const { txn } = txns.get(id)!
    if (txn.type === TransactionType.AppCall && txn.applicationAddress) {
      appByAddress.set(txn.applicationAddress, txn.applicationId)
    }
  }

  const entities = new Map<EntityId, Entity>()
  const account = (address: Address): EntityId => {
    const appId = appByAddress.get(address)
    if (appId !== undefined) return app(appId, address)
    const id = accountEntityId(address)
    if (!entities.has(id)) entities.set(id, { id, kind: 'account', address })
    return id
  }
  const app = (appId: ApplicationId, address?: Address): EntityId => {
    const id = appEntityId(appId)
    const existing = entities.get(id)
    if (!existing) entities.set(id, { id, kind: 'app', appId, address })
    else if (existing.kind === 'app' && !existing.address && address) existing.address = address
    return id
  }
  const asset = (assetId: AssetId): EntityId => {
    const id = assetEntityId(assetId)
    if (!entities.has(id)) entities.set(id, { id, kind: 'asset', assetId })
    return id
  }

  const flows: Flow[] = []
  const flowsByTxn = new Map<string, Flow[]>()
  for (const id of order) {
    const record = txns.get(id)!
    const list: Flow[] = []
    const push = (flow: Omit<Flow, 'id' | 'txnId' | 'depth'>) => {
      list.push({ ...flow, id: `${id}:${list.length}`, txnId: id, depth: record.depth })
    }
    const { txn } = record
    const sender = account(txn.sender)
    switch (txn.type) {
      case TransactionType.Payment:
        push({ kind: 'pay', from: sender, to: account(txn.receiver), amount: txn.amount })
        if (txn.closeRemainder) {
          push({
            kind: 'close',
            from: sender,
            to: account(txn.closeRemainder.to),
            amount: txn.closeRemainder.amount,
          })
        }
        break
      case TransactionType.AssetTransfer: {
        const assetId = txn.asset.id
        asset(assetId)
        if (txn.clawbackFrom || txn.subType === AssetTransferSubType.Clawback) {
          push({
            kind: 'clawback',
            from: account(txn.clawbackFrom ?? txn.sender),
            to: account(txn.receiver),
            assetId,
            amount: txn.amount,
            actor: sender,
          })
        } else {
          push({ kind: 'axfer', from: sender, to: account(txn.receiver), assetId, amount: txn.amount })
        }
        if (txn.closeRemainder) {
          push({
            kind: 'close',
            from: sender,
            to: account(txn.closeRemainder.to),
            assetId,
            amount: txn.closeRemainder.amount,
          })
        }
        break
      }
      case TransactionType.AssetConfig:
        push({ kind: 'acfg', from: sender, to: asset(txn.assetId), assetId: txn.assetId })
        break
      case TransactionType.AssetFreeze:
        push({ kind: 'afrz', from: sender, to: account(txn.address) })
        break
      case TransactionType.AppCall:
        push({ kind: 'appl', from: sender, to: app(txn.applicationId, txn.applicationAddress) })
        break
      case TransactionType.KeyReg:
        push({ kind: 'keyreg', from: sender, to: sender })
        break
      case TransactionType.StateProof:
        push({ kind: 'stpf', from: sender, to: sender })
        break
      case TransactionType.Heartbeat:
        push({ kind: 'hb', from: sender, to: sender })
        break
    }
    // Rekeyed senders (ARC-58 plugins sign for the wallet) get an extra
    // signer → sender link so the authority is visible.
    if (txn.signer && txn.signer !== txn.sender) {
      const signer = account(txn.signer)
      if (signer !== sender) push({ kind: 'auth', from: signer, to: sender })
    }
    flows.push(...list)
    flowsByTxn.set(id, list)
  }

  const first = transactions[0]
  return {
    entities,
    txns,
    order,
    roots,
    flows,
    flowsByTxn,
    groupId: first?.group,
    round: first?.confirmedRound,
  }
}

/** All txn ids in the subtree rooted at `id`, root included. */
export function subtreeIds(graph: TxnGraph, id: string, into: Set<string> = new Set()): Set<string> {
  const record = graph.txns.get(id)
  if (!record) return into
  into.add(id)
  for (const child of record.childIds) subtreeIds(graph, child, into)
  return into
}
