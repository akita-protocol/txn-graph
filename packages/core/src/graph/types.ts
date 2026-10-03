import type {
  Address,
  AmountLike,
  ApplicationId,
  AssetId,
  GraphTransaction,
} from '../models'

export type EntityKind = 'account' | 'app' | 'asset'

/** Stable entity key: `acct:<address>`, `app:<id>` or `asset:<id>`. */
export type EntityId = string

export type AccountEntity = { id: EntityId; kind: 'account'; address: Address }
export type AppEntity = {
  id: EntityId
  kind: 'app'
  appId: ApplicationId
  /** Escrow address, when any call in the group carried it. */
  address?: Address
}
export type AssetEntity = { id: EntityId; kind: 'asset'; assetId: AssetId }
export type Entity = AccountEntity | AppEntity | AssetEntity

/**
 * Connection kinds. Mostly one per transaction type; `close` and `clawback`
 * split out because they move value along a different path than the plain
 * transfer that carries them.
 */
export type ConnectionKind =
  | 'appl'
  | 'pay'
  | 'axfer'
  | 'acfg'
  | 'afrz'
  | 'close'
  | 'clawback'
  | 'keyreg'
  | 'stpf'
  | 'hb'
  /** Rekeyed authorization: the signer of a transaction → its sender. Not a value transfer. */
  | 'auth'

export const CONNECTION_KINDS: readonly ConnectionKind[] = [
  'appl',
  'pay',
  'axfer',
  'acfg',
  'afrz',
  'close',
  'clawback',
  'keyreg',
  'stpf',
  'hb',
  'auth',
]

/** One transaction, positioned in the group's call tree. */
export type TxnRecord = {
  id: string
  /** Human index: `3`, `3.1`, `3.1.2` — 1-based, like lora's numbering. */
  path: string
  depth: number
  parentId?: string
  childIds: string[]
  txn: GraphTransaction
}

/** A single directed effect of a transaction between two entities. */
export type Flow = {
  id: string
  txnId: string
  kind: ConnectionKind
  from: EntityId
  /** Equals `from` for self-flows (opt-ins, key regs, pay-to-self). */
  to: EntityId
  assetId?: AssetId
  amount?: AmountLike
  depth: number
  /** Extra entity involved without being an endpoint (clawback authority). */
  actor?: EntityId
}

export type TxnGraph = {
  entities: Map<EntityId, Entity>
  txns: Map<string, TxnRecord>
  /** Pre-order (document order) txn ids. */
  order: string[]
  roots: string[]
  flows: Flow[]
  flowsByTxn: Map<string, Flow[]>
  groupId?: string
  round?: bigint | number
}
