/**
 * Plain-data transaction model — the library's only input. Shapes follow
 * algokit-lora's transaction model with SDK types replaced by plain data:
 * assets are referenced by id (`AssetRef`) and resolved through the
 * `DataProvider`; anything else a consumer needs rides on `original`.
 */

export type Address = string
export type ApplicationId = bigint | number
export type AssetId = bigint | number

/** Opaque asset reference. Resolve via `useDataProvider().getAssetSummary(id)`. */
export type AssetRef = {
  id: AssetId
}

/** Plain-data amount. Accepts microAlgos, a number, or an AlgoAmount-like object. */
export type AmountLike =
  | bigint
  | number
  | {
      microAlgos: bigint | number
      algos?: number
    }

export enum TransactionType {
  Payment = 'pay',
  AssetTransfer = 'axfer',
  AssetConfig = 'acfg',
  AssetFreeze = 'afrz',
  AppCall = 'appl',
  KeyReg = 'keyreg',
  StateProof = 'stpf',
  Heartbeat = 'hb',
}

export enum AssetTransferSubType {
  Clawback = 'Clawback',
  OptOut = 'OptOut',
  OptIn = 'OptIn',
  Send = 'Send',
}

export enum AppCallSubType {
  Create = 'Create',
  Update = 'Update',
  Call = 'Call',
}

export enum AssetConfigSubType {
  Create = 'Create',
  Reconfigure = 'Reconfigure',
  Destroy = 'Destroy',
}

/** Shared fields present on every GraphTransaction variant. */
type GraphTransactionBase = {
  id: string
  sender: Address
  /** If set, the rekey-signer address; drives the 'Rekey' tag. */
  signer?: Address
  /** Opaque passthrough — e.g. lora's full Transaction object, used by consumer renderTooltip slots. */
  original?: unknown
  group?: string
  confirmedRound?: bigint | number
}

export type PaymentGraphTransaction = GraphTransactionBase & {
  type: TransactionType.Payment
  receiver: Address
  amount: AmountLike
  closeRemainder?: { to: Address; amount: AmountLike }
}

export type AssetTransferGraphTransaction = GraphTransactionBase & {
  type: TransactionType.AssetTransfer
  subType?: AssetTransferSubType
  receiver: Address
  amount: number | bigint
  asset: AssetRef
  clawbackFrom?: Address
  closeRemainder?: { to: Address; amount: number | bigint }
}

export type AssetConfigGraphTransaction = GraphTransactionBase & {
  type: TransactionType.AssetConfig
  subType?: AssetConfigSubType
  assetId: AssetId
}

export type AssetFreezeGraphTransaction = GraphTransactionBase & {
  type: TransactionType.AssetFreeze
  /** Address of the account whose freeze state is being toggled. */
  address: Address
}

/**
 * A single decoded ABI argument on an app call. Carries both the ABI type
 * string (so renderers can format e.g. `address` vs `uint64` differently) and
 * the already-decoded JS value. The library never decodes — consumers decode
 * against an ARC-56 spec with their own tooling (typically `algosdk`) and
 * attach the result to the transaction.
 */
export type DecodedAbiArg = {
  /** Arg name from the ARC-56 spec, when available. */
  name?: string
  /** ABI type string, e.g. `"uint64"`, `"address"`, `"(uint64,byte[])"`. */
  type: string
  /** Already-decoded value — string, bigint, array, object, etc. */
  value: unknown
  /** Optional short description from the ARC-56 `desc` field. */
  description?: string
}

/**
 * ARC-56-style decoded method call. Attach to `AppCallGraphTransaction.method`
 * when the call maps to a known ABI method; leave unset for bare calls or
 * calls against apps without a resolved spec. When present, the library
 * displays the method name on the edge badge in place of the generic
 * "app call" / "app create" / "app update" text.
 */
export type DecodedAbiMethod = {
  /** Method name, e.g. `"swap"`. */
  name: string
  /** Full ABI signature, e.g. `"swap(uint64,uint64)uint64"`. */
  signature?: string
  /** Method selector as 8-char hex (first 4 bytes of `sha512_256(signature)`). */
  selector?: string
  /** Decoded args in declaration order. */
  args?: DecodedAbiArg[]
  /** Decoded return value, when the spec declares one. */
  returnValue?: { type: string; value: unknown }
  /** Optional short description from the ARC-56 `desc` field. */
  description?: string
}

export type AppCallGraphTransaction = GraphTransactionBase & {
  type: TransactionType.AppCall
  subType?: AppCallSubType
  applicationId: ApplicationId
  /**
   * The application's Algorand address (escrow). Callers compute this via
   * `algosdk.getApplicationAddress(appId).toString()` before handing the
   * transaction to the library. Kept as a field so the library avoids a hard
   * dep on algokit-utils / algosdk.
   */
  applicationAddress: Address
  isOpUp?: boolean
  /**
   * Decoded ABI method, when the call matches a known ARC-56 spec. Consumers
   * decode with their own tooling (ARC-56 spec + `algosdk` ABI codec) and
   * attach the result here — the library stays SDK-free and just renders
   * what it's given. When set, the edge badge shows `method.name` in place
   * of the generic sub-type word; richer details (signature, args) are
   * available on the transaction for consumer tooltip / title renderers.
   */
  method?: DecodedAbiMethod
  innerTransactions: GraphTransaction[]
}

export type KeyRegGraphTransaction = GraphTransactionBase & {
  type: TransactionType.KeyReg
}

export type StateProofGraphTransaction = GraphTransactionBase & {
  type: TransactionType.StateProof
}

export type HeartbeatGraphTransaction = GraphTransactionBase & {
  type: TransactionType.Heartbeat
}

export type GraphTransaction =
  | PaymentGraphTransaction
  | AssetTransferGraphTransaction
  | AssetConfigGraphTransaction
  | AssetFreezeGraphTransaction
  | AppCallGraphTransaction
  | KeyRegGraphTransaction
  | StateProofGraphTransaction
  | HeartbeatGraphTransaction
