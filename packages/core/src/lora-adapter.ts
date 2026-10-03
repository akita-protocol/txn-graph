/**
 * Lora adapter — projects lora's domain shapes (Jotai-backed) onto the
 * library's plain `DataProviderApi`.
 *
 * Design note: the library can NOT depend on `jotai`, `@algorandfoundation/*`,
 * or any lora internals — it has to compile standalone and ship to RN. So
 * this adapter takes **plain-function resolvers**, not atoms + store. The
 * lora-side wrapper does the `store.get(atom)` wiring once and passes the
 * resulting thunks in. The payoff:
 *
 *   - Zero runtime coupling to jotai, lora's mappers, algosdk, or anything
 *     lora-specific inside the library.
 *   - Consumers other than lora (algomd-rn, a future Next.js app, tests) can
 *     reuse the adapter by supplying their own resolvers.
 *
 * Lora's wrapper ends up as ~25 lines in
 * `src/features/transactions-graph/components/transactions-graph-with-tooltips.tsx`.
 */

import type { Address, ApplicationId, AssetId } from './models'
import type {
  AccountSummary,
  ApplicationSummary,
  AssetSummary,
  DataProviderApi,
  EntityRef,
} from './providers/types'

/** Minimal structural input shape — lora's `AssetSummary` satisfies this directly. */
export type LoraAssetSummaryInput = {
  id: AssetId
  name?: string
  unitName?: string
  /** lora emits `number`; upstream is `number | bigint` on some paths. We coerce. */
  decimals: number | bigint
}

/** Minimal structural input shape — lora's `ApplicationSummary` satisfies this. */
export type LoraApplicationSummaryInput = {
  id: ApplicationId
  name?: string
}

/** Minimal structural input — lora's `NfdResult | null` satisfies this. */
export type LoraNfdResultInput =
  | {
      name?: string
    }
  | null
  | undefined

/** Plain-function resolvers the adapter wraps. Any source (Jotai, RQ, SWR) works. */
export type LoraResolvers = {
  /** Resolve an asset's display metadata. */
  resolveAssetSummary(
    id: AssetId,
  ): LoraAssetSummaryInput | Promise<LoraAssetSummaryInput>
  /** Resolve an application's display metadata. */
  resolveApplicationSummary(
    id: ApplicationId,
  ): LoraApplicationSummaryInput | Promise<LoraApplicationSummaryInput>
  /**
   * Optional — resolve an address to its NFD (or equivalent). Omit when the
   * consumer doesn't want a network round-trip per account node.
   */
  resolveAccountNfd?(
    address: Address,
  ): LoraNfdResultInput | Promise<LoraNfdResultInput>
}

/** Per-entity href builders — drives `<a href>` for web SEO / middle-click. */
export type LoraHrefs = {
  account(address: Address): string
  asset(id: AssetId): string
  application(id: ApplicationId): string
  /** Transaction ids as the converter set them (inner ids included). */
  transaction?(id: string): string
  group?(id: string): string
}

export type CreateLoraDataProviderOptions = {
  resolvers: LoraResolvers
  /** Web-only. Omit on native. */
  hrefs?: LoraHrefs
}

/**
 * Factory. Wraps lora's resolvers as a `DataProviderApi`. The returned object
 * is stable for the lifetime of the resolvers/hrefs references — wrap in
 * `useMemo([store, networkId])` in the consumer.
 *
 * @example
 *   const api = useMemo(() => createLoraDataProvider({
 *     resolvers: {
 *       resolveAssetSummary:       (id) => store.get(createAssetSummaryAtom(id)),
 *       resolveApplicationSummary: (id) => store.get(createApplicationSummaryAtom(id)),
 *       resolveAccountNfd:         (addr) => store.get(getNfdResultAtom({ address: addr, resolveNow: true })),
 *     },
 *     hrefs: {
 *       account:     (addr) => Urls.Network.Explore.Account.ByAddress.build({ networkId, address: addr }),
 *       asset:       (id)   => Urls.Network.Explore.Asset.ById.build({ networkId, assetId: id.toString() }),
 *       application: (id)   => Urls.Network.Explore.Application.ById.build({ networkId, applicationId: id.toString() }),
 *     },
 *   }), [store, networkId])
 */
export function createLoraDataProvider({
  resolvers,
  hrefs,
}: CreateLoraDataProviderOptions): DataProviderApi {
  return {
    getAssetSummary: (id) =>
      projectThenable(resolvers.resolveAssetSummary(id), projectAssetSummary),
    getApplicationSummary: (id) =>
      projectThenable(
        resolvers.resolveApplicationSummary(id),
        projectApplicationSummary,
      ),
    getAccountSummary: (address) => {
      if (!resolvers.resolveAccountNfd) {
        return { address }
      }
      const raw = resolvers.resolveAccountNfd(address)
      return projectThenable(raw, (nfd) => projectAccountSummary(address, nfd))
    },
    resolveHref: hrefs ? (ref) => buildHref(ref, hrefs) : undefined,
  }
}

// ── Projections ─────────────────────────────────────────────────────────────

function projectAssetSummary(input: LoraAssetSummaryInput): AssetSummary {
  return {
    id: input.id,
    name: input.name,
    unitName: input.unitName,
    decimals: Number(input.decimals),
  }
}

function projectApplicationSummary(
  input: LoraApplicationSummaryInput,
): ApplicationSummary {
  return { id: input.id, name: input.name }
}

function projectAccountSummary(
  address: Address,
  nfd: LoraNfdResultInput,
): AccountSummary {
  const name = nfd?.name
  return {
    address,
    name,
    verified: Boolean(name),
  }
}

function buildHref(ref: EntityRef, hrefs: LoraHrefs): string | null {
  switch (ref.kind) {
    case 'account':
      return hrefs.account(ref.address)
    case 'asset':
      return hrefs.asset(ref.id)
    case 'application':
      return hrefs.application(ref.id)
    case 'transaction':
      return hrefs.transaction?.(ref.id) ?? null
    case 'group':
      return hrefs.group?.(ref.id) ?? null
  }
}

// ── Thenable plumbing ──────────────────────────────────────────────────────
//
// The library's `DataProviderApi` tolerates sync-or-Promise returns. Resolvers
// do the same. This helper chains them without forcing `await` on the hot
// path (critical — the library re-renders every edge on step change and we
// want the Jotai store's cached-hit case to stay synchronous).

function projectThenable<T, U>(
  value: T | Promise<T>,
  project: (t: T) => U,
): U | Promise<U> {
  if (isPromise<T>(value)) return value.then(project)
  return project(value)
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    Boolean(value) &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}
