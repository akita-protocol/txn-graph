import type { AmountLike } from '../models'

/** Coerce an `AmountLike` into a bigint of microalgos (or base-unit ticks). */
export function toBigInt(amount: AmountLike | number | bigint): bigint {
  if (typeof amount === 'bigint') return amount
  if (typeof amount === 'number') return BigInt(Math.trunc(amount))
  if (typeof amount === 'object' && amount !== null) {
    const micro = (amount as { microAlgos?: bigint | number }).microAlgos
    if (typeof micro === 'bigint') return micro
    if (typeof micro === 'number') return BigInt(Math.trunc(micro))
    const algos = (amount as { algos?: number }).algos
    if (typeof algos === 'number') return BigInt(Math.trunc(algos * 1_000_000))
  }
  return 0n
}

/**
 * Format an Algo-denominated amount. Input is assumed to be microAlgos unless
 * the object provides an explicit `algos` number.
 */
export function formatAlgo(amount: AmountLike): string {
  const micro = toBigInt(amount)
  return `${bigIntToDecimal(micro, 6)} ALGO`
}

/**
 * Format a generic base-unit amount with a given number of decimals.
 * Used for ASA transfers where `decimals` comes from AssetSummary.
 */
export function formatAssetAmount(
  amount: number | bigint,
  decimals: number,
  unitName?: string,
): string {
  const base = typeof amount === 'bigint' ? amount : BigInt(Math.trunc(amount))
  const formatted = bigIntToDecimal(base, decimals)
  return unitName ? `${formatted} ${unitName}` : formatted
}

/** Format a bigint scaled by `decimals` places, trimming trailing zeros. */
export function bigIntToDecimal(value: bigint, decimals: number): string {
  if (decimals <= 0) return value.toString()
  const negative = value < 0n
  const abs = negative ? -value : value
  const s = abs.toString().padStart(decimals + 1, '0')
  const head = s.slice(0, s.length - decimals)
  const tail = s.slice(s.length - decimals).replace(/0+$/, '')
  const out = tail.length > 0 ? `${head}.${tail}` : head
  return negative ? `-${out}` : out
}
