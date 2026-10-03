import type { Entity } from '../graph/types'
import { useAccountSummary, useApplicationSummary, useAssetSummary } from '../providers/DataProvider'
import { truncateAddress } from '../utils/truncate-address'

export type EntityTitle = {
  title: string
  /** Address or id line under the title. */
  subtitle: string
  /** True when `title` is an address (render in mono). */
  titleIsAddress: boolean
}

/** Display name for an entity, resolved through the `DataProvider` when available. */
export function useEntityTitle(entity: Entity | undefined): EntityTitle {
  const account = useAccountSummary(entity?.kind === 'account' ? entity.address : null)
  const app = useApplicationSummary(entity?.kind === 'app' ? entity.appId : null)
  const asset = useAssetSummary(entity?.kind === 'asset' ? entity.assetId : null)
  if (!entity) return { title: '', subtitle: '', titleIsAddress: false }
  switch (entity.kind) {
    case 'account': {
      const short = truncateAddress(entity.address)
      return account?.name
        ? { title: account.name, subtitle: short, titleIsAddress: false }
        : { title: short, subtitle: 'account', titleIsAddress: true }
    }
    case 'app': {
      const id = String(entity.appId)
      return { title: app?.name ?? `App ${id}`, subtitle: app?.name ? `#${id}` : entity.address ? truncateAddress(entity.address) : `#${id}`, titleIsAddress: false }
    }
    case 'asset': {
      const id = String(entity.assetId)
      const title = asset?.unitName ?? asset?.name ?? `Asset ${id}`
      return { title, subtitle: asset?.name && asset.name !== title ? `${asset.name} · #${id}` : `#${id}`, titleIsAddress: false }
    }
  }
}
