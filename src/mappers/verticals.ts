/**
 * Port of algokit-lora's `src/features/transactions-graph/mappers/verticals.ts`.
 * Algorithms unchanged; lora types replaced with library's plain-data
 * `GraphTransaction` union + enum name remaps.
 */

import {
  AccountVertical,
  Address,
  ApplicationVertical,
  AssetTransferSubType,
  GraphTransaction,
  TransactionType,
  Vertical,
} from '../models'
import { distinct } from '../utils/distinct'

export const getVerticalsForTransactions = (transactions: GraphTransaction[]): Vertical[] => {
  const rawVerticals = asRawVerticals(transactions)
  const mergedVerticals = mergeRawVerticals(rawVerticals)
  return indexVerticals(mergedVerticals)
}

const indexVerticals = (verticals: Vertical[]): Vertical[] => {
  const uniqueAddresses = verticals
    .flatMap((vertical): Address[] => {
      switch (vertical.type) {
        case 'Account':
          return [vertical.accountAddress, ...vertical.associatedAccounts.map((a) => a.accountAddress)]
        case 'Application':
          return [
            vertical.linkedAccount.accountAddress,
            ...vertical.associatedAccounts.map((a) => a.accountAddress),
          ]
        default:
          return []
      }
    })
    .filter(distinct((x) => x))

  return verticals.map((vertical, index) => {
    switch (vertical.type) {
      case 'Account':
        return {
          ...vertical,
          id: index,
          accountNumber: uniqueAddresses.indexOf(vertical.accountAddress) + 1,
          associatedAccounts: vertical.associatedAccounts.map((account) => ({
            ...account,
            accountNumber: uniqueAddresses.indexOf(account.accountAddress) + 1,
          })),
        }
      case 'Asset':
        return { ...vertical, id: index }
      case 'Application':
        return {
          ...vertical,
          id: index,
          linkedAccount: {
            accountNumber: uniqueAddresses.indexOf(vertical.linkedAccount.accountAddress) + 1,
            accountAddress: vertical.linkedAccount.accountAddress,
          },
          associatedAccounts: vertical.associatedAccounts.map((account) => ({
            ...account,
            accountNumber: uniqueAddresses.indexOf(account.accountAddress) + 1,
          })),
        }
      case 'OpUp':
        return { ...vertical, id: index }
      case 'Placeholder':
        return { ...vertical, id: index }
      default:
        return vertical
    }
  })
}

const mergeRawVerticals = (verticals: Vertical[]): Vertical[] => {
  return verticals.reduce<Vertical[]>((acc, current, _, array) => {
    if (current.type === 'Account') {
      if (
        acc.some(
          (c) =>
            (c.type === 'Account' && c.accountAddress === current.accountAddress) ||
            (c.type === 'Application' && c.linkedAccount.accountAddress === current.accountAddress),
        )
      ) {
        return acc
      }
      // An application has its own escrow account — prefer that vertical.
      const app = array.find(
        (a) => a.type === 'Application' && a.linkedAccount.accountAddress === current.accountAddress,
      )
      if (app) return [...acc, app]

      // Prefer an account vertical that carries associatedAccounts.
      const accountWithAssociatedAccounts = array.find(
        (a) =>
          a.type === 'Account' &&
          a.accountAddress === current.accountAddress &&
          a.associatedAccounts.length > 0,
      )
      if (accountWithAssociatedAccounts) return [...acc, accountWithAssociatedAccounts]

      return [...acc, current]
    }
    if (current.type === 'Application') {
      const index = acc.findIndex(
        (c) => c.type === 'Application' && c.applicationId === current.applicationId,
      )
      if (index > -1) {
        const applicationVertical: ApplicationVertical = {
          id: -1,
          type: 'Application',
          applicationId: current.applicationId,
          linkedAccount: current.linkedAccount,
          associatedAccounts: [
            ...(acc[index] as ApplicationVertical).associatedAccounts,
            ...current.associatedAccounts,
          ].filter(distinct((x) => x.accountAddress)),
        }
        acc.splice(index, 1, applicationVertical)
        return acc
      }
      return [...acc, current]
    }
    if (current.type === 'Asset') {
      if (acc.some((c) => c.type === 'Asset' && c.assetId === current.assetId)) return acc
      return [...acc, current]
    }
    if (current.type === 'OpUp') {
      if (acc.some((c) => c.type === 'OpUp')) return acc
      return [...acc, current]
    }
    return acc
  }, [])
}

