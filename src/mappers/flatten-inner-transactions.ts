import { GraphTransaction, TransactionType } from '../models'

export type FlattenedTransaction = {
  nestingLevel: number
  transaction: GraphTransaction
}

/**
 * Returns the transaction + all inner transactions (including nested),
 * each tagged with its nesting level. Port of lora's
 * `src/utils/flatten-inner-transactions.ts`.
 */
export function flattenInnerTransactions(
  transaction: GraphTransaction,
  nestingLevel = 0,
): FlattenedTransaction[] {
  const results: FlattenedTransaction[] = [{ nestingLevel, transaction }]

  if (transaction.type !== TransactionType.AppCall) {
    return results
  }

  const inners = transaction.innerTransactions.flatMap((inner) =>
    flattenInnerTransactions(inner, nestingLevel + 1),
  )
  return results.concat(inners)
}
