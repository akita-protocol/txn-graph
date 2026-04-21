/**
 * Port of algokit-lora's `src/features/transactions-graph/mappers/horizontals.ts`.
 * Algorithms unchanged; lora subType enums renamed to match the library's own
 * enum names (`AssetTransferSubType`, `AppCallSubType`, `AssetConfigSubType`).
 */

import {
  AccountVertical,
  Address,
  AppCallGraphTransaction,
  AppCallSubType,
  ApplicationVertical,
  AssetConfigGraphTransaction,
  AssetConfigSubType,
  AssetFreezeGraphTransaction,
  AssetTransferGraphTransaction,
  AssetTransferSubType,
  fallbackFromTo,
  GraphTransaction,
  HeartbeatGraphTransaction,
  Horizontal,
  KeyRegGraphTransaction,
  Label,
  LabelType,
  PaymentGraphTransaction,
  Representation,
  RepresentationFromTo,
  RepresentationType,
  StateProofGraphTransaction,
  TransactionType,
  Vertical,
} from '../models'
import { isDefined } from '../utils/is-defined'

export const getHorizontalsForTransaction = (
  transaction: GraphTransaction,
  verticals: Vertical[],
  ancestors: Horizontal[],
  hasNextSibling: boolean,
  depth: number,
): Horizontal[] => {
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : undefined
  const representations = getTransactionRepresentations(transaction, verticals, parent)
  const rows: Horizontal[] = representations.map((representation, index) => ({
    transaction,
    representation,
    ancestors,
    hasNextSibling,
    depth,
    isSubHorizontal: index > 0,
  }))

  if (transaction.type === TransactionType.AppCall && transaction.innerTransactions.length > 0) {
    const firstRow = rows[0]
    return [
      ...rows,
      ...transaction.innerTransactions.flatMap((innerTxn, index) =>
        getHorizontalsForTransaction(
          innerTxn,
          verticals,
          [...ancestors, firstRow],
          index < transaction.innerTransactions.length - 1,
          depth + 1,
        ),
      ),
    ]
  }
  return rows
}

const getTransactionRepresentations = (
  transaction: GraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  switch (transaction.type) {
    case TransactionType.AppCall:
      return getAppCallTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.AssetConfig:
      return getAssetConfigTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.AssetFreeze:
      return getAssetFreezeTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.AssetTransfer:
      return getAssetTransferTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.KeyReg:
      return getKeyRegTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.Payment:
      return getPaymentTransactionRepresentations(transaction, verticals, parent)
    case TransactionType.StateProof:
      return getStateProofTransactionRepresentations(transaction, verticals)
    case TransactionType.Heartbeat:
      return getHeartbeatTransactionRepresentations(transaction, verticals)
  }
}

const getAppCallTransactionRepresentations = (
  transaction: AppCallGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const tagAddress = transaction.signer ? transaction.signer : undefined
  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)
  const to = transaction.isOpUp
    ? { verticalId: verticals.find((c) => c.type === 'OpUp')?.id ?? -1 }
    : {
        verticalId:
          verticals.find(
            (c) => c.type === 'Application' && transaction.applicationId === c.applicationId,
          )?.id ?? -1,
      }

  const type =
    transaction.subType === AppCallSubType.Create
      ? LabelType.AppCreate
      : transaction.subType === AppCallSubType.Update
        ? LabelType.AppUpdate
        : LabelType.AppCall

  return [asTransactionGraphRepresentation(from, to, { type })]
}

const getAssetConfigTransactionRepresentations = (
  transaction: AssetConfigGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const tagAddress = transaction.signer ? transaction.signer : undefined
  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)
  const to = {
    verticalId:
      verticals.find((c) => c.type === 'Asset' && transaction.assetId === c.assetId)?.id ?? -1,
  }

  const type =
    transaction.subType === AssetConfigSubType.Reconfigure
      ? LabelType.AssetReconfigure
      : transaction.subType === AssetConfigSubType.Destroy
        ? LabelType.AssetDestroy
        : LabelType.AssetCreate

  return [asTransactionGraphRepresentation(from, to, { type })]
}

const getAssetFreezeTransactionRepresentations = (
  transaction: AssetFreezeGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const tagAddress = transaction.signer ? transaction.signer : undefined
  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)
  const accountVertical = verticals.find(
    (c): c is AccountVertical => c.type === 'Account' && transaction.address === c.accountAddress,
  )
  const to = accountVertical
    ? { verticalId: accountVertical.id, tag: accountVertical.accountNumber }
    : fallbackFromTo

  return [asTransactionGraphRepresentation(from, to, { type: LabelType.AssetFreeze })]
}

