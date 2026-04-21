/**
 * Port of algokit-lora's `src/features/transactions-graph/mappers/index.ts`.
 * Public entry point: takes a list of top-level GraphTransactions and returns
 * the `TransactionsGraphData` the renderer consumes.
 */

import { GraphTransaction, TransactionsGraphData, Vertical } from '../models'
import { flattenInnerTransactions } from './flatten-inner-transactions'
import { getHorizontalsForTransaction } from './horizontals'
import { getVerticalsForTransactions } from './verticals'

export { flattenInnerTransactions } from './flatten-inner-transactions'
export { getHorizontalsForTransaction } from './horizontals'
export { getVerticalsForTransactions } from './verticals'

const base64Symbols = /[+=/]/g

export const asTransactionsGraphData = (transactions: GraphTransaction[]): TransactionsGraphData => {
  const flattenedTransactions = transactions.flatMap((t) => flattenInnerTransactions(t))
  const verticals: Vertical[] = [
    ...getVerticalsForTransactions(flattenedTransactions.map((ft) => ft.transaction)),
  ]
  const horizontals = transactions.flatMap((txn) =>
    getHorizontalsForTransaction(txn, verticals, [], false, 0),
  )

  const firstTransaction = transactions.length > 0 ? transactions[0] : undefined
  const filename = firstTransaction
    ? firstTransaction.group
      ? `block-${firstTransaction.confirmedRound ?? 'unknown'}-group-${firstTransaction.group.replace(base64Symbols, '_')}.png`
      : `transaction-${firstTransaction.id}.png`
    : 'transactions-graph.png'

  if (
    horizontals.some(
      (h) =>
        h.representation.type === 'SelfLoop' &&
        h.representation.fromVerticalIndex === verticals.length - 1,
    )
  ) {
    // Self-loop at the rightmost vertical needs a placeholder column so the arc has room.
    verticals.push({ id: -1, type: 'Placeholder' })
  }

  return {
    horizontals,
    verticals,
    filename,
  }
}