const asRawVerticals = (transactions: GraphTransaction[]): Vertical[] => {
  const verticals = transactions.flatMap(asVerticalsForTransaction)
  transactions.forEach((transaction) => {
    if (transaction.signer) {
      const vertical = verticals.find(
        (v): v is AccountVertical =>
          v.type === 'Account' && v.accountAddress === transaction.signer,
      )
      if (
        vertical &&
        !vertical.associatedAccounts.find(
          (a) => a.accountAddress === transaction.sender && a.type === 'Rekey',
        )
      ) {
        vertical.associatedAccounts.push({
          type: 'Rekey',
          accountNumber: -1,
          accountAddress: transaction.sender,
        })
      }
    }
  })
  return verticals
}

const asVerticalsForTransaction = (transaction: GraphTransaction): Vertical[] => {
  const verticals: Vertical[] = [
    {
      id: -1,
      accountNumber: -1,
      type: 'Account',
      accountAddress: transaction.sender,
      associatedAccounts:
        transaction.type === TransactionType.AssetTransfer &&
        transaction.subType === AssetTransferSubType.Clawback &&
        transaction.clawbackFrom
          ? [{ type: 'Clawback', accountNumber: -1, accountAddress: transaction.clawbackFrom }]
          : [],
    },
  ]

  if (transaction.type === TransactionType.Payment) {
    verticals.push({
      id: -1,
      accountNumber: -1,
      type: 'Account',
      accountAddress: transaction.receiver,
      associatedAccounts: [],
    })
    if (transaction.closeRemainder) {
      verticals.push({
        id: -1,
        accountNumber: -1,
        type: 'Account',
        accountAddress: transaction.closeRemainder.to,
        associatedAccounts: [],
      })
    }
  }

  if (transaction.type === TransactionType.AssetTransfer) {
    verticals.push({
      id: -1,
      accountNumber: -1,
      type: 'Account',
      accountAddress: transaction.receiver,
      associatedAccounts: [],
    })
    if (transaction.closeRemainder) {
      verticals.push({
        id: -1,
        accountNumber: -1,
        type: 'Account',
        accountAddress: transaction.closeRemainder.to,
        associatedAccounts: [],
      })
    }
  }

  if (transaction.type === TransactionType.AppCall) {
    if (transaction.isOpUp) {
      verticals.push({ id: -1, type: 'OpUp' })
    } else {
      const associatedAccounts = transaction.innerTransactions
        .reduce<ApplicationVertical['associatedAccounts']>((acc, itxn) => {
          if (itxn.sender !== transaction.applicationAddress) {
            acc.push({ type: 'Rekey', accountNumber: -1, accountAddress: itxn.sender })
          }
          if (
            itxn.type === TransactionType.AssetTransfer &&
            itxn.subType === AssetTransferSubType.Clawback &&
            itxn.clawbackFrom
          ) {
            acc.push({ type: 'Clawback', accountNumber: -1, accountAddress: itxn.clawbackFrom })
          }
          return acc
        }, [])
        .filter(distinct((a) => a.accountAddress))

      verticals.push({
        id: -1,
        type: 'Application',
        applicationId: transaction.applicationId,
        linkedAccount: {
          accountNumber: -1,
          accountAddress: transaction.applicationAddress,
        },
        associatedAccounts,
      })
    }
  }

  if (transaction.type === TransactionType.AssetConfig) {
    verticals.push({
      id: -1,
      type: 'Asset',
      assetId: transaction.assetId,
    })
  }

  if (transaction.type === TransactionType.AssetFreeze) {
    verticals.push({
      id: -1,
      accountNumber: -1,
      type: 'Account',
      accountAddress: transaction.address,
      associatedAccounts: [],
    })
  }

  return verticals
}
