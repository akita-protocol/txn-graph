import React from 'react'
import type { PositionedNode } from '../layouts/types'
import type { AccountVertical } from '../models'
import { useAccountSummary } from '../providers'
import { truncateAddress } from '../utils/truncate-address'
import { VerticalBox } from './VerticalBox'
import { useTheme } from '../theme'

export type AccountNodeProps = {
  node: PositionedNode
  vertical: AccountVertical
  onPress?: () => void
}

/**
 * Renders an AccountVertical as a column-header box. Uses `useAccountSummary`
 * to resolve display name / NFD — falls back to truncated address when no
 * consumer data provider is configured.
 */
export function AccountNode({ node, vertical, onPress }: AccountNodeProps): React.JSX.Element {
  const theme = useTheme()
  const summary = useAccountSummary(vertical.accountAddress)
  const title = summary?.name ?? `Account ${vertical.accountNumber}`
  const subtitle = summary?.name
    ? truncateAddress(vertical.accountAddress)
    : truncateAddress(vertical.accountAddress, 8, 6)

  return (
    <VerticalBox
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      title={title}
      subtitle={subtitle}
      accent={theme.palette.accent}
      onPress={onPress}
    />
  )
}
