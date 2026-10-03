import {
  AppCallSubType,
  AssetConfigSubType,
  AssetTransferSubType,
  TransactionType,
  type GraphTransaction,
} from '../models'
import type { AssetSummary } from '../providers/types'
import { formatAlgo, formatAssetAmount, toBigInt } from '../utils/format-amount'
import type { Block, ScopeView } from './scope'
import type { ConnectionKind, Flow, TxnGraph } from './types'

export const connectionKindLabel: Record<ConnectionKind, string> = {
  appl: 'app call',
  pay: 'payment',
  axfer: 'asset transfer',
  acfg: 'asset config',
  afrz: 'freeze',
  close: 'close-out',
  clawback: 'clawback',
  keyreg: 'key reg',
  stpf: 'state proof',
  hb: 'heartbeat',
  auth: 'signs for',
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Short title for a transaction, e.g. `Opt-in`, `swap()`, `App create`. */
export function txnTitle(txn: GraphTransaction): string {
  switch (txn.type) {
    case TransactionType.Payment:
      return txn.closeRemainder ? 'Payment + close' : 'Payment'
    case TransactionType.AssetTransfer:
      if (txn.subType === AssetTransferSubType.OptIn || (txn.sender === txn.receiver && toBigInt(txn.amount) === 0n)) {
        return 'Opt-in'
      }
      if (txn.subType === AssetTransferSubType.OptOut) return 'Opt-out'
      if (txn.subType === AssetTransferSubType.Clawback || txn.clawbackFrom) return 'Clawback'
      return 'Asset transfer'
    case TransactionType.AssetConfig:
      if (txn.subType === AssetConfigSubType.Create) return 'Asset create'
      if (txn.subType === AssetConfigSubType.Destroy) return 'Asset destroy'
      return 'Asset reconfigure'
    case TransactionType.AssetFreeze:
      return 'Asset freeze'
    case TransactionType.AppCall:
      if (txn.method?.name) return `${txn.method.name}()`
      if (txn.subType === AppCallSubType.Create) return 'App create'
      if (txn.subType === AppCallSubType.Update) return 'App update'
      return txn.isOpUp ? 'OpUp call' : 'App call'
    case TransactionType.KeyReg:
      return 'Key registration'
    case TransactionType.StateProof:
      return 'State proof'
    case TransactionType.Heartbeat:
      return 'Heartbeat'
  }
}

/** Amount carried by a flow, formatted. Asset amounts need the asset's decimals. */
export function formatFlowAmount(flow: Flow, asset?: AssetSummary): string | undefined {
  if (flow.amount === undefined) return undefined
  if (flow.assetId === undefined) return formatAlgo(flow.amount)
  const raw = typeof flow.amount === 'object' ? toBigInt(flow.amount) : flow.amount
  if (!asset) return `${raw.toString()} units`
  return formatAssetAmount(raw, asset.decimals, asset.unitName ?? asset.name)
}

/** Footer line on a block card. */
export function blockFooter(block: Block): string {
  const { stats } = block
  if (block.entity.kind === 'asset') {
    return stats.moves ? plural(stats.moves, 'movement') : 'configured'
  }
  const parts: string[] = []
  if (block.entity.kind === 'app') {
    if (stats.calls) parts.push(plural(stats.calls, 'call'))
    if (block.parts) parts.push(`${block.parts} inner`)
    else if (stats.out) parts.push(`${stats.out} out`)
    if (!stats.calls && stats.in) parts.push(`${stats.in} in`)
  } else {
    if (stats.out) parts.push(`${stats.out} out`)
    if (stats.in) parts.push(`${stats.in} in`)
  }
  if (stats.self) parts.push(`${stats.self} self`)
  return parts.join(' · ') || 'no transfers'
}

/** One-paragraph summary of the scope, shown under the title. */
export function describeScope(view: ScopeView): string {
  const { stats } = view
  if (!view.entity) {
    const head = `${plural(stats.outer, 'top-level transaction')} from ${plural(view.signers.length, 'sender')}`
    const touched = [plural(stats.accounts, 'account'), stats.apps ? plural(stats.apps, 'app') : '', stats.assets ? plural(stats.assets, 'asset') : '']
    const touch = `touching ${listJoin(touched.filter(Boolean))}.`
    const inner = stats.inner
      ? ` App calls issued ${plural(stats.inner, 'inner transaction')}.`
      : ''
    return `${head}, ${touch}${inner}`
  }
  const others = view.blocks.filter((b) => b.id !== view.entity!.id)
  const apps = others.filter((b) => b.entity.kind === 'app').length
  const accounts = others.length - apps
  const reach = [
    accounts ? plural(accounts, 'account') : '',
    apps ? plural(apps, 'other app', 'other apps') : '',
    stats.assets ? plural(stats.assets, 'asset') : '',
  ].filter(Boolean)
  return (
    `Called ${plural(stats.outer, 'time')} in this group and issued ${plural(stats.inner, 'inner transaction')}` +
    (reach.length ? `, reaching ${listJoin(reach)}.` : '.')
  )
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Methods called on an app within the scope, with counts. */
export function methodsCalled(graph: TxnGraph, view: ScopeView, appEntityId: string): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const id of view.scope.txnIds) {
    const { txn } = graph.txns.get(id)!
    if (txn.type !== TransactionType.AppCall || `app:${String(txn.applicationId)}` !== appEntityId) continue
    const name = txnTitle(txn)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count }))
}
