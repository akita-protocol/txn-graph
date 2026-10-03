import type { Address, ApplicationId, AssetId } from '../models'

/** Account metadata resolved by the consumer (display names, NFD, etc.). */
export type AccountSummary = {
  address: Address
  /** Optional display name (NFD, ENS, ABI name). */
  name?: string
  /** Optional verified/trusted marker. */
  verified?: boolean
}

/** Asset metadata resolved by the consumer. */
export type AssetSummary = {
  id: AssetId
  /** Unit name (e.g. `USDC`). */
  unitName?: string
  /** Full asset name. */
  name?: string
  /** Decimals for display-math. */
  decimals: number
  /** Optional image URL / data URI. */
  iconUrl?: string
}

/** Application metadata resolved by the consumer. */
export type ApplicationSummary = {
  id: ApplicationId
  /** Optional display name. */
  name?: string
  /** Optional icon URL. */
  iconUrl?: string
}

/** Discriminated entity ref — drives tap handlers + href resolution. */
export type EntityRef =
  | { kind: 'account'; address: Address }
  | { kind: 'application'; id: ApplicationId }
  | { kind: 'asset'; id: AssetId }
  | { kind: 'transaction'; id: string }
  | { kind: 'group'; id: string }

/**
 * Consumer-injected data access. All getters may return a value directly or a
 * Promise — the library handles both. Implementations typically sit on top of
 * react-query, jotai, swr, or an in-memory LRU cache.
 */
export type DataProviderApi = {
  getAccountSummary(address: Address): AccountSummary | Promise<AccountSummary> | undefined
  getAssetSummary(id: AssetId): AssetSummary | Promise<AssetSummary> | undefined
  getApplicationSummary(
    id: ApplicationId,
  ): ApplicationSummary | Promise<ApplicationSummary> | undefined
  /** Optional: drives <a href> on web for middle-click / SEO. */
  resolveHref?(ref: EntityRef): string | null
}