const getAssetTransferTransactionRepresentations = (
  transaction: AssetTransferGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const closeOutRepresentation = transaction.closeRemainder
    ? getRepresentationGivenSenderAndReceiver({
        sender: transaction.sender,
        receiver: transaction.closeRemainder.to,
        verticals,
        description: {
          type: LabelType.AssetTransferRemainder,
          amount: transaction.closeRemainder.amount,
          asset: transaction.asset,
        },
      })
    : undefined

  const tagAddress =
    transaction.subType === AssetTransferSubType.Clawback && transaction.clawbackFrom
      ? transaction.clawbackFrom
      : transaction.signer
        ? transaction.signer
        : undefined

  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent, tagAddress)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)
  const to = getAccountOrApplicationByAddress(verticals, transaction.receiver)

  const transferRepresentation = asTransactionGraphRepresentation(from, to, {
    type:
      transaction.subType === AssetTransferSubType.Clawback
        ? LabelType.Clawback
        : LabelType.AssetTransfer,
    amount: transaction.amount,
    asset: transaction.asset,
  })

  return [transferRepresentation, closeOutRepresentation].filter(isDefined)
}

const getKeyRegTransactionRepresentations = (
  transaction: KeyRegGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const tagAddress = transaction.signer ? transaction.signer : undefined
  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)

  return [
    {
      fromVerticalIndex: from.verticalId,
      fromTag: from.tag,
      type: RepresentationType.Point,
      label: { type: LabelType.KeyReg },
    },
  ]
}

const getPaymentTransactionRepresentations = (
  transaction: PaymentGraphTransaction,
  verticals: Vertical[],
  parent?: Horizontal,
): Representation[] => {
  const tagAddress = transaction.signer ? transaction.signer : undefined
  const from = parent
    ? calculateFromWithParent(transaction.sender, verticals, parent)
    : calculateFromWithoutParent(transaction.sender, verticals, tagAddress)
  const to = getAccountOrApplicationByAddress(verticals, transaction.receiver)

  const paymentRepresentation = asTransactionGraphRepresentation(from, to, {
    type: LabelType.Payment,
    amount: transaction.amount,
  })

  if (transaction.closeRemainder) {
    const closeOutRepresentation = getRepresentationGivenSenderAndReceiver({
      sender: transaction.sender,
      receiver: transaction.closeRemainder.to,
      verticals,
      description: {
        type: LabelType.PaymentTransferRemainder,
        amount: transaction.closeRemainder.amount,
      },
    })
    return [paymentRepresentation, closeOutRepresentation]
  }
  return [paymentRepresentation]
}

function getAccountOrApplicationByAddress(
  verticals: Vertical[],
  address: string,
): RepresentationFromTo {
  const accountVertical = verticals.find(
    (c): c is AccountVertical => c.type === 'Account' && c.accountAddress === address,
  )
  const applicationVertical = verticals.find(
    (c): c is ApplicationVertical =>
      c.type === 'Application' && c.linkedAccount.accountAddress === address,
  )
  let fromTo: RepresentationFromTo = fallbackFromTo
  if (accountVertical) {
    fromTo = { verticalId: accountVertical.id, tag: accountVertical.accountNumber }
  }
  if (applicationVertical) {
    fromTo = {
      verticalId: applicationVertical.id,
      tag: applicationVertical.linkedAccount.accountNumber,
    }
  }
  return fromTo
}

const getRepresentationGivenSenderAndReceiver = ({
  sender,
  receiver,
  verticals,
  description,
}: {
  sender: Address
  receiver: Address
  verticals: Vertical[]
  description: Label
}): Representation => {
  const from = calculateFromWithoutParent(sender, verticals)
  const to = getAccountOrApplicationByAddress(verticals, receiver)
  return asTransactionGraphRepresentation(from, to, description)
}

const getStateProofTransactionRepresentations = (
  transaction: StateProofGraphTransaction,
  verticals: Vertical[],
): Representation[] => {
  const from = calculateFromWithoutParent(transaction.sender, verticals)
  return [
    {
      fromVerticalIndex: from.verticalId,
      fromTag: from.tag,
      type: RepresentationType.Point,
      label: { type: LabelType.StateProof },
    },
  ]
}

const getHeartbeatTransactionRepresentations = (
  transaction: HeartbeatGraphTransaction,
  verticals: Vertical[],
): Representation[] => {
  const from = calculateFromWithoutParent(transaction.sender, verticals)
  return [
    {
      fromVerticalIndex: from.verticalId,
      fromTag: from.tag,
      type: RepresentationType.Point,
      label: { type: LabelType.Heartbeat },
    },
  ]
}

