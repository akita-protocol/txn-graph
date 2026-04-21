/**
 * Plain-data graph model. Ported from algokit-lora's
 * `src/features/transactions-graph/models/index.ts` with two transforms:
 *
 * 1. `Label` variants that previously carried `AsyncMaybeAtom<AssetSummary>`
 *    now carry a plain `AssetRef = { id }`. Consumers resolve asset metadata
 *    via the `DataProvider` context.
 * 2. `Horizontal.transaction` is a `GraphTransaction` discriminated union of
 *    plain-data shapes. Consumers attach whatever extra state they need via
 *    the `original` passthrough field and read it back in renderTooltip /
 *    renderHorizontalTitle callbacks.
 *
 * The mapper algorithms in `mappers/` are unchanged modulo those two types.
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

export type TransactionsGraphData = {
  horizontals: Horizontal[]
  verticals: Vertical[]
  filename: string
}

export type Horizontal = {
  ancestors: Horizontal[]
  transaction: GraphTransaction
  representation: Representation
  hasNextSibling: boolean
  depth: number
  isSubHorizontal: boolean
}

export type Representation = Vector | SelfLoop | Point

export enum RepresentationType {
  Vector = 'Vector',
  SelfLoop = 'SelfLoop',
  Point = 'Point',
}

export enum LabelType {
  Payment = 'Payment',
  PaymentTransferRemainder = 'PaymentTransferRemainder',
  AssetTransfer = 'AssetTransfer',
  AssetTransferRemainder = 'AssetTransferRemainder',
  AppCall = 'AppCall',
  AppCreate = 'AppCreate',
  AppUpdate = 'AppUpdate',
  AssetCreate = 'AssetCreate',
  AssetReconfigure = 'AssetReconfigure',
  AssetDestroy = 'AssetDestroy',
  AssetFreeze = 'AssetFreeze',
  KeyReg = 'KeyReg',
  StateProof = 'StateProof',
  Clawback = 'Clawback',
  Heartbeat = 'Heartbeat',
}

export type Label =
  | { type: LabelType.Payment; amount: AmountLike }
  | { type: LabelType.PaymentTransferRemainder; amount: AmountLike }
  | { type: LabelType.AssetTransfer; asset: AssetRef; amount: number | bigint }
  | { type: LabelType.AssetTransferRemainder; asset: AssetRef; amount: number | bigint }
  | { type: LabelType.Clawback; asset: AssetRef; amount: number | bigint }
  | { type: LabelType.AppCall }
  | { type: LabelType.AppCreate }
  | { type: LabelType.AppUpdate }
  | { type: LabelType.AssetCreate }
  | { type: LabelType.AssetReconfigure }
  | { type: LabelType.AssetDestroy }
  | { type: LabelType.AssetFreeze }
  | { type: LabelType.KeyReg }
  | { type: LabelType.StateProof }
  | { type: LabelType.Heartbeat }

export type MarkerTag = number | 'Rekey'

export type Vector = {
  type: RepresentationType.Vector
  label: Label
  fromVerticalIndex: number
  fromTag?: MarkerTag
  toTag?: MarkerTag
  toVerticalIndex: number
  direction: 'leftToRight' | 'rightToLeft'
}

export type SelfLoop = {
  type: RepresentationType.SelfLoop
  label: Label
  fromVerticalIndex: number
  fromTag?: MarkerTag
  toTag?: MarkerTag
}

export type Point = {
  type: RepresentationType.Point
  label: Label
  fromVerticalIndex: number
  fromTag?: MarkerTag
}

type AssociatedAccount = {
  accountNumber: number
  accountAddress: Address
}

export type ClawbackAssociatedAccount = AssociatedAccount & { type: 'Clawback' }
export type RekeyAssociatedAccount = AssociatedAccount & { type: 'Rekey' }

export type AccountVertical = {
  id: number
  accountNumber: number
  type: 'Account'
  accountAddress: Address
  associatedAccounts: (ClawbackAssociatedAccount | RekeyAssociatedAccount)[]
}

export type ApplicationVertical = {
  id: number
  type: 'Application'
  applicationId: ApplicationId
  linkedAccount: { accountNumber: number; accountAddress: Address }
  associatedAccounts: (ClawbackAssociatedAccount | RekeyAssociatedAccount)[]
}

export type AssetVertical = {
  id: number
  type: 'Asset'
  assetId: AssetId
}

export type OpUpVertical = {
  id: number
  type: 'OpUp'
}

export type PlaceholderVertical = {
  id: number
  type: 'Placeholder'
}

export type Vertical =
  | AccountVertical
  | ApplicationVertical
  | AssetVertical
  | OpUpVertical
  | PlaceholderVertical

export type RepresentationFromTo = {
  verticalId: number
  tag?: MarkerTag
}

export const fallbackFromTo: RepresentationFromTo = {
  verticalId: -1,
  tag: undefined,
}