const asTransactionGraphRepresentation = (
  from: RepresentationFromTo,
  to: RepresentationFromTo,
  description: Label,
): Representation => {
  if (from.verticalId === to.verticalId) {
    return {
      fromVerticalIndex: from.verticalId,
      fromTag: from.tag,
      toTag: to.tag,
      type: RepresentationType.SelfLoop,
      label: description,
    }
  }
  const direction: 'leftToRight' | 'rightToLeft' =
    from.verticalId < to.verticalId ? 'leftToRight' : 'rightToLeft'

  return {
    fromVerticalIndex: Math.min(from.verticalId, to.verticalId),
    fromTag: from.tag,
    toVerticalIndex: Math.max(from.verticalId, to.verticalId),
    toTag: to.tag,
    direction,
    type: RepresentationType.Vector,
    label: description,
  }
}

const calculateFromWithoutParent = (
  sender: Address,
  verticals: Vertical[],
  tagAddress?: Address,
): RepresentationFromTo => {
  const accountVertical = verticals.find(
    (c): c is AccountVertical => c.type === 'Account' && sender === c.accountAddress,
  )
  if (accountVertical) {
    const taggedAccount = tagAddress
      ? (verticals
          .find((c): c is AccountVertical => c.type === 'Account' && c.accountAddress === tagAddress)
          ?.associatedAccounts.find((a) => a.accountAddress === sender) ??
        accountVertical.associatedAccounts.find((a) => a.accountAddress === tagAddress))
      : undefined

    return {
      verticalId: accountVertical.id,
      tag: taggedAccount
        ? taggedAccount.type === 'Rekey'
          ? 'Rekey'
          : taggedAccount.accountNumber
        : sender === accountVertical.accountAddress
          ? accountVertical.accountNumber
          : accountVertical.associatedAccounts.find((x) => x.accountAddress === sender)?.accountNumber,
    }
  }

  const applicationVertical = verticals.find(
    (c): c is ApplicationVertical =>
      c.type === 'Application' && sender === c.linkedAccount.accountAddress,
  )
  if (applicationVertical) {
    const taggedAccount = tagAddress
      ? verticals
          .find((c): c is AccountVertical => c.type === 'Account' && c.accountAddress === tagAddress)
          ?.associatedAccounts.find((a) => a.accountAddress === sender)
      : applicationVertical.associatedAccounts.find((a) => a.accountAddress === tagAddress)

    return {
      verticalId: applicationVertical.id,
      tag: taggedAccount
        ? taggedAccount.type === 'Rekey'
          ? 'Rekey'
          : taggedAccount.accountNumber
        : applicationVertical.linkedAccount.accountNumber,
    }
  }

  return fallbackFromTo
}

const calculateFromWithParent = (
  sender: Address,
  verticals: Vertical[],
  parent: Horizontal,
  tagAddress?: Address,
): RepresentationFromTo => {
  // Parent is always an AppCall when we reach here.
  const parentAppCall = parent.transaction as AppCallGraphTransaction
  const parentApplicationVertical = verticals.find(
    (c): c is ApplicationVertical =>
      c.type === 'Application' && c.applicationId === parentAppCall.applicationId,
  )
  if (!parentApplicationVertical) return fallbackFromTo

  const tagAddressAccountNumber = tagAddress
    ? parentApplicationVertical.associatedAccounts.find((a) => a.accountAddress === tagAddress)
        ?.accountNumber
    : undefined
  if (tagAddressAccountNumber) {
    return { verticalId: parentApplicationVertical.id, tag: tagAddressAccountNumber }
  }

  if (sender === parentApplicationVertical.linkedAccount.accountAddress) {
    return {
      verticalId: parentApplicationVertical.id,
      tag: parentApplicationVertical.linkedAccount.accountNumber,
    }
  }

  const accountVertical = verticals.find(
    (c): c is AccountVertical => c.type === 'Account' && c.accountAddress === sender,
  )
  if (accountVertical) {
    return {
      verticalId: accountVertical.id,
      tag: parentApplicationVertical.associatedAccounts.find(
        (a) => a.type === 'Rekey' && sender === a.accountAddress,
      )
        ? 'Rekey'
        : accountVertical.accountNumber,
    }
  }

  const applicationVertical = verticals.find(
    (c): c is ApplicationVertical =>
      c.type === 'Application' && c.linkedAccount.accountAddress === sender,
  )
  if (applicationVertical) {
    return {
      verticalId: applicationVertical.id,
      tag: parentApplicationVertical.associatedAccounts.find(
        (a) => a.type === 'Rekey' && sender === a.accountAddress,
      )
        ? 'Rekey'
        : applicationVertical.linkedAccount.accountNumber,
    }
  }

  return fallbackFromTo
}
